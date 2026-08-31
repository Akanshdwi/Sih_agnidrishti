import { useState, useEffect } from 'react';
import MapView from './MapView.jsx';
import AlertFeed from './AlertFeed.jsx';
import LoadingScreen from './LoadingScreen.jsx';

export default function App() {
    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setShowLoader(false), 1800);
        return () => clearTimeout(t);
    }, []);

    if (showLoader) return <LoadingScreen />;

    return (
        <div style={{ position: 'relative' }}>
            <div className="topbar">
                <span className="status-dot" />
                <h1>AgniDrishti — Industrial Thermal Intelligence</h1>
            </div>
            <MapView />
            <AlertFeed />
        </div>
    );
}