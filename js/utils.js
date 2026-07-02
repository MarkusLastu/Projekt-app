




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