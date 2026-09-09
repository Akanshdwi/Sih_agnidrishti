import { useEffect, useState } from 'react';
import { getAlerts, getIncidentReport } from './api.js';

const TIER_LABEL = { 1: 'Facility', 2: 'District', 3: 'State', 4: 'National' };
const TIER_COLOR = { 1: '#22c55e', 2: '#f59e0b', 3: '#ef4444', 4: '#7c3aed' };
const TIER_BG    = { 1: 'rgba(34,197,94,0.08)', 2: 'rgba(245,158,11,0.08)', 3: 'rgba(239,68,68,0.1)', 4: 'rgba(124,58,237,0.1)' };

// ── Safe date parsing ──
const safeDate = (dateStr) => {
    if (!dateStr) return new Date();
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch {
        return new Date();
    }
};

function AlertItem({ a }) {
    const [report, setReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [reportError, setReportError] = useState(null);
    
    const fetchReport = async () => {
        if (report) {
            setReport(null); // toggle off
            setReportError(null);
            return;
        }
        setLoadingReport(true);
        setReportError(null);
        try {
            const data = await getIncidentReport(a.incident_id);
            setReport(data.report || 'No report available.');
        } catch (err) {
            const errorMsg = err.message || 'Error generating report.';
            setReportError(errorMsg);
            setReport(null);
        } finally {
            setLoadingReport(false);
        }
    };

    const color = TIER_COLOR[a.tier] || '#888';
    const bg    = TIER_BG[a.tier]    || 'transparent';
    const isCritical = a.tier >= 3;
    const sentTime = safeDate(a.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
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
                    T{a.tier} · {TIER_LABEL[a.tier] || 'Alert'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {sentTime}
                </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                {a.message || 'Alert triggered'}
            </p>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={fetchReport}
                    disabled={loadingReport}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 10,
                        color: '#60a5fa',
                        cursor: 'pointer',
                        opacity: loadingReport ? 0.6 : 1,
                    }}
                >
                    {loadingReport ? 'Generating...' : report ? 'Hide AI Report' : '✨ AI Report'}
                </button>
            </div>
            {report && (
                <div style={{
                    marginTop: 8,
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#e2e8f0',
                    lineHeight: 1.4,
                    fontStyle: 'italic',
                    borderLeft: '2px solid #60a5fa'
                }}>
                    {report}
                </div>
            )}
            {reportError && (
                <div style={{
                    marginTop: 8,
                    padding: '8px',
                    background: 'rgba(239,68,68,0.1)',
                    borderRadius: 6,
                    fontSize: 11,
                    color: '#f87171',
                    lineHeight: 1.4,
                    borderLeft: '2px solid #f87171'
                }}>
                    ⚠️ {reportError}
                </div>
            )}
        </div>
    );
}

export default function AlertFeed() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = () =>
            getAlerts()
                .then(a => {
                    setAlerts(Array.isArray(a) ? a : []);
                    setLoading(false);
                    setError(null);
                })
                .catch(err => {
                    console.error('[AlertFeed] Error loading alerts:', err);
                    setAlerts([]);
                    setLoading(false);
                    setError(err.message || 'Failed to load alerts');
                });
        load();
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
    }, []);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {/* Header */}
            <div className="sidebar-section" style={{ paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="sidebar-section-title" style={{ margin: 0 }}>Alert Feed</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {alerts.length} total · live
                    </span>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div style={{
                    padding: '8px 12px', margin: '8px 12px 0',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 6, fontSize: 10, color: '#f87171'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {loading && (
                    <>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="shimmer" style={{ height: 56, marginBottom: 6, borderRadius: 9 }} />
                        ))}
                    </>
                )}

                {!loading && alerts.length === 0 && !error && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>🟢</div>
                        <div>No alerts — system monitoring</div>
                        <div style={{ fontSize: 10, marginTop: 4 }}>Alerts appear after HIGH/CRITICAL events</div>
                    </div>
                )}

                {alerts.map(a => <AlertItem key={a.id} a={a} />)}
            </div>
        </div>
    );
}
