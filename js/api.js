// supabase

const minSupabaseKlient = window.supabase.createClient(
    'https://tevnovztzryjomtrtkcc.supabase.co/',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldm5vdnp0enJ5am9tdHJ0a2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MzYzNjAsImV4cCI6MjA5ODAxMjM2MH0.Av5W6Xbt4oMgZcMxvkmVPrGYLxtQL9-lTYPmJQZhLRo'
);

console.log('Ansluten med minSupabaseKlient')

// ladda arter

async function arter() {
    const select = document.getElementById('ArtNamnSelect');
    const status = document.getElementById('status');

    status.textContent = '🔄 Hämtar arter...';

    try {
        const { data, error } = await minSupabaseKlient
            .from('Arter')
            .select('Art_id, ArtNamn')
            .order('ArtNamn'); 

        if (error) {
            status.textContent = '❌ Fel: ' + error.message;
            return;
        }

        select.innerHTML = '<option value="">-- Välj art --</option>';

        data.forEach(artItem => {
            const option = document.createElement('option');
            option.value = artItem.Art_id;
            option.textContent = artItem.ArtNamn;
            select.appendChild(option);
        });

        status.textContent = '✅ ' + data.length + ' arter laddade!';

    } catch (error) {
        status.textContent = '❌ Nätverksfel: ' + error.message;
    }
}

// ladda observationer

