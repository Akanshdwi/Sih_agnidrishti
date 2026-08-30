import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet';
import { useEffect, useState } from 'react';
import { getHotspots, getFacilities } from './api.js';

const COLORS = {
    'Gas Flare': '#f59e0b',
    'Industrial Thermal Source': '#3b82f6',
    'Industrial Fire / Accident': '#ef4444',
    'Agricultural Burning': '#84cc16',
    'Wildfire / Forest Fire': '#f97316',
    'Mining Thermal Activity': '#a855f7',
    'False Positive / Sensor Artifact': '#9ca3af',
};

export default function MapView() {
    const [hotspots, setHotspots] = useState([]);
    const [facilities, setFacilities] = useState([]);

    useEffect(() => {
        getHotspots().then(setHotspots);
        getFacilities().then(setFacilities);
    }, []);

    return (
        <MapContainer center={[22.5, 79]} zoom={5} style={{ height: '100vh', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {facilities.map(f => (
                <GeoJSON key={f.id} data={JSON.parse(f.geometry)} style={{ color: '#555', weight: 1 }} />
            ))}

            {hotspots.map(h => (
                <CircleMarker
                    key={h.id}
                    center={[h.lat, h.lon]}
                    radius={6}
                    pathOptions={{ color: COLORS[h.classification] || '#888', fillOpacity: 0.8 }}
                >
                    <Popup>
                        <b>{h.classification || 'Unclassified'}</b><br />
                        FRP: {h.frp} MW<br />
                        Risk: {h.risk_score ?? '—'}<br />
                        {h.explanation}
                    </Popup>
                </CircleMarker>
            ))}
        </MapContainer>
    );
}