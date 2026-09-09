import { useEffect, useState } from 'react';
import { getAlerts, getIncidentReport } from './api.js';

const TIER_LABEL = { 1: 'Facility', 2: 'District', 3: 'State', 4: 'National' };
const TIER_COLOR = { 1: '#22c55e', 2: '#f59e0b', 3: '#ef4444', 4: '#a855f7' };
const TIER_BG    = { 1: 'rgba(34,197,94,0.08)', 2: 'rgba(245,158,11,0.08)', 3: 'rgba(239,68,68,0.1)', 4: 'rgba(168,85,247,0.1)' };

function AlertItem({ a }) {
    const [report, setReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);

    const fetchReport = async () => {
        if (report) {
            setReport(null); // toggle off
            return;
        }
        setLoadingReport(true);
        try {
            const data = await getIncidentReport(a.incident_id);
            setReport(data.report || 'No report available.');
        } catch (err) {
            setReport('Error generating report.');
        } finally {
            setLoadingReport(false);
        }
    };

    const color = TIER_COLOR[a.tier] || '#888';
    const bg    = TIER_BG[a.tier]    || 'transparent';
    const isCritical = a.tier >= 3;
    return (
        <div style={{
            padding: '9px 11px',
            borderRadius: 9,
            background: bg,
            borderLeft: `3px solid ${color}`,
            marginBottom: 6,
            transition: 'opacity 0.2s',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span
                    className={`badge ${isCritical ? 'badge-critical' : a.tier === 2 ? 'badge-high' : 'badge-low'} ${isCritical ? 'pulse' : ''}`}
                >
                    T{a.tier} · {TIER_LABEL[a.tier]}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ag-text-muted)' }}>
                    {new Date(a.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--ag-text-secondary)', lineHeight: 1.4, margin: 0 }}>
                {a.message}
            </p>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={fetchReport}
                    disabled={loadingReport}
                    style={{
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 10,
                        color: 'var(--ag-cyan)',
                        cursor: loadingReport ? 'wait' : 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    {loadingReport ? 'Generating…' : report ? 'Hide AI Report' : '✨ AI Report'}
                </button>
            </div>
            {report && (
                <div style={{
                    marginTop: 8,
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: 'var(--ag-text-secondary)',
                    lineHeight: 1.4,
                    fontStyle: 'italic',
                    borderLeft: '2px solid var(--ag-cyan)',
                }}>
                    {report}
                </div>
            )}
        </div>
    );
}

/**
 * AlertFeed — floating live alert panel shown over the globe / map view.
 * Polls the real /api/alerts endpoint every 15s; nothing here is static.
 * Collapsible so it doesn't permanently block the globe if not needed.
 */
export default function AlertFeed({ collapsible = true }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errored, setErrored] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const load = () =>
            getAlerts()
                .then(a => { setAlerts(Array.isArray(a) ? a : []); setLoading(false); setErrored(false); })
                .catch(() => { setLoading(false); setErrored(true); });
        load();
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
    }, []);

    const criticalCount = alerts.filter(a => a.tier >= 3).length;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: collapsed ? 0 : 10, borderBottom: collapsed ? 'none' : '1px solid var(--ag-glass-border)',
                marginBottom: collapsed ? 0 : 4,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: 1, color: 'var(--ag-cyan)',
                    }}>
                        🛰 Live Alert Feed
                    </span>
                    {criticalCount > 0 && (
                        <span className="badge badge-critical pulse" style={{ fontSize: 9 }}>{criticalCount} critical</span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--ag-text-muted)' }}>
                        {errored ? 'offline' : `${alerts.length} total · live`}
                    </span>
                    {collapsible && (
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            aria-label={collapsed ? 'Expand alert feed' : 'Collapse alert feed'}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--ag-text-muted)',
                                cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 2,
                            }}
                        >
                            {collapsed ? '▲' : '▼'}
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            {!collapsed && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 2px' }}>
                    {loading && (
                        <>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="shimmer" style={{ height: 56, marginBottom: 6, borderRadius: 9 }} />
                            ))}
                        </>
                    )}

                    {!loading && errored && (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ag-text-muted)', fontSize: 12 }}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>⚠️</div>
                            <div>Couldn't reach the alert service</div>
                        </div>
                    )}

                    {!loading && !errored && alerts.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ag-text-muted)', fontSize: 12 }}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>🟢</div>
                            <div>No alerts — system monitoring</div>
                            <div style={{ fontSize: 10, marginTop: 4 }}>Alerts appear after HIGH/CRITICAL events</div>
                        </div>
                    )}

                    {!loading && !errored && alerts.map(a => <AlertItem key={a.id} a={a} />)}
                </div>
            )}
        </div>
    );
}
