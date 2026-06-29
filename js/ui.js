// -------------------------------------------------------


// === SKAPA LOGG I CONSOLE OCH DIV-ELEMENT ===
export function skapaLoggar(text, statusElement) {
   // text = texten du vill skriva i loggen och på sidan
   // statusElement = (ID på elementet du vill skicka texten till) (jag har skapat flera divvar i HTML med olika Namn: lanStatus, obersvationStatus, kartaStatus)
   // -----------------------------------------------------
   // Lägg in dessa längst js-filen utanför denna funktion
   // const lanStatus = document.getElementById("lanStatus");
   // const observationStatus = document.getElementById('observationStatus');
   // const kartaStatus = document.getElementById('kartaStatus');
   // -----------------------------------------------------
   // Anropa så här från andra funktioner:
   // skapaLoggar("Laddar län...", lanStatus);
   // skapaLoggar("Sparar observation...", observationStatus);
   // skapaLoggar("Kartan är klar", kartaStatus);
   // -----------------------------------------------------
   // Då är det enklare att följa hur långt koden funka om det går fel nånstans.

   
   if (statusElement) {
      console.log(statusElement.id + ": " + text);
      document.getElementById(statusElement.textContent = text)
   } else {
      console.log(text);
   }
}