import { useState } from 'react';

const CLASSES = [
    { name: 'Gas Flare',                   color: '#f59e0b', emoji: '🔥' },
    { name: 'Industrial Thermal Source',   color: '#3b82f6', emoji: '🏭' },
    { name: 'Industrial Fire / Accident',  color: '#ef4444', emoji: '💥' },
    { name: 'Agricultural Burning',        color: '#84cc16', emoji: '🌾' },
    { name: 'Wildfire / Forest Fire',      color: '#f97316', emoji: '🌲' },
    { name: 'Mining Thermal Activity',     color: '#a855f7', emoji: '⛏️' },
    { name: 'False Positive',              color: '#6b7280', emoji: '✗'  },
];

export default function ClassFilter({ hotspots, onFilteredChange }) {
    const [active, setActive] = useState(new Set(CLASSES.map(c => c.name)));
    const [showAll, setShowAll] = useState(true);

    const toggle = (name) => {
        const next = new Set(active);
        if (next.has(name)) {
            if (next.size === 1) return; // keep at least one
            next.delete(name);
        } else {
            next.add(name);
        }
        setActive(next);
        const all = next.size === CLASSES.length;
        setShowAll(all);
        onFilteredChange(hotspots.filter(h => {
            const cls = h.classification || 'False Positive';
            return next.has(cls);
        }));
    };

    const toggleAll = () => {
        if (showAll) {
            const none = new Set(['Industrial Fire / Accident', 'Gas Flare', 'Wildfire / Forest Fire']);
            setActive(none);
            setShowAll(false);
            onFilteredChange(hotspots.filter(h => none.has(h.classification)));
        } else {
            const all = new Set(CLASSES.map(c => c.name));
            setActive(all);
            setShowAll(true);
            onFilteredChange(hotspots);
        }
    };

    const counts = {};
    for (const h of hotspots) {
        const cls = h.classification || 'False Positive';
        counts[cls] = (counts[cls] || 0) + 1;
    }

    return (
        <div style={{ width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="sidebar-section-title" style={{ margin: 0 }}>Class Filter</span>
                <button
                    onClick={toggleAll}
                    style={{
                        fontSize: 10, color: '#60a5fa', background: 'none',
                        border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0,
                        textTransform: 'uppercase', letterSpacing: 0.5
                    }}
                >
                    {showAll ? 'High-risk' : 'Show all'}
                </button>
            </div>

            {/* Class chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {CLASSES.map(cls => {
                    const isActive = active.has(cls.name);
                    const count = counts[cls.name] || 0;
                    return (
                        <button
                            key={cls.name}
                            className={`cls-chip ${isActive ? 'active' : ''}`}
                            onClick={() => toggle(cls.name)}
                            style={{ opacity: count === 0 ? 0.35 : 1 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: isActive ? cls.color : 'rgba(255,255,255,0.1)',
                                    display: 'inline-block', flexShrink: 0,
                                    boxShadow: isActive ? `0 0 6px ${cls.color}` : 'none',
                                    transition: 'all 0.15s ease',
                                }} />
                                <span style={{ color: isActive ? 'white' : 'var(--text-muted)' }}>
                                    {cls.emoji} {cls.name}
                                </span>
                            </div>
                            {count > 0 && (
                                <span style={{
                                    fontSize: 10, fontWeight: 700,
                                    color: isActive ? cls.color : 'var(--text-muted)',
                                }}>
                                    {count.toLocaleString()}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
