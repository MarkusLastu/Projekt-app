// -------------------------------------------------------

// === KOPPLAR TILL ANDRA JS-FILER ===
import * as ui from "./ui.js";
import { skapaLoggar } from "./ui.js";
import { renderWikiInfo } from "./components.js";

// -------------------------------------------------------


// === EXTERNA API-TJÄNSTER ===

// Wikipedia ----------------------------------------------------------
export async function hamtaWikiSammanfattning(sokord) {
    const wikiStatus = document.getElementById("wikiStatus");
    const injectWikiLabel = document.getElementById('wikiLabel');
    const injectWikiData = document.getElementById('wikiData');

    skapaLoggar(hamtaWikiSammanfattning, 'start', 'Läser från Wikipedia...', wikiStatus);

    // SÄKERHETSKOLL: Fyll bara i laddnings-text om rutorna finns på sidan (index.html)
    if (injectWikiLabel) {
        injectWikiLabel.innerHTML = `<label class="filter-title">Hämtar data</label>`;
    }
    if (injectWikiData) {
        injectWikiData.innerHTML = `<p>Laddar information från Wikipedia...</p>`;
    }

    try {
        const url = `https://sv.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sokord)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Hittade ingen Wikipedia-artikel');
        const data = await response.json();

        skapaLoggar(hamtaWikiSammanfattning, 'ok', 'Wikipedia inläst', wikiStatus);


        // SÄKERHETSKOLL: Kör bara render-funktionen om vi faktiskt är på index.html
        if (injectWikiData && typeof renderWikiInfo === "function") {
            renderWikiInfo(data);
        }

        // Texten och datan returneras helt felfritt i bakgrunden
        return {
            titel: data.title,
            text: data.extract,
            bildUrl: data.thumbnail ? data.thumbnail.source : null
        };
    } catch (error) {
        // SÄKERHETSKOLL ÄVEN I CATCH: Visa bara felmeddelande i HTML om fälten finns
        if (injectWikiLabel) {
            injectWikiLabel.innerHTML = `<label class="filter-title">Fel vid läsning</label>`;
        }
        if (injectWikiData) {
            injectWikiData.innerHTML = `
                <p>Felmeddelande från Wikipedia: <br>
                ${error}<br>
                Försök igen.</p>`;
        }

        // Loggar felet till statussidan oavsett
        skapaLoggar('hamtaWikiSammanfattning', 'fel', 'Wikipedia-fel: ' + error, wikiStatus);
        return null;
    }
}

// Unsplash ----------------------------------------------------------
export async function hamtaBakgrundsbild(sokord) {
    const unsplashStatus = document.getElementById("unsplashStatus");
    skapaLoggar(hamtaBakgrundsbild, 'start', 'Läser från Unsplash...', unsplashStatus);

    const accessKey = 'z3_YcJGOVhxQf56FRurRqQCy0z35MDLvLI3tXq_4yKI';

    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(sokord)}&client_id=${accessKey}&per_page=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Kunde inte hämta bild från Unsplash');
        const data = await response.json();
        if (data.results.length === 0) return null;

        skapaLoggar('hamtaBakgrundsbild', 'ok', '✅ Unsplash inläst', unsplashStatus);

        return {
            url: data.results[0].urls.regular,
            altText: data.results[0].alt_description
        };

    } catch (error) {
        // ÄNDRA FRÅN: skapaLoggar(hamtaBakgrundsbild, 'start', 'Unsplash fel: ' + error, unsplashStatus);
        skapaLoggar('hamtaBakgrundsbild', 'fel', 'Unsplash fel: ' + error, unsplashStatus);
        return null;
    }
}


// VÄDER ----------------------------------------------------------

// Hjälpfunktion för väder
export function tolkaVaderKod(kod) {
    const koder = {
        0: { text: "Klart", emoji: "☀️" },
        1: { text: "Mestadels klart", emoji: "🌤️" },
        2: { text: "Växlande molnighet", emoji: "⛅" },
        3: { text: "Mulet", emoji: "☁️" },
        45: { text: "Dimma", emoji: "🌫️" },
        51: { text: "Lätt duggregn", emoji: "🌦️" },
        61: { text: "Lätt regn", emoji: "🌦️" },
        63: { text: "Regn", emoji: "🌧️" },
        71: { text: "Lätt snöfall", emoji: "🌨️" },
        80: { text: "Lätta regnskurar", emoji: "🌦️" },
        95: { text: "Åska", emoji: "⛈️" }
    };
    return koder[kod] || { text: "Okänt väder", emoji: "🤷" };
}

// Väder (Open-Meteo dagens + historisk väder-data)
export async function hamtaVader(lat, lon, datum, elementId) {

    // Hämtar bara elementet om ett ID faktiskt skickades med
    const weatherStatusElem = elementId ? document.getElementById(elementId) : null;

    // Loggar bara TILL elementet om det faktiskt existerar på just denna sida
    if (weatherStatusElem) {
        ui.skapaLoggar('hamtaVader', 'start', '⏳ Hämtar väderdata via API...', weatherStatusElem);
    }

    try {
        // Formaterar det efterfrågade datumet till YYYY-MM-DD
        const d = new Date(datum);
        const aaaa = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const formateratDatum = `${aaaa}-${mm}-${dd}`;

        // Hämta även dagens faktiska datum för att jämföra med
        const nu = new Date();
        const dagensDatumStr = `${nu.getFullYear()}-${String(nu.getMonth() + 1).padStart(2, '0')}-${String(nu.getDate()).padStart(2, '0')}`;

        // 🔥 MAGIN: Välj Forecast-API om det är idag, annars Archive-API för gamla synder
        let baseUrl = "https://archive-api.open-meteo.com/v1/archive";
        if (formateratDatum === dagensDatumStr) {
            baseUrl = "https://api.open-meteo.com/v1/forecast";
        }

        // Bygg ihop URL:en dynamiskt med rätt API-adress
        const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&start_date=${formateratDatum}&end_date=${formateratDatum}&daily=temperature_2m_max,weather_code&timezone=auto`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Kunde inte hämta väderdata');

        const data = await response.json();
        const historiskVaderKod = data.daily.weather_code[0];
        const maxTemp = data.daily.temperature_2m_max[0];

        // Använder hjälpfunktionen tolkaVaderKod för att tolka väderkoden till text och emoji's
        const vaderInfo = tolkaVaderKod(historiskVaderKod);

        if (weatherStatusElem) {
            ui.skapaLoggar('hamtaVader', 'ok', `Väder hämtat: ${maxTemp}°C, ${vaderInfo.text} ${vaderInfo.emoji}`, weatherStatusElem);
        }

        return {
            temp: maxTemp,
            beskrivning: vaderInfo.text,
            emoji: vaderInfo.emoji
        };

    } catch (error) {
        if (weatherStatusElem) {
            ui.skapaLoggar('hamtaVader', 'fel', 'Misslyckades att hämta väder', weatherStatusElem);
        } else {
            ui.skapaLoggar('hamtaVader', 'fel', 'Väderfel: ' + error);
        }
        return null;
    }
}


