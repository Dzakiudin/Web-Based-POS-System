import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Search, Eye, RotateCcw, XCircle, Receipt, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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
    COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    VOIDED: 'bg-red-500/20 text-red-400 border-red-500/30',
    REFUNDED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    HELD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Receipt className="w-7 h-7 text-indigo-400" /> Riwayat Transaksi
                </h1>
                <span className="text-white/40 text-sm">{total} transaksi</span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input type="text" placeholder="Cari no. receipt..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none cursor-pointer min-w-[130px]">
                    <option value="">Semua Status</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="VOIDED">Voided</option>
                    <option value="REFUNDED">Refunded</option>
                </select>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }}
                    className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }}
                    className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
            </div>

            {/* Table */}
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/3">
                            <th className="text-left px-4 py-3 text-xs text-white/50 font-medium">Receipt</th>
                            <th className="text-left px-4 py-3 text-xs text-white/50 font-medium">Tanggal</th>
                            <th className="text-left px-4 py-3 text-xs text-white/50 font-medium">Pelanggan</th>
                            <th className="text-left px-4 py-3 text-xs text-white/50 font-medium">Pembayaran</th>
                            <th className="text-right px-4 py-3 text-xs text-white/50 font-medium">Total</th>
                            <th className="text-center px-4 py-3 text-xs text-white/50 font-medium">Status</th>
                            <th className="text-center px-4 py-3 text-xs text-white/50 font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.filter(s => !search || s.receiptNumber.toLowerCase().includes(search.toLowerCase())).map(sale => (
                            <tr key={sale.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="px-4 py-3 text-sm text-white/80 font-mono text-xs">{sale.receiptNumber}</td>
                                <td className="px-4 py-3 text-sm text-white/60">{new Date(sale.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td className="px-4 py-3 text-sm text-white/60">{sale.customer?.name || '—'}</td>
                                <td className="px-4 py-3 text-xs">
                                    {sale.payments.map((p, i) => (
                                        <span key={i} className="inline-block bg-white/5 px-2 py-0.5 rounded-md text-white/50 mr-1">{p.method}</span>
                                    ))}
                                </td>
                                <td className="px-4 py-3 text-sm text-indigo-400 font-bold text-right">Rp {Number(sale.finalPrice).toLocaleString('id-ID')}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-medium border ${STATUS_STYLES[sale.status] || ''}`}>
                                        {sale.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => viewSaleDetail(sale.id)} className="text-white/40 hover:text-indigo-400 transition-colors">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sales.length === 0 && (
                    <div className="text-center py-16 text-white/30">
                        <Receipt className="w-10 h-10 mx-auto mb-3" />
                        <p className="text-sm">Belum ada transaksi</p>
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

            {/* Detail Modal */}
            {showDetail && selectedSale && (
                <Modal title="Detail Transaksi" onClose={() => setShowDetail(false)}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-white/40">Receipt:</span> <span className="text-white/80 font-mono">{selectedSale.receiptNumber}</span></div>
                            <div><span className="text-white/40">Status:</span> <span className={`px-2 py-0.5 rounded-md text-xs border ${STATUS_STYLES[selectedSale.status]}`}>{selectedSale.status}</span></div>
                            <div><span className="text-white/40">Tanggal:</span> <span className="text-white/80">{new Date(selectedSale.date).toLocaleString('id-ID')}</span></div>
                            <div><span className="text-white/40">Kasir:</span> <span className="text-white/80">{selectedSale.user?.name || '—'}</span></div>
                            <div><span className="text-white/40">Pelanggan:</span> <span className="text-white/80">{selectedSale.customer?.name || 'Walk-in'}</span></div>
                        </div>

                        {selectedSale.refundReason && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                <p className="text-red-400 text-xs font-medium">Alasan: {selectedSale.refundReason}</p>
                            </div>
                        )}

                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-white/10">
                                <th className="text-left py-2 text-white/40 text-xs">Item</th>
                                <th className="text-center py-2 text-white/40 text-xs">Qty</th>
                                <th className="text-right py-2 text-white/40 text-xs">Harga</th>
                                <th className="text-right py-2 text-white/40 text-xs">Sub</th>
                            </tr></thead>
                            <tbody>
                                {selectedSale.details?.map((d: any) => (
                                    <tr key={d.id} className="border-b border-white/5">
                                        <td className="py-2 text-white/80">{d.product.name}</td>
                                        <td className="py-2 text-center text-white/60">{d.quantity}</td>
                                        <td className="py-2 text-right text-white/60">Rp {Number(d.unitPrice).toLocaleString('id-ID')}</td>
                                        <td className="py-2 text-right text-indigo-400 font-medium">Rp {Number(d.subtotal).toLocaleString('id-ID')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="border-t border-white/10 pt-3 space-y-1">
                            <div className="flex justify-between text-sm"><span className="text-white/40">Subtotal</span><span className="text-white/70">Rp {Number(selectedSale.totalPrice).toLocaleString('id-ID')}</span></div>
                            {Number(selectedSale.discountAmount) > 0 && (
                                <div className="flex justify-between text-sm"><span className="text-emerald-400/60">Diskon</span><span className="text-emerald-400">-Rp {Number(selectedSale.discountAmount).toLocaleString('id-ID')}</span></div>
                            )}
                            <div className="flex justify-between text-base font-bold"><span className="text-white">Total</span><span className="text-indigo-400">Rp {Number(selectedSale.finalPrice).toLocaleString('id-ID')}</span></div>
                        </div>

                        {selectedSale.payments?.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-white/40 text-xs">Pembayaran:</p>
                                {selectedSale.payments.map((p: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                                        <span className="text-white/60">{p.method} {p.reference && `(${p.reference})`}</span>
                                        <span className="text-white/80">Rp {Number(p.amount).toLocaleString('id-ID')}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedSale.status === 'COMPLETED' && (
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => { setActionType('void'); setShowVoidModal(true); }}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
                                    <XCircle className="w-4 h-4" /> Void
                                </button>
                                <button onClick={() => { setActionType('refund'); setShowVoidModal(true); }}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2">
                                    <RotateCcw className="w-4 h-4" /> Refund
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Void/Refund Reason Modal */}
            {showVoidModal && (
                <Modal title={`${actionType === 'void' ? 'Void' : 'Refund'} Transaksi`} onClose={() => setShowVoidModal(false)}>
                    <div className="space-y-4">
                        <p className="text-white/50 text-sm">Masukkan alasan {actionType === 'void' ? 'void' : 'refund'}:</p>
                        <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} placeholder="Alasan..."
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 resize-none" />
                        <button onClick={handleVoidRefund} disabled={!voidReason.trim()}
                            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${actionType === 'void'
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
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
