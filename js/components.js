import { skapaLoggar } from "./ui.js";
// Nollställ allt till ljust läge direkt när scriptet laddas
document.body.classList.remove("dark-mode");
document.documentElement.dataset.theme = "light";
if (localStorage.getItem("theme")) {
    localStorage.removeItem("theme");
}
//Navigation med länkar till de olika sidorna
export const nav = `    
        <div><a href="index.html">Hem</a></div>
        <div><a href="projektinfo.html">Projektinfo</a></div>
        <div><a href="statusar.html">Systemstatus</a></div>    
`;

//Footer med namn på gruppmedlemmar och årtal
export const footer = `    
        <p>Marcus Berggren&trade; | Markus Lasumäki&trade; | Nicklas Larsson&trade; | 2026</p>      
`;

//Variabler för att byta mellan ljust och mörkt tema
export const themeToggle = document.getElementById("themeToggle");

// Om knappen finns på sidan, se till att texten matchar det ljusa startläget direkt
if (themeToggle) {
        themeToggle.textContent = "🌙 Mörkt tema";
        themeToggle.classList.add("dark-btn");
        themeToggle.classList.remove("light-btn");
}

export function updateThemeButton() {
        const html = document.documentElement;
        const isDarkMode = document.body.classList.contains("dark-mode");

        if (isDarkMode) {
                themeToggle.textContent = "☀️ Ljust tema";
                themeToggle.classList.add("light-btn");
                themeToggle.classList.remove("dark-btn");
                html.dataset.theme = "dark";
        } else {
                themeToggle.textContent = "🌙 Mörkt tema";
                themeToggle.classList.add("dark-btn");
                themeToggle.classList.remove("light-btn");
                html.dataset.theme = "light";
        }

        // KOPPLINGEN TILL DIAGRAMMET
        try {
                const aktivGraf = Chart.getChart("trendsChart");
                
                if (aktivGraf) {
                        const textFarg = isDarkMode ? "#ffffff" : "#333333";
                        
                        // 1. Uppdatera färgen på artnamnen (legenden)
                        aktivGraf.options.plugins.legend.labels.color = textFarg;
                        
                        // 2. Uppdatera färgen på axlarna och siffrorna
                        if (aktivGraf.options.scales.x?.ticks) aktivGraf.options.scales.x.ticks.color = textFarg;
                        if (aktivGraf.options.scales.y?.ticks) aktivGraf.options.scales.y.ticks.color = textFarg;
                        
                        // 3. Rita omedelbart om diagrammet med de nya färgerna!
                        aktivGraf.update();
                }
        } catch (error) {
                console.log("Ingen aktiv trendsChart hittades på den här undersidan.");
        }
}

//Lägger ut data från Wikipedia från Valt Djur på kartan
export function renderWikiInfo(data) {
        skapaLoggar(renderWikiInfo, 'start', 'Renderar wikiData...');
        const injectWikiLabel = document.getElementById('wikiLabel');
        const injectWikiData = document.getElementById('wikiData');
        const injectWikiImg = document.getElementById('wikiImg');

        console.log(data);

        // Gör så att Fakta har en länk som leder till Wikipedia i ny flik
        injectWikiLabel.innerHTML = (`<label class="filter-title">${data.title}</label>`);
        injectWikiData.innerHTML = (`
                ${data.extract_html}
                <br>
                ${data.thumbnail?.source
                        ? `<img class="wiki-img" src="${data.thumbnail.source}" alt="${data.title}">`
                        : ""
                }
        
                <p class="wiki-url">
                        <a href="${data.content_urls?.desktop?.page}" target="_blank" rel="noopener noreferrer">
                                <u>Läs mer på Wikipedia här!</u>
                        </a>
                </p>
                `);
        skapaLoggar(renderWikiInfo, 'ok', 'wikiData klar');
}