async function laddaObservationer() {
    try {
        const { data, error } = await minSupabaseKlient
            .from('Observationer')
            // Magi: Vi hämtar all data från Observationer, OCH artnamnet från Arter-tabellen!
            .select('*, Arter(ArtNamn)') 
            .order('Datum', { ascending: false });

        if (error) {
            console.error('Fel:', error);
            return;
        }

        const lista = document.getElementById('observationerLista');
        lista.innerHTML = '';

        if (!data || data.length === 0) {
            lista.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">🐾</span>
                    <p>Inga observationer än.</p>
                </div>
            `;
            return;
        }

        data.forEach(obs => {
            const div = document.createElement('div');
            div.className = 'observation';

            const datum = new Date(obs.Datum).toLocaleDateString('sv-SE');
            
            // Om koppling finns, hämta namnet. Annars skriv "Okänt djur"
            const artNamn = obs.Arter ? obs.Arter.ArtNamn : 'Okänt djur'; 

            div.innerHTML = `
                <div class="lan">${obs.Lan || 'Okänt län'}</div>
                <div class="datum">📅 ${datum}</div>
                <div class="koordinater">📍 ${obs.Latitude}, ${obs.Longitude}</div>
                <div>🐾 ${artNamn}</div>
            `;
            lista.appendChild(div);
        });

        console.log('✅', data.length, 'observationer');
    } catch (error) {
        console.error('Nätverksfel:', error);
    }
}

// spara observationer

async function sparaObservation() {

    const lanId = parseInt(document.getElementById('lanSelect').value);
    const datum = document.getElementById('datumInput').value;
    const lat = parseFloat(document.getElementById('latInput').value);
    const lon = parseFloat(document.getElementById('lonInput').value);
    const antal = parseInt(document.getElementById('antalInput').value) || 1;

    if (!artId) {
        alert('Välj en art!');
        return;
    }
    if (!datum) {
        alert('Välj ett datum!');
        return;
    }
    if (isNaN(lat) || isNaN(lon)) {
        alert('Ange koordinater!');
        return;
    }

    try {

        const { data: lanData } = await minSupabaseKlient
            .from('land')
            .select('lan')
            .eq('id', lanId)
            .single();

        const { error } = await minSupabaseKlient
            .from('observationer')
            .insert({
                datum: datum,
                lan: lanData.lan,
                lan_id: lanId,
                lat: lat,
                lon: lon,
                antal: antal
            });

        if (error) {
            alert('Fel: ' + error.message);
            return;
        }

        alert('✅ Sparad!');

        document.getElementById('datumInput').value = '';
        document.getElementById('latInput').value = '';
        document.getElementById('lonInput').value = '';

        laddaObservationer();

    } catch (error) {
        alert('Nätverksfel: ' + error.message);
    }
}

// ladda allt

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Appen startar...');
    document.getElementById('sparaBtn').addEventListener('click', sparaObservation);

    laddaLan(); // Ändrad från laddaKommuner()
    laddaObservationer();
});

//realtid

minSupabaseKlient
    .channel('vargar')
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vargar' },
        () => laddaObservationer()
    )
    .subscribe();


//wikipedia

async function hamtaWikiSammanfattning(sokord) {
    try {
        // encodeURIComponent hanterar å, ä, ö och mellanslag i länets namn
        const url = `https://sv.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sokord)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Hittade ingen Wikipedia-artikkel');

        const data = await response.json();

        // Returnerar ett färdigt objekt med .extract (text) och .thumbnail.source (bild)
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


//unsplash bakgrundsbild

async function hamtaBakgrundsbild(sokord) {
    const accessKey = 'KLISTRA_IN_DIN_UNSPLASH_ACCESS_KEY_HÄR';
    
    try {
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(sokord)}&client_id=${accessKey}&per_page=1`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Kunde inte hämta bild från Unsplash');
        
        const data = await response.json();
        
        if (data.results.length === 0) return null;
        
        // Returnerar bildens URL och en alternativ text för tillgänglighet
        return {
            url: data.results[0].urls.regular,
            altText: data.results[0].alt_description
        };
    } catch (error) {
        console.error('Unsplash-fel:', error);
        return null;
    }
}


//Väder

async function hamtaVader(lat, lon) {
    try {
        // Vi anropar Open-Meteo med latitud och longitud, och ber om aktuell temperatur och väderkod
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Kunde inte hämta väderdata från Open-Meteo');
        
        const data = await response.json();
        
        // Hämta värdena från API-svaret
        const temp = data.current.temperature_2m;
        const vaderKod = data.current.weather_code;
        
        // Översätt Open-Meteos sifferkod till svensk text och emoji
        const vaderInfo = tolkaVaderKod(vaderKod);
        
        return {
            temp: temp,
            beskrivning: vaderInfo.text,
            emoji: vaderInfo.emoji
        };
    } catch (error) {
        console.error('Open-Meteo fel:', error);
        return null;
    }
}

// Hjälpfunktion för och översätta Open-Meteos WMO-väderkoder
function tolkaVaderKod(kod) {
    const koder = {
        0: { text: "Klart", emoji: "☀️" },
        1: { text: "Mestadels klart", emoji: "🌤️" },
        2: { text: "Växlande molnighet", emoji: "⛅" },
        3: { text: "Mulet", emoji: "☁️" },
        45: { text: "Dimma", emoji: "🌫️" },
        48: { text: "Rimmfrost-dimma", emoji: "🌫️" },
        51: { text: "Lätt duggregn", emoji: "🌦️" },
        53: { text: "Duggregn", emoji: "🌧️" },
        55: { text: "Tätt duggregn", emoji: "🌧️" },
        61: { text: "Lätt regn", emoji: "🌦️" },
        63: { text: "Regn", emoji: "🌧️" },
        65: { text: "Kraftigt regn", emoji: "🌧️" },
        71: { text: "Lätt snöfall", emoji: "盒️" },
        73: { text: "Snöfall", emoji: "🌨️" },
        75: { text: "Kraftigt snöfall", emoji: "❄️" },
        77: { text: "Snökorn", emoji: "❄️" },
        80: { text: "Lätta regnskurar", emoji: "🌦️" },
        81: { text: "Regnskurar", emoji: "🌧️" },
        82: { text: "Kraftiga regnskurar", emoji: "🌧️" },
        85: { text: "Lätta snöskurar", emoji: "🌨️" },
        86: { text: "Kraftiga snöskurar", emoji: "❄️" },
        95: { text: "Åska", emoji: "⛈️" }
    };

    // Om koden inte finns i listan, returnera ett standardfall
    return koder[kod] || { text: "Okänt väder", emoji: "🤷" };
}