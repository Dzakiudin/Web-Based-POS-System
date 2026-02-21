import { useState, useEffect } from 'react';
import api from '../lib/axios';

interface Product { id: number; name: string; sku: string | null; stock: number; minStock: number; price: string; category: { name: string; color: string } | null; }
interface StockMovement { id: number; type: string; quantity: number; reason: string | null; reference: string | null; createdAt: string; product: { name: string; sku: string | null }; user: { name: string } | null; }

const TYPE_STYLES: Record<string, string> = {
    IN: 'bg-primary/10 text-primary', OUT: 'bg-red-500/10 text-red-400',
    ADJUSTMENT: 'bg-blue-500/10 text-blue-400', SALE: 'bg-purple-500/10 text-purple-400',
    REFUND: 'bg-amber-500/10 text-amber-400',
};

const Inventory = () => {
    const [tab, setTab] = useState<'lowstock' | 'movements'>('lowstock');
    const [lowStock, setLowStock] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [showAdjust, setShowAdjust] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [adjustForm, setAdjustForm] = useState({ productId: '', type: 'IN', quantity: '', reason: '' });

    useEffect(() => { fetchData(); }, [tab]);

    const fetchData = async () => {
        try {
            if (tab === 'lowstock') { const r = await api.get('/stock-movements/low-stock'); setLowStock(r.data); }
            else { const r = await api.get('/stock-movements'); setMovements(r.data); }
            const p = await api.get('/products'); setProducts(p.data);
        } catch (e) { console.error(e); }
    };

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/stock-movements', {
                productId: Number(adjustForm.productId), type: adjustForm.type,
                quantity: Number(adjustForm.quantity), reason: adjustForm.reason,
            });
            setShowAdjust(false);
            setAdjustForm({ productId: '', type: 'IN', quantity: '', reason: '' });
            fetchData();
        } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button onClick={() => setTab('lowstock')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${tab === 'lowstock' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-card-dark text-text-subtle border border-border-dark hover:bg-card-hover'}`}>
                        <span className="material-symbols-outlined text-[18px]">warning</span> Low Stock ({lowStock.length})
                    </button>
                    <button onClick={() => setTab('movements')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${tab === 'movements' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-card-dark text-text-subtle border border-border-dark hover:bg-card-hover'}`}>
                        <span className="material-symbols-outlined text-[18px]">sync</span> Riwayat Pergerakan
                    </button>
                </div>
                <button onClick={() => setShowAdjust(true)}
                    className="px-4 py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[18px]">add</span> Stok Masuk / Keluar
                </button>
            </div>

            {/* Low Stock Tab */}
            {tab === 'lowstock' && (
                <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                    <table className="w-full">
                        <thead><tr className="border-b border-border-dark bg-background-dark">
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Produk</th>
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Kategori</th>
                            <th className="text-center px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Stok</th>
                            <th className="text-center px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Min. Stok</th>
                            <th className="text-center px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Status</th>
                        </tr></thead>
                        <tbody>
                            {lowStock.map(p => (
                                <tr key={p.id} className="border-b border-border-dark hover:bg-card-hover transition-colors">
                                    <td className="px-5 py-3.5">
                                        <p className="text-white text-sm font-semibold">{p.name}</p>
                                        {p.sku && <p className="text-text-subtle/60 text-xs font-mono">{p.sku}</p>}
                                    </td>
                                    <td className="px-5 py-3.5 text-text-subtle text-sm">{p.category?.name || '—'}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        <span className={`font-bold text-sm ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>{p.stock}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-center text-text-subtle text-sm">{p.minStock}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${p.stock === 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                            {p.stock === 0 ? 'HABIS' : 'RENDAH'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {lowStock.length === 0 && (
                        <div className="py-16 text-center text-text-subtle">
                            <span className="material-symbols-outlined text-4xl mb-3 block">check_circle</span>
                            <p className="text-sm">Semua stok aman!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Movements Tab */}
            {tab === 'movements' && (
                <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                    <table className="w-full">
                        <thead><tr className="border-b border-border-dark bg-background-dark">
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Waktu</th>
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Produk</th>
                            <th className="text-center px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Tipe</th>
                            <th className="text-center px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Qty</th>
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Alasan</th>
                            <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">User</th>
                        </tr></thead>
                        <tbody>
                            {movements.map(m => (
                                <tr key={m.id} className="border-b border-border-dark hover:bg-card-hover transition-colors">
                                    <td className="px-5 py-3.5 text-text-subtle text-xs">{new Date(m.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td className="px-5 py-3.5 text-white text-sm">{m.product.name}</td>
                                    <td className="px-5 py-3.5 text-center">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${TYPE_STYLES[m.type] || ''}`}>{m.type}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-center text-white font-semibold text-sm">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]" style={{ color: (m.type === 'IN' || m.type === 'REFUND') ? '#13ec5b' : '#ef4444' }}>
                                                {(m.type === 'IN' || m.type === 'REFUND') ? 'trending_up' : 'trending_down'}
                                            </span>
                                            {m.quantity}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-text-subtle text-xs">{m.reason || '—'}</td>
                                    <td className="px-5 py-3.5 text-text-subtle text-xs">{m.user?.name || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Adjust Modal */}
            {showAdjust && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAdjust(false)}>
                    <div className="w-full max-w-md bg-card-dark rounded-xl border border-border-dark p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">inventory</span> Pergerakan Stok
                            </h2>
                            <button onClick={() => setShowAdjust(false)} className="text-text-subtle hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAdjust} className="space-y-4">
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Produk</label>
                                <select value={adjustForm.productId} onChange={e => setAdjustForm({ ...adjustForm, productId: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer">
                                    <option value="">Pilih produk</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Tipe</label>
                                <div className="flex gap-2">
                                    {(['IN', 'OUT', 'ADJUSTMENT'] as const).map(t => (
                                        <button key={t} type="button" onClick={() => setAdjustForm({ ...adjustForm, type: t })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${adjustForm.type === t ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background-dark border-border-dark text-text-subtle hover:bg-card-hover'}`}>
                                            {t === 'IN' ? 'Masuk' : t === 'OUT' ? 'Keluar' : 'Opname'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Jumlah</label>
                                <input type="number" min="1" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Alasan</label>
                                <input type="text" value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="Restok dari supplier..."
                                    className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-colors shadow-lg shadow-primary/20">
                                Simpan
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
