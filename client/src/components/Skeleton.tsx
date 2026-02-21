const Skeleton = ({ className = '', ...props }: { className?: string;[key: string]: any }) => (
    <div
        className={`animate-pulse bg-white/5 rounded-xl ${className}`}
        {...props}
    />
);

// Pre-built skeleton patterns
export const CardSkeleton = () => (
    <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-3">
        <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-1/3" />
            </div>
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-4/5" />
    </div>
);

export const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => (
    <tr className="border-b border-white/5">
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="px-4 py-3"><Skeleton className="h-3 w-full max-w-[120px]" /></td>
        ))}
    </tr>
);

export const StatCardSkeleton = () => (
    <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-2 w-16" />
        </div>
        <Skeleton className="h-6 w-20" />
    </div>
);

export const PageSkeleton = () => (
    <div className="space-y-5">
        <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
        <div className="glass-card rounded-2xl border border-white/10 p-1">
            <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 flex gap-4">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-16 ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default Skeleton;
