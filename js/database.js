// -------------------------------------------------------


// === KOPPLAR TILL ANDRA JS-FILER ===
import { skapaLoggar } from "./ui.js";


// -------------------------------------------------------


// === ANSLUT TILL SUPABASECLIENT ===
const dbStatus = document.getElementById("dbStatus");
skapaLoggar('Ansluter till mySupabaseClient', dbStatus);

const mySupabaseClient = window.supabase.createClient(
   "https://tevnovztzryjomtrtkcc.supabase.co",
   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldm5vdnp0enJ5am9tdHJ0a2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MzYzNjAsImV4cCI6MjA5ODAxMjM2MH0.Av5W6Xbt4oMgZcMxvkmVPrGYLxtQL9-lTYPmJQZhLRo"
);

skapaLoggar('✅ Ansluten med mySupabaseClient', dbStatus);
// -------------------------------------------------------


// === LADDA KOMMUNER ===
export async function laddaKommuner() {

   const select = document.getElementById("kommunSelect");
   const dbKommunStatus = document.getElementById("dbKommunStatus");

   skapaLoggar("Laddar kommuner...", dbKommunStatus);

   try {
      const { data: kommuner, error } = await mySupabaseClient
         .from("gavleborg")
         .select("id, kommunnamn")
         .order("kommunnamn");

      if (error) {
         skapaLoggar("❌ Fel: " + error.message, dbKommunStatus);
         return;
      }

      select.innerHTML = '<option value="">--- Välj kommun ---</option>'

      kommuner.forEach(kommun => {
         const option = document.createElement("option");
         option.value = kommun.id;
         option.textContent = kommun.kommunnamn;
         select.appendChild(option);
      });

      skapaLoggar('✅ ' + kommuner.length + ' kommuner laddade!', dbKommunStatus);
      console.log(kommuner);


   } catch (error) {
      kommunStatus.textContent = '❌ Nätverksfel: ' + error.message;
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
         .from('Observationer')
         .select("id, Datum, Latitude, Longitude, Art_id, Arter(ArtNamn)")
         .order('Datum', { ascending: false });

      if (error) {
         skapaLoggar('Fel:' + error, dbObservationStatus);
         return;
      }

      const lista = document.getElementById('observationerLista');
      lista.innerHTML = '';
      clearObservationMarkers(); // Rensa gamla markörer

      if (!observationer || observationer.length === 0) {
         lista.innerHTML = `<div class="empty-state"><p>Inga observationer än.</p></div>`;
         return;
      }

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
            // Vi skickar med artnamnet istället för kommun
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
   }
}
// -------------------------------------------------------


// === SPARA OBSERVATION ===
export async function sparaObservation() {
   const dbSaveObservationStatus = document.getElementById("dbSaveObservationStatus");
   skapaLoggar("Laddar observationer...", dbSaveObservationStatus);

   // Hämta värden från HTML (se till att ID:n stämmer med din HTML)
   const artId = document.getElementById("ArtNamnSelect").value; // Byt från kommunSelect
   const datum = document.getElementById("datumInput").value;
   const lat = parseFloat(document.getElementById("latInput").value);
   const lon = parseFloat(document.getElementById("lonInput").value);

   if (!artId) { alert("Välj en art!"); return }
   if (!datum) { alert("Välj ett datum!"); return }
   if (isNaN(lat) || isNaN(lon)) { alert("Ange koordinater!"); return }

   try {
      const { error } = await mySupabaseClient
         .from('Observationer')
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
// -------------------------------------------------------



// === UPPDATERA SIDAN I REALTID OM DB UPPDATERAS ===
mySupabaseClient
   .channel('Observationer') // Döp kanalen till tabellens namn
   .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'Observationer' }, // Ändra till 'Observationer'
      () => laddaObservationer()
   )
   .subscribe();

skapaLoggar('Supabase har uppdaterats', dbStatus);
// -------------------------------------------------------