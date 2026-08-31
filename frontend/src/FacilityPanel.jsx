import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const BASE = 'http://localhost:4000/api';

export default function FacilityPanel({ facilityId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!facilityId) { setData(null); return; }
        setLoading(true);
        fetch(`${BASE}/facilities/${facilityId}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); });
    }, [facilityId]);

    if (!facilityId) return null;

    return (
        <div className="card" style={{
            position: 'absolute', bottom: 60, left: 10, width: 340,
            padding: 16, zIndex: 1000,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{data?.name ?? 'Loading...'}</h3>
                    {data && <span style={{
                        fontSize: 11, color: '#3b82f6', background: '#eff6ff',
                        padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                    }}>{data.type}</span>}
                </div>
                <button onClick={onClose} style={{
                    border: 'none', background: '#f1f5f9', borderRadius: 6,
                    width: 26, height: 26, cursor: 'pointer', fontSize: 14,
                }}>✕</button>
            </div>

            {loading && <p style={{ fontSize: 13, color: '#888', marginTop: 12 }}>Loading facility data...</p>}

            {data && (
                <>
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13 }}>
                        <Stat label="Detections" value={data.stats.detection_count} />
                        <Stat label="Avg FRP" value={`${Number(data.stats.avg_frp || 0).toFixed(1)} MW`} />
                        <Stat label="Last Seen" value={data.stats.last_seen ? new Date(data.stats.last_seen).toLocaleDateString() : '—'} />
                    </div>

                    {data.history.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={data.history.map(h => ({
                                date: new Date(h.acq_date).toLocaleDateString(),
                                frp: h.frp,
                            }))} style={{ marginTop: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="frp" stroke="#ef4444" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ fontSize: 12, color: '#aaa', marginTop: 16, textAlign: 'center' }}>
                            No linked detections yet
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: '#888' }}>{label}</div>
            <div style={{ fontWeight: 700 }}>{value}</div>
        </div>
    );
}