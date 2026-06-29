// -------------------------------------------------------


// === KOPPLAR TILL ANDRA JS-FILER ===
import { skapaLoggar } from "./ui.js";
import { uppdateraKartaEfterFilter } from "./app.js";

export let allaObservationer = []; // Globala variabeln för att lagra alla observationer


// -------------------------------------------------------


// === ANSLUT TILL SUPABASECLIENT ===
const dbStatus = document.getElementById("dbStatus");
skapaLoggar('Ansluter till mySupabaseClient...', dbStatus);

const mySupabaseClient = window.supabase.createClient(
   "https://tevnovztzryjomtrtkcc.supabase.co",
   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldm5vdnp0enJ5am9tdHJ0a2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MzYzNjAsImV4cCI6MjA5ODAxMjM2MH0.Av5W6Xbt4oMgZcMxvkmVPrGYLxtQL9-lTYPmJQZhLRo"
);

skapaLoggar('✅ Ansluten med mySupabaseClient', dbStatus);
// -------------------------------------------------------


// === LADDA LÄN ===
export async function laddaLan() {
   const dbLanStatus = document.getElementById("dbLanStatus");
   skapaLoggar("Laddar län...", dbLanStatus);

   try {
      const { data: observationer, error } = await mySupabaseClient
         .from("observationer")
         .select("Lan")
         .order("Lan");

      if (error) {
         if (dbLanStatus) dbLanStatus.textContent = "❌ Fel: " + error.message;
         console.error(error);
         return;
      }

      const unikaLan = [...new Set(observationer.map(obs => obs.Lan).filter(Boolean))];

      const select = document.getElementById("lanSelect");
      if (select) {
         select.innerHTML = '<option value="">--- Välj län ---</option>';

         unikaLan.forEach(lanNamn => {
            const option = document.createElement("option");
            option.value = lanNamn;
            option.textContent = lanNamn;
            select.appendChild(option);
         });

         skapaLoggar(`✅ ${unikaLan.length} unika län inlästa (i dropdown-menyn)!`, dbLanStatus);
      } else {
         skapaLoggar(`✅ ${unikaLan.length} unika län inlästa!`, dbLanStatus);
      }

   } catch (error) {
      if (dbLanStatus) dbLanStatus.textContent = '❌ Nätverksfel: ' + error.message;
      console.error(error);
   }
}
// -------------------------------------------------------


// === LADDA OBSERVATIONER ===
export async function laddaObservationer() {

   const dbObservationStatus = document.getElementById("dbObservationStatus");
   skapaLoggar("Laddar observationer...", dbObservationStatus);

   try {
      const { data: observationer, error } = await mySupabaseClient
         .from('observationer')
         .select("Observationer_id, Datum, Latitude, Longitude, Art_id, arter(ArtNamn)")
         .order('Datum', { ascending: false });

      if (error) {
         if (dbObservationStatus) dbObservationStatus.textContent = "❌ Fel: " + error.message;
         console.error(error);
         skapaLoggar("❌ Fel: " + error.message, dbObservationStatus);
         return;
      }

      const lista = document.getElementById('observationerLista');
      if (lista) lista.innerHTML = '';

      if (!observationer || observationer.length === 0) {
         if (lista) lista.innerHTML = `<div class="empty-state"><p>Inga observationer än.</p></div>`;
         skapaLoggar('ℹ️ Inga observationer hittades i databasen.', dbObservationStatus);
         return;
      }

      allaObservationer = observationer;

      // Kör filtreringen direkt så att kartan laddar första perioden på slidern!
      uppdateraKartaEfterFilter();

      skapaLoggar(`✅ ${observationer.length} observationer hämtade!`, dbObservationStatus);

   } catch (error) {
      if (dbObservationStatus) dbObservationStatus.textContent = '❌ Nätverksfel: ' + error.message;
      console.error('Nätverksfel:', error);
      skapaLoggar('❌ Systemfel: ' + error.message, dbObservationStatus);
   }

   /*       GAMMAL KOD
            observationer.forEach(obs => {
            const div = document.createElement('div');
            div.className = 'observation';
            const datum = new Date(obs.Datum).toLocaleDateString('sv-SE');
            const artNamn = obs.Arter ? obs.Arter.ArtNamn : 'Okänt djur';
   
            div.innerHTML = `
                   <div>🐾 ${artNamn}</div>
                   <div class="datum">📅 ${datum}</div>
                   <div class="koordinater">📍 ${obs.Latitude}, ${obs.Longitude}</div>
               `;
            lista.appendChild(div);
   
            // KARTA: Lägg till markör om koordinater finns
            if (obs.Latitude && obs.Longitude) {
               // Vi skickar med artnamnet istället för län
               addObservationMarker(obs.Latitude, obs.Longitude, artNamn, 1, obs.Datum);
            }
         });
   
         // Anpassa kartvy
         if (observationMarkers.length > 0) {
            const group = L.featureGroup(observationMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
         }
   
         skapaLoggar('✅ ' + observationer.length + ' observationer laddade!', dbObservationStatus);
         console.log(observationer)
      } catch (error) {
         skapaLoggar('Nätverksfel:', error);
      } */
}
// -------------------------------------------------------


/* // === SPARA OBSERVATION === (BEHÖVS INTE LÄNGRE)
export async function sparaObservation() {
   const dbSaveObservationStatus = document.getElementById("dbSaveObservationStatus");
   skapaLoggar("Laddar observationer...", dbSaveObservationStatus);

   // Hämta värden från HTML (se till att ID:n stämmer med din HTML)
   const artId = document.getElementById("ArtNamnSelect").value; // Byt från lanSelect
   const datum = document.getElementById("datumInput").value;
   const lat = parseFloat(document.getElementById("latInput").value);
   const lon = parseFloat(document.getElementById("lonInput").value);

   if (!artId) { alert("Välj en art!"); return }
   if (!datum) { alert("Välj ett datum!"); return }
   if (isNaN(lat) || isNaN(lon)) { alert("Ange koordinater!"); return }

   try {
      const { error } = await mySupabaseClient
         .from('observationer')
         .insert({
            Datum: datum,           // Måste matcha "Datum" i Supabase
            Latitude: lat,          // Måste matcha "Latitude"
            Longitude: lon,         // Måste matcha "Longitude"
            Art_id: artId           // Koppla till rätt art
         });

      if (error) {
         alert('Fel vid sparande: ' + error.message);
         console.error(error);
         return;
      }
      alert('✅ Sparad!');

      // Töm fälten
      document.getElementById("ArtNamnSelect").value = '';
      document.getElementById("datumInput").value = '';
      document.getElementById("latInput").value = '';
      document.getElementById("lonInput").value = '';

      laddaObservationer(); // Ladda om listan

      skapaLoggar('✅ Observation sparad!', dbSaveObservationStatus);

   } catch (error) {
      console.error('Nätverksfel: ' + error.message);
   }
}
// ------------------------------------------------------- */



// === UPPDATERA SIDAN I REALTID OM DB UPPDATERAS ===
mySupabaseClient
   .channel('observationer')
   .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'observationer' },
      () => laddaObservationer()
   )
   .subscribe();

skapaLoggar('Supabase har uppdaterats', dbStatus);
// -------------------------------------------------------