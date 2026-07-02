// === KOPPLAR TILL ANDRA JS-FILER ===
import { skapaLoggar } from "./ui.js";
import { hamtaVader, hamtaWikiSammanfattning } from "./api.js";
import { skapaBildSlug } from "./app.js";


// -------------------------------------------------------

// === KONSTANTER OCH VARIABLER ===
let map;
let marker = null;
let markerLayer = null;
let gridLayer = null;
let markerClusterGroup = null; // Deklarerad och nollställd
let heatLayer = null;          // 🔥 TILLAGD: Saknades i din topp-lista!
let allHeatPoints = [];        // 🔥 TILLAGD: Saknades i din topp-lista!
let nuvarandeLaddningsId = 0;
let currentFilteredPoints = [];

// Markörerna på kartan 
const pawIcon = L.icon({
   iconUrl: 'images/svg/paw.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const vargIcon = L.icon({
   iconUrl: 'images/svg/varg.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const algIcon = L.icon({
   iconUrl: 'images/svg/alg.svg',
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

const grasalIcon = L.icon({
   iconUrl: 'images/svg/grasal.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const gravlingIcon = L.icon({
   iconUrl: 'images/svg/gravling.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const vildsvinIcon = L.icon({
   iconUrl: 'images/svg/vildsvin.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const ravIcon = L.icon({
   iconUrl: 'images/svg/rav.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const kungsornIcon = L.icon({
   iconUrl: 'images/svg/kungsorn.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const baverIcon = L.icon({
   iconUrl: 'images/svg/baver.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});

const bjornIcon = L.icon({
   iconUrl: 'images/svg/bjorn.svg',
   iconSize: [36, 36],
   iconAnchor: [18, 36],
   popupAnchor: [0, -36]
});


// -------------------------------------------------------

// === SKAPA KARTAN ===
export function skapaKarta() {
   const mapCreateStatus = document.getElementById("mapCreateStatus");
   skapaLoggar(skapaKarta, 'start', 'Laddar kartan...', mapCreateStatus);

   const mapContainer = document.getElementById("map");
   if (!mapContainer) {
      skapaLoggar(skapaKarta, 'varna', 'Ingen karta på denna sida', mapCreateStatus);
      return;
   }

   map = L.map('map', {
      preferCanvas: true,
      minZoom: 3,
      maxZoom: 17
   }).setView(
      [62.0, 15.0], 5
   );
   markerLayer = L.layerGroup().addTo(map);

   /* L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      noWrap: true,
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)'
   }).addTo(map); */


   // Gamla kartan
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
   }).addTo(map);

   L.control.scale({ position: 'bottomright' }).addTo(map);

   kopplaKarthandelser();

   skapaLoggar(skapaKarta, 'ok', 'Karta skapad med OpenStreetMap', mapCreateStatus);
   return map;
}
// Kopplar kartan till händelser som uppdaterar markörer och rutor när användaren flyttar eller zoomar kartan
function kopplaKarthandelser() {
   const loader = document.getElementById("map-loader");

   map.on('movestart', () => {
      if (loader) loader.classList.remove("hidden");
   });

   let timeoutId;
   map.on('moveend', () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
         uppdateraVynBaseratPaOmrade();
      }, 100);
   });
}


