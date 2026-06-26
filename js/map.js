// -------------------------------------------------------


// === KOPPLAR TILL ANDRA JS-FILER ===
import { skapaLoggar } from "./ui.js";


// -------------------------------------------------------

// === KONSTANTER OCH VARIABLER ===
let map;
let marker = null;
let observationMarkers = [];

// -------------------------------------------------------

// === SKAPA KARTAN ===

export function skapaKarta() {

   const mapCreateStatus = document.getElementById("mapCreateStatus");

   // Skapar kartan och centrerar över Gävle
   skapaLoggar("Laddar kartan...", mapCreateStatus);

   map = L.map('map').setView([61.5, 16.5], 8);

   // Lägg till OpenStreeMap-bakgrund
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>contributors',
      maxZoom: 19,
   }).addTo(map);

   // Lägg till zoom-kontroller
   L.control.zoom({ position: 'topleft' }).addTo(map);

   // Lägg till skala
   L.control.scale({ position: 'bottomright' }).addTo(map);

   skapaLoggar('🗺️ Zoom och skala tillagd på kartan');

   skapaLoggar('🗺️ Karta skapad med OpenStreetMap', mapCreateStatus);

   return map;
}
// -------------------------------------------------------


// === LÄGGER TILL KLICK-FUNKTION PÅ KARTAN ===
// === När användaren klickar fylls koordinaterna i formuläret ===
export function laggTillKlickFunktion() {
   const mapAddClickStatus = document.getElementById("mapAddClickStatus");
   skapaLoggar('Klickfunktion på kartan körs.', mapAddClickStatus);

   map.on('click', function (e) {
      const lat = e.latlng.lat.toFixed(6);
      const lon = e.latlng.lng.toFixed(6);

      document.getElementById('latInput').value = lat;
      document.getElementById('lonInput').value = lon;
      // Sätt eller flytta markör
      if (marker) {
         marker.setLatLng(e.latlng);
      } else {
         marker = L.marker(e.latlng).addTo(map);
      }
      skapaLoggar(`📍 Klickade på: ${lat}, ${lon}`);
   });
}
// -------------------------------------------------------


// === LÄGGER TILL MARKERING PÅ KARTAN ===
   

function addObservationMarker(lat, lon, artNamn, antal, datum) {   
   const popupContent = `
        <strong>${artNamn}</strong><br>
        📅 ${new Date(datum).toLocaleDateString('sv-SE')}<br>
        📍 ${lat}, ${lon}
    `;
   const marker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(popupContent);
   observationMarkers.push(marker);
}
// -------------------------------------------------------


// === TAR BORT MARKERING PÅ KARTAN ===
function clearObservationMarkers() {
   observationMarkers.forEach(m => map.removeLayer(m));
   observationMarkers = [];
}

// Ta bort tillfällig markör från kartan
if (marker) {
   map.removeLayer(marker);
   marker = null;
}
// -------------------------------------------------------


