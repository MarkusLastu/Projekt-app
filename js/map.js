// -------------------------------------------------------


// === KOPPLAR TILL ANDRA JS-FILER ===

import { skapaLoggar } from "./ui.js";
import { hamtaVader, hamtaWikiSammanfattning } from "./api.js";

// -------------------------------------------------------

// === KONSTANTER OCH VARIABLER ===
let map;
let marker = null;
let markerClusterGroup;
let heatLayer = null;
let allHeatPoints = [];

// Markörerna på kartan 
const vargIcon = L.icon({
   iconUrl: 'images/svg/varg.svg',
   iconSize: [36, 36],       // Storlek i pixlar [bredd, höjd]
   iconAnchor: [18, 36],     // Vilken punkt i bilden som ska stå på koordinaten (mitten längst ner)
   popupAnchor: [0, -36]     // Var popup-rutan ska ploppa upp i förhållande till ikonen
});

const algIcon = L.icon({
   iconUrl: 'images/svg/alg.svg', // Ändra till exakt vad din fil heter
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const radjurIcon = L.icon({
   iconUrl: 'images/svg/radjur.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

// -------------------------------------------------------

// === SKAPA KARTAN ===

export function skapaKarta() {

   const mapCreateStatus = document.getElementById("mapCreateStatus");
   skapaLoggar(skapaKarta, 'start', 'Laddar kartan...', mapCreateStatus);
   // Skapar kartan och centrerar över Gävle

   const mapContainer = document.getElementById("map");

   if (!mapContainer) {
      skapaLoggar(skapaKarta, 'varna', 'Ingen karta på denna sida', mapCreateStatus);
      return;
   }

   map = L.map('map', { preferCanvas: true, maxZoom: 19 }).setView([62.0, 15.0], 5);

   // Initiera klustret (så att markörer nära varandra blir en markör)
   markerClusterGroup = L.markerClusterGroup();
   map.addLayer(markerClusterGroup);

   // Lägg till OpenStreeMap-bakgrund
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>contributors',
      maxZoom: 19,
   }).addTo(map);

   // Lägg till zoom-kontroller (inte nödvändigt på denna karta - finns standard-zoom knappar)
   /* L.control.zoom({ position: 'topleft' }).addTo(map); */

   // Lägg till skala
   L.control.scale({ position: 'bottomright' }).addTo(map);

   skapaLoggar(skapaKarta, 'info', 'Zoom och skala tillagd på kartan');

   skapaLoggar(skapaKarta, 'info', 'Karta skapad med OpenStreetMap', mapCreateStatus);

   return map;
}
// -------------------------------------------------------


// 🔥 HJÄLPFUNKTION: Känner av kommunen baserat på koordinater och sätter rullistan
async function identifieraOchValjKommun(lat, lon) {
   const obsKommunSelect = document.getElementById("obsKommun");
   if (!obsKommunSelect) return;

   try {
      // Vi lägger till zoom=10 för att specifikt be om kommun/stads-nivå
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
         headers: { 'User-Agent': 'BastaKartanApplikation' } // Nominatim kräver en unik user-agent
      });
      const data = await response.json();

      if (data && data.address) {
         // API:et kan returnera kommunen under lite olika fält beroende på plats, vi helgarderar oss:
         let funnenKommun = data.address.municipality || data.address.city || data.address.town || "";

         if (funnenKommun) {
            // API:et svarar ofta t.ex. "Gävle kommun" eller "Stockholms stad". 
            // Vi rensar bort det så vi bara har "Gävle" eller "Stockholm" kvar:
            funnenKommun = funnenKommun.replace(" kommun", "").replace(" stad", "").trim().toLowerCase();

            // Loopa igenom alla alternativ i vår <select>-lista för att hitta en matchning
            for (let i = 0; i < obsKommunSelect.options.length; i++) {
               const optionText = obsKommunSelect.options[i].text.toLowerCase();

               if (optionText.includes(funnenKommun)) {
                  obsKommunSelect.selectedIndex = i; // Välj denna kommun automatiskt!
                  console.log(`🔮 Matchade automatiskt till kommun: ${obsKommunSelect.options[i].text}`);
                  break;
               }
            }
         }
      }
   } catch (error) {
      console.warn("Kunde inte hämta kommun från koordinater:", error);
   }
}

