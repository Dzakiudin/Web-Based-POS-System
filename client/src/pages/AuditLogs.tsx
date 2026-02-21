import { useState, useEffect } from 'react';
import api from '../lib/axios';

interface AuditLog {
    id: number; action: string; entity: string; entityId: string | null;
    details: string | null; ipAddress: string | null;
    createdAt: string;
    user: { id: number; name: string; role: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-primary/10 text-primary',
    UPDATE: 'bg-blue-500/10 text-blue-400',
    DELETE: 'bg-red-500/10 text-red-400',
    LOGIN: 'bg-purple-500/10 text-purple-400',
    VOID: 'bg-amber-500/10 text-amber-400',
    REFUND: 'bg-orange-500/10 text-orange-400',
};

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const limit = 30;

    useEffect(() => { fetchLogs(); }, [page, actionFilter, entityFilter]);

    const fetchLogs = async () => {
        try {
            const params: any = { limit, offset: page * limit };
            if (actionFilter) params.action = actionFilter;
            if (entityFilter) params.entity = entityFilter;
            const r = await api.get('/audit-logs', { params });
            setLogs(r.data.logs);
            setTotal(r.data.total);
        } catch (e) { console.error(e); }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none appearance-none cursor-pointer min-w-[120px]">
                    <option value="">Semua Aksi</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                    <option value="LOGIN">Login</option>
                    <option value="VOID">Void</option>
                    <option value="REFUND">Refund</option>
                </select>
                <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none appearance-none cursor-pointer min-w-[120px]">
                    <option value="">Semua Entitas</option>
                    <option value="Sale">Sale</option>
                    <option value="Product">Product</option>
                    <option value="Customer">Customer</option>
                    <option value="User">User</option>
                    <option value="Category">Category</option>
                    <option value="Discount">Discount</option>
                    <option value="CashSession">CashSession</option>
                </select>
                <span className="text-text-subtle text-sm ml-auto">{total} entri</span>
            </div>

            {/* Log Timeline */}
            <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                <div className="divide-y divide-border-dark">
                    {logs.map(log => (
                        <div key={log.id} className="px-5 py-3.5 flex items-start gap-4 hover:bg-card-hover transition-colors group">
                            <div className="flex flex-col items-center mt-1">
                                <div className={`size-2.5 rounded-full ${(ACTION_COLORS[log.action] || 'bg-card-hover').split(' ')[0]}`} />
                                <div className="w-px h-full bg-border-dark mt-1" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${ACTION_COLORS[log.action] || 'bg-card-hover text-text-subtle'}`}>
                                        {log.action}
                                    </span>
                                    <span className="text-white text-xs font-medium">{log.entity}</span>
                                    {log.entityId && <span className="text-text-subtle text-xs font-mono">#{log.entityId}</span>}
                                </div>
                                {log.details && <p className="text-text-subtle/60 text-xs truncate">{log.details}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                                {log.user && (
                                    <div className="flex items-center gap-1.5 text-xs text-text-subtle mb-0.5 justify-end">
                                        <span className="material-symbols-outlined text-[14px]">person</span>
                                        <span>{log.user.name}</span>
                                        <span className="text-xs px-1.5 py-0 rounded bg-background-dark text-text-subtle/60 border border-border-dark">{log.user.role}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-text-subtle/40 justify-end">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {logs.length === 0 && (
                    <div className="py-16 text-center text-text-subtle">
                        <span className="material-symbols-outlined text-4xl mb-3 block">description</span>
                        <p className="text-sm">Tidak ada log audit</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="p-2 rounded-lg bg-card-dark border border-border-dark text-text-subtle hover:bg-card-hover disabled:opacity-30">
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="text-text-subtle text-sm">{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="p-2 rounded-lg bg-card-dark border border-border-dark text-text-subtle hover:bg-card-hover disabled:opacity-30">
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
