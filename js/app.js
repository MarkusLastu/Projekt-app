// -------------------------------------------------------

import * as ui from "./ui.js";
import * as database from "./database.js";
import * as mapModul from "./map.js";
import * as api from "./api.js";
import * as components from "./components.js";

import { allaObservationer, allRegionData } from "./database.js";


// #region === KOPPLA ELEMENT I HTML ===
const lanStatus = document.getElementById("dbLanStatus");
const observationStatus = document.getElementById('dbObservationStatus');
const kartaStatus = document.getElementById('dbKartaStatus');
const sliderMin = document.getElementById('timeSliderMin');
const sliderMax = document.getElementById('timeSliderMax');
const periodText = document.getElementById('periodText');
const themeToggle = document.getElementById("themeToggle");

const vargSvg = new Image(22, 22); vargSvg.src = 'images/svg/varg.svg';
const algSvg = new Image(22, 22); algSvg.src = 'images/svg/alg.svg';
const radjurSvg = new Image(22, 22); radjurSvg.src = 'images/svg/radjur.svg';
const grasalSvg = new Image(22, 22); grasalSvg.src = 'images/svg/grasal.svg';
const gravlingSvg = new Image(22, 22); gravlingSvg.src = 'images/svg/gravling.svg';
const kungsornSvg = new Image(22, 22); kungsornSvg.src = 'images/svg/kungsorn.svg';
const ravSvg = new Image(22, 22); ravSvg.src = 'images/svg/rav.svg';
const vildsvinSvg = new Image(22, 22); vildsvinSvg.src = 'images/svg/vildsvin.svg';
// -------------------------------------------------------
// #endregion


// #region === STATE - GLOBALA VARIABLER ===
/* Vilken information behöver programmet komma ihåg? */
let trendsChart = null;
let nuvarandeLjud = null;
let currentRenderId = 0; // Håller koll på vilken filtreringsrunda som är den absolut senaste
// -------------------------------------------------------
// #endregion



// #region FUNCTIONS
/* Här ligger all logik. */

// Hjälpfunktion: Översätter ett index (0-20) till en läsbar text
function indexTillText(index) {
   const startAr = 2016;
   const totaltAntalHalvar = parseInt(index);
   const ar = startAr + Math.floor(totaltAntalHalvar / 2);
   const ärAndraHalvåret = totaltAntalHalvar % 2 !== 0;
   return `${ar} ${ärAndraHalvåret ? "H2" : "H1"}`;
}

// Hjälpfunktion: Räknar ut vilket index (0-20) ett specifikt datum har
function hamtaIndexFranDatum(datumStr) {
   const d = new Date(datumStr);
   const ar = d.getFullYear();
   const isH2 = d.getMonth() >= 6; // juli-december
   return (ar - 2016) * 2 + (isH2 ? 1 : 0);
}


// Hjälpfunktion: Skapar en "slug" för bildnamn baserat på artnamnet
function skapaBildSlug(text) {
   if (!text) return "paw";
   return text
      .toLowerCase()
      .replace(/å/g, "a")
      .replace(/ä/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]/g, ""); // Tar bort eventuella kvarvarande konstiga tecken eller mellanslag
}


