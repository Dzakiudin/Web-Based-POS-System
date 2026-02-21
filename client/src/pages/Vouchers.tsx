import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Gift, Plus, Trash2, CheckCircle2, XCircle, Tag } from 'lucide-react';

interface Voucher {
    id: number; code: string; isUsed: boolean; usedAt: string | null;
    expiresAt: string; createdAt: string;
    customer: { id: number; name: string } | null;
    discount: { id: number; name: string; type: string; value: string } | null;
}

interface Discount { id: number; name: string; type: string; value: string; }
interface Customer { id: number; name: string; }

const Vouchers = () => {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ code: '', customerId: '', discountId: '', expiresAt: '' });

    useEffect(() => { fetchVouchers(); fetchDiscounts(); fetchCustomers(); }, [statusFilter]);

    const fetchVouchers = async () => {
        try { const r = await api.get('/vouchers', { params: statusFilter ? { status: statusFilter } : {} }); setVouchers(r.data); } catch (e) { console.error(e); }
    };
    const fetchDiscounts = async () => { try { const r = await api.get('/discounts'); setDiscounts(r.data); } catch (e) { console.error(e); } };
    const fetchCustomers = async () => { try { const r = await api.get('/customers'); setCustomers(r.data); } catch (e) { console.error(e); } };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/vouchers', {
                code: form.code,
                customerId: form.customerId ? Number(form.customerId) : null,
                discountId: form.discountId ? Number(form.discountId) : null,
                expiresAt: new Date(form.expiresAt).toISOString(),
            });
            setShowCreate(false);
            setForm({ code: '', customerId: '', discountId: '', expiresAt: '' });
            fetchVouchers();
        } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus voucher ini?')) return;
        try { await api.delete(`/vouchers/${id}`); fetchVouchers(); } catch (e) { console.error(e); }
    };

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'VCH-';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        setForm({ ...form, code });
    };

    const now = new Date();
    const stats = {
        active: vouchers.filter(v => !v.isUsed && new Date(v.expiresAt) > now).length,
        used: vouchers.filter(v => v.isUsed).length,
        expired: vouchers.filter(v => !v.isUsed && new Date(v.expiresAt) <= now).length,
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Gift className="w-7 h-7 text-indigo-400" /> Voucher
                </h1>
                <button onClick={() => setShowCreate(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Buat Voucher
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass-card rounded-2xl border border-emerald-500/20 p-4 bg-emerald-500/5 cursor-pointer" onClick={() => setStatusFilter('active')}>
                    <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-white/40 text-[10px]">AKTIF</span></div>
                    <p className="text-emerald-400 text-2xl font-bold">{stats.active}</p>
                </div>
                <div className="glass-card rounded-2xl border border-blue-500/20 p-4 bg-blue-500/5 cursor-pointer" onClick={() => setStatusFilter('used')}>
                    <div className="flex items-center gap-2 mb-1"><Tag className="w-4 h-4 text-blue-400" /><span className="text-white/40 text-[10px]">DIGUNAKAN</span></div>
                    <p className="text-blue-400 text-2xl font-bold">{stats.used}</p>
                </div>
                <div className="glass-card rounded-2xl border border-red-500/20 p-4 bg-red-500/5 cursor-pointer" onClick={() => setStatusFilter('expired')}>
                    <div className="flex items-center gap-2 mb-1"><XCircle className="w-4 h-4 text-red-400" /><span className="text-white/40 text-[10px]">KEDALUWARSA</span></div>
                    <p className="text-red-400 text-2xl font-bold">{stats.expired}</p>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2">
                {[{ key: '', label: 'Semua' }, { key: 'active', label: 'Aktif' }, { key: 'used', label: 'Used' }, { key: 'expired', label: 'Expired' }].map(f => (
                    <button key={f.key} onClick={() => setStatusFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${statusFilter === f.key ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Voucher Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vouchers.map(v => {
                    const isExpired = !v.isUsed && new Date(v.expiresAt) <= now;
                    const isActive = !v.isUsed && !isExpired;
                    return (
                        <div key={v.id} className={`glass-card rounded-2xl border p-4 transition-all group relative overflow-hidden ${v.isUsed ? 'border-white/5 opacity-60' : isExpired ? 'border-red-500/10 opacity-50' : 'border-emerald-500/20 hover:border-emerald-500/30'
                            }`}>
                            {/* Dashed border ticket effect */}
                            <div className="absolute left-0 top-1/2 w-3 h-6 bg-[#060918] rounded-r-full -translate-y-1/2" />
                            <div className="absolute right-0 top-1/2 w-3 h-6 bg-[#060918] rounded-l-full -translate-y-1/2" />

                            <div className="flex items-start justify-between mb-3 pl-3">
                                <div>
                                    <p className="text-white font-mono font-bold text-sm tracking-wider">{v.code}</p>
                                    {v.discount && (
                                        <p className="text-indigo-400 text-xs mt-0.5">
                                            {v.discount.name} — {v.discount.type === 'PERCENTAGE' ? `${v.discount.value}%` : `Rp ${Number(v.discount.value).toLocaleString('id-ID')}`}
                                        </p>
                                    )}
                                </div>
                                {isActive && (
                                    <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-red-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="pl-3 space-y-1.5">
                                {v.customer && (
                                    <p className="text-white/40 text-[10px]">Untuk: <span className="text-white/60">{v.customer.name}</span></p>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-white/30 text-[10px]">
                                        {v.isUsed ? `Digunakan ${new Date(v.usedAt!).toLocaleDateString('id-ID')}` : `Exp: ${new Date(v.expiresAt).toLocaleDateString('id-ID')}`}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${v.isUsed ? 'bg-blue-500/20 text-blue-400' : isExpired ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                        {v.isUsed ? 'USED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {vouchers.length === 0 && (
                <div className="text-center py-16 text-white/30">
                    <Gift className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-sm">Belum ada voucher</p>
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
                    <div className="w-full max-w-md bg-[#0a0f1e]/95 rounded-2xl border border-white/10 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4">Buat Voucher</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Kode Voucher</label>
                                <div className="flex gap-2">
                                    <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-indigo-500/50" placeholder="VCH-XXXXXX" />
                                    <button type="button" onClick={generateCode}
                                        className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 hover:text-white transition-colors">
                                        Generate
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Diskon (Opsional)</label>
                                <select value={form.discountId} onChange={e => setForm({ ...form, discountId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none">
                                    <option value="">Tanpa diskon</option>
                                    {discounts.map(d => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.type === 'PERCENTAGE' ? `${d.value}%` : `Rp ${Number(d.value).toLocaleString('id-ID')}`})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Pelanggan (Opsional)</label>
                                <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none">
                                    <option value="">Untuk semua</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Berlaku Sampai</label>
                                <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                            </div>
                            <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium">Buat Voucher</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vouchers;
