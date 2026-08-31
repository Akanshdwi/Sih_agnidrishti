import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet';
import { useEffect, useState, useCallback } from 'react';
import { getHotspots, getFacilities } from './api.js';
import FacilityPanel from './FacilityPanel.jsx';
import TimeSlider from './TimeSlider.jsx';
import Legend from './Legend.jsx';

const COLORS = {
    'Gas Flare': '#f59e0b',
    'Industrial Thermal Source': '#3b82f6',
    'Industrial Fire / Accident': '#ef4444',
    'Agricultural Burning': '#84cc16',
    'Wildfire / Forest Fire': '#f97316',
    'Mining Thermal Activity': '#a855f7',
};

export default function MapView() {
    const [hotspots, setHotspots] = useState([]);
    const [visibleHotspots, setVisibleHotspots] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getHotspots(), getFacilities()]).then(([h, f]) => {
            setHotspots(h);
            setVisibleHotspots(h);
            setFacilities(f);
            setLoading(false);
        });
    }, []);

    const handleFilteredChange = useCallback((filtered) => setVisibleHotspots(filtered), []);

    return (
        <>
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', background: '#0f172a', color: 'white',
                    fontSize: 15, zIndex: 2000,
                }}>
                    Loading thermal intelligence data...
                </div>
            )}

            <MapContainer center={[22.5, 79]} zoom={5} style={{ height: '100vh', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {facilities.map(f => (
                    <GeoJSON
                        key={f.id}
                        data={JSON.parse(f.geometry)}
                        style={{ color: '#475569', weight: 1.5, fillOpacity: 0.1 }}
                        eventHandlers={{ click: () => setSelectedFacility(f.id) }}
                    />
                ))}

                {visibleHotspots.map(h => (
                    <CircleMarker
                        key={h.id}
                        center={[h.lat, h.lon]}
                        radius={h.risk_score >= 76 ? 9 : 6}
                        pathOptions={{
                            color: COLORS[h.classification] || '#9ca3af',
                            fillColor: COLORS[h.classification] || '#9ca3af',
                            fillOpacity: 0.85, weight: 1.5,
                        }}
                    >
                        <Popup>
                            <div style={{ fontSize: 13, minWidth: 160 }}>
                                <b>{h.classification || 'Unclassified'}</b>
                                <div style={{ marginTop: 4 }}>FRP: {h.frp?.toFixed(1) ?? '—'} MW</div>
                                <div>Risk: {h.risk_score ?? '— (pending model)'}</div>
                                <div style={{ color: '#888', marginTop: 4, fontSize: 11 }}>
                                    {h.explanation || 'No explanation yet'}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            <Legend />
            <FacilityPanel facilityId={selectedFacility} onClose={() => setSelectedFacility(null)} />
            <TimeSlider hotspots={hotspots} onFilteredChange={handleFilteredChange} />
        </>
    );
}