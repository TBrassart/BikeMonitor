import React, { useState, useEffect } from 'react';
import { FaCloudSun, FaWind, FaTint, FaMapMarkerAlt, FaSun, FaCloudRain, FaSnowflake, FaBolt, FaMoon, FaCloudMoon } from 'react-icons/fa';
import './WeatherWidget.css';

function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(fetchWeather, handleError);
        } else {
            setError("Géoloc refusée");
            setLoading(false);
        }
    }, []);

    const fetchWeather = async (position) => {
        try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // Ajout de 'is_day' pour savoir s'il fait nuit
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            setWeather({
                temp: Math.round(data.current.temperature_2m),
                humidity: data.current.relative_humidity_2m,
                wind: Math.round(data.current.wind_speed_10m),
                code: data.current.weather_code,
                isDay: data.current.is_day === 1, // 1 = Jour, 0 = Nuit
                city: "Ma Position"
            });
        } catch (err) {
            setError("Erreur météo");
        } finally {
            setLoading(false);
        }
    };

    const handleError = () => {
        setError("Position introuvable");
        setLoading(false);
    };

    // Logique d'icône et couleur dynamique
    const getWeatherInfo = (code, isDay) => {
        // NUIT
        if (!isDay) {
            if (code === 0) return { icon: <FaMoon />, text: "Nuit claire", color: "moon" };
            if (code <= 3) return { icon: <FaCloudMoon />, text: "Nuit voilée", color: "cloudy" };
        }

        // JOUR (ou mauvais temps la nuit aussi)
        if (code === 0) return { icon: <FaSun />, text: "Ensoleillé", color: "sun" };
        if (code <= 3) return { icon: <FaCloudSun />, text: "Nuageux", color: "cloudy" };
        
        if (code >= 51 && code <= 67) return { icon: <FaCloudRain />, text: "Pluvieux", color: "rain" };
        if (code >= 71 && code <= 77) return { icon: <FaSnowflake />, text: "Neige", color: "snow" };
        if (code >= 95) return { icon: <FaBolt />, text: "Orage", color: "storm" };
        
        return { icon: <FaCloudSun />, text: "Variable", color: "cloudy" };
    };

    const getAdvice = (code, temp) => {
        if (code >= 51) return "Garde-boue obligatoires ! 🌧️";
        if (temp < 5) return "Gants d'hiver recommandés ! 🥶";
        if (temp > 25) return "Hydratation max ! ☀️";
        return "Conditions idéales pour rouler ! 🚴";
    };

    if (loading) return <div className="weather-widget glass-panel loading">Chargement...</div>;
    if (error || !weather) return <div className="weather-widget glass-panel error">{error || "Météo HS"}</div>;

    const info = getWeatherInfo(weather.code, weather.isDay);

    return (
        <div className={`weather-widget ${!weather.isDay ? 'night-mode' : ''}`}>
            <div className="weather-header">
                <span className="location"><FaMapMarkerAlt /> {weather.city}</span>
                <span className="today">Direct</span>
            </div>

            <div className="weather-main">
                {/* On applique la classe de couleur dynamique ici */}
                <div className={`weather-icon-main ${info.color}`}>
                    {info.icon}
                </div>
                <div className="temp-box">
                    <span className="temp">{weather.temp}°</span>
                    <span className="cond">{info.text}</span>
                </div>
            </div>

            <div className="weather-details">
                <div className="w-detail">
                    <FaWind className="w-icon" />
                    <span>{weather.wind} km/h</span>
                </div>
                <div className="w-detail">
                    <FaTint className="w-icon" />
                    <span>{weather.humidity}%</span>
                </div>
            </div>
            
            <div className="advice-box">
                {getAdvice(weather.code, weather.temp)}
            </div>
        </div>
    );
}

export default WeatherWidget;