// Uppdaterar linjegrafen (visar alltid hela 2016-2026 baserat på valda arter)
export function uppdateraGraf(valdaArtIds = [], filtreradData = []) {
   const canvas = document.getElementById('trendsChart');
   if (!canvas || typeof canvas.getContext !== 'function') {
      console.log("📊 Grafmodulen hoppades över (trendsChart saknas eller är inte en canvas på denna sida).");
      return;
   }

   const ctx = canvas.getContext('2d');

   const minInput = document.getElementById('dateMin')?.value;
   const maxInput = document.getElementById('dateMax')?.value;
   const startDatumStr = minInput || "2026-01-01";
   const slutDatumStr = maxInput || new Date().toISOString().split('T')[0];

   const tidsEtiketter = genereraDatumIntervall(startDatumStr, slutDatumStr);

   const fargPalett = ["#88919c", "#884303", "#e78300", "#00a0e3", "#6b4c3b", "#c0c0c0", "#8B4513", "#2e7d32", "#c62828", "#1565c0"];

   const snyggArtInfo = {};
   valdaArtIds.forEach((artId, index) => {
      const cb = document.querySelector(`#arterFilterGroup input[value="${artId}"]`);
      let namn = `Art ${artId}`;

      if (cb) {
         const labelParent = cb.closest('label');
         if (labelParent) {
            namn = labelParent.textContent.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
         }
      }

      const farg = fargPalett[index % fargPalett.length];

      // 🌟 DYNAMISK IKON-LOGIK 🌟
      // 1. Skapa filnamnet baserat på det tvättade artnamnet (t.ex. "grasal")
      const slug = skapaBildSlug(namn);

      // 2. Skapa ett Image-objekt som Chart.js kan använda som punktstil
      const ikonImg = new Image(20, 20);
      ikonImg.src = `images/svg/${slug}.svg`;

      // 3. Fallback: Om bilden inte hittas på servern, ladda paw.svg istället
      ikonImg.onerror = function () {
         if (this.src !== 'images/svg/paw.svg') {
            this.src = 'images/svg/paw.svg';
         }
      };

      snyggArtInfo[artId] = {
         namn: namn,
         färg: farg,
         ikon: ikonImg // Spara bildobjektet här!
      };
   });

   // 4. Skapa datasets baserat på tidsaxeln
   const nyaDatasets = valdaArtIds.map(artId => {
      const artInfo = snyggArtInfo[artId];

      const artData = filtreradData.filter(obs => {
         const nuvarandeArtId = typeof obs.Art_id !== 'undefined' ? obs.Art_id : obs.art_id;
         return parseInt(nuvarandeArtId) === artId;
      });

      const punkterData = tidsEtiketter.map(datum => {
         return artData.filter(obs => {
            const obsDatum = obs.Datum || obs.datum;
            return obsDatum === datum;
         }).length;
      });

      const totaltAntal = artData.length;

      return {
         label: `${artInfo.namn} (${totaltAntal} st)`,
         data: punkterData,
         backgroundColor: artInfo.färg + "22",
         borderColor: artInfo.färg,
         borderWidth: 3,
         tension: 0.3,
         fill: true,

         // 🌟 BERÄTTA FÖR CHART.JS ATT ANVÄNDA IKONEN 🌟
         pointStyle: artInfo.ikon,
         pointRadius: 6,      // Storlek på ikonen i själva graf-punkterna
         pointHoverRadius: 8
      };
   });

   // 5. Uppdatera eller rita grafen
   if (trendsChart) {
      trendsChart.data.labels = tidsEtiketter;
      trendsChart.data.datasets = nyaDatasets;
      trendsChart.update();
   } else {
      trendsChart = new Chart(ctx, {
         type: 'line',
         data: { labels: tidsEtiketter, datasets: nyaDatasets },
         options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
               legend: {
                  labels: {
                     usePointStyle: true // 🌟 Tvingar förklaringen (legenden) högst upp att visa ikonerna också!
                  }
               }
            },
            scales: {
               x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
               y: { beginAtZero: true, ticks: { precision: 0 } }
            }
         }
      });
   }
}


// 🛠️ Hjälpfunktion för att bygga listan med datum (X-axeln)
function genereraDatumIntervall(startStr, slutStr) {
   const datumLista = [];
   let nuvarande = new Date(startStr);
   const slut = new Date(slutStr);

   // Säkerhetsspärr ifall datumen är helt galna
   let maxLoop = 0;

   while (nuvarande <= slut && maxLoop < 366) {
      datumLista.push(nuvarande.toISOString().split('T')[0]);
      nuvarande.setDate(nuvarande.getDate() + 1); // Gå till nästa dag
      maxLoop++;
   }
   return datumLista;
}

