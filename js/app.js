// -------------------------------------------------------

import * as ui from "./ui.js";
import * as database from "./database.js";
import * as mapModul from "./map.js";
import * as api from "./api.js";
import * as components from "./components.js";


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

// Uppdaterar linjegrafen (visar alltid hela 2016-2026 baserat på valda arter)
function uppdateraGraf(valdaArtIds, minVal = 0, maxVal = 20) {

   // Berätta för statussidan att graf-logiken fungerar!
   const grafStatus = document.getElementById("uppdateraGraf");
   if (grafStatus) {
      ui.skapaLoggar(uppdateraGraf, 'ok', "Graf-data beräknad och redo!", grafStatus);
   }

   // Leta efter själva ritytan (canvasen)
   const canvas = document.getElementById('trendsChart');
   if (!canvas) {
      // Om canvas saknas, avbryt här så det inte kraschar!
      return;
   }

   const ctx = canvas.getContext('2d');
   const tidsEtiketter = [];
   const perioderIndex = [];

   // Fyll på tidsaxeln
   for (let i = minVal; i <= maxVal; i++) {
      perioderIndex.push(i);
      tidsEtiketter.push(indexTillText(i));
   }

   const artInställningar = {
      1: { label: "Varg", färg: "#88919ce0", ikon: vargSvg },
      2: { label: "Älg", färg: "#884303f5", ikon: algSvg },
      3: { label: "Rådjur", färg: "#e78300", ikon: radjurSvg }
   };

   const nyaDatasets = valdaArtIds.map(artId => {
      const info = artInställningar[artId] || { label: `Art ${artId}`, färg: "#666" };

      const punkterData = perioderIndex.map(pIndex => {
         return database.allaObservationer.filter(obs => {
            if (obs.Art_id !== artId) return false;
            return hamtaIndexFranDatum(obs.Datum) === pIndex;
         }).length;
      });

      // Räkna ihop totalsumman för just denna art i det valda tidsintervallet
      const totaltAntal = punkterData.reduce((summa, antal) => summa + antal, 0);

      return {
         // Lägger till totalsumman direkt i namnet (label)
         label: `${info.label} (${totaltAntal} st)`,
         data: punkterData,
         borderColor: info.färg,
         backgroundColor: info.färg + "22",
         tension: 0.3,
         borderWidth: 3,
         legendIkon: info.ikon
      };
   });

   if (!trendsChart) {
      trendsChart = new Chart(ctx, {
         type: 'line',
         data: { labels: tidsEtiketter, datasets: nyaDatasets },

         options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
               legend: {
                  labels: {
                     usePointStyle: true,
                     boxWidth: 20,
                     boxHeight: 20,
                     font: { size: 14 },

                     // Tvingar bara LEGENDEN att använda sig av SVG-ikonerna
                     generateLabels: function (chart) {
                        const datasets = chart.data.datasets;
                        return datasets.map((dataset, i) => ({
                           text: dataset.label,
                           fillStyle: dataset.borderColor,
                           strokeStyle: dataset.borderColor,
                           lineWidth: dataset.borderWidth,
                           hidden: !chart.isDatasetVisible(i),
                           datasetIndex: i,
                           pointStyle: dataset.legendIkon
                        }));
                     }
                  }
               }
            },

            scales: {
               x: { grid: { display: false } },
               y: { beginAtZero: true, ticks: { precision: 0 } }
            }
         }
      });

   } else {
      trendsChart.data.labels = tidsEtiketter;
      trendsChart.data.datasets = nyaDatasets;
      trendsChart.update();
   }
}

