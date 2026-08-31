import { useMemo, useState, useEffect } from 'react';

export default function TimeSlider({ hotspots, onFilteredChange }) {
    const [dayOffset, setDayOffset] = useState(30);

    const { minDate, maxDate } = useMemo(() => {
        if (!hotspots.length) return { minDate: null, maxDate: null };
        const dates = hotspots.map(h => new Date(h.acq_date).getTime());
        return { minDate: Math.min(...dates), maxDate: Math.max(...dates) };
    }, [hotspots]);

    useEffect(() => {
        if (!minDate || !maxDate) return;
        const cutoff = minDate + ((maxDate - minDate) * dayOffset) / 30;
        onFilteredChange(hotspots.filter(h => new Date(h.acq_date).getTime() <= cutoff));
    }, [dayOffset, hotspots, minDate, maxDate, onFilteredChange]);

    if (!minDate) return null;

    const cutoffDate = new Date(minDate + ((maxDate - minDate) * dayOffset) / 30);

    return (
        <div className="card" style={{
            position: 'absolute', bottom: 10, right: 10, left: 370,
            padding: '12px 20px', zIndex: 1000,
        }}>
            <div style={{ fontSize: 12, marginBottom: 6, display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{new Date(minDate).toLocaleDateString()}</span>
                <b style={{ color: '#1e293b' }}>{cutoffDate.toLocaleString()}</b>
                <span>{new Date(maxDate).toLocaleDateString()}</span>
            </div>
            <input
                type="range" className="slider-track"
                min={0} max={30} step={0.1}
                value={dayOffset}
                onChange={e => setDayOffset(Number(e.target.value))}
            />
        </div>
    );
}