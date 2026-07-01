// -------------------------------------------------------

// === KOPPLAR TILL ANDRA JS-FILER ===

export let currentEditItem = null;



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
      statusElement.textContent = logg;
} else {
   console.log(logg);
}
}


// === VISA PROJEKTINFO  ===

const ikon = {
   ok: "🟢",
   pagar: "🟡",
   ej: "🔴"
};

const rubrik = {
   krav: "📌 Obligatoriska krav",
   extra: "🚀 Extra utmaningar",
   nice: "✨ Nice to have",
   bug: "🐛 Buggar"
};






// === GENERERAR LISTA I HTML FRÅN DATABASEN ===
// ==========================
// RENDER UI
// ==========================
export function renderProjektStatusUI(lista) {

   const container =
      document.getElementById("projektStatusContainer");

   if (!container) return;

   container.innerHTML = "";

   const grupper = {};

   lista.forEach(item => {
      if (!grupper[item.typ]) grupper[item.typ] = [];
      grupper[item.typ].push(item);
   });

   Object.keys(grupper).forEach(typ => {

      const block = document.createElement("div");
      block.className = "filter-group";

      const title = document.createElement("span");
      title.className = "filter-title";
      title.textContent = rubrik[typ] || typ;

      block.appendChild(title);

      grupper[typ].forEach(item => {

         const row = document.createElement("div");
         row.className = "status-row clickable";

         row.addEventListener("click", () =>
            openEditModal(item)
         );

         row.innerHTML = `
            <span class="col-status">
               ${ikon[item.status] || "⚪"}
            </span>

            <div class="col-main">
               <div class="col-uppgift">${item.uppgift}</div>
               <div class="col-kommentar">${item.kommentar || ""}</div>
            </div>
         `;

         block.appendChild(row);
      });

      container.appendChild(block);
   });
}

// ==========================
// MODAL OPEN
// ==========================
export function openAddModal() {

   document.getElementById("addTyp").value = "krav";
   document.getElementById("addStatus").value = "ej";
   document.getElementById("addUppgift").value = "";
   document.getElementById("addKommentar").value = "";

   document.getElementById("addModal").classList.remove("hidden");
}

export function closeAddModal() {
   document.getElementById("addModal").classList.add("hidden");
}


export function openEditModal(item) {

   currentEditItem = item;

   document.getElementById("editTyp").value = item.typ;
   document.getElementById("editStatus").value = item.status;
   document.getElementById("editUppgift").value = item.uppgift;
   document.getElementById("editKommentar").value = item.kommentar;

   document.getElementById("editModal")
      .classList.remove("hidden");
}

export function closeModal() {

   document.getElementById("editModal")
      .classList.add("hidden");
}