// Den här funktionen körs så fort man drar i NÅGON av knapparna eller ändrar filter
export function uppdateraKartaEfterFilter() {
   // Sätt standardvärden om reglagen saknas
   let minVal = 0;
   let maxVal = 21;

   if (sliderMin && sliderMax) {
      minVal = parseInt(sliderMin.value);
      maxVal = parseInt(sliderMax.value);

      if (minVal > maxVal) {
         if (this === sliderMin) { sliderMax.value = minVal; maxVal = minVal; } 
         else { sliderMin.value = maxVal; minVal = maxVal; }
      }
      if (periodText) {
         periodText.textContent = `${indexTillText(minVal)} till ${indexTillText(maxVal)}`;
      }
   }

   // Hämta vilka arter som är ikryssade
   const ikryssadeCheckboxar = document.querySelectorAll('.art-checkbox:checked');
   const valdaArtIds = Array.from(ikryssadeCheckboxar).map(cb => parseInt(cb.value));

   // Uppdatera grafen
   uppdateraGraf(valdaArtIds, minVal, maxVal);

   // Filtrera datan baserat på art och tid
   const filtreradData = database.allaObservationer.filter(obs => {
      const artMatch = valdaArtIds.includes(obs.Art_id);
      const obsIndex = hamtaIndexFranDatum(obs.Datum);
      const tidsMatch = (obsIndex >= minVal && obsIndex <= maxVal);
      return artMatch && tidsMatch;
   });

   // 🔥 NYTT: Formatera datan direkt till det format kartan vill ha
   const punkterTillKartan = filtreradData
      .filter(obs => obs.Latitude && obs.Longitude)
      .map(obs => ({
         lat: parseFloat(obs.Latitude),
         lon: parseFloat(obs.Longitude),
         artNamn: obs.ArtNamn,
         datum: obs.Datum
      }))
      .filter(pt => !isNaN(pt.lat) && !isNaN(pt.lon));

   // 🔥 NYTT: Skicka allt på en gång till kartan! Ingen loop, ingen väntan.
   mapModul.taEmotOchRitaObservationer(punkterTillKartan);

   ui.skapaLoggar(uppdateraKartaEfterFilter, 'ok', `🔍 Visar ${filtreradData.length} av ${database.allaObservationer.length} observationer på kartan.`, observationStatus);
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

// -------------------------------------------------------
// #endregion





// #region STARTUP
/* Kod som ska köras när sidan laddas. */

document.addEventListener('DOMContentLoaded', async function () {
   ui.skapaLoggar('DOMContentLoaded', 'start', 'Appen startar...');

   // Fyll kommun-dropdownen från databasen
   const obsKommunSelect = document.getElementById("obsKommun");
   if (obsKommunSelect) {
      database.hämtaAllaKommuner().then(kommuner => {
         // Rensa "Laddar..." och lägg till en tom start-option
         obsKommunSelect.innerHTML = '<option value="" disabled selected>-- Välj kommun --</option>';

         // Loopa ut alla kommuner till rullistan
         kommuner.forEach(kommun => {
            const option = document.createElement("option");
            option.value = kommun.Kommun_id; // ID skickas till databasen
            option.textContent = kommun.KommunNamn; // Namnet visas för användaren
            obsKommunSelect.appendChild(option);
         });
      });
   }

   // Lyssna på båda slider-knapparna samtidigt!
   if (sliderMin && sliderMax) {
      sliderMin.addEventListener('input', debouncedUppdateraKarta);
      sliderMax.addEventListener('input', debouncedUppdateraKarta);
   }

   // Lyssna på kryssrutorna
   const markeraAllaCheckbox = document.getElementById("markeraAlla");
   const artCheckboxar = document.querySelectorAll(".art-checkbox");

   if (markeraAllaCheckbox) {
      markeraAllaCheckbox.addEventListener("change", function () {
         artCheckboxar.forEach(cb => {
            cb.checked = markeraAllaCheckbox.checked;
         });

         uppdateraKartaEfterFilter();
      });
   }

   artCheckboxar.forEach(checkbox => {
      checkbox.addEventListener('change', function () {
         // Om markera-alla är ikryssat -> bockar ur den när man kryssar i ett annat val
         if (!this.checked && markeraAllaCheckbox) {
            markeraAllaCheckbox.checked = false;
         }

         if (markeraAllaCheckbox) {
            const AllaArIkryssade = Array.from(artCheckboxar).every(cb => cb.checked);
            markeraAllaCheckbox.checked = AllaArIkryssade;
         }

         uppdateraKartaEfterFilter();
      })
   })

   const navContainer = document.getElementById("nav");
   if (navContainer) {
      navContainer.innerHTML = components.nav;
   }

   const footerContainer = document.getElementById("footer");
   if (footerContainer) {
      footerContainer.innerHTML = components.footer;
   }

   // 1. Skapa kartan med OSM-bakgrund
   mapModul.skapaKarta();

   // 2. Lägg till klick-funktionalitet
   mapModul.laggTillKlickFunktion();
   const dbKartaStatus = document.getElementById("dbKartaStatus");
   if (dbKartaStatus) {
      ui.skapaLoggar(mapModul.laggTillKlickFunktion, "ok", "Kartmodulen är helt redo och aktiv!", dbKartaStatus);
   }

   // 3. Ladda data från Supsabase

   database.laddaLan();
   database.laddaObservationer();

   async function laddaToppmenyVader() {
      const widget = document.getElementById("weatherWidget");
      if (!widget) return; // Avbryt om komponenten inte finns på sidan

      const gavleLat = 60.6745;
      const gavleLon = 17.1417;

      // Skapa dagens datum i formatet YYYY-MM-DD
      const idag = new Date().toISOString().split('T')[0];

      // Vi återanvänder hamtaVader och skickar med "weatherStatusTopp" som logg-id
      const vader = await api.hamtaVader(gavleLat, gavleLon, idag, "weatherStatusTopp");
      if (vader) {
         widget.innerHTML = `Gävle: ${vader.emoji} ${vader.temp}°C (${vader.beskrivning})`;
      } else {
         widget.innerHTML = "Väder ej tillgängligt 🌤️";
      }
   }

   laddaToppmenyVader(); // Kör funktionen direkt vid start!

   // === Tema knappen ===
   // Kolla om användaren har sparat ett tema sedan tidigare när sidan laddas
   const sparatTema = localStorage.getItem("tema");
   if (sparatTema === "dark") {
      document.body.classList.add("dark-mode");
   }

   // Lyssna på klick på tema-knappen
   themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      components.updateThemeButton();

      // Spara det nya valet i webbläsarens minne
      if (document.body.classList.contains("dark-mode")) {
         localStorage.setItem("tema", "dark");
      } else {
         localStorage.setItem("tema", "light");
      }

      // Uppdatera knappens ikon/text via komponenten
      components.updateThemeButton();
   });

   // Körs när sidan laddas för att knappen ska matcha rätt läge direkt
   components.updateThemeButton();


   // --- TESTKÖRNING FÖR STATUSSIDAN (statusar.html) ---
   // Kollar om vi är på statusar.html (genom att se om wikiStatus-elementet finns)
   if (document.getElementById("wikiStatus")) {
      ui.skapaLoggar('Testkörning API', 'start', 'Skickar test-anrop till externa API:er...', document.getElementById('wikiStatus'));

      // Testar Wikipedia och Unsplash med "Gävle" som sökord
      api.hamtaWikiSammanfattning("Gävle");
      api.hamtaBakgrundsbild("Gävle");

      // Testar ett historiskt väder-anrop (t.ex. för ett år sedan) till den andra logg-raden
      api.hamtaVader(60.6745, 17.1417, "2025-06-06", "weatherStatusObs");
   }




   // --- Ljudknapparnas logik (Hämtar direkt från observationernas artdata) ---
   document.querySelectorAll('.sound-btn').forEach(knapp => {
      knapp.addEventListener('click', async (e) => {
         e.preventDefault();
         e.stopPropagation();

         const artId = parseInt(knapp.getAttribute('data-art-id'));

         // Letar i listan av observationer efter första bästa rad som matchar vårt artId
         const matchandeObs = database.allaObservationer.find(obs => obs.Art_id === artId);
         const latinName = matchandeObs ? matchandeObs.VetenskapligtNamn : null;

         if (!latinName) {
            console.warn(`Hittade inget latinskt namn för Art_id: ${artId} än. (Datan kanske laddas fortfarande)`);
            return;
         }

         // Om samma ljud redan spelas – pausa det
         if (nuvarandeLjud && !nuvarandeLjud.paused && nuvarandeLjud.src === knapp.dataset.playingUrl) {
            nuvarandeLjud.pause();
            knapp.textContent = '🔊';
            return;
         }

         knapp.textContent = '⏳';

         const audioUrl = await api.hamtaLjudUrl(latinName);

         if (audioUrl) {
            if (nuvarandeLjud) {
               nuvarandeLjud.pause();
               document.querySelectorAll('.sound-btn').forEach(b => b.textContent = '🔊');
            }

            nuvarandeLjud = new Audio(audioUrl);
            knapp.dataset.playingUrl = audioUrl;

            nuvarandeLjud.play();
            knapp.textContent = '🛑';

            nuvarandeLjud.onended = () => {
               knapp.textContent = '🔊';
            };

         } else {
            knapp.textContent = '❌';
            setTimeout(() => { knapp.textContent = '🔊'; }, 2000);
         }
      });
   });


   // === PROJEKTINFO-SIDAN ===

   // init   
   await loadProjektStatus();

   const closeBtn = document.getElementById("closeEditBtn");
   if (closeBtn) {
      closeBtn.addEventListener("click", () => {
         ui.closeModal(); // ✅ Nu anropas rätt modul!
      });
   }

   const saveBtn = document.getElementById("saveEditBtn");

   if (saveBtn) {
      saveBtn.addEventListener("click", async () => {

         // RÄTTNING: Vi sätter måsvingar runt argumenten för att skapa ett objekt { ... }
         await database.uppdateraProjektStatus({
            projektstatus_id: ui.currentEditItem.projektstatus_id,
            typ: document.getElementById("editTyp").value,
            status: document.getElementById("editStatus").value,
            uppgift: document.getElementById("editUppgift").value,
            kommentar: document.getElementById("editKommentar").value
         });

         document.getElementById("editModal").classList.add("hidden");

         await loadProjektStatus(); // Larmar om listan på skärmen
      });
   }

   const addBtn = document.getElementById("addBtn");
   const closeAddBtn = document.getElementById("closeAddBtn");
   const saveAddBtn = document.getElementById("saveAddBtn");

   if (addBtn) {
      addBtn.addEventListener("click", () => {
         ui.openAddModal();
      });
   }

   if (closeAddBtn) {
      closeAddBtn.addEventListener("click", () => {
         ui.closeAddModal();
      });
   }

   if (saveAddBtn) {
      saveAddBtn.addEventListener("click", async () => {

         const typ = document.getElementById("addTyp").value;
         const status = document.getElementById("addStatus").value;
         const uppgift = document.getElementById("addUppgift").value;
         const kommentar = document.getElementById("addKommentar").value;

         await database.insertProjektStatus(typ, status, uppgift, kommentar);

         ui.closeAddModal();
      });
   }

   const deleteEditBtn = document.getElementById("deleteEditBtn");

   if (deleteEditBtn) {
      deleteEditBtn.addEventListener("click", async () => {
         // Skapa en säkerhetsfråga så användaren inte klickar fel
         const konfirmera = confirm("Är du säker på att du vill ta bort den här uppgiften?");

         if (konfirmera) {
            // Hämta ID från det objekt som ui-modulen just nu kom ihåg att vi editerar
            const id = ui.currentEditItem.projektstatus_id;

            // Kör borttagningen i databasen
            const lyckades = await database.taBortProjektStatus(id);

            if (lyckades) {
               ui.closeModal();          // Stäng modalen
               await loadProjektStatus(); // Ladda om listan på skärmen direkt!
            } else {
               alert("Det gick inte att ta bort uppgiften. Kolla RLS-policyn i Supabase.");
            }
         }
      });
   }



   // === LOGIK FÖR ATT RAPPORTERA NY OBSERVATION ===
   const obsModal = document.getElementById("addObservationModal");
   const closeObsModalBtn = document.getElementById("closeObsModalBtn");
   const addObsForm = document.getElementById("addObservationForm");

   // 1. Öppna modalen via knappen i kartans popup (Event delegation)
   document.addEventListener("click", function (e) {
      if (e.target && e.target.id === "openObsModalBtn") {
         if (obsModal) {
            obsModal.classList.remove("hidden");
            // Sätt automatiskt dagens datum i datumväljaren för smidighetens skull
            document.getElementById("obsDatum").value = new Date().toISOString().split('T')[0];
         }
      }
   });

   // 2. Stäng modalen
   if (closeObsModalBtn) {
      closeObsModalBtn.addEventListener("click", () => {
         obsModal.classList.add("hidden");
      });
   }

   // 3. Hantera när formuläret skickas (Spara till Supabase)
   if (addObsForm) {
      addObsForm.addEventListener("submit", async (e) => {
         e.preventDefault();

         const artId = parseInt(document.getElementById("obsArt").value);
         const datum = document.getElementById("obsDatum").value;
         const lat = document.getElementById("latInput").value;
         const lon = document.getElementById("lonInput").value;

         // 🔥 NYTT: Hämta det valda kommun-ID:t (görs om till ett heltal)
         const kommunId = parseInt(document.getElementById("obsKommun").value);

         // Skicka med kommunId som det sista argumentet till databasen!
         const lyckades = await database.insertObservation(artId, datum, lat, lon, kommunId);

         if (lyckades) {
            obsModal.classList.add("hidden");
            mapModul.clearObservationMarkers();
            uppdateraKartaEfterFilter();
            alert("Observationen har sparats i databasen! 🎉");
         } else {
            alert("Det gick inte att spara. Kolla console-loggen.");
         }
      });
   }

});



// #endregion