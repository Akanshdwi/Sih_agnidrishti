import MapView from './MapView.jsx';
import AlertFeed from './AlertFeed.jsx';

export default function App() {
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