// updateMapViewBasedOnArea() uppdaterar kartan baserat på synliga punkter och zoomnivå. Den hanterar både rutnätsvisning och markörer beroende på zoomnivån.
export function uppdateraVynBaseratPaOmrade() {
   if (!map) return;

   const loader = document.getElementById("map-loader");
   if (loader) loader.classList.remove("hidden");

   setTimeout(() => {
      try {
         map.closePopup();
         nuvarandeLaddningsId++;
         const mittLaddningsId = nuvarandeLaddningsId;

         // Hämta kartans synliga ruta
         const bounds = map.getBounds();
         const zoom = map.getZoom();

         // 🔥 SÄKRARE FILTRERING: Om bounds saknas eller är korrupt, 
         // lita på currentFilteredPoints istället för att tömma hela listan!
         let synligaPunkter = [];

         if (bounds && typeof bounds.contains === 'function') {
            synligaPunkter = currentFilteredPoints.filter(pt => {
               if (!pt || typeof pt.lat !== 'number' || typeof pt.lon !== 'number') return false;
               return bounds.contains(L.latLng(pt.lat, pt.lon));
            });
         }

         // 🚨 KRITISK FIX: Om kartan precis har laddats och bounds råkar bli 0, 
         // men vi VET att vi har filtrerade punkter -> Använd dem för legenden!
         if (synligaPunkter.length === 0 && currentFilteredPoints.length > 0) {
            synligaPunkter = currentFilteredPoints;
         }

         // 1. Rensa ALLTID lagren först
         if (markerLayer) { markerLayer.clearLayers(); }
         if (gridLayer) { gridLayer.clearLayers(); }
         else { gridLayer = L.layerGroup().addTo(map); }

         // 2. Uppdatera legenden DIREKT (Nu är synligaPunkter garanterat inte tom om det finns data!)
         uppdateraKartLegendUI(synligaPunkter);

         // 3. Avbryt om det faktiskt är helt tomt i databasen/filtret
         if (synligaPunkter.length === 0 && currentFilteredPoints.length > 0) {
            synligaPunkter = currentFilteredPoints;
         }


         // 🔥 ZOOM-TRÖSKEL
         if (zoom <= 10) {
            let gridSize = 0.4;
            if (zoom <= 3) gridSize = 4.0;
            else if (zoom === 4) gridSize = 2.0;
            else if (zoom === 5) gridSize = 0.8;
            else if (zoom === 6) gridSize = 0.4;
            else if (zoom === 7) gridSize = 0.2;
            else if (zoom === 8) gridSize = 0.1;
            else if (zoom === 9) gridSize = 0.05;
            else if (zoom === 10) gridSize = 0.02;

            const gridCounter = {};
            synligaPunkter.forEach(pt => {
               const gridLat = Math.floor(pt.lat / gridSize) * gridSize;
               const gridLon = Math.floor(pt.lon / gridSize) * gridSize;
               const key = `${gridLat.toFixed(4)},${gridLon.toFixed(4)}`;
               if (!gridCounter[key]) gridCounter[key] = 0;
               gridCounter[key]++;
            });

            renderGridmap(gridCounter, gridSize, mittLaddningsId);

         } else {
            // 🔥 MARKÖRER
            synligaPunkter.forEach(pt => {
               if (mittLaddningsId !== nuvarandeLaddningsId) return;

               let icon = pawIcon; // Standardikon
               if (pt.artNamn?.includes('Varg')) icon = vargIcon;
               else if (pt.artNamn?.includes('Älg')) icon = algIcon;
               else if (pt.artNamn?.includes('Rådjur')) icon = radjurIcon;
               else if (pt.artNamn?.includes('Gråsäl')) icon = grasalIcon;
               else if (pt.artNamn?.includes('Grävling')) icon = gravlingIcon;
               else if (pt.artNamn?.includes('Räv')) icon = ravIcon;
               else if (pt.artNamn?.includes('Vildsvin')) icon = vildsvinIcon;
               else if (pt.artNamn?.includes('Björn')) icon = bjornIcon;
               else if (pt.artNamn?.includes('Bäver')) icon = baverIcon;
               else if (pt.artNamn?.includes('Kungsörn')) icon = kungsornIcon;

               const marker = L.marker([pt.lat, pt.lon], { icon }).addTo(markerLayer);

               let formateratDatum = "Okänt datum";
               if (pt.datum) {
                  const testDate = new Date(pt.datum);
                  if (!isNaN(testDate.getTime())) {
                     formateratDatum = testDate.toLocaleDateString('sv-SE');
                  }
               }

               const visningsTid = pt.tid ? ` 🕒 ${pt.tid.substring(0, 5)}` : "";

               marker.bindPopup(`
                  <strong>${pt.artNamn || "Okänt djur"}</strong><br>
                  📅 ${formateratDatum}<br>
                  ${visningsTid}<br>
                  <em>⏳ Laddar väder och info...</em>
               `);

               marker.on('popupopen', async function () {
                  if (marker._loaded) return;
                  marker._loaded = true;

                  const vader = await hamtaVader(pt.lat, pt.lon, pt.datum);
                  const wiki = await hamtaWikiSammanfattning(pt.artNamn);
                  // Uppdatera popup-innehållet med väderdata och wiki-sammanfattning
                  if (marker.getPopup().isOpen()) {
                     marker.setPopupContent(`
                        <strong>${pt.artNamn || "Okänt djur"}</strong><br>
                        📅 ${formateratDatum}<br>
                        ${visningsTid}<br>
                        <hr>
                        ${vader ? `${vader.emoji} ${vader.temp}°C` : "❌ Väder saknas"}<br>
                     `);
                  }
               });
            });
         }
      } catch (error) {
         console.error("Layout- eller datatypfel vid uppdatering av kartvyn:", error);
      } finally {
         // 3. Dölj laddaren FÖRST när hela loopen och renderingen är helt färdigberäknad
         if (loader) {
            loader.classList.add("hidden");
         }
      }
   }, 25); // 25ms är precis lagom för att ge webbläsaren en chans att uppdatera gränssnittet
}

