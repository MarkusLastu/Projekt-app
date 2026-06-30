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
      const { data: lan, error } = await mySupabaseClient
         .from("lanLista")
         .select("LanNamn")
         .order("LanNamn");

      if (error) {
         if (dbLanStatus) skapaLoggar(laddaLan, 'fel', 'Fel: ' + error.message);
         console.error(error);
         skapaLoggar("❌ Fel: " + error.message, dbLanStatus);
         return;
      }

      skapaLoggar('laddaLan', 'ok', `✅ ${lan.length} län inlästa!`, dbLanStatus);

   } catch (error) {
      if (dbLanStatus) dbLanStatus.textContent = '❌ Nätverksfel: ' + error.message;
   }
}
// -------------------------------------------------------


// === LADDA OBSERVATIONER ===
export async function laddaObservationer() {

   const dbObservationStatus = document.getElementById("dbObservationStatus");
   skapaLoggar(laddaObservationer, 'start', "Laddar observationer...", dbObservationStatus);

   /* Hämta ALL data från supabase (annars är max 1000 rader)
   let allData = []; 
   let rangeStart = 0;
   const batchSize = 1000;
   let hasMore = true; */ //Hallå en massa dubbel kod????//

   try {
      while (hasMore) {
         const { data: data, error } = await mySupabaseClient
            .from('observationer')
            .select(`
            *,
            arter (ArtNamn),
            kommuner!Kommun_id (
               KommunNamn,
               lanLista!Lan_id (LanNamn)
            )
         `)
            .order('Datum', { ascending: false })
            .range(rangeStart, rangeStart + batchSize - 1);

         if (error) throw error;

         if (data.length > 0) {
            allData = allData.concat(data);
            rangeStart += batchSize;
         }

         // När vi laddar in färre än 1000 rader är vi klara
         if (data.length < batchSize) {
            hasMore = false;
         }
      }

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