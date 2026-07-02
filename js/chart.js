


// Uppdaterar linjegrafen (visar alltid hela 2016-2026 baserat på valda arter)
export function uppdateraGraf(valdaArtIds = [], filtreradData = []) {
   const canvas = document.getElementById('trendsChart');
   if (!canvas || typeof canvas.getContext !== 'function') {
      console.log("📊 Grafmodulen hoppades över (trendsChart saknas eller är inte en canvas på denna sida).");
      return;
   }

   const ctx = canvas.getContext('2d');
   // Hämta datumintervall från input-fälten, eller använd standardvärden
   const minInput = document.getElementById('dateMin')?.value;
   const maxInput = document.getElementById('dateMax')?.value;
   const startDatumStr = minInput || "2026-01-01";
   const slutDatumStr = maxInput || new Date().toISOString().split('T')[0];

   const tidsEtiketter = genereraDatumIntervall(startDatumStr, slutDatumStr);
// färgpalett för linjerna i grafen
   const fargPalett = ["#88919c", "#884303", "#e78300", "#00a0e3", "#6b4c3b", "#c0c0c0", "#8B4513", "#2e7d32", "#c62828", "#1565c0"];
//hämtar snygg info om valda arter (namn, färg, ikon)
   const snyggArtInfo = {};
   valdaArtIds.forEach((artId, index) => {
      const cb = document.querySelector(`#arterFilterGroup input[value="${artId}"]`);
      let namn = `Art ${artId}`;
      // Om checkboxen är markerad, hämta namnet från dess label
      if (cb) {
         const labelParent = cb.closest('label');
         if (labelParent) {
            namn = labelParent.textContent.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
         }
      }
      // färg från paletten baserat på index
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
      // Spara informationen i snyggArtInfo
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