// === RENDERAR RUTNÄT PÅ KARTAN ===
function renderGridmap(gridCounter, gridSize, mittLaddningsId) {
   if (mittLaddningsId !== nuvarandeLaddningsId) return;
   if (!gridLayer) gridLayer = L.layerGroup().addTo(map);

   const allaAntal = Object.values(gridCounter).sort((a, b) => a - b);
   const antalRutor = allaAntal.length;

   const index33 = Math.floor(antalRutor * 0.33);
   const index66 = Math.floor(antalRutor * 0.66);

   const limit1 = antalRutor > 0 ? allaAntal[index33] : 0;
   const limit2 = antalRutor > 0 ? allaAntal[index66] : 0;
   //för varje ruta i gridCounter, rita en rektangel med färg baserat på antal observationer
   Object.keys(gridCounter).forEach(key => {
      if (mittLaddningsId !== nuvarandeLaddningsId) return;

      const [latStr, lonStr] = key.split(',');
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const antalObs = gridCounter[key];

      const cellBounds = [
         [lat, lon],
         [lat + gridSize, lon + gridSize]
      ];

      let färg = "#f5d3a8";
      if (antalObs > limit1 && antalObs <= limit2) {
         färg = "#e67e66";
      } else if (antalObs > limit2) {
         färg = "#b83b43";
      }

      const rectangle = L.rectangle(cellBounds, {
         color: "#444444",
         weight: 1,
         fillColor: färg,
         fillOpacity: 0.75
      });

      /* rectangle.bindPopup(`<b>Här finns:</b> ${antalObs} st observationer.`);
      rectangle.on('click', function () {
         map.fitBounds(cellBounds);
      }); */

      // 1. Koppla popupen men säg till Leaflet att inte stänga den automatiskt vid andra klick om du vill ha den stabil
      rectangle.bindPopup(`<b>Här finns:</b> ${antalObs} st observationer.`, { closeButton: false });

      // 2. VISA popup när man håller musen över (Hover in)
      rectangle.on('mouseover', function (e) {
         this.openPopup();
      });

      // 3. DÖLJ popup när musen lämnar objektet (Hover out)
      rectangle.on('mouseout', function (e) {
         this.closePopup();
      });

      // 4. ZOOMA IN när man faktiskt KLICKAR på objektet
      rectangle.on('click', function () {
         map.fitBounds(cellBounds);
      });



      rectangle.addTo(gridLayer);
   });
}



