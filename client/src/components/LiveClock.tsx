import { useState, useEffect } from 'react';

const LiveClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-card-dark rounded-lg border border-border-dark text-text-subtle text-sm font-medium">
            <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
            <span className="text-white font-bold">
                {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </div>
    );
};

export default LiveClock;