export function uppdateraKartaEfterFilter() {
   if (!allaObservationer || allaObservationer.length === 0) return;

   const valtLan = document.getElementById('lanFilter')?.value || "alla";
   const valtKommun = document.getElementById('kommunFilter')?.value || "alla";
   const valtTidsdygn = document.getElementById('timePresetSelect')?.value || "all";

   // 1. Hitta ALLA inputs i gruppen (oberoende av om klassen ligger på label eller input)
   const allaArtCheckboxar = document.querySelectorAll('#arterFilterGroup input[type="checkbox"]');

   console.log(`🔍 Hittade ${allaArtCheckboxar.length} st checkboxar i DOM:en.`);

   // 2. Bygg ordlistan
   const artNamnOrdlista = {};
   allaArtCheckboxar.forEach(cb => {
      if (cb.id === "markeraAlla") return;

      // Hämta texten: Prova först om texten ligger i en förälder-label, annars i ett span, annars direkt på värdet
      let labelText = "";
      const labelParent = cb.closest('label');
      if (labelParent) {
         labelText = labelParent.textContent;
      } else {
         // Fallback om label ligger bredvid
         const tillhorandeLabel = document.querySelector(`label[for="${cb.id}"]`);
         if (tillhorandeLabel) labelText = tillhorandeLabel.textContent;
      }

      // Tvätta bort eventuella emojis och spara
      const artNamn = labelText.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();

      if (cb.value && artNamn) {
         artNamnOrdlista[parseInt(cb.value)] = artNamn;
      }
   });

   console.log("🗺️ Dynamisk art-ordlista som skapades från ditt GUI:", artNamnOrdlista);

   // 3. Hämta de ikryssade ID:na
   const valdaArtIds = [];
   allaArtCheckboxar.forEach(cb => {
      if (cb.id !== "markeraAlla" && cb.checked) {
         valdaArtIds.push(parseInt(cb.value));
      }
   });

   console.log(`✅ Ikryssade Art-ID:n just nu:`, valdaArtIds);

   // Om inget är ikryssat, rensa och stäng av
   if (valdaArtIds.length === 0) {
      console.warn("⚠️ Inga djur är ikryssade. Tömmer kartan.");
      // 1. Töm kartan (din gamla rad)
      mapModul.taEmotOchRitaObservationer([]);
      // 2. Töm grafen live! (Skicka in tomma arrayer)
      if (typeof uppdateraGraf === "function") {
         uppdateraGraf([], []);
      }
      return;
   }

   // 4. Kör filtreringen
   let filtrerade = allaObservationer.filter(obs => {
      const nuvarandeArtId = typeof obs.Art_id !== 'undefined' ? obs.Art_id : obs.art_id;
      const nuvarandeKommunId = typeof obs.Kommun_id !== 'undefined' ? obs.Kommun_id : obs.kommun_id;
      const faktisktDatum = obs.Datum || obs.datum;
      const faktisktTid = obs.Tid || obs.tid;

      const artMatch = valdaArtIds.includes(parseInt(nuvarandeArtId));

      const kommunInfo = allRegionData.find(r => {
         const rKommunId = typeof r.kommun_id !== 'undefined' ? r.kommun_id : r.Kommun_id;
         return parseInt(rKommunId) === parseInt(nuvarandeKommunId);
      });

      const lanMatch = (valtLan === "alla" || (kommunInfo && (kommunInfo.lan_namn === valtLan || kommunInfo.Lan_namn === valtLan)));
      const kommunMatch = (valtKommun === "alla" || valtKommun === "" || (kommunInfo && (kommunInfo.kommun_namn === valtKommun || kommunInfo.Kommun_namn === valtKommun)));

      //1. Datumfilter
      const filterMin = document.getElementById('dateMin')?.value;
      const filterMax = document.getElementById('dateMax')?.value;
      const datumMatch = (!filterMin || faktisktDatum >= filterMin) && (!filterMax || faktisktDatum <= filterMax);

      // 2. Klockslagfilter
      let klockanMatch = true;
      if (valtTidsdygn !== "all" && faktisktTid) {
         // Vi plockar ut bara timmen (t.ex. 23 från "23:15") för att göra enklare jämförelser
         const timme = parseInt(faktisktTid.split(':')[0]);

         if (valtTidsdygn === "night") {
            // Natten sträcker sig över tolvslaget (22:00 till 05:00)
            klockanMatch = (timme >= 22 || timme < 5);
         } else if (valtTidsdygn === "morning") {
            klockanMatch = (timme >= 5 && timme < 9);
         } else if (valtTidsdygn === "day") {
            klockanMatch = (timme >= 9 && timme < 18);
         } else if (valtTidsdygn === "evening") {
            klockanMatch = (timme >= 18 && timme < 22);
         }
      }

      const skaBehallas = artMatch && lanMatch && kommunMatch && datumMatch && klockanMatch;

      if (skaBehallas) {
         obs.artNamn = artNamnOrdlista[parseInt(nuvarandeArtId)] || "Okänt djur";
      }

      return skaBehallas;
   });

   console.log(`🎯 Matchningar hittade efter filter (inkl. tid): ${filtrerade.length}`);
   mapModul.taEmotOchRitaObservationer(filtrerade);
   if (typeof uppdateraGraf === "function") {
      uppdateraGraf(valdaArtIds, filtrerade);
   }
}

let debounceTimer;

function debouncedUppdateraKarta() {
   clearTimeout(debounceTimer);
   debounceTimer = setTimeout(() => {
      uppdateraKartaEfterFilter();
   }, 200); // Väntar 200ms efter att användaren slutat dra i slidern
}

async function uppdateraDashboard(lanNamn) {
   // Kör alla tre samtidigt!
   const wikiData = await api.hamtaWikiSammanfattning(lanNamn);
   const vaderData = await api.hamtaVader(lanNamn);
   const bildData = await api.hamtaBakgrundsbild(lanNamn);
}

// Anropa väder funktion
async function visaVaderForObservation(lat, lon) {
   const vader = await hamtaVader(lat, lon);

   if (vader) {
      mapModul.skapaLoggar(visaVaderForObservation, 'ok', `Det är ${vader.temp}°C och ${vader.beskrivning} där! ${vader.emoji}`)

      // Här kan ni skriva ut det i er statistikruta, t.ex:
      // document.getElementById('vaderRuta').innerHTML = `${vader.emoji} ${vader.temp}°C (${vader.beskrivning})`;
   }
}

async function loadProjektStatus() {
   const data = await database.refreshProjektStatus();
   ui.renderProjektStatusUI(data);
}