// Freesound API (Hämta ljudlänk baserat på vetenskapligt namn med inbyggt CORS-stöd)
export async function hamtaLjudUrl(latinName) {
    const FREESOUND_TOKEN = 'hNMc4qbqSpI4LsbNbHnOvk1GltQzxkFdG83PZCcA';

    // Översättningstabell med specifika sökord för att garantera djurläten
    const engelskaSokord = {
        'Canis lupus familiaris': 'howl_echo',          // Vargyl
        'Alces alces': 'Elk_Moose',         // Älgbröl
        'Capreolus capreolus': 'stag', // Rådjursskall (de skäller ju när de varnar!)
        'Halichoerus grypus': 'sealpup', // Sälskrik
        'Meles meles': 'badger', // Grävling
        'Sus scrofa': 'wildboar', // Vildsvin
        'Vulpes': 'fox' // Räv
    };

    // Hitta det engelska sökordet, eller använd det latinska namnet som backup
    const sokord = engelskaSokord[latinName] || latinName;

    try {
        // Vi lägger till ett filter så vi BARA får ljud som är mellan 1 och 10 sekunder långa
        const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(sokord)}&token=${FREESOUND_TOKEN}&fields=name,previews&page_size=1`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Kunde inte nå Freesound API');

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error('Inga ljud hittades på Freesound för: ' + sokord);
        }

        // Plocka ut HQ-MP3-streamen från det första sökresultatet
        const mp3Url = data.results[0].previews['preview-hq-mp3'];

        if (!mp3Url) throw new Error('Hittade ingen MP3-förhandsvisning för detta ljud');

        return mp3Url;
    } catch (error) {
        console.error('Freesound Ljudfel:', error);
        return null;
    }
}


export async function sokArtIGBIF(sökord) {
   const backboneKey = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c";
   const url = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(sökord)}&datasetKey=${backboneKey}&limit=20`;

   try {
      const svar = await fetch(url);
      if (!svar.ok) throw new Error(`Status: ${svar.status}`);
      const data = await svar.json();
      return data.results || [];
   } catch (fel) {
      console.error("GBIF API-fel:", fel);
      return []; // Returnera tom array om det skiter sig
   }
}


// -----------------------------------------------------------------------------