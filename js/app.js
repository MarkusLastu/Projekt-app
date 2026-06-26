// -------------------------------------------------------

// #region === KOPPLA ELEMENT I HTML ===
const kommunStatus = document.getElementById("kommunStatus");
const observationStatus = document.getElementById('observationStatus');
const kartaStatus = document.getElementById('kartaStatus');

// -------------------------------------------------------
// #endregion


// #region === STATE - GLOBALA VARIABLER ===
/* Vilken information behöver programmet komma ihåg? */


// -------------------------------------------------------
// #endregion




// #region FUNCTIONS
/* Här ligger all logik. */

async function uppdateraDashboard(lanNamn) {
   // Kör alla tre samtidigt!
   const wikiData = await hamtaWikiSammanfattning(lanNamn);
   const vaderData = await hamtaVader(lanNamn);
   const bildData = await hamtaBakgrundsbild(lanNamn);
}

// Anropa väder funktion
async function visaVaderForObservation(lat, lon) {
   const vader = await hamtaVader(lat, lon);

   if (vader) {
      console.log(`Det är ${vader.temp}°C och ${vader.beskrivning} där! ${vader.emoji}`);
      // Här kan ni skriva ut det i er statistikruta, t.ex:
      // document.getElementById('vaderRuta').innerHTML = `${vader.emoji} ${vader.temp}°C (${vader.beskrivning})`;
   }
}

// -------------------------------------------------------
// #endregion





// #region STARTUP
/* Kod som ska köras när sidan laddas. */

import * as ui from "./ui.js";
import * as database from "./database.js";
import * as map from "./map.js";
import * as api from "./api.js";
import * as components from "./components.js";

document.addEventListener('DOMContentLoaded', function () {
   ui.skapaLoggar('🚀 Appen startar...');

   document.getElementById("nav").innerHTML = components.nav;
   document.getElementById("footer").innerHTML = components.footer;

   // 1. Skapa kartan med OSM-bakgrund
   map.skapaKarta();

   // 2. Lägg till klick-funktionalitet
   map.laggTillKlickFunktion();

   // 3. Ladda data från Supsabase

   database.laddaKommuner();
   database.laddaObservationer();

   // 4. Event listeners
   // document.getElementById('sparaBtn').addEventListener('click', sparaObservation);
});






// #endregion

