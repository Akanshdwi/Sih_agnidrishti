/**
 * Dashboard.jsx — AgniDrishti Analytics Dashboard
 *
 * Summary cards + charts using recharts, all backed by live API data
 * (hotspots, alerts, facilities, ML status). Visual language matches the
 * cyan/glass "Orbital Explorer" home theme (see LandingHome.css --ag-* vars).
 */
import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend as ReLegend,
    LineChart, Line, CartesianGrid,
} from 'recharts';
import { getHotspots, getAlerts, getFacilities, getMlStatus, runMlPipeline } from './api.js';

/* ─── Colour constants ───────────────────────────────────────────────────── */
const CLASS_COLORS = {
    'Gas Flare':                  '#f59e0b',
    'Industrial Thermal Source':  '#38bdf8',
    'Industrial Fire / Accident': '#ef4444',
    'Agricultural Burning':       '#84cc16',
    'Wildfire / Forest Fire':     '#f97316',
    'Mining Thermal Activity':    '#a855f7',
    'False Positive':             '#6b7280',
};
const PRIORITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MODERATE: '#f59e0b', LOW: '#22c55e' };
const RISK_COLOR = s => s >= 76 ? '#ef4444' : s >= 56 ? '#f97316' : s >= 31 ? '#f59e0b' : '#22c55e';

/* ─── Small reusables ────────────────────────────────────────────────────── */
function Card({ children, style = {} }) {
    return (
        <div style={{
            background: 'var(--ag-glass-bg)', border: '1px solid var(--ag-glass-border)',
            borderRadius: 14, padding: '16px 18px',
            backdropFilter: 'var(--ag-glass-blur)', WebkitBackdropFilter: 'var(--ag-glass-blur)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            ...style,
        }}>
            {children}
        </div>
    );
}

function SectionTitle({ children }) {
    return (
        <div style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 1.2, color: 'var(--ag-text-muted)', marginBottom: 14,
        }}>
            {children}
        </div>
    );
}

function StatCard({ icon, label, value, sub, color = 'var(--ag-cyan)', trend }) {
    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 12, color: 'var(--ag-text-secondary)', marginTop: 4 }}>{label}</div>
                    {sub && <div style={{ fontSize: 10, color: 'var(--ag-text-muted)', marginTop: 2 }}>{sub}</div>}
                </div>
                {trend != null && (
                    <span style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 999,
                        background: trend >= 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                        color: trend >= 0 ? '#f87171' : '#4ade80',
                        fontWeight: 700,
                    }}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
        </Card>
    );
}

