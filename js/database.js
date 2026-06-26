// -------------------------------------------------------


// === ANSLUT TILL SUPABASECLIENT ===
skapaLoggar('Ansluter till mySupabaseClient');
const mySupabaseClient = window.supabase.createClient(
   "https://tlfodbbdftijglhatvqp.supabase.co",
   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZm9kYmJkZnRpamdsaGF0dnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODM1MjIsImV4cCI6MjA5Nzg1OTUyMn0.rqgYwfWLNjPFHbHnnzV8jiivkOtK9TfAFQKgY4IpSIw"
)
skapaLoggar('✅ Ansluten med mySupabaseClient');
// -------------------------------------------------------


// === LADDA KOMMUNER ===
async function laddaKommuner() {

   const select = document.getElementById("kommunSelect");

   skapaLoggar("Laddar kommuner...", kommunStatus);

   try {
      const { data: kommuner, error } = await mySupabaseClient
         .from("gavleborg")
         .select("id, kommunnamn")
         .order("kommunnamn");

      if (error) {
         kommunStatus.textContent = "❌ Fel: " + error.message;
         console.log(error(error));
         return;
      }

      select.innerHTML = '<option value="">--- Välj kommun ---</option>'

      kommuner.forEach(kommun => {
         const option = document.createElement("option");
         option.value = kommun.id;
         option.textContent = kommun.kommunnamn;
         select.appendChild(option);
      });

      skapaLoggar('✅ ' + kommuner.length + ' kommuner laddade!', kommunStatus);
      console.log(kommuner);


   } catch (error) {
      kommunStatus.textContent = '❌ Nätverksfel: ' + error.message;
      console.error(error);
   }
}
// -------------------------------------------------------


// === LADDA OBSERVATIONER ===
async function laddaObservationer() {

   skapaLoggar("Laddar observationer...", observationStatus)

   try {
      const { data: observationer, error } = await mySupabaseClient
         .from('vargar')
         .select("id, created_at, lat, lon, antal, kommun_id, datum, gavleborg(kommunnamn)")
         .order('datum', { ascending: false });
      if (error) {
         console.error('Fel:', error);
         return;
      }
      const lista = document.getElementById('observationerLista');
      lista.innerHTML = '';
      if (!observationer || observationer.length === 0) {
         lista.innerHTML = `
            <div class="empty-state">
            <span class="emoji">🐺</span>
            <p>Inga observationer än.</p>
            </div>
         `;
         // Rensa kartmarkörer
         clearObservationMarkers();
         return;
      }
      // Rensa kartmarkörer
      clearObservationMarkers();
      observationer.forEach(obs => {
         const div = document.createElement('div');
         div.className = 'observation';
         const antal = obs.antal || 1;
         const datum = new Date(obs.datum).toLocaleDateString('sv-SE');

         div.innerHTML = `
            <div class="kommun">${obs.gavleborg.kommunnamn}</div>
            <div class="datum">📅 ${datum}</div>
            <div class="koordinater">📍 ${obs.lat}, ${obs.lon}</div>
            <div>🐺 ${antal} varg${antal > 1 ? 'ar' : ''}</div>
            `;
         lista.appendChild(div);
         // Karta, lägg till markör om koordinater finns
         if (obs.lat && obs.lon) {
            addObservationMarker(obs.lat, obs.lon, obs.kommunnamn,
               antal, obs.datum);
         }
      });

      // Anpassa kartvy till alla markörer
      if (observationMarkers.length > 0) {
         const group = L.featureGroup(observationMarkers);
         map.fitBounds(group.getBounds().pad(0.1));
      } else {
         // Återställ till standardvy om inga markörer
         map.setView([61.5, 16.5], 8);
      }

      
      skapaLoggar('✅ ' + observationer.length + ' observationer laddade!', observationStatus);
      console.log('=== OBSERVATIONER: ===');
      console.log(observationer);

   } catch (error) {
      console.error('Nätverksfel:', error);
   }
}
// -------------------------------------------------------


// === SPARA OBSERVATION ===
async function sparaObservation() {

   const kommunId = parseInt(document.getElementById("kommunSelect").value);
   const datum = document.getElementById("datumInput").value;
   const lat = parseFloat(document.getElementById("latInput").value);
   const lon = parseFloat(document.getElementById("lonInput").value);
   const antal = parseInt(document.getElementById("antalInput").value) || 1;

   console.log("== Data som ska skickas till DB: ==")
   console.log('kommunId: ' + kommunId);
   console.log('datum: ' + datum);
   console.log('lat: ' + lat);
   console.log('lon: ' + lon);
   console.log('antal: ' + antal);

   if (!kommunId) { alert("Välj en kommun!"); return }
   if (!datum) { alert("Välj ett datum!"); return }
   if (isNaN(lat) || isNaN(lon)) { alert("Ange coordinater!"); return }

   try {
      const { data: kommun } = await mySupabaseClient
         .from('gavleborg')
         .select('kommunnamn')
         .eq('id', kommunId)
         .single();

      const { error } = await mySupabaseClient
         .from('vargar')
         .insert({
            datum: datum,
            lat: lat,
            lon: lon,
            antal: antal,
            kommun_id: kommunId
         });

      if (error) {
         alert('Fel: ' + error.message);
         console.log("Fel!" + error.message);
         return;
      }
      alert('✅ Sparad!');

      document.getElementById("kommunSelect").value = '';
      document.getElementById("datumInput").value = '';
      document.getElementById("latInput").value = '';
      document.getElementById("lonInput").value = '';
      document.getElementById("antalInput").value = '';

      laddaObservationer();

   } catch (error) {
      console.log('Nätverksfel: ' + error.message);
   }
}
// -------------------------------------------------------



// === UPPDATERA SIDAN I REALTID OM DB UPPDATERAS ===
mySupabaseClient
   .channel('vargar')
   .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'vargar' },
      () => laddaObservationer()
   )
   .subscribe();

skapaLoggar.log('Supabase har uppdaterats');
// -------------------------------------------------------