import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { ScrollText, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';

interface AuditLog {
    id: number; action: string; entity: string; entityId: string | null;
    details: string | null; ipAddress: string | null;
    createdAt: string;
    user: { id: number; name: string; role: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
    CREATE: 'bg-emerald-500/20 text-emerald-400',
    UPDATE: 'bg-blue-500/20 text-blue-400',
    DELETE: 'bg-red-500/20 text-red-400',
    LOGIN: 'bg-purple-500/20 text-purple-400',
    VOID: 'bg-amber-500/20 text-amber-400',
    REFUND: 'bg-orange-500/20 text-orange-400',
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <ScrollText className="w-7 h-7 text-indigo-400" /> Audit Log
                </h1>
                <span className="text-white/30 text-sm">{total} entri</span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none cursor-pointer min-w-[120px]">
                    <option value="">Semua Aksi</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                    <option value="LOGIN">Login</option>
                    <option value="VOID">Void</option>
                    <option value="REFUND">Refund</option>
                </select>
                <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(0); }}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none cursor-pointer min-w-[120px]">
                    <option value="">Semua Entitas</option>
                    <option value="Sale">Sale</option>
                    <option value="Product">Product</option>
                    <option value="Customer">Customer</option>
                    <option value="User">User</option>
                    <option value="Category">Category</option>
                    <option value="Discount">Discount</option>
                    <option value="CashSession">CashSession</option>
                </select>
            </div>

            {/* Log Timeline */}
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="divide-y divide-white/5">
                    {logs.map(log => (
                        <div key={log.id} className="px-5 py-3 flex items-start gap-4 hover:bg-white/3 transition-colors group">
                            {/* Timeline dot */}
                            <div className="flex flex-col items-center mt-1">
                                <div className={`w-2.5 h-2.5 rounded-full ${(ACTION_COLORS[log.action] || 'bg-white/20').split(' ')[0]}`} />
                                <div className="w-px h-full bg-white/5 mt-1" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ACTION_COLORS[log.action] || 'bg-white/10 text-white/50'}`}>
                                        {log.action}
                                    </span>
                                    <span className="text-white/60 text-xs font-medium">{log.entity}</span>
                                    {log.entityId && <span className="text-white/30 text-[10px] font-mono">#{log.entityId}</span>}
                                </div>
                                {log.details && <p className="text-white/40 text-xs truncate">{log.details}</p>}
                            </div>

                            {/* User & Time */}
                            <div className="text-right flex-shrink-0">
                                {log.user && (
                                    <div className="flex items-center gap-1.5 text-xs text-white/50 mb-0.5 justify-end">
                                        <User className="w-3 h-3" />
                                        <span>{log.user.name}</span>
                                        <span className="text-[10px] px-1.5 py-0 rounded bg-white/5 text-white/30">{log.user.role}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-white/25 justify-end">
                                    <Clock className="w-3 h-3" />
                                    {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {logs.length === 0 && (
                    <div className="py-16 text-center text-white/30">
                        <ScrollText className="w-10 h-10 mx-auto mb-3" />
                        <p className="text-sm">Tidak ada log audit</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-white/50 text-sm">{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 disabled:opacity-30">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