// === LÄGGER TILL KLICK-FUNKTION PÅ KARTAN ===
export function laggTillKlickFunktion() {
   const mapAddClickStatus = document.getElementById("mapAddClickStatus");
   skapaLoggar(laggTillKlickFunktion, 'info', 'Klickfunktion på kartan körs.', mapAddClickStatus);

   const mapContainer = document.getElementById("map");

   if (!mapContainer) {
      console.warn("Ingen karta på denna sida");
      return;
   }

   map.on('click', function (e) {
      const lat = e.latlng.lat.toFixed(6);
      const lon = e.latlng.lng.toFixed(6);

      const latInput = document.getElementById('latInput');
      const lonInput = document.getElementById('lonInput');

      if (latInput && lonInput) {
         latInput.value = lat;
         lonInput.value = lon;
      }

      // 🔥 KÖR DIREKT VID KLICK: Lista ut kommunen direkt
      identifieraOchValjKommun(lat, lon);

      // Sätt eller flytta markör
      if (marker) {
         marker.setLatLng(e.latlng);
      } else {
         marker = L.marker(e.latlng, { draggable: true }).addTo(map);

         // 1. UNDER DRAGET: Visa bara koordinaterna live (inget API-anrop här för att spara prestanda)
         marker.on('drag', function () {
            const nuvarandePosition = marker.getLatLng();
            const dragLat = nuvarandePosition.lat.toFixed(6);
            const dragLon = nuvarandePosition.lng.toFixed(6);

            if (latInput && lonInput) {
               latInput.value = dragLat;
               lonInput.value = dragLon;
            }

            marker.setPopupContent(`
               <div style="text-align: center; min-width: 120px;">
                  <span style="font-size:12px; font-weight:bold; color:#e78300;">📍 ${dragLat}, ${dragLon}</span>
               </div>
            `).openPopup();
         });

         // 2. NÄR MAN SLÄPPER: Ge tillbaka hela popupen + uppdatera kommunen i bakgrunden
         marker.on('dragend', function () {
            const slutligPosition = marker.getLatLng();
            const slutLat = slutligPosition.lat.toFixed(6);
            const slutLon = slutligPosition.lng.toFixed(6);

            // 🔥 KÖR VID DRAGEND: Uppdatera kommunväljaren till den nya platsen användaren släppte markören på!
            identifieraOchValjKommun(slutLat, slutLon);

            marker.setPopupContent(`
               <div style="text-align: center;">
                  <strong>Vald position</strong><br>
                  <span style="font-size:11px; color:#666;">${slutLat}, ${slutLon}</span><br><br>
                  <button id="openObsModalBtn" style="cursor:pointer; padding: 6px 10px; background: #e78300; color: white; border: none; border-radius: 4px; font-weight:bold;">
                     🐾 Rapportera här
                  </button>
               </div>
            `).openPopup();
         });
      }

      // Standard-popupen när man klickar första gången på kartan
      marker.bindPopup(`
         <div style="text-align: center;">
            <strong>Vald position</strong><br>
            <span style="font-size:11px; color:#666;">${lat}, ${lon}</span><br><br>
            <button id="openObsModalBtn" style="cursor:pointer; padding: 6px 10px; background: #e78300; color: white; border: none; border-radius: 4px; font-weight:bold;">
               🐾 Rapportera här
            </button>
         </div>
      `).openPopup();

      skapaLoggar(laggTillKlickFunktion, 'info', `📍 Klickade på: ${lat}, ${lon}`);
   });
}
// -------------------------------------------------------


// === LÄGGER TILL MARKERING PÅ KARTAN ===
export function addObservationMarker(lat, lon, artNamn, datum) {
   if (!markerClusterGroup) return;

   let icon = L.Icon.Default;

   if (artNamn.includes('Varg')) icon = vargIcon;
   else if (artNamn.includes('Älg')) icon = algIcon;
   else if (artNamn.includes('Rådjur')) icon = radjurIcon;

   const marker = L.marker([lat, lon], { icon });

   marker.bindPopup(`
      <strong>${artNamn}</strong><br>
      📅 ${new Date(datum).toLocaleDateString('sv-SE')}<br>
      ⏳ Laddar data...
   `);

   marker.on('popupopen', async function () {
      if (marker._loaded) return;
      marker._loaded = true;

      const vader = await hamtaVader(lat, lon, datum);
      const wiki = await hamtaWikiSammanfattning(artNamn);

      marker.setPopupContent(`
         <strong>${artNamn}</strong><br>
         📅 ${new Date(datum).toLocaleDateString('sv-SE')}<br>
         <hr>
         ${vader ? `${vader.emoji} ${vader.temp}°C` : "❌ väder saknas"}
      `);
   });

   markerClusterGroup.addLayer(marker);

   // 🔥 heatmap data
   allHeatPoints.push([lat, lon, 1]);
}
// -------------------------------------------------------


// === TAR BORT MARKERING PÅ KARTAN ===
export function clearObservationMarkers() {
   if (markerClusterGroup) {
      markerClusterGroup.clearLayers();
   }

   if (heatLayer) {
      map.removeLayer(heatLayer);
      heatLayer = null;
   }

   allHeatPoints = [];

   if (marker) {
      map.removeLayer(marker);
      marker = null;
   }
}

let useHeatMap = false
// === HEATMAP ===
export function renderHeatmap() {
   if (!map) return;
   if (useHeatMap) return;

   if (heatLayer) {
      map.removeLayer(heatLayer);
   }

   heatLayer = L.heatLayer(allHeatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
   }).addTo(map);
}

// -------------------------------------------------------