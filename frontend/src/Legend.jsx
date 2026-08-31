const COLORS = {
    'Gas Flare': '#f59e0b',
    'Industrial Thermal Source': '#3b82f6',
    'Industrial Fire / Accident': '#ef4444',
    'Agricultural Burning': '#84cc16',
    'Wildfire / Forest Fire': '#f97316',
    'Mining Thermal Activity': '#a855f7',
    'Unclassified': '#9ca3af',
};

export default function Legend() {
    return (
        <div className="card" style={{
            position: 'absolute', bottom: 60, left: 10, padding: 12,
            zIndex: 1000, fontSize: 12, maxWidth: 200,
        }}>
            <b style={{ fontSize: 13 }}>Classification</b>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {Object.entries(COLORS).map(([label, color]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                            width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0,
                        }} />
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}