/* ─── Custom tooltip for recharts ────────────────────────────────────────── */
function DarkTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(6,12,20,0.97)', border: '1px solid var(--ag-glass-border)',
            borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--ag-text-primary)',
        }}>
            {label && <div style={{ color: 'var(--ag-text-muted)', marginBottom: 4 }}>{label}</div>}
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color || 'var(--ag-text-primary)', fontWeight: 700 }}>
                    {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
                </div>
            ))}
        </div>
    );
}

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */
export default function Dashboard({ mlStatus, onRunML }) {
    const [hotspots, setHotspots]   = useState([]);
    const [alerts, setAlerts]       = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [errored, setErrored]     = useState(false);
    const [mlRunning, setMlRunning] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    const refresh = () => {
        setErrored(false);
        return Promise.all([getHotspots(), getAlerts(), getFacilities()])
            .then(([h, a, f]) => {
                setHotspots(Array.isArray(h) ? h : []);
                setAlerts(Array.isArray(a) ? a : []);
                setFacilities(Array.isArray(f) ? f : []);
                setLastRefresh(new Date());
                setLoading(false);
            })
            .catch(() => { setErrored(true); setLoading(false); });
    };

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 30000); // keep the dashboard live, not a static snapshot
        return () => clearInterval(t);
    }, []);

    /* ── Derived stats (all computed from live API data) ── */
    const classified   = hotspots.filter(h => h.classification && h.classification !== 'False Positive');
    const falsePos     = hotspots.filter(h => h.classification === 'False Positive');
    const critical     = hotspots.filter(h => (h.risk_score || 0) >= 76);
    const avgFrp       = hotspots.length
        ? (hotspots.reduce((s, h) => s + (h.frp || 0), 0) / hotspots.length).toFixed(1)
        : '—';
    const maxFrp       = hotspots.length
        ? Math.max(...hotspots.map(h => h.frp || 0)).toFixed(1)
        : '—';

    /* ── Classification pie data ── */
    const classCounts = {};
    for (const h of hotspots) {
        const c = h.classification || 'Unclassified';
        classCounts[c] = (classCounts[c] || 0) + 1;
    }
    const pieData = Object.entries(classCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }));

    /* ── Risk distribution bar ── */
    const riskBuckets = { 'Critical (76–100)': 0, 'High (56–75)': 0, 'Moderate (31–55)': 0, 'Low (0–30)': 0 };
    for (const h of hotspots) {
        const s = h.risk_score || 0;
        if (s >= 76) riskBuckets['Critical (76–100)']++;
        else if (s >= 56) riskBuckets['High (56–75)']++;
        else if (s >= 31) riskBuckets['Moderate (31–55)']++;
        else riskBuckets['Low (0–30)']++;
    }
    const riskBarData = Object.entries(riskBuckets).map(([name, count]) => ({
        name: name.split(' ')[0], count, color: ['#ef4444','#f97316','#f59e0b','#22c55e'][
            ['Critical','High','Moderate','Low'].indexOf(name.split(' ')[0])
        ],
    }));

    /* ── Daily detection trend ── */
    const dailyCounts = {};
    for (const h of hotspots) {
        if (!h.acq_date) continue;
        const day = new Date(h.acq_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }
    const trendData = Object.entries(dailyCounts)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-14)
        .map(([date, count]) => ({ date, count }));

    /* ── Alert tier summary ── */
    const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const a of alerts) tierCounts[a.tier] = (tierCounts[a.tier] || 0) + 1;

    const handleRunML = async () => {
        if (mlRunning) return;
        setMlRunning(true);
        await runMlPipeline(true).catch(() => {});
        setMlRunning(false);
        getMlStatus().then(onRunML).catch(() => {});
        refresh();
    };

    if (loading) {
        return (
            <div style={{ padding: 24, background: 'var(--ag-bg-void)', minHeight: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="shimmer" style={{ height: 100, borderRadius: 14 }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            padding: '24px 28px', color: 'var(--ag-text-primary)', fontFamily: "'Inter', sans-serif",
            background: 'var(--ag-bg-void)', minHeight: '100%',
        }}>

            {errored && (
                <div style={{
                    marginBottom: 16, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    fontSize: 12, color: '#f87171', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <span>⚠ Couldn't reach the backend — showing the last data received. Check the API server / network connection.</span>
                    <button onClick={refresh} style={{
                        background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171',
                        borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                    }}>Retry</button>
                </div>
            )}

            {/* ── Page title ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                        color: 'var(--ag-cyan)', marginBottom: 6,
                    }}>
                        ISRO · DRDO · Live Telemetry
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0,
                        background: 'linear-gradient(90deg,var(--ag-cyan),var(--ag-gold))',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        Thermal Intelligence Dashboard
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ag-text-muted)' }}>
                        Gujarat Industrial Belt · VIIRS NRT ·{' '}
                        {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}
                    </p>
                </div>
                <button
                    onClick={handleRunML}
                    disabled={mlRunning || mlStatus?.status === 'running'}
                    style={{
                        width: 'auto', padding: '9px 20px', borderRadius: 9, border: '1px solid rgba(56,189,248,0.4)',
                        cursor: (mlRunning || mlStatus?.status === 'running') ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: 0.2,
                        transition: 'all 0.2s ease', color: '#fff',
                        background: (mlRunning || mlStatus?.status === 'running')
                            ? 'rgba(56,189,248,0.15)'
                            : 'linear-gradient(135deg, #0284c7, #0369a1)',
                        boxShadow: (mlRunning || mlStatus?.status === 'running') ? 'none' : '0 4px 16px rgba(2,132,199,0.35)',
                    }}
                >
                    {(mlRunning || mlStatus?.status === 'running') ? '⟳ Pipeline Running…' : '▶ Run ML Pipeline'}
                </button>
            </div>

            {/* ── Stat cards row (all values derived live from the API) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
                <StatCard icon="🔥" label="Total Detections" value={hotspots.length.toLocaleString()} color="#f97316" sub="All time · VIIRS SNPP" />
                <StatCard icon="⚡" label="Classified Events" value={classified.length.toLocaleString()} color="var(--ag-cyan)" sub="ML-confirmed real fires" />
                <StatCard icon="🚨" label="Critical Risk" value={critical.length.toLocaleString()} color="#ef4444" sub="Risk score ≥ 76/100" />
                <StatCard icon="📡" label="Avg FRP" value={`${avgFrp} MW`} color="var(--ag-cyan)" sub="Fire Radiative Power" />
                <StatCard icon="🌡️" label="Peak FRP" value={`${maxFrp} MW`} color="var(--ag-gold)" sub="Max detected intensity" />
                <StatCard icon="✅" label="False Positives" value={falsePos.length.toLocaleString()} color="#4ade80" sub="Suppressed by Agent 2" />
                <StatCard icon="📢" label="Alerts Sent" value={alerts.length.toLocaleString()} color="#a855f7" sub="Tier 1–4 escalations" />
                <StatCard icon="🏭" label="Monitored Facilities" value={facilities.length.toLocaleString()} color="var(--ag-cyan)" sub="Linked industrial + rural sites" />
            </div>

            {/* ── Charts row 1 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                {/* Classification pie */}
                <Card>
                    <SectionTitle>Detection Classification Breakdown</SectionTitle>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                                    paddingAngle={2} dataKey="value"
                                >
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={CLASS_COLORS[entry.name] || '#9ca3af'} />
                                    ))}
                                </Pie>
                                <Tooltip content={<DarkTooltip />} />
                                <ReLegend
                                    formatter={(v) => <span style={{ fontSize: 11, color: 'var(--ag-text-secondary)' }}>{v}</span>}
                                    iconSize={8} iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <NoData msg="Run ML pipeline to classify detections" />
                    )}
                </Card>

                {/* Risk distribution bar */}
                <Card>
                    <SectionTitle>Risk Level Distribution</SectionTitle>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={riskBarData} barSize={36}>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ag-text-secondary)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--ag-text-secondary)' }} axisLine={false} tickLine={false} width={36} />
                            <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Bar dataKey="count" radius={[6,6,0,0]}>
                                {riskBarData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* ── Charts row 2 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

                {/* Daily trend */}
                <Card>
                    <SectionTitle>Detection Trend — Last 14 Days</SectionTitle>
                    {trendData.length > 1 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--ag-text-secondary)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--ag-text-secondary)' }} axisLine={false} tickLine={false} width={32} />
                                <Tooltip content={<DarkTooltip />} />
                                <Line type="monotone" dataKey="count" stroke="var(--ag-cyan)" strokeWidth={2.5}
                                    dot={{ fill: '#38bdf8', r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <NoData msg="Not enough data for trend" />
                    )}
                </Card>

                {/* Alert tier breakdown */}
                <Card>
                    <SectionTitle>Alert Escalation Tiers</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                        {[
                            { tier: 4, label: 'National Emergency', color: '#a855f7', icon: '🚨' },
                            { tier: 3, label: 'State Alert + SMS',  color: '#ef4444', icon: '🔴' },
                            { tier: 2, label: 'District Alert',     color: '#f97316', icon: '🟠' },
                            { tier: 1, label: 'Facility Monitor',   color: '#22c55e', icon: '🟢' },
                        ].map(({ tier, label, color, icon }) => {
                            const count = tierCounts[tier] || 0;
                            const maxCount = Math.max(...Object.values(tierCounts), 1);
                            return (
                                <div key={tier}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: 'var(--ag-text-secondary)' }}>{icon} {label}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color }}>{count}</span>
                                    </div>
                                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                                        <div style={{
                                            height: '100%', borderRadius: 3,
                                            width: `${(count / maxCount) * 100}%`,
                                            background: color, transition: 'width 0.6s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {mlStatus?.summary && (
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--ag-glass-border)' }}>
                            <SectionTitle>Last ML Run</SectionTitle>
                            {[
                                { label: 'Total processed', val: mlStatus.summary.total || 0 },
                                { label: 'Classified',      val: mlStatus.summary.patched || 0 },
                                { label: 'False Positives', val: mlStatus.summary.debunked || 0 },
                                { label: 'Incidents filed', val: mlStatus.summary.incidents || 0 },
                            ].map(({ label, val }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                    <span style={{ fontSize: 11, color: 'var(--ag-text-muted)' }}>{label}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700 }}>{val.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* ── Recent alerts ── */}
            <Card>
                <SectionTitle>Recent Alerts (Last 5)</SectionTitle>
                {alerts.length === 0 ? (
                    <NoData msg="No alerts yet — system monitoring" />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 8 }}>
                        {alerts.slice(0, 5).map(a => {
                            const tc = ['#22c55e','#f59e0b','#ef4444','#a855f7'][a.tier - 1] || '#888';
                            return (
                                <div key={a.id} style={{
                                    padding: '10px 12px', borderRadius: 9,
                                    background: `${tc}10`, borderLeft: `3px solid ${tc}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: tc,
                                            textTransform: 'uppercase' }}>Tier {a.tier}</span>
                                        <span style={{ fontSize: 10, color: 'var(--ag-text-muted)' }}>
                                            {new Date(a.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--ag-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                        {a.message}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <div style={{ height: 32 }} />
        </div>
    );
}

function NoData({ msg }) {
    return (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ag-text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
            <div style={{ fontSize: 12 }}>{msg}</div>
        </div>
    );
}
