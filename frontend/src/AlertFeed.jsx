import { useEffect, useMemo, useState } from 'react';
import { getAlerts, getIncidentReport } from './api.js';

const TIER_LABEL = { 1: 'Facility', 2: 'District', 3: 'State', 4: 'National' };
const TIER_COLOR = { 1: '#4ade80', 2: '#fb923c', 3: '#f87171', 4: '#c084fc' };
const TIER_BG    = { 1: 'rgba(74,222,128,0.08)', 2: 'rgba(251,146,60,0.09)', 3: 'rgba(248,113,113,0.11)', 4: 'rgba(192,132,252,0.11)' };
const TIERS = [1, 2, 3, 4];

function AlertItem({ a }) {
    const [report, setReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [reportError, setReportError] = useState(false);

    const fetchReport = async () => {
        if (report) { setReport(null); return; }
        setLoadingReport(true);
        setReportError(false);
        try {
            const data = await getIncidentReport(a.incident_id);
            setReport(data.report || 'No report available.');
        } catch {
            setReportError(true);
        } finally {
            setLoadingReport(false);
        }
    };

    const color = TIER_COLOR[a.tier] || '#94a3b8';
    const bg = TIER_BG[a.tier] || 'rgba(255,255,255,0.03)';
    const isCritical = a.tier >= 3;

    return (
        <div style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: bg,
            border: `1px solid ${color}22`,
            borderLeft: `3px solid ${color}`,
            marginBottom: 8,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span
                    className={`badge ${isCritical ? 'badge-critical' : a.tier === 2 ? 'badge-high' : 'badge-low'} ${isCritical ? 'pulse' : ''}`}
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}
                >
                    Tier {a.tier} · {TIER_LABEL[a.tier] || 'Unknown'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {new Date(a.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                {a.message}
            </p>

            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={fetchReport}
                    disabled={loadingReport}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#fb923c',
                        cursor: loadingReport ? 'default' : 'pointer',
                        opacity: loadingReport ? 0.6 : 1,
                    }}
                >
                    {loadingReport ? 'Generating…' : report ? 'Hide AI report' : '✨ AI report'}
                </button>
            </div>

            {report && (
                <div style={{
                    marginTop: 8, padding: 10, background: 'rgba(0,0,0,0.25)',
                    borderRadius: 8, fontSize: 11.5, color: '#e2e8f0',
                    lineHeight: 1.5, borderLeft: '2px solid #fb923c',
                }}>
                    {report}
                </div>
            )}
            {reportError && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#f87171' }}>
                    Couldn't generate a report — try again shortly.
                </div>
            )}
        </div>
    );
}

export default function AlertFeed() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTier, setActiveTier] = useState('ALL');
    const [error, setError] = useState(false);

    useEffect(() => {
        const load = () =>
            getAlerts()
                .then(a => { setAlerts(Array.isArray(a) ? a : []); setLoading(false); setError(false); })
                .catch(() => { setLoading(false); setError(true); });
        load();
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
    }, []);

    const visible = useMemo(
        () => activeTier === 'ALL' ? alerts : alerts.filter(a => a.tier === activeTier),
        [alerts, activeTier]
    );

    const tierCounts = useMemo(() => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
        for (const a of alerts) counts[a.tier] = (counts[a.tier] || 0) + 1;
        return counts;
    }, [alerts]);

    const criticalCount = tierCounts[3] + tierCounts[4];

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {/* Header */}
            <div className="sidebar-section" style={{ paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="sidebar-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        Alert Feed
                        {!loading && !error && (
                            <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: '#4ade80', boxShadow: '0 0 6px #4ade80',
                                display: 'inline-block',
                            }} />
                        )}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {alerts.length} total
                    </span>
                </div>

                {/* Tier filter pills */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTier('ALL')}
                        style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.3,
                            background: activeTier === 'ALL' ? 'rgba(251,146,60,0.18)' : 'rgba(255,255,255,0.04)',
                            border: activeTier === 'ALL' ? '1px solid rgba(251,146,60,0.4)' : '1px solid var(--border)',
                            color: activeTier === 'ALL' ? '#fb923c' : 'var(--text-secondary)',
                        }}
                    >
                        All
                    </button>
                    {TIERS.map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTier(t)}
                            disabled={tierCounts[t] === 0}
                            style={{
                                padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                                cursor: tierCounts[t] === 0 ? 'default' : 'pointer', fontFamily: 'inherit',
                                opacity: tierCounts[t] === 0 ? 0.35 : 1,
                                background: activeTier === t ? `${TIER_COLOR[t]}22` : 'rgba(255,255,255,0.04)',
                                border: activeTier === t ? `1px solid ${TIER_COLOR[t]}66` : '1px solid var(--border)',
                                color: activeTier === t ? TIER_COLOR[t] : 'var(--text-secondary)',
                            }}
                        >
                            T{t} {tierCounts[t] > 0 && `· ${tierCounts[t]}`}
                        </button>
                    ))}
                </div>

                {criticalCount > 0 && (
                    <div style={{
                        marginTop: 8, fontSize: 10.5, color: '#f87171',
                        display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600,
                    }}>
                        <span className="pulse" style={{
                            width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block',
                        }} />
                        {criticalCount} active State/National escalation{criticalCount !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {loading && (
                    <>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="shimmer" style={{ height: 64, marginBottom: 8, borderRadius: 10 }} />
                        ))}
                    </>
                )}

                {!loading && error && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>⚠️</div>
                        <div>Couldn't reach the alert service</div>
                        <div style={{ fontSize: 10, marginTop: 4 }}>Retrying every 15s…</div>
                    </div>
                )}

                {!loading && !error && visible.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>🟢</div>
                        <div>{activeTier === 'ALL' ? 'No alerts — system monitoring' : `No Tier ${activeTier} alerts`}</div>
                        {activeTier === 'ALL' && (
                            <div style={{ fontSize: 10, marginTop: 4 }}>Alerts appear after HIGH/CRITICAL events</div>
                        )}
                    </div>
                )}

                {!loading && !error && visible.map(a => <AlertItem key={a.id} a={a} />)}
            </div>
        </div>
    );
}