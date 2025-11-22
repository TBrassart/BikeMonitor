// src/services/weatherService.js

export const weatherService = {
    async getLocalWeather() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Géolocalisation non supportée"));
                return;
            }

            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // API Open-Meteo (Gratuite)
                    const response = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`
                    );
                    const data = await response.json();
                    
                    resolve({
                        temp: Math.round(data.current.temperature_2m),
                        precip: data.current.precipitation,
                        wind: Math.round(data.current.wind_speed_10m),
                        code: data.current.weather_code,
                        isWet: data.current.precipitation > 0 || (data.current.weather_code >= 51 && data.current.weather_code <= 67) || (data.current.weather_code >= 80)
                    });
                } catch (error) {
                    reject(error);
                }
            }, (err) => {
                reject(err);
            });
        });
    },

    // Helper pour traduire les codes WMO en texte/icône
    getWeatherInfo(code) {
        if (code === 0) return { label: "Grand Soleil", icon: "☀️", status: "ideal" };
        if (code <= 3) return { label: "Nuageux", icon: "☁️", status: "good" };
        if (code <= 48) return { label: "Brouillard", icon: "🌫️", status: "warning" };
        if (code <= 67) return { label: "Pluie", icon: "🌧️", status: "wet" };
        if (code <= 77) return { label: "Neige", icon: "❄️", status: "bad" };
        if (code <= 82) return { label: "Averses", icon: "🌦️", status: "wet" };
        if (code <= 99) return { label: "Orage", icon: "⚡", status: "bad" };
        return { label: "Inconnu", icon: "❓", status: "neutral" };
    }
};