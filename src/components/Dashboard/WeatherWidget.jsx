import React, { useState, useEffect } from 'react';
import { FaCloudSun, FaWind, FaTint, FaMapMarkerAlt, FaSun, FaCloudRain, FaSnowflake, FaBolt } from 'react-icons/fa';
import './WeatherWidget.css';

function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(fetchWeather, handleError);
        } else {
            setError("Géoloc non supportée");
            setLoading(false);
        }
    }, []);

    const fetchWeather = async (position) => {
        try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // API Open-Meteo (Gratuite, sans clé)
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            setWeather({
                temp: Math.round(data.current.temperature_2m),
                humidity: data.current.relative_humidity_2m,
                wind: Math.round(data.current.wind_speed_10m),
                code: data.current.weather_code,
                city: "Ma Position" // Open-Meteo ne donne pas la ville, on simplifie
            });
        } catch (err) {
            setError("Erreur météo");
        } finally {
            setLoading(false);
        }
    };

    const handleError = () => {
        setError("Position refusée");
        setLoading(false);
    };

    // Mapping Codes WMO -> Icônes & Textes
    const getWeatherInfo = (code) => {
        if (code === 0) return { icon: <FaSun className="weather-icon-main sun" />, text: "Ensoleillé" };
        if (code >= 1 && code <= 3) return { icon: <FaCloudSun className="weather-icon-main cloud" />, text: "Nuageux" };
        if (code >= 51 && code <= 67) return { icon: <FaCloudRain className="weather-icon-main rain" />, text: "Pluvieux" };
        if (code >= 71 && code <= 77) return { icon: <FaSnowflake className="weather-icon-main snow" />, text: "Neige" };
        if (code >= 95) return { icon: <FaBolt className="weather-icon-main storm" />, text: "Orage" };
        return { icon: <FaCloudSun className="weather-icon-main" />, text: "Variable" };
    };

    const getAdvice = (code, temp) => {
        if (code >= 51) return "Garde-boue obligatoires ! 🌧️";
        if (temp < 5) return "Couvre-chaussures et gants d'hiver ! 🥶";
        if (temp > 25) return "Prends deux bidons, il fait chaud ! ☀️";
        return "Conditions idéales pour rouler ! 🚴";
    };

    if (loading) return <div className="weather-widget glass-panel loading">Météo en cours...</div>;
    if (error || !weather) return <div className="weather-widget glass-panel error">{error || "Météo indisponible"}</div>;

    const info = getWeatherInfo(weather.code);

    return (
        <div className="weather-widget">
            <div className="weather-header">
                <span className="location"><FaMapMarkerAlt /> {weather.city}</span>
                <span className="today">Direct</span>
            </div>

            <div className="weather-main">
                {info.icon}
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