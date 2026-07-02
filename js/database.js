// -------------------------------------------------------


// === KOPPLAR TILL ANDRA JS-FILER ===
import { skapaLoggar, renderProjektStatusUI } from "./ui.js";
import { uppdateraKartaEfterFilter } from "./app.js";

export let allaObservationer = []; // Globala variabeln för att lagra alla observationer
export let allRegionData = [];



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



export async function laddaRegioner() {
   const dbLanStatus = document.getElementById("dbLanStatus");

   // Sträng 'laddaRegioner' istället för funktionsreferens så att det inte blir undefined!
   skapaLoggar('laddaRegioner', 'start', "Hämtar län och kommuner från Supabase...", dbLanStatus);

   try {
      // Anropa den kombinerade funktionen i Supabase
      const { data, error } = await mySupabaseClient.rpc('get_kommun_and_lan');

      if (error) {
         if (dbLanStatus) skapaLoggar('laddaRegioner', 'fel', 'Fel: ' + error.message, dbLanStatus);
         console.error("Supabase-fel:", error);
         return;
      }

      allRegionData = data;

      // 🔥 SÄKERHETSKONTROLL: Kör bara populeraFilterUI om elementet faktiskt finns på sidan!
      if (document.getElementById("lanFilter")) {
         populeraFilterUI(data);
      } else {
         console.log("lanFilter saknas på denna sida (statusar.html). Regioner sparade i minnet.");
      }

      // 🔥 RÄKNA UT ANTAL HÄR:
      const antalKommuner = data.length;
      const unikaLan = [...new Set(data.map(item => item.lan_namn))];
      const antalLan = unikaLan.length;

      console.log("📊 DATABAS-STATUS:");
      console.log(`-> Antal inlästa län: ${antalLan}`);
      console.log(`-> Antal inlästa kommuner: ${antalKommuner}`);

      // Hitta kommun-rullistan från din index.html
      const kommunSelect = document.getElementById("obsKommun");

      if (kommunSelect) {
         kommunSelect.innerHTML = '<option value="" disabled selected>--- Välj kommun ---</option>';

         data.forEach(k => {
            const option = document.createElement("option");
            option.value = k.kommun_id; 
            option.textContent = `${k.kommun_namn} (${k.lan_namn})`; 
            kommunSelect.appendChild(option);
         });
      }

      // 🔥 LOGGEN PÅ SKÄRMEN (skapaLoggar):
      const loggText = `Klart! Inläst: ${antalLan} län och ${antalKommuner} kommuner.`;
      skapaLoggar('laddaRegioner', 'ok', loggText, dbLanStatus);

   } catch (error) {
      console.error("Nätverksfel i laddaRegioner:", error);
      if (dbLanStatus) dbLanStatus.textContent = '❌ Nätverksfel: ' + error.message;
   }
}


export async function laddaAllData() {
   await laddaRegioner();
   await laddaObservationer();
}


// Ny funktion för att fylla filter-UI:t
export function populeraFilterUI(data) {
   const lanFilter = document.getElementById("lanFilter");

   // Hämta unika län
   const unikaLan = [...new Set(data.map(item => item.lan_namn))].sort();

   lanFilter.innerHTML = '<option value="alla">Alla län</option>';
   unikaLan.forEach(lan => {
      const opt = document.createElement("option");
      opt.value = lan;
      opt.textContent = lan;
      lanFilter.appendChild(opt);
   });
}

