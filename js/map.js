// -------------------------------------------------------


// === KOPPLAR TILL ANDRA JS-FILER ===

import { skapaLoggar } from "./ui.js";
import { hamtaVader, hamtaWikiSammanfattning } from "./api.js";

// -------------------------------------------------------

// === KONSTANTER OCH VARIABLER ===
let map;
let marker = null;
let markerClusterGroup;

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

   map = L.map('map', { maxZoom: 19 }).setView([62.0, 15.0], 5);

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


// === LÄGGER TILL KLICK-FUNKTION PÅ KARTAN ===
// === När användaren klickar fylls koordinaterna i formuläret ===
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

      // Hämta elementen först
      const latInput = document.getElementById('latInput');
      const lonInput = document.getElementById('lonInput');

      // SÄKERHETSKOLL: Fyll bara i om fälten faktiskt existerar på sidan!
      if (latInput && lonInput) {
         latInput.value = lat;
         lonInput.value = lon;
      }

      // Sätt eller flytta markör (detta vill vi göra oavsett sida!)
      if (marker) {
         marker.setLatLng(e.latlng);
      } else {
         marker = L.marker(e.latlng).addTo(map);
      }
      skapaLoggar(laggTillKlickFunktion, 'info', `📍 Klickade på: ${lat}, ${lon}`);
   });
}
// -------------------------------------------------------


// === LÄGGER TILL MARKERING PÅ KARTAN ===
export function addObservationMarker(lat, lon, artNamn, antal, datum) {
   // Förhindrar krasch om kartan inte finns på sidan
   if (!markerClusterGroup) {
      return;
   }

   const popupContent = `
        <strong>${artNamn}</strong><br>
        📅 ${new Date(datum).toLocaleDateString('sv-SE')}<br>
        ⏳ <em>Hämtar historiskt väderdata...</em>
    `;

   // Bestämmer vilken ikon som ska användas beroende på artNamn
   let valdIkon = L.Icon.Defaults; //Om något går fel används den blå standard-markören)

   if (artNamn.includes('Varg')) {
      valdIkon = vargIcon;
   } else if (artNamn.includes('Älg')) {
      valdIkon = algIcon;
   } else if (artNamn.includes('Rådjur')) {
      valdIkon = radjurIcon;
   }

   const marker = L.marker([lat, lon], { icon: valdIkon })
      .bindPopup(popupContent);
   markerClusterGroup.addLayer(marker);

   marker.on('popupopen', async function () {
      //Om vädret redan blivit laddad för just dennna markör -> gör inget mer
      if (marker.vaderLaddat)
         return;

      //Anropar historiskt väder API med markörens koordinater
      const vader = await hamtaVader(lat, lon, datum);
      //Anropar väder Wiki API med djurets namn      
      const wikiData = await hamtaWikiSammanfattning(artNamn);

      if (vader) {
         marker.setPopupContent(`
               <strong>${artNamn}</strong><br>
               📅 ${new Date(datum).toLocaleDateString('sv-SE')}<br>
               <hr style="margin: 5px 0; border: 0; border-top: 1px solid #eee;">
               ${vader.emoji} ${vader.temp}°C, ${vader.beskrivning}
               `);
      } else {
         // Om API:n inte svarar:
         marker.setPopupContent(`
               <strong>${artNamn}</strong><br>
               📅 ${new Date(datum).toLocaleDateString('sv-SE')}<br>
               ❌ Kunde inte hämta väderdata
               `);
      }
   });

   /*    observationMarkers.push(marker); */
}

// -------------------------------------------------------


// === TAR BORT MARKERING PÅ KARTAN ===
export function clearObservationMarkers() {
   // Förhindrar krasch om kartan saknas!
   if (!markerClusterGroup) {
      return; // Avbryt funktionen direkt, det finns inget att rensa
   }

   markerClusterGroup.clearLayers();

   // Flytta in den tillfälliga klick-markören här så den rensas på rätt ställe!
   if (marker) {
      map.removeLayer(marker);
      marker = null;
   }
}

// -------------------------------------------------------