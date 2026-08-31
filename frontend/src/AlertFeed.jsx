import { useEffect, useState } from 'react';

const BASE = 'http://localhost:4000/api';
const TIER_LABEL = { 1: 'Facility', 2: 'District', 3: 'State', 4: 'National' };

export default function AlertFeed() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = () => fetch(`${BASE}/alerts`).then(r => r.json()).then(a => { setAlerts(a); setLoading(false); });
        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="card scrollbar-thin" style={{
            position: 'absolute', top: 70, right: 10, width: 300,
            maxHeight: 'calc(100vh - 90px)', overflowY: 'auto',
            padding: 14, zIndex: 1000,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>Alert Feed</h3>
                <span style={{ fontSize: 11, color: '#888' }}>{alerts.length} total</span>
            </div>

            {loading && <p style={{ color: '#888', fontSize: 13 }}>Loading...</p>}
            {!loading && alerts.length === 0 && (
                <p style={{ color: '#888', fontSize: 13 }}>No alerts yet — system monitoring.</p>
            )}

            {alerts.map(a => (
                <div key={a.id} style={{
                    padding: 10, marginBottom: 8, borderRadius: 8,
                    background: a.tier >= 3 ? '#fef2f2' : a.tier === 2 ? '#fffbeb' : '#f0fdf4',
                    borderLeft: `4px solid ${a.tier >= 3 ? '#ef4444' : a.tier === 2 ? '#f59e0b' : '#22c55e'}`,
                    fontSize: 13,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span className={a.tier >= 3 ? 'pulse' : ''} style={{
                            padding: '2px 8px', borderRadius: 12, fontSize: 11,
                            background: a.tier >= 3 ? '#ef4444' : a.tier === 2 ? '#f59e0b' : '#22c55e',
                            color: 'white',
                        }}>
                            Tier {a.tier} · {TIER_LABEL[a.tier]}
                        </span>
                    </div>
                    <div style={{ marginTop: 6 }}>{a.message}</div>
                    <div style={{ marginTop: 4, fontSize: 11, color: '#888' }}>
                        {new Date(a.sent_at).toLocaleString()}
                    </div>
                </div>
            ))}
        </div>
    );
}