// -------------------------------------------------------

// === KOPPLAR TILL ANDRA JS-FILER ===
import * as ui from "./ui.js";
import { skapaLoggar } from "./ui.js";

// -------------------------------------------------------


// === EXTERNA API-TJÄNSTER ===

// Wikipedia
export async function hamtaWikiSammanfattning(sokord) {
    const wikiStatus = document.getElementById("wikiStatus");
    skapaLoggar('Läser från Wikipedia...', wikiStatus);


    try {
        const url = `https://sv.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sokord)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Hittade ingen Wikipedia-artikel');
        const data = await response.json();

        skapaLoggar('✅ Wikipedia inläst', wikiStatus);
        return {
            titel: data.title,
            text: data.extract,
            bildUrl: data.thumbnail ? data.thumbnail.source : null
        };

    } catch (error) {
        console.error('Wikipedia-fel:', error);
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

// Väder (Open-Meteo)
export async function hamtaVader(lat, lon) {
    const weatherStatusElem = document.getElementById("weatherStatus");

    if (weatherStatusElem) {
        ui.skapaLoggar("⏳ Hämtar väderdata...", weatherStatusElem);
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Kunde inte hämta väderdata');

        const data = await response.json();

        // Använd din hjälpfunktion för att tolka koden!
        const vaderInfo = tolkaVaderKod(data.current.weather_code);

        if (weatherStatusElem) {
            ui.skapaLoggar(`✅ Väder hämtat: ${data.current.temperature_2m}°C, ${vaderInfo.text} ${vaderInfo.emoji}`, weatherStatusElem);
        }

        return {
            temp: data.current.temperature_2m,
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