// === UPPDATERAR LEGENDEN PÅ KARTAN ===
function uppdateraKartLegendUI(synligaPunkter) {
   const container = document.getElementById("live-counter-container");
   if (!container) return;

   // 1. Bygg räknaren HELT dynamiskt utifrån de arter som faktiskt skickas in!
   const räknare = {};
   synligaPunkter.forEach(pt => {
      if (!pt.artNamn) return;
      if (!räknare[pt.artNamn]) {
         räknare[pt.artNamn] = 0;
      }
      räknare[pt.artNamn]++;
   });

   let htmlInnehåll = "";

   // 2. Loopa igenom de djur vi faktiskt hittade
   Object.keys(räknare).forEach(art => {
      const antal = räknare[art];
      if (antal > 0) {
         // Gör om namnet till gemener och ta bort å,ä,ö för att matcha din filstruktur (t.ex. "Älg" -> "alg")

         const filnamn = skapaBildSlug(art);

         const ikonStig = `images/svg/${filnamn}.svg`;
         skapaLoggar(uppdateraKartLegendUI, 'info', `ikonStig: ${ikonStig}`);

         // 3. Lägg till HTML för varje art i räknaren
         htmlInnehåll += `
            <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: bold;">
               <img src="${ikonStig}" alt="${art}" onerror="this.src='images/svg/paw.svg';" style="width: 24px; height: 24px;" />
               <span>${art}: ${antal} st</span>
            </div>
         `;
      }
   });
   // 4. Om inga observationer hittades, visa ett meddelande
   if (htmlInnehåll === "") {
      htmlInnehåll = '<em style="color: #666; font-size: 13px;">Inga observationer i detta område.</em>';
   }

   container.innerHTML = htmlInnehåll;
}

