import { useState, useEffect } from 'react';
import api from '../lib/axios';

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

    const fetchVouchers = async () => { try { const r = await api.get('/vouchers', { params: statusFilter ? { status: statusFilter } : {} }); setVouchers(r.data); } catch (e) { console.error(e); } };
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-text-subtle text-sm">{vouchers.length} voucher</p>
                <button onClick={() => setShowCreate(true)}
                    className="px-4 py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[18px]">add</span> Buat Voucher
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-card-dark rounded-xl border border-primary/20 p-4 cursor-pointer hover:bg-card-hover transition-colors" onClick={() => setStatusFilter('active')}>
                    <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-primary text-[18px]">check_circle</span><span className="text-text-subtle text-xs uppercase font-semibold">AKTIF</span></div>
                    <p className="text-primary text-2xl font-bold">{stats.active}</p>
                </div>
                <div className="bg-card-dark rounded-xl border border-blue-500/20 p-4 cursor-pointer hover:bg-card-hover transition-colors" onClick={() => setStatusFilter('used')}>
                    <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-blue-400 text-[18px]">sell</span><span className="text-text-subtle text-xs uppercase font-semibold">DIGUNAKAN</span></div>
                    <p className="text-blue-400 text-2xl font-bold">{stats.used}</p>
                </div>
                <div className="bg-card-dark rounded-xl border border-red-500/20 p-4 cursor-pointer hover:bg-card-hover transition-colors" onClick={() => setStatusFilter('expired')}>
                    <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-red-400 text-[18px]">cancel</span><span className="text-text-subtle text-xs uppercase font-semibold">KEDALUWARSA</span></div>
                    <p className="text-red-400 text-2xl font-bold">{stats.expired}</p>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2">
                {[{ key: '', label: 'Semua' }, { key: 'active', label: 'Aktif' }, { key: 'used', label: 'Used' }, { key: 'expired', label: 'Expired' }].map(f => (
                    <button key={f.key} onClick={() => setStatusFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${statusFilter === f.key ? 'bg-primary/10 text-primary border-primary/20' : 'bg-card-dark text-text-subtle border-border-dark hover:bg-card-hover'}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Voucher Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vouchers.map(v => {
                    const isExpired = !v.isUsed && new Date(v.expiresAt) <= now;
                    const isActive = !v.isUsed && !isExpired;
                    return (
                        <div key={v.id} className={`bg-card-dark rounded-xl border p-4 transition-all group relative overflow-hidden shadow-lg ${v.isUsed ? 'border-border-dark opacity-60' : isExpired ? 'border-red-500/10 opacity-50' : 'border-primary/20 hover:border-primary/40'
                            }`}>
                            {/* Ticket cutout effect */}
                            <div className="absolute left-0 top-1/2 w-3 h-6 bg-background-dark rounded-r-full -translate-y-1/2" />
                            <div className="absolute right-0 top-1/2 w-3 h-6 bg-background-dark rounded-l-full -translate-y-1/2" />

                            <div className="flex items-start justify-between mb-3 pl-3">
                                <div>
                                    <p className="text-white font-mono font-bold text-sm tracking-wider">{v.code}</p>
                                    {v.discount && (
                                        <p className="text-primary text-xs mt-0.5">
                                            {v.discount.name} — {v.discount.type === 'PERCENTAGE' ? `${v.discount.value}%` : `Rp ${Number(v.discount.value).toLocaleString('id-ID')}`}
                                        </p>
                                    )}
                                </div>
                                {isActive && (
                                    <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all border border-border-dark">
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                    </button>
                                )}
                            </div>

                            <div className="pl-3 space-y-1.5">
                                {v.customer && (
                                    <p className="text-text-subtle text-xs">Untuk: <span className="text-white">{v.customer.name}</span></p>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-text-subtle/60 text-xs">
                                        {v.isUsed ? `Digunakan ${new Date(v.usedAt!).toLocaleDateString('id-ID')}` : `Exp: ${new Date(v.expiresAt).toLocaleDateString('id-ID')}`}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${v.isUsed ? 'bg-blue-500/10 text-blue-400' : isExpired ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary'
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
                <div className="text-center py-16 text-text-subtle">
                    <span className="material-symbols-outlined text-4xl mb-3 block">confirmation_number</span>
                    <p className="text-sm">Belum ada voucher</p>
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
                    <div className="w-full max-w-md bg-card-dark rounded-xl border border-border-dark p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">confirmation_number</span> Buat Voucher
                            </h2>
                            <button onClick={() => setShowCreate(false)} className="text-text-subtle hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Kode Voucher</label>
                                <div className="flex gap-2">
                                    <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" placeholder="VCH-XXXXXX" />
                                    <button type="button" onClick={generateCode}
                                        className="px-3 py-2.5 rounded-lg bg-background-dark border border-border-dark text-text-subtle text-xs hover:bg-card-hover hover:text-white font-semibold transition-colors">
                                        Generate
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Diskon (Opsional)</label>
                                <select value={form.discountId} onChange={e => setForm({ ...form, discountId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none appearance-none cursor-pointer">
                                    <option value="">Tanpa diskon</option>
                                    {discounts.map(d => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.type === 'PERCENTAGE' ? `${d.value}%` : `Rp ${Number(d.value).toLocaleString('id-ID')}`})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Pelanggan (Opsional)</label>
                                <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none appearance-none cursor-pointer">
                                    <option value="">Untuk semua</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Berlaku Sampai</label>
                                <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 shadow-lg shadow-primary/20 transition-all">
                                Buat Voucher
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vouchers;
