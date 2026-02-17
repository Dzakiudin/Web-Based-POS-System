import React from 'react';

const KineticMarquee: React.FC = () => {
    return (
        <div className="w-full bg-white/5 border-b border-white/10 overflow-hidden py-1.5 backdrop-blur-sm z-50">
            <div className="flex whitespace-nowrap animate-marquee">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-8 px-4">
                        <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">POS PRO MAX SYSTEM</span>
                        <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                        <span className="text-[10px] font-medium text-slate-400">PREMIUM ANALYTICS ENABLED</span>
                        <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                        <span className="text-[10px] font-medium text-slate-400">REAL-TIME SYNC ACTIVE</span>
                        <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                        <span className="text-[10px] font-medium text-emerald-400">STORE SECURE</span>
                        <div className="w-1 h-1 bg-white/30 rounded-full"></div>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-20%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default KineticMarquee;
