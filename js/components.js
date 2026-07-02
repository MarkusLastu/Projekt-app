import { skapaLoggar } from "./ui.js";

export const nav = `    
        <div><a href="index.html">Hem</a></div>
        <div><a href="projektinfo.html">Projektinfo</a></div>
        <div><a href="statusar.html">Systemstatus</a></div>    
`;


export const footer = `    
        <p>Marcus Berggren&trade; | Markus Lasumäki&trade; | Nicklas Larsson&trade; | 2026</p>      
`;

export const themeToggle = document.getElementById("themeToggle");

export function updateThemeButton() {
        const html = document.documentElement
        if (document.body.classList.contains("dark-mode")) {
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
}



export function renderWikiInfo(data) {
        skapaLoggar(renderWikiInfo, 'start', 'Renderar wikiData...');
        const injectWikiLabel = document.getElementById('wikiLabel');
        const injectWikiData = document.getElementById('wikiData');
        const injectWikiImg = document.getElementById('wikiImg');

        console.log(data);
        

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
                                Läs mer på Wikipedia
                        </a>
                </p>
                `);
        skapaLoggar(renderWikiInfo, 'ok', 'wikiData klar');
}