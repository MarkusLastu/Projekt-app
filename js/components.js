
export const nav = `    
        <div><a href="index.html">Hem</a></div>
        <div><a href="projektinfo.html">Info om projektet</a></div>
        <div><a href="statusar.html">Statusar för anrop</a></div>    
`;


export const footer = `    
        <p>Marcus Berggren&trade; | Markus Lasumäki&trade; | Nicklas Larsson&trade; | 2026</p>      
`;

export const themeToggle = document.getElementById("themeToggle");

function updateThemeButton() {
        if (document.body.classList.contains("dark-mode")) {
                themeToggle.textContent = "☀️ Ljust tema";
                themeToggle.classList.add("light-btn");
                themeToggle.classList.remove("dark-btn");
        } else {
                themeToggle.textContent = "🌙 Mörkt tema";
                themeToggle.classList.add("dark-btn");
                themeToggle.classList.remove("light-btn");
        }
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    updateThemeButton();
});

// Körs när sidan laddas
updateThemeButton();