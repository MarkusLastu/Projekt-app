// -------------------------------------------------------

// #region === KOPPLA ELEMENT I HTML ===
/* Här hämtar du allt från HTML. */
const kommunStatus = document.getElementById("kommunStatus");
const observationStatus = document.getElementById('observationStatus');
const kartaStatus = document.getElementById('kartaStatus');

// #endregion

// #region === STATE - GLOBALA VARIABLER ===
/* Vilken information behöver programmet komma ihåg? */
let map;
let marker = null;
let observationMarkers = [];

// #endregion

// #region === STARTUP ===
/* Kod som ska köras när sidan laddas. */

document.addEventListener('DOMContentLoaded', function () {
   skapaLoggar('🚀 Appen startar...');

   // 1. Skapa kartan med OSM-bakgrund
   skapaKarta();

   // 2. Lägg till klick-funktionalitet
   laggTillKlickFunktion();

   // 3. Ladda data från Supsabase

   laddaKommuner();
   laddaObservationer();

   // 4. Event listeners
   document.getElementById('sparaBtn').addEventListener('click', sparaObservation);
});

// #endregion

