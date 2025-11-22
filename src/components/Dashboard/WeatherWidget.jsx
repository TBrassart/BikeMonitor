import React, { useState, useEffect } from 'react';
import { weatherService } from '../../services/weatherService';
import { FaTint, FaWind, FaExclamationCircle } from 'react-icons/fa';
import './WeatherWidget.css';

const WeatherWidget = () => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        weatherService.getLocalWeather()
            .then(data => {
                setWeather(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Météo indisponible (Activez la localisation)");
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="weather-widget loading">Chargement météo...</div>;
    if (error) return <div className="weather-widget error">{error}</div>;

    const info = weatherService.getWeatherInfo(weather.code);

    return (
        <div className={`weather-widget ${info.status}`}>
            <div className="weather-main">
                <span className="weather-icon">{info.icon}</span>
                <div className="weather-temp">
                    {weather.temp}°C
                    <span className="weather-label">{info.label}</span>
                </div>
            </div>

            <div className="weather-details">
                <div className="detail-item">
                    <FaWind /> {weather.wind} km/h
                </div>
                <div className="detail-item">
                    <FaTint /> {weather.precip} mm
                </div>
            </div>

            {/* ALERTE PRESSION PNEUS */}
            {weather.isWet && (
                <div className="tire-alert">
                    <FaExclamationCircle />
                    <div>
                        <strong>Route humide !</strong>
                        <p>Conseil : Baisse ta pression de 0.3 à 0.5 bar.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeatherWidget;