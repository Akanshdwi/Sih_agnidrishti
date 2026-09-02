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
        <div className="timeslider-bar">
            <div className="slider-label">Timeline </div>
            <span className="slider-date">{new Date(minDate).toLocaleDateString([], {month:'short', day:'numeric'})}</span>
            <input
                type="range" className="slider-track"
                min={0} max={30} step={0.1}
                value={dayOffset}
                onChange={e => setDayOffset(Number(e.target.value))}
            />
            <span className="slider-date" style={{ color: 'var(--text-primary)' }}>
                {cutoffDate.toLocaleDateString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
            </span>
        </div>
    );
}