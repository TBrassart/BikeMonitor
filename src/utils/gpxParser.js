import { DOMParser } from 'xmldom';
import toGeoJSON from '@mapbox/togeojson';

// --- 1. FONCTION D'ENCODAGE MANUELLE (Remplace la librairie googlemaps) ---
const encodePolyline = (coordinates) => {
    let str = '';
    let lastLat = 0;
    let lastLng = 0;

    for (const coordinate of coordinates) {
        // On multiplie par 1e5 (standard Google)
        let lat = Math.round(coordinate[0] * 1e5);
        let lng = Math.round(coordinate[1] * 1e5);

        let dLat = lat - lastLat;
        let dLng = lng - lastLng;

        lastLat = lat;
        lastLng = lng;

        str += encodeValue(dLat) + encodeValue(dLng);
    }
    return str;
};

const encodeValue = (value) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let str = '';
    while (v >= 0x20) {
        str += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
        v >>= 5;
    }
    str += String.fromCharCode(v + 63);
    return str;
};
// -------------------------------------------------------------------

export const parseGpxFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const gpxStr = e.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(gpxStr, "text/xml");
                const geoJSON = toGeoJSON.gpx(xmlDoc);

                if (!geoJSON.features || geoJSON.features.length === 0) throw new Error("Fichier GPX invalide");

                const track = geoJSON.features.find(f => f.geometry.type === "LineString");
                if (!track) throw new Error("Aucun tracé trouvé");

                const coords = track.geometry.coordinates; // [lon, lat, elev]

                // Utilisation de notre fonction manuelle (Note: elle attend [lat, lon])
                const pathForEncode = coords.map(c => [c[1], c[0]]);
                const polyline = encodePolyline(pathForEncode);

                let distance = 0;
                let elevationGain = 0;
                
                for (let i = 0; i < coords.length - 1; i++) {
                    const [lon1, lat1, ele1] = coords[i];
                    const [lon2, lat2, ele2] = coords[i+1];
                    distance += getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
                    if (ele2 > ele1) elevationGain += (ele2 - ele1);
                }

                const startTime = track.properties?.time ? new Date(track.properties.time).toISOString() : new Date().toISOString();

                resolve({
                    distance: parseFloat(distance.toFixed(2)),
                    elevation: Math.round(elevationGain),
                    polyline,
                    startDate: startTime,
                    movingTime: Math.round((distance / 20) * 3600) 
                });

            } catch (err) {
                reject(err);
            }
        };
        reader.readAsText(file);
    });
};

function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; var dLat = deg2rad(lat2-lat1); var dLon = deg2rad(lon2-lon1); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c;
}
function deg2rad(deg) { return deg * (Math.PI/180); }