import React from 'react';
import { FaCloudSun, FaWind, FaTint, FaMapMarkerAlt } from 'react-icons/fa';
import './WeatherWidget.css';

function WeatherWidget() {
    // Données simulées pour l'instant (Mode UI Design)
    const weather = {
        temp: 18,
        condition: 'Éclaircies',
        wind: 12,
        humidity: 45,
        location: 'Mon Garage'
    };

    return (
        <div className="weather-widget">
            <div className="weather-header">
                <span className="location"><FaMapMarkerAlt /> {weather.location}</span>
                <span className="today">Aujourd'hui</span>
            </div>

            <div className="weather-main">
                <FaCloudSun className="weather-icon-main" />
                <div className="temp-box">
                    <span className="temp">{weather.temp}°</span>
                    <span className="cond">{weather.condition}</span>
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
                Condition idéale pour une sortie longue ! 🚴
            </div>
        </div>
    );
}

export default WeatherWidget;