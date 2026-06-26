// -------------------------------------------------------

// #region === KOPPLA ELEMENT I HTML ===
const kommunStatus = document.getElementById("kommunStatus");
const observationStatus = document.getElementById('observationStatus');
const kartaStatus = document.getElementById('kartaStatus');
// -------------------------------------------------------
// #endregion


// #region === STATE - GLOBALA VARIABLER ===
/* Vilken information behöver programmet komma ihåg? */
let map;
let marker = null;
let observationMarkers = [];
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



// === Skapa loggar ===
function skapaLoggar(text, statusElement) {
   // text = texten du vill skriva i loggen och på sidan
   // statusElement = (ID på elementet du vill skicka texten till) (jag har skapat flera divvar i HTML med olika Namn: kommunStatus, obersvationStatus, kartaStatus)
   // -----------------------------------------------------
   // Lägg in dessa längst js-filen utanför denna funktion
   // const kommunStatus = document.getElementById("kommunStatus");
   // const observationStatus = document.getElementById('observationStatus');
   // const kartaStatus = document.getElementById('kartaStatus');
   // -----------------------------------------------------
   // Anropa så här från andra funktioner:
   // skapaLoggar("Laddar kommuner...", kommunStatus);
   // skapaLoggar("Sparar observation...", observationStatus);
   // skapaLoggar("Kartan är klar", kartaStatus);
   // -----------------------------------------------------
   // Då är det enklare att följa hur långt koden funka om det går fel nånstans.

   console.log(text);
   if (statusElement) {
      document.getElementById(statusElement.textContent = text)
   }
}
// -------------------------------------------------------
// #endregion





// #region STARTUP
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

