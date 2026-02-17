import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center space-x-3 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-lg shadow-black/20 group hover:border-indigo-500/50 transition-all duration-500">
            <div className="p-2 bg-indigo-600/20 rounded-xl group-hover:bg-indigo-600/30 transition-colors">
                <Clock className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-widest tabular-nums leading-none">
                    {time.toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                    Jakarta Time
                </span>
            </div>
        </div>
    );
};

export default LiveClock;
