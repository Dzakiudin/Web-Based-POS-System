const Skeleton = ({ className = '', ...props }: { className?: string;[key: string]: any }) => (
    <div
        className={`animate-pulse bg-surface-dark/60 rounded-xl ${className}`}
        {...props}
    />
);

// Pre-built skeleton patterns
export const CardSkeleton = () => (
    <div className="bg-card-dark rounded-xl border border-border-dark p-6 space-y-4 shadow-lg h-full">
        <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-xl" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
            </div>
        </div>
        <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
        </div>
    </div>
);

export const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => (
    <tr className="border-b border-border-dark/50">
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="px-5 py-4"><Skeleton className="h-3.5 w-full max-w-[120px]" /></td>
        ))}
    </tr>
);

export const StatCardSkeleton = () => (
    <div className="bg-card-dark rounded-xl border border-border-dark p-4 space-y-3 shadow-md">
        <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-2 w-16" />
        </div>
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-12" />
        </div>
    </div>
);

export const PageSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>
        <div className="bg-card-dark rounded-xl border border-border-dark p-1 shadow-lg">
            <div className="p-4 border-b border-border-dark">
                <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-0">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="px-6 py-5 flex gap-6 border-b border-border-dark last:border-0">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-full max-w-sm" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32 ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default Skeleton;
