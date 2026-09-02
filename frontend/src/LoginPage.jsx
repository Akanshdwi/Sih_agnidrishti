/**
 * LoginPage.jsx — Government authentication portal
 * Two modes: Sign In | Request Access (register)
 */
import { useState } from 'react';
import { login, register, setToken, setUser } from './api.js';

const ALLOWED_DOMAINS = [
    'gov.in', 'nic.in', 'isro.gov.in', 'imd.gov.in',
    'gsdma.org', 'gujarat.gov.in', 'iitb.ac.in', 'iitgn.ac.in',
];

const DEPARTMENTS = [
    'GSDMA — Gujarat State Disaster Management Authority',
    'Gujarat Forest Department',
    'ISRO / SAC — Space Applications Centre',
    'IMD — India Meteorological Department',
    'CPCB / GPCB — Pollution Control Board',
    'Revenue & Relief Commissioner, Gujarat',
    'IIT Gandhinagar / IIT Bombay (Research)',
    'National Disaster Response Force (NDRF)',
    'Other Government Agency',
];

export default function LoginPage({ onAuthSuccess }) {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [form, setForm] = useState({
        email: '', password: '', full_name: '', designation: '', department: '',
    });
    const [error,   setError]   = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const { token, user } = await login(form.email, form.password);
            setToken(token);
            setUser(user);
            onAuthSuccess(user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            const data = await register({
                email:       form.email,
                password:    form.password,
                full_name:   form.full_name,
                designation: form.designation,
                department:  form.department,
            });
            setSuccess(data.message || 'Registration submitted. Await admin approval.');
            setForm({ email: '', password: '', full_name: '', designation: '', department: '' });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', width: '100vw',
            background: 'linear-gradient(135deg, #020817 0%, #0a1628 50%, #060d1f 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', sans-serif",
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Background grid */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.06,
                backgroundImage: `linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
            }} />

            {/* Glow orbs */}
            <div style={{
                position: 'absolute', top: '15%', left: '10%',
                width: 400, height: 400, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '15%', right: '10%',
                width: 350, height: 350, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Card */}
            <div style={{
                position: 'relative', width: '100%', maxWidth: 440,
                background: 'rgba(8,15,30,0.92)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: '36px 40px',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🔥</div>
                    <h1 style={{
                        fontSize: 22, fontWeight: 800, margin: 0,
                        background: 'linear-gradient(90deg, #ef4444, #f97316)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>AgniDrishti</h1>
                    <p style={{ fontSize: 11, color: 'rgba(138,172,204,0.6)', margin: '4px 0 0',
                        letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        Industrial Thermal Intelligence · SIH 2026
                    </p>
                    <div style={{
                        marginTop: 10, fontSize: 10, padding: '3px 12px', display: 'inline-block',
                        borderRadius: 999, background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa',
                        fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase',
                    }}>
                        🏛️ Authorised Personnel Only
                    </div>
                </div>

                {/* Tab switcher */}
                <div style={{
                    display: 'flex', background: 'rgba(255,255,255,0.04)',
                    borderRadius: 10, padding: 3, marginBottom: 24,
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    {[['login', 'Sign In'], ['register', 'Request Access']].map(([m, label]) => (
                        <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }} style={{
                            flex: 1, padding: '8px 0', borderRadius: 8,
                            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                            background: mode === m ? 'rgba(59,130,246,0.2)' : 'transparent',
                            color: mode === m ? '#60a5fa' : 'rgba(138,172,204,0.5)',
                            outline: mode === m ? '1px solid rgba(59,130,246,0.3)' : 'none',
                        }}>{label}</button>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
                    {mode === 'register' && (
                        <Field label="Full Name *" type="text" placeholder="Dr. Ramesh Patel"
                            value={form.full_name} onChange={v => set('full_name', v)} />
                    )}

                    <Field label="Official Email *" type="email" placeholder="officer@gujarat.gov.in"
                        value={form.email} onChange={v => set('email', v)} />

                    <Field label="Password *" type="password"
                        placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                        value={form.password} onChange={v => set('password', v)} />

                    {mode === 'register' && (
                        <>
                            <Field label="Designation" type="text" placeholder="Fire Safety Officer"
                                value={form.designation} onChange={v => set('designation', v)} />

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600,
                                    color: 'rgba(138,172,204,0.7)', marginBottom: 5, textTransform: 'uppercase',
                                    letterSpacing: 0.8 }}>Department</label>
                                <select value={form.department} onChange={e => set('department', e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 9,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: form.department ? '#f0f6ff' : 'rgba(138,172,204,0.4)',
                                        fontSize: 13, fontFamily: 'inherit', outline: 'none',
                                        boxSizing: 'border-box',
                                    }}>
                                    <option value="">Select department…</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                            <div style={{
                                padding: '10px 12px', borderRadius: 9, marginBottom: 14,
                                background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)',
                                fontSize: 11, color: '#60a5fa', lineHeight: 1.5,
                            }}>
                                ℹ️ Access restricted to government & authorised institutional emails
                                ({ALLOWED_DOMAINS.slice(0,4).join(', ')}, etc.)
                            </div>
                        </>
                    )}

                    {error && (
                        <div style={{
                            padding: '10px 12px', borderRadius: 9, marginBottom: 14,
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                            fontSize: 12, color: '#f87171',
                        }}>⚠️ {error}</div>
                    )}

                    {success && (
                        <div style={{
                            padding: '10px 12px', borderRadius: 9, marginBottom: 14,
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                            fontSize: 12, color: '#4ade80',
                        }}>✓ {success}</div>
                    )}

                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '12px 0', borderRadius: 10,
                        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                        background: loading
                            ? 'rgba(59,130,246,0.3)'
                            : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                        color: 'white',
                        boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.35)',
                        transition: 'all 0.2s',
                        letterSpacing: 0.5,
                    }}>
                        {loading ? '⟳ Please wait…' : mode === 'login' ? '🔐 Sign In' : '📋 Submit Request'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 10,
                    color: 'rgba(138,172,204,0.35)', lineHeight: 1.6 }}>
                    AgniDrishti · SIH-2026 · Team 26162<br />
                    Unauthorized access is a criminal offence under IT Act 2000
                </p>
            </div>
        </div>
    );
}

function Field({ label, type, placeholder, value, onChange }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{
                display: 'block', fontSize: 11, fontWeight: 600,
                color: 'rgba(138,172,204,0.7)', marginBottom: 5,
                textTransform: 'uppercase', letterSpacing: 0.8,
            }}>{label}</label>
            <input
                type={type} placeholder={placeholder} value={value} required
                onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%', padding: '10px 12px', borderRadius: 9,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f0f6ff', fontSize: 13, fontFamily: 'inherit',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
        </div>
    );
}
