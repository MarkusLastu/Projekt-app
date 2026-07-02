// -------------------------------------------------------

// === KOPPLAR TILL ANDRA JS-FILER ===

export let currentEditItem = null;



// -------------------------------------------------------


// === SKAPA LOGG I CONSOLE OCH DIV-ELEMENT ===
export function skapaLoggar(fn, status, text, statusElement) {
   // fn = (namnet på funktionen som anropar denna logg-funktion / textsträng som beskriver flödet
   // status = (start, ok, fel, info) beroende på vad som händer i koden
   // text = texten du vill skriva i loggen och på sidan
   // statusElement = (ID på elementet du vill skicka texten till (ej obligatoriskt)
   
   let fnText = fn?.name || fn;
   let ikon = '';

   if (status === "start") {
      ikon = '🔄 ';
   } else if (status === "ok") {
      ikon = '✅ ';
   } else if (status === "fel") {
      ikon = '❌ ';
   } else if (status === "varning") {
      ikon = '⚠️ ';
   } else {
      ikon = 'ℹ️ ';
   }

   const logg = `${ikon} [${fnText}] ${text}`;

   if (statusElement) {
      console.log(logg);
      statusElement.textContent = logg;
} else {
   console.log(logg);
}
}


// === VISA PROJEKTINFO  ===

// ikoner för status
const ikon = {
   ok: "🟢",
   pagar: "🟡",
   ej: "🔴",
   borttagen: "❌"
};

// rubrik för olika typer av uppgifter
const rubrik = {
   krav: "📌 Obligatoriska krav",
   extra: "🚀 Extra utmaningar",
   nice: "✨ Nice to have",
   bug: "🐛 Buggar"
};


// === Renderar lista från databasen ===
export function renderProjektStatusUI(lista) {

   const container =
      document.getElementById("projektStatusContainer");

   if (!container) return;

   container.innerHTML = "";

   const grupper = {};
// Gruppera uppgifterna efter typ
   lista.forEach(item => {
      if (!grupper[item.typ]) grupper[item.typ] = [];
      grupper[item.typ].push(item);
   });
   // Loopa igenom grupperna och rendera varje typ med dess uppgifter
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

// === Hanterar modalt fönster för att lägga till ny uppgift ===
export function openAddModal() {

   document.getElementById("addTyp").value = "krav";
   document.getElementById("addStatus").value = "ej";
   document.getElementById("addUppgift").value = "";
   document.getElementById("addKommentar").value = "";

   document.getElementById("addModal").classList.remove("hidden");
}
// === Stänger modalt fönster för att lägga till ny uppgift ===
export function closeAddModal() {
   document.getElementById("addModal").classList.add("hidden");
}

// === Öppnar modalt fönster för att ändra uppgift ===
export function openEditModal(item) {

   currentEditItem = item;

   document.getElementById("editTyp").value = item.typ;
   document.getElementById("editStatus").value = item.status;
   document.getElementById("editUppgift").value = item.uppgift;
   document.getElementById("editKommentar").value = item.kommentar;

   document.getElementById("editModal")
      .classList.remove("hidden");
}
// === Stänger modalt fönster för att ändra uppgift ===
export function closeModal() {

   document.getElementById("editModal")
      .classList.add("hidden");
}


// Renderar filter för arter i UI
export function renderaArterFilter(arterLista) {
   const container = document.getElementById("arterFilterGroup");
   if (!container) return;

   // Töm behållaren men behåll "Markera alla" i toppen
   container.innerHTML = `
      <label class="art-checkbox">
         <input type="checkbox" id="markeraAlla">
         <span>🌟 Markera alla</span>
      </label>
   `;

   // Loopa ut arterna från databasen
   arterLista.forEach(art => {
      // Gör om t.ex. "Gråsäl" till "grasal" för att matcha din filstruktur
      const svgNamn = art.ArtNamn.toLowerCase()
         .replace(/ä/g, 'a')
         .replace(/å/g, 'a')
         .replace(/ö/g, 'o')
         .replace(/\s+/g, ''); // Tar bort eventuella mellanslag

      const label = document.createElement("label");
      
      // Vi sätter data-latin direkt på ljudknappen så Freesound vet vad den ska söka på!
      label.innerHTML = `
         <input type="checkbox" class="art-checkbox" value="${art.Art_id}">
         <img src="images/svg/${svgNamn}.svg" alt="${art.ArtNamn}" class="icon-small" onerror="this.src='images/svg/paw.svg'">
         <span>${art.ArtNamn}</span>
         <button type="button" class="sound-btn" data-art-id="${art.Art_id}" data-latin="${art.VetenskapligtNamn || ''}">🔊</button>
      `;
      container.appendChild(label);
   });
}