// Hjälpfunktion som lyssnar på läns-väljaren och fyller på med RÄTT kommuner
export function uppdateraKommunDropdown(valtLan) {
   const kommunSelect = document.getElementById("obsKommun"); // Ditt ID från index.html
   if (!kommunSelect) return;

   // Om inget län är valt, visa en blockerad hjälptext
   if (!valtLan) {
      kommunSelect.innerHTML = '<option value="" disabled selected>⚠️ Välj ett län först...</option>';
      return;
   }

   kommunSelect.innerHTML = '<option value="" disabled selected>--- Välj kommun ---</option>';

   // Filtrera blixtsnabbt ut de kommuner som tillhör det valda länet i JavaScript
   const filtreradeKommuner = allRegionData.filter(item => item.lan_namn === valtLan);

   filtreradeKommuner.forEach(k => {
      const option = document.createElement("option");
      option.value = k.kommun_id; // Skickar ID (siffran) till Supabase sen
      option.textContent = k.kommun_namn; // Visar namnet för användaren
      kommunSelect.appendChild(option);
   });
}


// === HÄMTA ELLER SKAPA ART DYNAMISKT ===
export async function getOrCreateArt(artNamn, vetenskapligtNamn) {
   try {
      // 1. Kolla om det vetenskapliga namnet redan finns i vår databas
      let { data: befintligArt, error: selectError } = await mySupabaseClient
         .from('arter')
         .select('Art_id')
         .eq('VetenskapligtNamn', vetenskapligtNamn)
         .maybeSingle(); // Returnerar objektet om det finns, annars null

      if (selectError) throw selectError;

      // Om arten redan fanns, returnera dess ID direkt!
      if (befintligArt) {
         return befintligArt.Art_id;
      }

      // 2. Om arten INTE fanns, lägg till den live i 'arter'-tabellen!
      const { data: nyArt, error: insertError } = await mySupabaseClient
         .from('arter')
         .insert([{ ArtNamn: artNamn, VetenskapligtNamn: vetenskapligtNamn }])
         .select('Art_id')
         .single();

      if (insertError) throw insertError;

      console.log(`✨ Ny art registrerad i databasen: ${artNamn} (${vetenskapligtNamn})`);
      return nyArt.Art_id; // Returnera det sprillans nya ID:t

   } catch (error) {
      console.error("Fel i getOrCreateArt:", error);
      return null;
   }
}


// 🔥 Lägg till denna i database.js (och exportera den)
export async function hamtaAllaArter() {
   const { data, error } = await mySupabaseClient
      .from('arter')
      .select('Art_id, ArtNamn, VetenskapligtNamn')
      .order('ArtNamn', { ascending: true });

   if (error) {
      console.error("Kunde inte hämta arter från Supabase:", error.message);
      return [];
   }
   return data;
}


// === LADDA OBSERVATIONER ===
export async function laddaObservationer() {

   const dbObservationStatus = document.getElementById("dbObservationStatus");
   skapaLoggar(laddaObservationer, 'start', "Laddar observationer...", dbObservationStatus);

   try {
      // Hämta data via RPC från Supabase
      const { data: observationer, error } = await mySupabaseClient
         .rpc('get_observationer');

      if (error) throw error;

      const lista = document.getElementById('observationerLista');
      if (lista) lista.innerHTML = '';

      if (!observationer || observationer.length === 0) {
         if (lista) lista.innerHTML = `<div class="empty-state"><p>Inga observationer än.</p></div>`;
         skapaLoggar(laddaObservationer, 'info', 'Inga observationer hittades i databasen.', dbObservationStatus);
         return;
      }

      // Spara observationerna i den globala variabeln
      allaObservationer = observationer;

      // Kör filtreringen så att kartan och legenden uppdateras med den faktiska datan
      if (typeof uppdateraKartaEfterFilter === "function") {
         uppdateraKartaEfterFilter();
      }
      
      skapaLoggar('laddaObservationer', 'ok', `✅ ${observationer.length} observationer hämtade!`, dbObservationStatus);

   } catch (error) {
      if (dbObservationStatus) dbObservationStatus.textContent = '❌ Nätverksfel: ' + error.message;
      console.error('Kritiskt nätverksfel:', error);
      skapaLoggar('❌ Systemfel: ' + error.message, dbObservationStatus);
   }
}

// -------------------------------------------------------