function filtreraData() {
   const valtLan = document.getElementById('lanFilter').value;
   const valtKommun = document.getElementById('kommunFilter').value;

   // 1. Börja med alla observationer
   let filtreradLista = allaObservationer;

   // 2. Filtrera på län om inte "alla" är valt
   if (valtLan !== 'alla') {
      filtreradLista = filtreradLista.filter(obs => obs.lan_namn === valtLan);
   }

   // 3. Filtrera på kommun om inte "alla" är valt
   if (valtKommun !== 'alla') {
      filtreradLista = filtreradLista.filter(obs => obs.kommun_namn === valtKommun);
   }

   // 4. Skicka den filtrerade listan till din kart-funktion
   // Istället för att använda din globala 'allaObservationer', 
   // skickar du in denna lokala lista:
   uppdateraKartaEfterFilter(filtreradLista);
}

// -------------------------------------------------------
// #endregion


document.addEventListener('DOMContentLoaded', async function () {
   ui.skapaLoggar('DOMContentLoaded', 'start', 'Appen startar...');

   // === Tema knappen ===
   const sparatTema = localStorage.getItem("tema");
   if (sparatTema === "dark") {
      document.body.classList.add("dark-mode");
   }

   // Säkra themeToggle om den flyttas/saknas på någon sida
   const themeToggleBtn = document.getElementById("themeToggle") || (typeof themeToggle !== 'undefined' ? themeToggle : null);
   if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
         document.body.classList.toggle("dark-mode");
         components.updateThemeButton();

         if (document.body.classList.contains("dark-mode")) {
            localStorage.setItem("tema", "dark");
         } else {
            localStorage.setItem("tema", "light");
         }
         components.updateThemeButton();
      });
   }

   // Körs när sidan laddas
   if (components && typeof components.updateThemeButton === 'function') {
      components.updateThemeButton();
   }

   // === RENDERA GLOBAL MENY & FOOTER ===
   const navContainer = document.getElementById("nav");
   if (navContainer) {
      navContainer.innerHTML = components.nav;
   }

   const footerContainer = document.getElementById("footer");
   if (footerContainer) {
      footerContainer.innerHTML = components.footer;
   }



   // === PROJEKTINFO-SIDAN ===
   // Kör bara detta om vi faktiskt kan ladda projektstatus (funktionen existerar och vi har tabellen/vyn)
   if (typeof loadProjektStatus === 'function') {
      try {
         await loadProjektStatus();
      } catch (e) {
         console.log("Kunde inte ladda projektstatus (kanske inte på rätt sida):", e.message);
      }
   }

   const closeBtn = document.getElementById("closeEditBtn");
   if (closeBtn) {
      closeBtn.addEventListener("click", () => {
         ui.closeModal();
      });
   }

   const saveBtn = document.getElementById("saveEditBtn");
   if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
         await database.uppdateraProjektStatus({
            projektstatus_id: ui.currentEditItem.projektstatus_id,
            typ: document.getElementById("editTyp").value,
            status: document.getElementById("editStatus").value,
            uppgift: document.getElementById("editUppgift").value,
            kommentar: document.getElementById("editKommentar").value
         });
         document.getElementById("editModal").classList.add("hidden");
         await loadProjektStatus();
      });
   }

   const addBtn = document.getElementById("addBtn");
   const closeAddBtn = document.getElementById("closeAddBtn");
   const saveAddBtn = document.getElementById("saveAddBtn");

   if (addBtn) {
      addBtn.addEventListener("click", () => { ui.openAddModal(); });
   }
   if (closeAddBtn) {
      closeAddBtn.addEventListener("click", () => { ui.closeAddModal(); });
   }
   if (saveAddBtn) {
      saveAddBtn.addEventListener("click", async () => {
         const typ = document.getElementById("addTyp").value;
         const status = document.getElementById("addStatus").value;
         const uppgift = document.getElementById("addUppgift").value;
         const kommentar = document.getElementById("addKommentar").value;

         await database.insertProjektStatus(typ, status, uppgift, kommentar);
         ui.closeAddModal();
         await loadProjektStatus();
      });
   }

   const deleteEditBtn = document.getElementById("deleteEditBtn");
   if (deleteEditBtn) {
      deleteEditBtn.addEventListener("click", async () => {
         const konfirmera = confirm("Är du säker på att du vill ta bort den här uppgiften?");
         if (konfirmera) {
            const id = ui.currentEditItem.projektstatus_id;
            const lyckades = await database.taBortProjektStatus(id);
            if (lyckades) {
               ui.closeModal();
               await loadProjektStatus();
            } else {
               alert("Det gick inte att ta bort uppgiften. Kolla RLS-policyn i Supabase.");
            }
         }
      });
   }

   // === LOGIK FÖR TIDSDYGN-FILTER ===
   const timePresetSelect = document.getElementById('timePresetSelect');
   if (timePresetSelect) {
      timePresetSelect.addEventListener('change', () => {
         if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
      });
   }

   // === LOGIK FÖR DROPDOWN TRIGER (DATE PRESET SELECT) ===
   const datePresetSelect = document.getElementById('datePresetSelect');
   const dateMinInput = document.getElementById('dateMin');
   const dateMaxInput = document.getElementById('dateMax');

   // === SÄTT STANDARDINTERVALL (30 DAGAR BAKÅT TILL IDAG) ===
   if (dateMinInput && dateMaxInput) {
      const idag = new Date();
      const idagStr = idag.toISOString().split('T')[0];
      const startDatum = new Date();
      startDatum.setDate(idag.getDate() - 30);

      const startStr = startDatum.toISOString().split('T')[0];

      dateMinInput.value = startStr;
      dateMaxInput.value = idagStr;

      if (datePresetSelect) {
         datePresetSelect.value = "30days";
      }
   }




   if (datePresetSelect && dateMinInput && dateMaxInput) {
      datePresetSelect.addEventListener('change', function () {
         const idag = new Date();
         const idagStr = idag.toISOString().split('T')[0];
         let startStr = "2016-01-01";

         const val = this.value;

         if (val === "30days") {
            const startDatum = new Date();
            startDatum.setDate(idag.getDate() - 30);
            startStr = startDatum.toISOString().split('T')[0];
         } else if (val === "current") {
            startStr = `${idag.getFullYear()}-01-01`;
         } else if (val === "previous") {
            const fofAr = idag.getFullYear() - 1;
            startStr = `${fofAr}-01-01`;
            dateMaxInput.value = `${fofAr}-12-31`;
            dateMinInput.value = startStr;
            if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
            return;
         } else if (val === "5years") {
            startStr = `${idag.getFullYear() - 5}-01-01`;
         } else if (val === "10years") {
            startStr = `${idag.getFullYear() - 10}-01-01`;
         } else if (val === "25years") {
            startStr = `${idag.getFullYear() - 25}-01-01`;
         } else if (val === "custom") {
            return;
         }

         dateMinInput.value = startStr;
         dateMaxInput.value = idagStr;
         if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
      });
   }





   // === HÄNDELSEHANTERARE FÖR SNABBKNAPPAR (DATE PRESETS) ===
   document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', function () {
         const nu = new Date();
         let minIndex = 0;

         if (typeof hamtaIndexFranDatum === 'function') {
            const maxIndex = hamtaIndexFranDatum(nu.toISOString().split('T')[0]);
            minIndex = maxIndex;

            const days = this.getAttribute('data-days');
            const preset = this.getAttribute('data-preset');

            if (days) {
               const startDatum = new Date();
               startDatum.setDate(nu.getDate() - parseInt(days));
               minIndex = hamtaIndexFranDatum(startDatum.toISOString().split('T')[0]);
            } else if (preset === 'brunst') {
               const nuvarandeAr = nu.getFullYear();
               minIndex = (nuvarandeAr - 2016) * 2 + 1;
            } else if (preset === 'all') {
               minIndex = 0;
            }

            if (minIndex < 0) minIndex = 0;

            if (typeof sliderMin !== 'undefined' && typeof sliderMax !== 'undefined') {
               sliderMin.value = minIndex;
               sliderMax.value = maxIndex;
            }
         }

         if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
      });
   });


   // 🚨 SÄKRAD: Län- och kommunfilter körs BARA om elementen existerar!
   const lanFilter = document.getElementById('lanFilter');
   const kommunFilter = document.getElementById('kommunFilter');

   if (lanFilter && kommunFilter) {
      lanFilter.addEventListener('change', function () {
         const valtLan = this.value;

         kommunFilter.innerHTML = '<option value="alla">Alla kommuner</option>';

         if (valtLan === 'alla') {
            if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
            return;
         }

         if (typeof allRegionData !== 'undefined') {
            const kommunerILanet = allRegionData.filter(k => k.lan_namn === valtLan);
            kommunerILanet.sort((a, b) => a.kommun_namn.localeCompare(b.kommun_namn, 'sv'));

            kommunerILanet.forEach(k => {
               const opt = document.createElement("option");
               opt.value = k.kommun_namn;
               opt.textContent = k.kommun_namn;
               kommunFilter.appendChild(opt);
            });
         }

         if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
      });

      kommunFilter.addEventListener('change', () => {
         if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
      });
   }


   if (dateMinInput && dateMaxInput && lanFilter) {
      dateMinInput.addEventListener('change', () => { if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter(); });
      dateMaxInput.addEventListener('change', () => { if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter(); });
   }

   document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', function () {
         if (!dateMinInput || !dateMaxInput) return;

         const idag = new Date();
         const idagStr = idag.toISOString().split('T')[0];

         const range = this.getAttribute('data-range');
         let startStr = "2016-01-01";

         if (range === "7" || range === "30") {
            const startDatum = new Date();
            startDatum.setDate(idag.getDate() - parseInt(range));
            startStr = startDatum.toISOString().split('T')[0];
         } else if (range === "brunst") {
            const nuvarandeAr = idag.getFullYear();
            startStr = `${nuvarandeAr}-09-01`;
            dateMaxInput.value = `${nuvarandeAr}-10-31`;
            dateMinInput.value = startStr;
            if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
            return;
         }

         dateMinInput.value = startStr;
         dateMaxInput.value = idagStr;

         if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
      });
   });

   // Ladda arter och sätt upp checkboxar (Bara om funktionen finns och vi har filtergruppen på sidan)
   if (document.getElementById("arterFilterGroup") && typeof database.hamtaAllaArter === 'function') {
      const arter = await database.hamtaAllaArter();
      ui.renderaArterFilter(arter);

      const markeraAllaCheckbox = document.getElementById("markeraAlla");
      const artCheckboxar = document.querySelectorAll(".art-checkbox");










      // === FIX: Fånga upp ALLA klick på checkboxar dynamiskt ===
      const filterGrupp = document.getElementById("arterFilterGroup");
      if (filterGrupp) {
         filterGrupp.addEventListener("change", function (e) {
            if (e.target && e.target.type === "checkbox") {

               // Om man klickade på "Markera alla"
               if (e.target.id === "markeraAlla") {
                  const allaAndra = filterGrupp.querySelectorAll('input[type="checkbox"]:not(#markeraAlla)');
                  allaAndra.forEach(cb => {
                     cb.checked = e.target.checked;
                  });
               }

               // Kör filteringen direkt vid varje klick!
               if (typeof uppdateraKartaEfterFilter === 'function') {
                  uppdateraKartaEfterFilter();
               }
            }
         });
      }
   } else {
      // 🔥 HIT HAMNAR STATUSSIDAN!
      // Om vi inte har filtergruppen men har status-elementet, sätt det till OK
      const artFilterStatusEl = document.getElementById("artFilterStatus");
      if (artFilterStatusEl) {
         ui.skapaLoggar('Artfilter', 'ok', '✅ Artfilter inläst i minnet (hoppades över i GUI)', artFilterStatusEl);
      }
   }


   // 🚨 SÄKRAD: Kartinitiering sker enbart om kart-containern ("map") finns på sidan!
   if (document.getElementById("map")) {
      mapModul.skapaKarta();
      mapModul.laggTillKlickFunktion();

      const dbKartaStatus = document.getElementById("dbKartaStatus");
      if (dbKartaStatus) {
         ui.skapaLoggar(mapModul.laggTillKlickFunktion, "ok", "Kartmodulen är helt redo och aktiv!", dbKartaStatus);
      }

      await database.laddaRegioner();
      await database.laddaObservationer();

      // 🌟 LÄGG TILL DETTA RAD: Kör den första renderingen direkt när datan har landat!
      if (typeof uppdateraKartaEfterFilter === 'function') {
         uppdateraKartaEfterFilter();
      }
   }


   // Väderwidget i toppmenyn (körs på alla sidor om elementet finns)
   async function laddaToppmenyVader() {
      const widget = document.getElementById("weatherWidget");
      if (!widget) return;

      const gavleLat = 60.6745;
      const gavleLon = 17.1417;

      const nu = new Date();
      const ar = nu.getFullYear();
      const manad = String(nu.getMonth() + 1).padStart(2, '0');
      const dag = String(nu.getDate()).padStart(2, '0');
      const idag = `${ar}-${manad}-${dag}`;

      const vader = await api.hamtaVader(gavleLat, gavleLon, idag, "weatherStatusTopp");
      if (vader) {
         widget.innerHTML = `Gävle: ${vader.emoji} ${vader.temp}°C (${vader.beskrivning})`;
      } else {
         widget.innerHTML = "Väder ej tillgängligt 🌤️";
      }
   }
   laddaToppmenyVader();


   // --- TESTKÖRNING FÖR STATUSSIDAN (statusar.html) ---
   if (document.getElementById("wikiStatus")) {
      const wikiLogElement = document.getElementById('wikiStatus');
      ui.skapaLoggar('Testkörning API', 'start', 'Skickar test-anrop till externa API:er...', wikiLogElement);

      // --- TEST FÖR WIKIPEDIA ---
      // Vi kör ett faktiskt testanrop mot Wikipedia för att se att det svarar
      fetch('https://sv.wikipedia.org/api/rest_v1/page/summary/G%C3%A4vle')
         .then(res => {
            if (!res.ok) throw new Error("Wikipedia svarade med status " + res.status);
            return res.json();
         })
         .then(data => {
            ui.skapaLoggar('Testkörning Wikipedia', 'ok', 'Wikipedia svarade OK! Sammanfattning hämtad.', wikiLogElement);
         })
         .catch(err => {
            ui.skapaLoggar('Testkörning Wikipedia', 'fel', 'Wikipedia misslyckades: ' + err.message, wikiLogElement);
         });

      // --- TEST FÖR GBIF ---
      ui.skapaLoggar('Testkörning GBIF', 'start', 'Testar art-sök...', document.getElementById('gbifStatus'));
      fetch('https://api.gbif.org/v1/species/match?name=Lupus')
         .then(res => res.json())
         .then(data => {
            ui.skapaLoggar('Testkörning GBIF', 'ok', 'GBIF svarade OK! Hittade: ' + data.scientificName, document.getElementById('gbifStatus'));
         })
         .catch(err => {
            ui.skapaLoggar('Testkörning GBIF', 'fel', 'GBIF misslyckades', document.getElementById('gbifStatus'));
         });

      // --- TEST FÖR FREESOUND ---
      const freesoundLogElement = document.getElementById('freesoundStatus');
      ui.skapaLoggar('Testkörning Freesound', 'start', 'Testar ljud-API...', freesoundLogElement);

      api.hamtaLjudUrl('Canis lupus familiaris')
         .then(mp3Url => {
            if (mp3Url) {
               ui.skapaLoggar('Testkörning Freesound', 'ok', 'Freesound svarade OK! Hittade ljudfil.', freesoundLogElement);
            } else {
               ui.skapaLoggar('Testkörning Freesound', 'fel', 'Freesound misslyckades (inga resultat).', freesoundLogElement);
            }
         })
         .catch(err => {
            ui.skapaLoggar('Testkörning Freesound', 'fel', 'Nätverksfel mot Freesound: ' + err.message, freesoundLogElement);
         });

      // --- TEST FÖR HISTORISKT VÄDER ---
      // Se till att skicka med målelementet (document.getElementById('weatherStatusObs')) i anropet!
      const weatherObsLogElement = document.getElementById("weatherStatusObs");
      if (weatherObsLogElement) {
         api.hamtaVader(60.6745, 17.1417, "2025-06-06", "weatherStatusObs");
      }

      // --- TEST GRAFEN ---
      const grafStatusEl = document.getElementById("trendsChart");
      if (grafStatusEl) {
         ui.skapaLoggar('uppdateraGraf', 'ok', "Grafmodulen redo (visas endast på startsidan)", grafStatusEl);
      }
   }


   // --- Ljudknapparnas logik ---
   document.getElementById("arterFilterGroup")?.addEventListener("click", async (e) => {
      if (e.target.classList.contains("sound-btn")) {
         e.preventDefault();
         e.stopPropagation();

         const knapp = e.target;
         const latinName = knapp.getAttribute("data-latin");

         if (!latinName) return;

         if (typeof nuvarandeLjud !== 'undefined' && nuvarandeLjud && !nuvarandeLjud.paused && nuvarandeLjud.src === knapp.dataset.playingUrl) {
            nuvarandeLjud.pause();
            knapp.textContent = '🔊';
            return;
         }

         knapp.textContent = '⏳';
         const audioUrl = await api.hamtaLjudUrl(latinName);

         if (audioUrl) {
            if (typeof nuvarandeLjud !== 'undefined' && nuvarandeLjud) {
               nuvarandeLjud.pause();
               document.querySelectorAll('.sound-btn').forEach(b => b.textContent = '🔊');
            }

            nuvarandeLjud = new Audio(audioUrl);
            knapp.dataset.playingUrl = audioUrl;
            nuvarandeLjud.play();
            knapp.textContent = '🛑';

            nuvarandeLjud.onended = () => { knapp.textContent = '🔊'; };
         } else {
            knapp.textContent = '❌';
            setTimeout(() => { knapp.textContent = '🔊'; }, 2000);
         }
      }
   });


   // === LOGIK FÖR ATT RAPPORTERA NY OBSERVATION ===
   const obsModal = document.getElementById("addObservationModal");
   const closeObsModalBtn = document.getElementById("closeObsModalBtn");
   const addObsForm = document.getElementById("addObservationForm");

   document.addEventListener("click", function (e) {
      const openBtn = e.target.closest("#openObsModalBtn");
      if (openBtn && obsModal) {
         obsModal.classList.remove("hidden");

         const nu = new Date();
         const ar = nu.getFullYear();
         const manad = String(nu.getMonth() + 1).padStart(2, '0');
         const dag = String(nu.getDate()).padStart(2, '0');

         if (document.getElementById("obsDatum")) document.getElementById("obsDatum").value = `${ar}-${manad}-${dag}`;

         const nuvarandeTid = nu.toTimeString().split(' ')[0].substring(0, 5);
         if (document.getElementById("obsTid")) document.getElementById("obsTid").value = nuvarandeTid;
      }
   });

   if (closeObsModalBtn && obsModal) {
      closeObsModalBtn.addEventListener("click", () => {
         obsModal.classList.add("hidden");
      });
   }

   if (addObsForm) {
      addObsForm.addEventListener("submit", async (e) => {
         e.preventDefault();

         const artNamn = document.getElementById("valtArtNamn").value;
         const vetenskapligtNamn = document.getElementById("valtVetenskapligtNamn").value;

         if (!artNamn || !vetenskapligtNamn) {
            alert("Vänligen sök och välj en art ur förslagslistan!");
            return;
         }

         const kommunId = parseInt(document.getElementById("obsKommun").value);
         const datum = document.getElementById("obsDatum").value;
         const tid = document.getElementById("obsTid").value;
         const lat = document.getElementById("latInput").value;
         const lon = document.getElementById("lonInput").value;

         if (isNaN(kommunId)) {
            alert("Vänligen välj en kommun ur listan.");
            return;
         }

         const artId = await database.getOrCreateArt(artNamn, vetenskapligtNamn);
         if (!artId) {
            alert("Kunde inte verifiera arten i databasen.");
            return;
         }

         const lyckades = await database.insertObservation(artId, datum, lat, lon, kommunId, tid);

         if (lyckades) {
            obsModal.classList.add("hidden");
            addObsForm.reset();
            document.getElementById("valtArtNamn").value = "";
            document.getElementById("valtVetenskapligtNamn").value = "";

            if (typeof mapModul !== 'undefined' && typeof mapModul.clearObservationMarkers === 'function') {
               mapModul.clearObservationMarkers();
            }
            if (typeof uppdateraKartaEfterFilter === 'function') uppdateraKartaEfterFilter();
            alert("Observationen har sparats i databasen! 🎉");
         } else {
            alert("Det gick inte att spara.");
         }
      });
   }


   const artSökInput = document.getElementById("artSök");
   const artFörslagDiv = document.getElementById("artFörslag");
   const valtArtNamnInput = document.getElementById("valtArtNamn");
   const valtVetenskapligtNamnInput = document.getElementById("valtVetenskapligtNamn");

   if (artSökInput && artFörslagDiv) {
      artSökInput.addEventListener("input", async (e) => {
         const sökord = e.target.value.trim();

         if (sökord.length < 2) {
            artFörslagDiv.innerHTML = "";
            artFörslagDiv.classList.add("hidden");
            return;
         }

         try {
            const backboneKey = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c";
            const url = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(sökord)}&datasetKey=${backboneKey}&limit=20`;

            const svar = await fetch(url);
            const data = await svar.json();
            const rawFörslag = data.results || [];

            artFörslagDiv.innerHTML = "";

            if (rawFörslag.length === 0) {
               artFörslagDiv.innerHTML = "<div class='suggestion-item'>Inga arter hittades...</div>";
               artFörslagDiv.classList.remove("hidden");
               return;
            }

            let bearbetadeArter = rawFörslag.map(art => {
               let svensktNamn = "";
               if (art.vernacularNames && art.vernacularNames.length > 0) {
                  const svenskMatch = art.vernacularNames.find(v => v.language === "swe" || v.language === "sv");
                  if (svenskMatch) svensktNamn = svenskMatch.vernacularName;
               }
               if (!svensktNamn && art.vernacularName) svensktNamn = art.vernacularName;

               let poäng = 0;
               if (svensktNamn) {
                  poäng += 10;
                  if (svensktNamn.toLowerCase().includes(sökord.toLowerCase())) poäng += 5;
                  if (svensktNamn.toLowerCase().startsWith(sökord.toLowerCase())) poäng += 5;
               }

               if (svensktNamn) {
                  svensktNamn = svensktNamn.charAt(0).toUpperCase() + svensktNamn.slice(1);
               } else {
                  svensktNamn = art.canonicalName || sökord;
               }

               return {
                  ...art,
                  svensktNamn: svensktNamn,
                  latinsktNamn: art.canonicalName || art.scientificName,
                  poäng: poäng
               };
            });

            bearbetadeArter.sort((a, b) => b.poäng - a.poäng);
            const deFemBästa = bearbetadeArter.slice(0, 5);

            deFemBästa.forEach(art => {
               const div = document.createElement("div");
               div.className = "suggestion-item";
               div.innerHTML = `<strong>${art.svensktNamn}</strong> <small>(${art.latinsktNamn})</small>`;

               div.addEventListener("click", () => {
                  artSökInput.value = art.svensktNamn;
                  valtArtNamnInput.value = art.svensktNamn;
                  valtVetenskapligtNamnInput.value = art.latinsktNamn;
                  artFörslagDiv.innerHTML = "";
                  artFörslagDiv.classList.add("hidden");
               });
               artFörslagDiv.appendChild(div);
            });

            artFörslagDiv.classList.remove("hidden");
         } catch (fel) {
            console.error("GBIF API-fel:", fel);
         }
      });

      document.addEventListener("click", (e) => {
         if (e.target !== artSökInput) {
            artFörslagDiv.classList.add("hidden");
         }
      });
   }
});





// #endregion