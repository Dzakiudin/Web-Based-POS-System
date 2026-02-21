interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    iconColor?: string;
    trend?: string;
    trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconColor = 'text-primary', trend, trendUp = true }) => {
    return (
        <div className="bg-card-dark p-6 rounded-xl border border-border-dark hover:border-primary/30 transition-all group shadow-lg">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2 bg-background-dark rounded-lg ${iconColor}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                {trend && (
                    <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'text-primary bg-primary/10' : 'text-text-subtle bg-background-dark border border-border-dark'
                        }`}>
                        {trendUp && <span className="material-symbols-outlined text-base mr-1">trending_up</span>}
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-text-subtle text-sm font-medium mb-1">{title}</h3>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        </div>
    );
};

export default StatCard;
