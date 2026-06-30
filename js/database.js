// -------------------------------------------------------


// === KOPPLAR TILL ANDRA JS-FILER ===
import { skapaLoggar } from "./ui.js";
import { uppdateraKartaEfterFilter } from "./app.js";

export let allaObservationer = []; // Globala variabeln för att lagra alla observationer


// -------------------------------------------------------


// === ANSLUT TILL SUPABASECLIENT ===
const dbStatus = document.getElementById("dbStatus");

skapaLoggar('dbStatus', 'start', 'Ansluter till mySupabaseClient...', dbStatus);

const mySupabaseClient = window.supabase.createClient(
   "https://tevnovztzryjomtrtkcc.supabase.co",
   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldm5vdnp0enJ5am9tdHJ0a2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MzYzNjAsImV4cCI6MjA5ODAxMjM2MH0.Av5W6Xbt4oMgZcMxvkmVPrGYLxtQL9-lTYPmJQZhLRo"
);

skapaLoggar('dbStatus', 'ok', 'Ansluten med mySupabaseClient...', dbStatus);
// -------------------------------------------------------


// === LADDA LÄN ===
export async function laddaLan() {
   const dbLanStatus = document.getElementById("dbLanStatus");
   skapaLoggar(laddaLan, 'start', "Laddar län...", dbLanStatus);

   try {
      const { data: lan, error } = await mySupabaseClient.rpc('get_lan');       
      console.log(lan)  ;
 
      if (error) {
         if (dbLanStatus) skapaLoggar(laddaLan, 'fel', 'Fel: ' + error.message);
         console.error(error);
         skapaLoggar("❌ Fel: " + error.message, dbLanStatus);
         return;
      }

      const unikaLan = lan;

      // Behövs inte. Vi söker SELECT DISTINCT istället
      /* [...new Set(lan.map(obs => obs.lanNamn).filter(Boolean))]; */


      const select = document.getElementById("lanSelect");
      if (select) {
         select.innerHTML = '<option value="">--- Välj län ---</option>';

         unikaLan.forEach(lanNamn => {
            const option = document.createElement("option");
            option.value = lanNamn;
            option.textContent = lanNamn;
            select.appendChild(option);
         });

         skapaLoggar(laddaLan, 'ok', `${unikaLan.length} unika län inlästa (i dropdown-menyn)!`, dbLanStatus);
      } else {
         skapaLoggar(laddaLan, 'ok', `${unikaLan.length} unika län inlästa!`, dbLanStatus);
      }

   } catch (error) {
      if (dbLanStatus) dbLanStatus.textContent = '❌ Nätverksfel: ' + error.message;
   }
}
// -------------------------------------------------------


// === LADDA OBSERVATIONER ===
export async function laddaObservationer() {

   const dbObservationStatus = document.getElementById("dbObservationStatus");
   skapaLoggar(laddaObservationer, 'start', "Laddar observationer...", dbObservationStatus);

   // Hämta ALL data från supabase (annars är max 1000 rader)
   let allData = []; 
   let rangeStart = 0;
   const batchSize = 1000;
   let hasMore = true; // Hallå en massa dubbel kod????

   try {
      const { data: observationer, error } = await mySupabaseClient
      .rpc('get_observationer')
      
      console.log(observationer);
      /*  .from('observationer')
         .select("Observationer_id, Datum, Latitude, Longitude, Art_id, arter(ArtNamn)")
         .order('Datum', { ascending: false })
         .range(0, 50000); */

         if (error) throw error;

         if (observationer.length > 0) {
            allData = allData.concat(observationer);
            rangeStart += batchSize;
         }

         // När vi laddar in färre än 1000 rader är vi klara
         if (observationer.length < batchSize) {
            hasMore = false;
         }
      

      const lista = document.getElementById('observationerLista');
      if (lista) lista.innerHTML = '';

      if (!observationer || observationer.length === 0) {
         if (lista) lista.innerHTML = `<div class="empty-state"><p>Inga observationer än.</p></div>`;
         skapaLoggar(laddaObservationer, 'info', 'Inga observationer hittades i databasen.', dbObservationStatus);
         return;
      }

      allaObservationer = observationer;      

      // Kör filtreringen direkt så att kartan laddar första perioden på slidern!
      allaObservationer = allData;
      uppdateraKartaEfterFilter();
      skapaLoggar('laddaObservationer', 'ok', `✅ ${allData.length} observationer hämtade!`, dbObservationStatus);

   } catch (error) {
      // Detta fångar oväntade tekniska fel (t.ex. att internet dör helt)
      if (dbObservationStatus) dbObservationStatus.textContent = '❌ Nätverksfel: ' + error.message;
      console.error('Kritiskt nätverksfel:', error);
      skapaLoggar('❌ Systemfel: ' + error.message, dbObservationStatus);
   }
}

// -------------------------------------------------------


// === UPPDATERA SIDAN I REALTID OM DB UPPDATERAS ===
mySupabaseClient
   .channel('observationer')
   .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'observationer' },
      () => laddaObservationer()
   )
   .subscribe();

skapaLoggar('Supabase', 'info', 'Supabase har uppdaterats', dbStatus);
// -------------------------------------------------------