// === LÄGGER TILL KLICKFUNKTION PÅ KARTAN ===
async function identifieraOchValjKommun(lat, lon) {
   const obsKommunSelect = document.getElementById("obsKommun");
   if (!obsKommunSelect) return;
   //console.log(`Försöker identifiera kommun för koordinater: ${lat}, ${lon}`);
   try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
         headers: { 'User-Agent': 'BastaKartanApplikation' }
      });
      const data = await response.json();
      //data.address innehåller information om kommunen, staden, länet etc.
      if (data && data.address) {
         let funnenKommun = data.address.municipality || data.address.city || data.address.town || "";
         //funnenKommun kan innehålla "kommun" eller "stad" i slutet, ta bort det
         if (funnenKommun) {
            funnenKommun = funnenKommun.replace(" kommun", "").replace(" stad", "").trim().toLowerCase();
            //matchr mot options i obsKommunSelect
            for (let i = 0; i < obsKommunSelect.options.length; i++) {
               const optionText = obsKommunSelect.options[i].text.toLowerCase();
               if (optionText.includes(funnenKommun)) {
                  obsKommunSelect.selectedIndex = i;
                  console.log(`🔮 Matchade automatiskt till kommun: ${obsKommunSelect.options[i].text}`);
                  break;
               }
            }
         }
      }
      //felmeddelande om ingen kommun hittades
   } catch (error) {
      console.warn("Kunde inte hämta kommun från koordinater:", error);
   }
}
//lägger till klickfunktion på kartan
export function laggTillKlickFunktion() {
   const mapAddClickStatus = document.getElementById("mapAddClickStatus");
   skapaLoggar(laggTillKlickFunktion, 'info', 'Klickfunktion på kartan körs.', mapAddClickStatus);
   // Kontrollera om kartan finns innan du lägger till klickfunktionen
   const mapContainer = document.getElementById("map");
   if (!mapContainer) return;
   // clickar på kartan för att få koordinater
   map.on('click', function (e) {
      const lat = e.latlng.lat.toFixed(6);
      const lon = e.latlng.lng.toFixed(6);

      const latInput = document.getElementById('latInput');
      const lonInput = document.getElementById('lonInput');

      if (latInput && lonInput) {
         latInput.value = lat;
         lonInput.value = lon;
      }
      // Identifiera och välj kommun baserat på klickade koordinater
      identifieraOchValjKommun(lat, lon);
      // Om markören redan finns, flytta den; annars skapa en ny markör
      if (marker) {
         marker.setLatLng(e.latlng);
      } else {
         marker = L.marker(e.latlng, { draggable: true }).addTo(map);
         // Lägg till drag-händelse för markören
         marker.on('drag', function () {
            const nuvarandePosition = marker.getLatLng();
            const dragLat = nuvarandePosition.lat.toFixed(6);
            const dragLon = nuvarandePosition.lng.toFixed(6);
            // Uppdatera input-fälten när markören dras
            if (latInput && lonInput) {
               latInput.value = dragLat;
               lonInput.value = dragLon;
            }
            // Uppdatera popup-innehållet medan markören dras
            marker.setPopupContent(`
               <div style="text-align: center; min-width: 120px;">
                  <span style="font-size:12px; font-weight:bold; color:#e78300;">📍 ${dragLat}, ${dragLon}</span>
               </div>
            `).openPopup();
         });
         // När markören släpps, identifiera kommunen och uppdatera popup-innehållet
         marker.on('dragend', function () {
            const slutligPosition = marker.getLatLng();
            const slutLat = slutligPosition.lat.toFixed(6);
            const slutLon = slutligPosition.lng.toFixed(6);

            identifieraOchValjKommun(slutLat, slutLon);
            // Uppdatera popup-innehållet när markören släpps
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
      // Uppdatera popup-innehållet direkt när markören placeras
      marker.bindPopup(`
         <div style="text-align: center;">
            <strong>Vald position</strong><br>
            <span style="font-size:11px; color:#666;">${lat}, ${lon}</span><br><br>
            <button id="openObsModalBtn" style="cursor:pointer; padding: 6px 10px; background: #e78300; color: white; border: none; border-radius: 4px; font-weight:bold;">
               🐾 Rapportera här
            </button>
         </div>
      `).openPopup();
      // Logga klicket i konsolen och i loggfilen
      skapaLoggar(laggTillKlickFunktion, 'info', `📍 Klickade på: ${lat}, ${lon}`);
   });
}
// -------------------------------------------------------


// === LÄGGER TILL MARKERING PÅ KARTAN ===
export function addObservationMarker(lat, lon, artNamn, datum) {
   if (!markerClusterGroup) return;

   // Standardikon om  som default direkt!
   let icon = pawIcon;
   // Dynamisk ikon baserat på artnamnet
   if (artNamn.includes('Varg')) icon = vargIcon;
   else if (artNamn.includes('Älg')) icon = algIcon;
   else if (artNamn.includes('Gråsäl')) icon = grasalIcon;
   else if (artNamn.includes('Grävling')) icon = gravlingIcon;
   else if (artNamn.includes('Räv')) icon = ravIcon;
   else if (artNamn.includes('Vildsvin')) icon = vildsvinIcon;
   else if (artNamn.includes('Rådjur')) icon = radjurIcon;
   else if (artNamn.includes('Bäver')) icon = baverIcon;
   else if (artNamn.includes('Björn')) icon = bjornIcon;
   else if (artNamn.includes('Kungsörn')) icon = kungsornIcon;

   const marker = L.marker([lat, lon], { icon });
   // Sätt en tillfällig popup som visar att data laddas
   marker.bindPopup(`
      <strong>${artNamn}</strong><br>
      📅 ${new Date(datum).toLocaleDateString('sv-SE')}<br>
      ⏳ Laddar data...
   `);
   // När popupen öppnas, hämta väder och wiki-data
   marker.on('popupopen', async function () {
      if (marker._loaded) return;
      marker._loaded = true;

      const vader = await hamtaVader(lat, lon, datum);
      const wiki = await hamtaWikiSammanfattning(artNamn);
      // Uppdatera popup-innehållet med väderdata
      marker.setPopupContent(`
         <strong>${artNamn}</strong><br>
         📅 ${new Date(datum).toLocaleDateString('sv-SE')}<br>
         <hr>
         ${vader ? `${vader.emoji} ${vader.temp}°C` : "❌ väder saknas"}
      `);
   });
   // Lägg till markören i markerClusterGroup istället för direkt på kartan
   markerClusterGroup.addLayer(marker);

   // 🔥 heatmap data
   allHeatPoints.push([lat, lon, 1]);
}
// -------------------------------------------------------






// === TAR BORT MARKERING PÅ KARTAN ===
export function clearObservationMarkers() {
   // 1. Rensa det vanliga markör-lagret som används vid hög zoom
   if (markerLayer) {
      markerLayer.clearLayers();
   }

   // 2. Rensa rutnätet som används vid låg zoom
   if (gridLayer) {
      gridLayer.clearLayers();
   }

   // 3. Om det finns ett påbörjat heatmap-lager, ta bort det från kartan
   if (heatLayer && map) {
      map.removeLayer(heatLayer);
      heatLayer = null;
   }
   allHeatPoints = [];

   // 4. Ta bort den tillfälliga orangea klick-markören (om användaren precis klickat ut en position)
   if (marker && map) {
      map.removeLayer(marker);
      marker = null;
   }
   // 5. loggar även markerClusterGroup
   console.log("🧹 Kartans lager har rensats och förberetts för ny data!");
}

//heatmap toggle
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

// === PROGRESS BAR ===
export function visaProgress(max) {
   skapaLoggar(visaProgress, 'start', `Visar progress bar: ${max}`);

   const el = document.getElementById("renderProgress");

   el.style.display = "flex";
   el.style.visibility = "visible";
   el.style.opacity = "1";
   el.style.pointerEvents = "auto";

   document.getElementById("progressFill").style.width = "0%";

   document.getElementById("renderText").textContent =
      `Laddar 0 / ${max} observationer...`;
}
//updaterar progress bar
export function uppdateraProgress(antal, max) {
   skapaLoggar(uppdateraProgress, 'start', `Uppdaterar progress: ${antal} / ${max}`);
   const procent = (antal / max) * 100;

   document
      .getElementById("progressFill")
      .style.width = procent + "%";

   document
      .getElementById("renderText")
      .textContent =
      `Laddar ${antal.toLocaleString()} / ${max.toLocaleString()} observationer...`;
}
//döljer progress bar
export function doljProgress() {
   skapaLoggar(doljProgress, 'ok', 'Döljer progress bar');

   const el = document.getElementById("renderProgress");

   if (!el) return;

   el.style.display = "none";
   el.style.visibility = "hidden";
   el.style.opacity = "0";
   el.style.pointerEvents = "none";
}

// -------------------------------------------------------
// === TAR EMOT FILTRERADE OBSERVATIONER OCH RITAR PÅ KARTAN ===
export function taEmotOchRitaObservationer(nyaPunkter) {
   if (nyaPunkter.length > 0) {
      console.log("🧐 RÅTT OBJEKT FRÅN FILTRET (Kolla vad artnamnet heter här):", nyaPunkter[0]);
   }

   currentFilteredPoints = nyaPunkter.map(pt => {
      // Lägg till eventuella kolumnnamn du ser i loggen här:
      const hittatNamn = pt.artNamn || pt.ArtNamn || pt.art_namn || pt.namn || pt.ArtNamnSvenska;
      //returnerar lat, lon, artNamn, datum och tid för varje observation
      return {
         lat: typeof pt.lat === 'number' ? pt.lat : parseFloat(pt.Latitude || pt.latitude || pt.latitud),
         lon: typeof pt.lon === 'number' ? pt.lon : parseFloat(pt.Longitude || pt.longitude || pt.longitud),
         artNamn: hittatNamn || "Okänt djur",
         datum: pt.datum || pt.Datum || null,
         tid: pt.tid || pt.Tid || null
      };
   }).filter(pt => !isNaN(pt.lat) && !isNaN(pt.lon));
   // updaterar vyn baserat på det nya området och de filtrerade punkterna
   uppdateraVynBaseratPaOmrade();
}