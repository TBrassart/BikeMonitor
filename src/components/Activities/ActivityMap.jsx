import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Petit utilitaire pour recentrer la carte sur la trace
function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [bounds, map]);
    return null;
}

// Algorithme de décodage Polyline (Google Algorithm)
// Transforme la string "_p~iF~ps|U_ulLnnqC_mqNvxq`@" en latitude/longitude
const decodePolyline = (encoded) => {
    if (!encoded) return [];
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
};

const ActivityMap = ({ polyline }) => {
    const positions = useMemo(() => decodePolyline(polyline), [polyline]);

    if (!positions || positions.length === 0) return <div style={{height:'100%', background:'#111'}}>Pas de tracé GPS</div>;

    return (
        <MapContainer 
            center={positions[0]} 
            zoom={13} 
            style={{ height: '100%', width: '100%', borderRadius: '16px 16px 0 0', zIndex: 0 }}
            zoomControl={false} // On retire les boutons +/- pour le style épuré
            dragging={true}
            scrollWheelZoom={false} // On évite de zoomer par erreur en scrollant la page
        >
            {/* FOND DE CARTE SOMBRE (CartoDB Dark Matter) */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* LA TRACE EN BLEU NÉON */}
            <Polyline 
                positions={positions} 
                pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.8 }} 
            />
            
            <ChangeView bounds={positions} />
        </MapContainer>
    );
};

export default ActivityMap;