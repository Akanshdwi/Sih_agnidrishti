import { useState, useEffect } from 'react';
import MapView from './MapView.jsx';
import AlertFeed from './AlertFeed.jsx';
import MLPanel from './MLPanel.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import { getMlStatus } from './api.js';

function TopbarBadge({ status }) {
    if (!status || status.status === 'never_run') return null;
    if (status.status === 'running') {
        return (
            <span className="badge badge-running pulse-running">
                ⟳ ML Running
            </span>
        );
    }
    if (status.status === 'done' && status.summary) {
        const { validated = 0, patched = 0 } = status.summary;
        return (
            <span className="badge badge-done">
                ✓ {(patched || validated).toLocaleString()} classified
            </span>
        );
    }
    if (status.status === 'error') {
        return <span className="badge badge-critical">✗ ML Error</span>;
    }
    return null;
}

export default function App() {
    const [showLoader, setShowLoader] = useState(true);
    const [mlStatus, setMlStatus] = useState(null);
    const [hotspotCount, setHotspotCount] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => setShowLoader(false), 1800);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const load = () => getMlStatus().then(setMlStatus).catch(() => {});
        load();
        const t = setInterval(load, 10000);
        return () => clearInterval(t);
    }, []);

    if (showLoader) return <LoadingScreen />;

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

            {/* ── Top Bar ── */}
            <header className="topbar">
                <div className="topbar-brand">
                    <span className="status-dot" />
                    <h1>AgniDrishti</h1>
                </div>

                <div className="topbar-stats">
                    {hotspotCount != null && (
                        <div className="topbar-stat">
                            🔥 <b>{hotspotCount.toLocaleString()}</b> hotspots
                        </div>
                    )}
                    <div className="topbar-stat">
                        📡 <b>Gujarat</b> industrial belt
                    </div>
                    <div className="topbar-stat">
                        🛰 VIIRS 375m · NRT
                    </div>
                </div>

                <div className="topbar-right">
                    <TopbarBadge status={mlStatus} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>SIH-2026 · 26162</span>
                </div>
            </header>

            {/* ── Map (with filter, ML panel inside) ── */}
            <MapView onHotspotCount={setHotspotCount} />

            {/* ── Right Sidebar ── */}
            <aside className="sidebar">
                <AlertFeed />
                <MLPanel onStatusChange={setMlStatus} />
            </aside>
        </div>
    );
}