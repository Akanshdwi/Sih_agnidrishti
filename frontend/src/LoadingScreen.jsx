export default function LoadingScreen() {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: '#0a0a0f',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 3000, overflow: 'hidden',
        }}>
            <svg width="220" height="220" viewBox="0 0 220 220">
                <defs>
                    <radialGradient id="fireGrad" cx="50%" cy="70%" r="60%">
                        <stop offset="0%" stopColor="#fff59d" />
                        <stop offset="40%" stopColor="#ff9800" />
                        <stop offset="100%" stopColor="#d32f2f" />
                    </radialGradient>
                    <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffb74d" />
                        <stop offset="60%" stopColor="#e65100" />
                        <stop offset="100%" stopColor="#3e0a00" />
                    </radialGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* eye outline */}
                <path d="M20,110 Q110,30 200,110 Q110,190 20,110 Z" fill="none" stroke="#ff7043" strokeWidth="3" filter="url(#glow)">
                    <animate attributeName="d"
                        values="M20,110 Q110,30 200,110 Q110,190 20,110 Z;
                    M20,110 Q110,40 200,110 Q110,180 20,110 Z;
                    M20,110 Q110,30 200,110 Q110,190 20,110 Z"
                        dur="3s" repeatCount="indefinite" />
                </path>

                {/* iris */}
                <circle cx="110" cy="110" r="38" fill="url(#irisGrad)" filter="url(#glow)">
                    <animate attributeName="r" values="38;42;38" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* pupil */}
                <circle cx="110" cy="110" r="14" fill="#0a0a0f" />

                {/* rising embers */}
                {[...Array(6)].map((_, i) => (
                    <circle key={i} cx={70 + i * 16} cy="150" r={2 + (i % 3)} fill="url(#fireGrad)">
                        <animate attributeName="cy" values="150;-10" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.25}s`} />
                        <animate attributeName="opacity" values="1;0" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" begin={`${i * 0.25}s`} />
                    </circle>
                ))}
            </svg>

            <h1 style={{
                color: '#ff7043', fontFamily: "'Inter', sans-serif", fontSize: 26,
                letterSpacing: 3, marginTop: 10, fontWeight: 700,
            }}>
                AGNIDRISHTI
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 13, letterSpacing: 1 }}>
                Scanning thermal signatures...
            </p>
        </div>
    );
}