import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Package, ArrowUpRight, ArrowDownRight, AlertTriangle, BarChart3, RefreshCw, Plus, Search } from 'lucide-react';

interface Product { id: number; name: string; sku: string | null; stock: number; minStock: number; price: string; category: { name: string; color: string } | null; }
interface StockMovement { id: number; type: string; quantity: number; reason: string | null; reference: string | null; createdAt: string; product: { name: string; sku: string | null }; user: { name: string } | null; }

const TYPE_STYLES: Record<string, string> = {
    IN: 'bg-emerald-500/20 text-emerald-400', OUT: 'bg-red-500/20 text-red-400',
    ADJUSTMENT: 'bg-blue-500/20 text-blue-400', SALE: 'bg-purple-500/20 text-purple-400',
    REFUND: 'bg-amber-500/20 text-amber-400',
};

const Inventory = () => {
    const [tab, setTab] = useState<'lowstock' | 'movements'>('lowstock');
    const [lowStock, setLowStock] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [search, setSearch] = useState('');
    const [showAdjust, setShowAdjust] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [adjustForm, setAdjustForm] = useState({ productId: '', type: 'IN', quantity: '', reason: '' });

    useEffect(() => { fetchData(); }, [tab]);

    const fetchData = async () => {
        try {
            if (tab === 'lowstock') {
                const r = await api.get('/stock-movements/low-stock');
                setLowStock(r.data);
            } else {
                const r = await api.get('/stock-movements');
                setMovements(r.data);
            }
            const p = await api.get('/products');
            setProducts(p.data);
        } catch (e) { console.error(e); }
    };

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/stock-movements', {
                productId: Number(adjustForm.productId),
                type: adjustForm.type,
                quantity: Number(adjustForm.quantity),
                reason: adjustForm.reason,
            });
            setShowAdjust(false);
            setAdjustForm({ productId: '', type: 'IN', quantity: '', reason: '' });
            fetchData();
        } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BarChart3 className="w-7 h-7 text-indigo-400" /> Manajemen Stok
                </h1>
                <button onClick={() => setShowAdjust(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Stok Masuk / Keluar
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button onClick={() => setTab('lowstock')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'lowstock' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}>
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />Low Stock ({lowStock.length})
                </button>
                <button onClick={() => setTab('movements')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'movements' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}>
                    <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />Riwayat Pergerakan
                </button>
            </div>

            {/* Low Stock Tab */}
            {tab === 'lowstock' && (
                <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                        <thead><tr className="border-b border-white/10 bg-white/3">
                            <th className="text-left px-4 py-3 text-xs text-white/50">Produk</th>
                            <th className="text-left px-4 py-3 text-xs text-white/50">Kategori</th>
                            <th className="text-center px-4 py-3 text-xs text-white/50">Stok</th>
                            <th className="text-center px-4 py-3 text-xs text-white/50">Min. Stok</th>
                            <th className="text-center px-4 py-3 text-xs text-white/50">Status</th>
                        </tr></thead>
                        <tbody>
                            {lowStock.map(p => (
                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                                    <td className="px-4 py-3">
                                        <p className="text-white/80 text-sm font-medium">{p.name}</p>
                                        {p.sku && <p className="text-white/30 text-[10px] font-mono">{p.sku}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-white/50 text-sm">{p.category?.name || '—'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`font-bold text-sm ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>{p.stock}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-white/40 text-sm">{p.minStock}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${p.stock === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {p.stock === 0 ? 'HABIS' : 'RENDAH'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {lowStock.length === 0 && (
                        <div className="py-16 text-center text-white/30"><Package className="w-10 h-10 mx-auto mb-3" /><p className="text-sm">Semua stok aman!</p></div>
                    )}
                </div>
            )}

            {/* Movements Tab */}
            {tab === 'movements' && (
                <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                        <thead><tr className="border-b border-white/10 bg-white/3">
                            <th className="text-left px-4 py-3 text-xs text-white/50">Waktu</th>
                            <th className="text-left px-4 py-3 text-xs text-white/50">Produk</th>
                            <th className="text-center px-4 py-3 text-xs text-white/50">Tipe</th>
                            <th className="text-center px-4 py-3 text-xs text-white/50">Qty</th>
                            <th className="text-left px-4 py-3 text-xs text-white/50">Alasan</th>
                            <th className="text-left px-4 py-3 text-xs text-white/50">User</th>
                        </tr></thead>
                        <tbody>
                            {movements.map(m => (
                                <tr key={m.id} className="border-b border-white/5 hover:bg-white/3">
                                    <td className="px-4 py-3 text-white/50 text-xs">{new Date(m.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td className="px-4 py-3"><p className="text-white/80 text-sm">{m.product.name}</p></td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${TYPE_STYLES[m.type] || ''}`}>{m.type}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-white/80 font-medium text-sm flex items-center justify-center gap-1">
                                        {(m.type === 'IN' || m.type === 'REFUND') ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                                        {m.quantity}
                                    </td>
                                    <td className="px-4 py-3 text-white/50 text-xs">{m.reason || '—'}</td>
                                    <td className="px-4 py-3 text-white/50 text-xs">{m.user?.name || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Adjust Modal */}
            {showAdjust && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAdjust(false)}>
                    <div className="w-full max-w-md bg-[#0a0f1e]/95 rounded-2xl border border-white/10 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4">Pergerakan Stok</h2>
                        <form onSubmit={handleAdjust} className="space-y-4">
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Produk</label>
                                <select value={adjustForm.productId} onChange={e => setAdjustForm({ ...adjustForm, productId: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none">
                                    <option value="">Pilih produk</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Tipe</label>
                                <div className="flex gap-2">
                                    {(['IN', 'OUT', 'ADJUSTMENT'] as const).map(t => (
                                        <button key={t} type="button" onClick={() => setAdjustForm({ ...adjustForm, type: t })}
                                            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${adjustForm.type === t ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                            {t === 'IN' ? 'Masuk' : t === 'OUT' ? 'Keluar' : 'Opname'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Jumlah</label>
                                <input type="number" min="1" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Alasan</label>
                                <input type="text" value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="Restok dari supplier..."
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                            </div>
                            <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium">Simpan</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