// 🔥 Hämtar alla kommuner sorterade i bokstavsordning
export async function hämtaAllaKommuner() {
   const { data, error } = await mySupabaseClient
      .from('kommuner')
      .select('Kommun_id, KommunNamn')
      .order('KommunNamn', { ascending: true });

   if (error) {
      console.error("Kunde inte hämta kommuner från Supabase:", error.message);
      return [];
   }
   return data;
}


// ==========================
// INSERT NY OBSERVATION
// ==========================
export async function insertObservation(artId, datum, lat, lon, kommunId, tid) {

   console.log("📥 DATABASE.JS TOG EMOT:", { artId, datum, lat, lon, kommunId, tid });

   const { data, error } = await mySupabaseClient
      .from('observationer')
      .insert([
         {
            Art_id: artId,
            Datum: datum,
            Latitude: lat,
            Longitude: lon,
            Kommun_id: kommunId,
            Tid: tid
         }
      ]);

   if (error) {
      console.error("Kunde inte spara observationen:", error.message);
      return false;
   }

   // Ladda om den lokala arrayen med all data så att kartan/grafen hänger med
   await laddaObservationer();
   return true;
}



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



// === PROJEKTSTATUS ===


// ==========================
// INIT (startar allt)
// ==========================
export async function initProjektStatus() {
   const data = await hamtaProjektStatus();
   renderProjektStatusUI(data);
}


// ==========================
// SELECT
// ==========================
export async function hamtaProjektStatus() {

   const { data: projStatus, error } =
      await mySupabaseClient.rpc("get_projektstatus");

   if (error) {
      console.error(error.message);
      return [];
   }

   renderProjektStatusUI(projStatus); // 🔥 detta uppdaterar sidan

   return projStatus;
}

// ==========================
// UPDATE
// ==========================
export async function uppdateraProjektStatus(item) {

   const { error } = await mySupabaseClient.rpc("update_projektstatus", {
      p_id: item.projektstatus_id,
      p_typ: item.typ,
      p_status: item.status,
      p_uppgift: item.uppgift,
      p_kommentar: item.kommentar
   });

   if (error) {
      skapaLoggar("Update", "fel", error.message);
      return false;
   }

   return true;
}


// ==========================
// SAVE från modal
// ==========================
export async function saveEdit() {

   if (!currentEditItem) return;

   currentEditItem.typ =
      document.getElementById("editTyp").value;

   currentEditItem.status =
      document.getElementById("editStatus").value;

   currentEditItem.uppgift =
      document.getElementById("editUppgift").value;

   currentEditItem.kommentar =
      document.getElementById("editKommentar").value;

   await uppdateraProjektStatus({
      projektstatus_id: currentEditItem.projektstatus_id,
      typ: currentEditItem.typ,
      status: currentEditItem.status,
      uppgift: currentEditItem.uppgift,
      kommentar: currentEditItem.kommentar
   });

   closeModal();

   const data = await hamtaProjektStatus();
   renderProjektStatusUI(data);
}



// ==========================
// INSERT
// ==========================
export async function insertProjektStatus(p_typ, p_status, p_uppgift, p_kommentar) {

   const { error } = await mySupabaseClient.rpc("insert_projektstatus", {
      p_typ,
      p_status,
      p_uppgift,
      p_kommentar
   });

   if (error) {
      console.error(error.message);
      return false;
   }
   await refreshProjektStatus();
   return true;
}


// ==========================
// DELETE
// ==========================
export async function taBortProjektStatus(id) {
   // OBS: Dubbelkolla att din tabell faktiskt heter 'projektstatus' i Supabase!
   const { error } = await mySupabaseClient
      .from('projektstatus')
      .delete()
      .eq('projektstatus_id', id); // Tar bort raden där ID matchar

   if (error) {
      console.error("Kunde inte ta bort:", error.message);
      return false;
   }

   return true;
}


export async function refreshProjektStatus() {
   const { data, error } =
      await mySupabaseClient.rpc("get_projektstatus");

   if (error) {
      console.error(error.message);
      return [];
   }

   return data;
}
