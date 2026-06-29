// -------------------------------------------------------

// === KOPPLAR TILL ANDRA JS-FILER ===
import * as ui from "./ui.js";
import { skapaLoggar } from "./ui.js";
import { renderWikiInfo } from "./components.js";

// -------------------------------------------------------


// === EXTERNA API-TJÄNSTER ===

// Wikipedia
export async function hamtaWikiSammanfattning(sokord) {
    const wikiStatus = document.getElementById("wikiStatus");

    sokord = "Varg"
    skapaLoggar('Läser från Wikipedia...', wikiStatus);

    try {
        const url = `https://sv.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sokord)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Hittade ingen Wikipedia-artikel');
        const data = await response.json();

        skapaLoggar('✅ Wikipedia inläst', wikiStatus);
        console.log(data);

        renderWikiInfo(data);

        return {
            titel: data.title,
            text: data.extract,
            bildUrl: data.thumbnail ? data.thumbnail.source : null
        };




    } catch (error) {
        skapaLoggar('Wikipedia-fel:'+ error, wikiStatus);
        return null;
    }
}

// Unsplash
export async function hamtaBakgrundsbild(sokord) {
    const unsplashStatus = document.getElementById("unsplashStatus");
    skapaLoggar('Läser från Unsplash...', unsplashStatus);

    const accessKey = 'z3_YcJGOVhxQf56FRurRqQCy0z35MDLvLI3tXq_4yKI';

    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(sokord)}&client_id=${accessKey}&per_page=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Kunde inte hämta bild från Unsplash');
        const data = await response.json();
        if (data.results.length === 0) return null;

        skapaLoggar('✅ Unsplash inläst', unsplashStatus);
        return {
            url: data.results[0].urls.regular,
            altText: data.results[0].alt_description
        };

    } catch (error) {
        console.error('Unsplash-fel:', error);
        return null;
    }
}


//VÄDER ----------------------------------------------------------

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
export async function hamtaVader(lat, lon, datum) {

    const weatherStatusElem = document.getElementById("weatherStatus");
    skapaLoggar("Hämtar väder via API...", weatherStatusElem)

    if (weatherStatusElem) {
        ui.skapaLoggar("⏳ Hämtar historiskt väderdata...", weatherStatusElem);
    }

    try {
        //Formaterar datumet till YYYY-MM-DD pga API:n kräver det
        const d = new Date(datum);
        const aaaa = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const formateratDatum = `${aaaa}-${mm}-${dd}`;

        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${formateratDatum}&end_date=${formateratDatum}&daily=temperature_2m_max,weather_code&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Kunde inte hämta väderdata');

        const data = await response.json();

        const historiskVaderKod = data.daily.weather_code[0];
        const maxTemp = data.daily.temperature_2m_max[0];

        // Använder hjälpfunktionen tolkaVaderKod för att tolka väderkoden till text och emoji's
        const vaderInfo = tolkaVaderKod(historiskVaderKod);

        if (weatherStatusElem) {
            ui.skapaLoggar(`✅ Väder hämtat: ${maxTemp}°C, ${vaderInfo.text} ${vaderInfo.emoji}`, weatherStatusElem);
        }

        return {
            temp: maxTemp,
            beskrivning: vaderInfo.text,
            emoji: vaderInfo.emoji
        };

    } catch (error) {
        console.error("Väderfel:", error);

        if (weatherStatusElem) {
            ui.skapaLoggar("❌ Misslyckades att hämta väder", weatherStatusElem);
        }
        return null;
    }
}

// -----------------------------------------------------------------------------