import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const RISK_COLOR = (score) => {
    if (score >= 76) return '#ef4444';
    if (score >= 51) return '#f97316';
    if (score >= 26) return '#f59e0b';
    return '#22c55e';
};

const STYLE = {
    version: 8,
    sources: {
        satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Esri World Imagery',
        },
        terrainSource: {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            tileSize: 256,
            encoding: 'terrarium',
            maxzoom: 15,
        },
    },
    layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
    terrain: { source: 'terrainSource', exaggeration: 1.5 },
    sky: { 'sky-color': '#0ea5e9', 'horizon-color': '#f8fafc', 'fog-color': '#e2e8f0' },
};

export default function Scene3D({ hotspots, facilities, onClose }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const map = new maplibregl.Map({
            container: containerRef.current,
            style: STYLE,
            center: hotspots.length ? [hotspots[0].lon, hotspots[0].lat] : [79, 22.5],
            zoom: 13,
            pitch: 65,
            bearing: -20,
            antialias: true,
        });

        map.on('load', () => {
            map.setTerrain({ source: 'terrainSource', exaggeration: 1.5 });

            facilities.forEach(f => {
                const geom = JSON.parse(f.geometry);
                const srcId = `facility-${f.id}`;
                map.addSource(srcId, { type: 'geojson', data: { type: 'Feature', geometry: geom, properties: {} } });
                map.addLayer({
                    id: `${srcId}-fill`,
                    type: 'fill-extrusion',
                    source: srcId,
                    paint: {
                        'fill-extrusion-color': '#f97316',
                        'fill-extrusion-height': 25,
                        'fill-extrusion-opacity': 0.35,
                    },
                });
            });

            hotspots.forEach(h => {
                const el = document.createElement('div');
                const color = RISK_COLOR(h.risk_score || 0);
                el.style.cssText = `
          width: 22px; height: 22px; border-radius: 50%;
          background: radial-gradient(circle, #fff59d 0%, ${color} 60%, transparent 100%);
          box-shadow: 0 0 14px 6px ${color}aa;
          animation: firePulse 1.4s infinite ease-in-out;
        `;
                new maplibregl.Marker({ element: el })
                    .setLngLat([h.lon, h.lat])
                    .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML(
                        `<b>${h.classification || 'Unclassified'}</b><br/>FRP: ${h.frp?.toFixed(1) ?? '—'} MW<br/>Risk: ${h.risk_score ?? '—'}`
                    ))
                    .addTo(map);
            });
        });

        return () => map.remove();
    }, [hotspots, facilities]);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2500 }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            <style>{`
        @keyframes firePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
            <button onClick={onClose} style={{
                position: 'absolute', top: 16, right: 16, zIndex: 2600,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: '#1e293b', color: 'white', cursor: 'pointer', fontWeight: 600,
            }}>
                ✕ Exit 3D View
            </button>
        </div>
    );
}