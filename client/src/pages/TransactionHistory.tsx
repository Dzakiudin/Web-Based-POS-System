import { useState, useEffect } from 'react';
import api from '../lib/axios';
import Modal from '../components/Modal';

interface Sale {
    id: number; receiptNumber: string; date: string;
    totalPrice: string; discountAmount: string; finalPrice: string;
    status: string; notes: string | null; refundReason: string | null;
    customer: { name: string } | null;
    user: { name: string } | null;
    payments: { method: string; amount: string; change: string; reference: string | null }[];
    _count: { details: number };
}

const STATUS_STYLES: Record<string, string> = {
    COMPLETED: 'bg-primary/10 text-primary border-primary/30',
    VOIDED: 'bg-red-500/10 text-red-400 border-red-500/30',
    REFUNDED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    HELD: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const TransactionHistory = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [actionType, setActionType] = useState<'void' | 'refund'>('void');
    const limit = 20;

    useEffect(() => { fetchSales(); }, [page, statusFilter, startDate, endDate]);

    const fetchSales = async () => {
        try {
            const params: any = { limit, offset: page * limit };
            if (statusFilter) params.status = statusFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            const r = await api.get('/sales', { params });
            setSales(r.data.sales);
            setTotal(r.data.total);
        } catch (e) { console.error(e); }
    };

    const viewSaleDetail = async (id: number) => {
        try {
            const r = await api.get(`/sales/${id}`);
            setSelectedSale(r.data);
            setShowDetail(true);
        } catch (e) { console.error(e); }
    };

    const handleVoidRefund = async () => {
        if (!voidReason.trim() || !selectedSale) return;
        try {
            await api.post(`/sales/${selectedSale.id}/${actionType}`, { reason: voidReason });
            setShowVoidModal(false);
            setVoidReason('');
            setShowDetail(false);
            fetchSales();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Action failed');
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">search</span>
                    <input type="text" placeholder="Cari no. receipt..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                    className="px-4 py-2.5 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none appearance-none cursor-pointer min-w-[130px]">
                    <option value="">Semua Status</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="VOIDED">Voided</option>
                    <option value="REFUNDED">Refunded</option>
                </select>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }}
                    className="px-3 py-2.5 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none" />
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }}
                    className="px-3 py-2.5 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none" />
                <span className="text-text-subtle text-sm flex items-center">{total} transaksi</span>
            </div>

            {/* Table */}
            <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border-dark bg-background-dark">
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Receipt</th>
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Tanggal</th>
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Pelanggan</th>
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Pembayaran</th>
                            <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Total</th>
                            <th className="text-center px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Status</th>
                            <th className="text-center px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.filter(s => !search || s.receiptNumber.toLowerCase().includes(search.toLowerCase())).map(sale => (
                            <tr key={sale.id} className="border-b border-border-dark hover:bg-card-hover transition-colors">
                                <td className="px-5 py-3.5 text-sm text-white font-mono text-xs font-medium">{sale.receiptNumber}</td>
                                <td className="px-5 py-3.5 text-sm text-text-subtle">{new Date(sale.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td className="px-5 py-3.5 text-sm text-text-subtle">{sale.customer?.name || '—'}</td>
                                <td className="px-5 py-3.5 text-xs">
                                    {sale.payments.map((p, i) => (
                                        <span key={i} className="inline-block bg-background-dark px-2 py-0.5 rounded-md text-text-subtle mr-1 border border-border-dark">{p.method}</span>
                                    ))}
                                </td>
                                <td className="px-5 py-3.5 text-sm text-primary font-bold text-right">Rp {Number(sale.finalPrice).toLocaleString('id-ID')}</td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_STYLES[sale.status] || ''}`}>
                                        {sale.status}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <button onClick={() => viewSaleDetail(sale.id)} className="text-text-subtle hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sales.length === 0 && (
                    <div className="text-center py-16 text-text-subtle">
                        <span className="material-symbols-outlined text-4xl mb-3 block">receipt_long</span>
                        <p className="text-sm">Belum ada transaksi</p>
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

            {/* Detail Modal */}
            {showDetail && selectedSale && (
                <Modal isOpen={showDetail} title="Detail Transaksi" onClose={() => setShowDetail(false)}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-text-subtle">Receipt:</span> <span className="text-white font-mono">{selectedSale.receiptNumber}</span></div>
                            <div><span className="text-text-subtle">Status:</span> <span className={`px-2 py-0.5 rounded-md text-xs border ${STATUS_STYLES[selectedSale.status]}`}>{selectedSale.status}</span></div>
                            <div><span className="text-text-subtle">Tanggal:</span> <span className="text-white">{new Date(selectedSale.date).toLocaleString('id-ID')}</span></div>
                            <div><span className="text-text-subtle">Kasir:</span> <span className="text-white">{selectedSale.user?.name || '—'}</span></div>
                            <div><span className="text-text-subtle">Pelanggan:</span> <span className="text-white">{selectedSale.customer?.name || 'Walk-in'}</span></div>
                        </div>

                        {selectedSale.refundReason && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <p className="text-red-400 text-xs font-medium">Alasan: {selectedSale.refundReason}</p>
                            </div>
                        )}

                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border-dark">
                                <th className="text-left py-2 text-text-subtle text-xs">Item</th>
                                <th className="text-center py-2 text-text-subtle text-xs">Qty</th>
                                <th className="text-right py-2 text-text-subtle text-xs">Harga</th>
                                <th className="text-right py-2 text-text-subtle text-xs">Sub</th>
                            </tr></thead>
                            <tbody>
                                {selectedSale.details?.map((d: any) => (
                                    <tr key={d.id} className="border-b border-border-dark/50">
                                        <td className="py-2 text-white">{d.product.name}</td>
                                        <td className="py-2 text-center text-text-subtle">{d.quantity}</td>
                                        <td className="py-2 text-right text-text-subtle">Rp {Number(d.unitPrice).toLocaleString('id-ID')}</td>
                                        <td className="py-2 text-right text-primary font-medium">Rp {Number(d.subtotal).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="border-t border-border-dark pt-3 space-y-1">
                            <div className="flex justify-between text-sm"><span className="text-text-subtle">Subtotal</span><span className="text-white">Rp {Number(selectedSale.totalPrice).toLocaleString('id-ID')}</span></div>
                            {Number(selectedSale.discountAmount) > 0 && (
                                <div className="flex justify-between text-sm"><span className="text-primary/60">Diskon</span><span className="text-primary">-Rp {Number(selectedSale.discountAmount).toLocaleString('id-ID')}</span></div>
                            )}
                            <div className="flex justify-between text-base font-bold"><span className="text-white">Total</span><span className="text-primary">Rp {Number(selectedSale.finalPrice).toLocaleString('id-ID')}</span></div>
                        </div>

                        {selectedSale.payments?.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-text-subtle text-xs font-semibold">Pembayaran:</p>
                                {selectedSale.payments.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm bg-background-dark rounded-lg px-3 py-2 border border-border-dark">
                                        <span className="text-text-subtle">{p.method} {p.reference && `(${p.reference})`}</span>
                                        <span className="text-white font-semibold">Rp {Number(p.amount).toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedSale.status === 'COMPLETED' && (
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => { setActionType('void'); setShowVoidModal(true); }}
                                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">block</span> Void
                                </button>
                                <button onClick={() => { setActionType('refund'); setShowVoidModal(true); }}
                                    className="flex-1 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">undo</span> Refund
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Void/Refund Reason Modal */}
            {showVoidModal && (
                <Modal isOpen={showVoidModal} title={`${actionType === 'void' ? 'Void' : 'Refund'} Transaksi`} onClose={() => setShowVoidModal(false)}>
                    <div className="space-y-4">
                        <p className="text-text-subtle text-sm">Masukkan alasan {actionType === 'void' ? 'void' : 'refund'}:</p>
                        <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} placeholder="Alasan..."
                            className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                        <button onClick={handleVoidRefund} disabled={!voidReason.trim()}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${actionType === 'void'
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                                } disabled:opacity-30`}>
                            Konfirmasi {actionType === 'void' ? 'Void' : 'Refund'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TransactionHistory;
