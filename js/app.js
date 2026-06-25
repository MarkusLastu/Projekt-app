

// #region ELEMENT
/* Här hämtar du allt från HTML. */

const button = document.getElementById("x");
const buttons = document.querySelectorAll("y");

// #endregion

// #region STATE
/* Vilken information behöver programmet komma ihåg? */

let globalVariable = null;

// #endregion

// #region EVENT LISTENERS
/* Här kopplar du alla lyssnare. */

button.addEventListener("click", function (inputValue) {
   console.log(inputValue);
});

button.addEventListener("click", funcionName());
// #endregion

// #region FUNCTIONS
/* Här ligger all logik. */
 
// === Logga progress ===
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

// #endregion

// #region STARTUP
/* Kod som ska köras när sidan laddas. */



// #endregion

