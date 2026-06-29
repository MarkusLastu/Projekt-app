// -------------------------------------------------------


// === SKAPA LOGG I CONSOLE OCH DIV-ELEMENT ===
export function skapaLoggar(fn, status, text, statusElement) {
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

   let fnText = fn?.name || fn;
   let ikon = '';

   if (status === "start") {
      ikon = '🔄 ';
   } else if (status === "ok") {
      ikon = '✅ ';
   } else if (status === "fel") {
      ikon = '❌ ';
   } else {
      ikon = 'ℹ️ ';
   }

   const logg = `${ikon} [${fnText}] ${text}`;

   // Fler ikoner vi kan använda om vi vill
   // 🔄 Startar / laddar
   // ⏳ Väntar
   // ✅ Ok
   // ⚠️ Varning
   // ❌ Fel
   // ℹ️ Information
   // 🚀 Startar appen
   // 📡 API-anrop
   // 💾 Databas
   // 🗺️ Karta
   // 🌐 Nätverk
   // 🔍 Visar

   if (statusElement) {
      console.log(logg);
      document.getElementById(statusElement.textContent = logg)
   } else {
      console.log(logg);
   }
}