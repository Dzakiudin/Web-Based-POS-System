import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    return (
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group glass-hover border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-indigo-600/10 transition-all duration-500">
            <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full opacity-20 -mr-8 -mt-8 ${color.replace('bg-', 'bg-')}`}></div>
            <div className="absolute inset-0 border border-white/5 rounded-3xl group-hover:border-white/10 transition-colors"></div>

            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-slate-400 text-[10px] font-bold mb-2 tracking-[0.2em] uppercase opacity-70 group-hover:opacity-100 transition-opacity">{title}</p>
                    <h3 className="text-3xl font-black text-white tracking-tight group-hover:scale-105 transition-transform origin-left duration-500">{value}</h3>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 ${color}/10 backdrop-blur-sm group-hover:rotate-6 transition-transform duration-500 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>
            </div>
        </div>
    );
};

export default StatCard;
