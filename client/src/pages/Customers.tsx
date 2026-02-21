import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Plus, Edit, Trash2, Users, Search, Star, Crown, Gift, ShoppingBag, X, Award, TrendingUp } from 'lucide-react';
import Modal from '../components/Modal';

interface Customer {
    id: number; name: string; email: string | null; address: string | null; phone: string | null;
    loyaltyPoints: number; membershipTier: string; totalSpent: string;
    createdAt: string; _count: { sales: number };
}

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; label: string; minSpent: string }> = {
    BRONZE: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Award, label: 'Bronze', minSpent: '0' },
    SILVER: { color: 'text-gray-300', bg: 'bg-gray-400/10', border: 'border-gray-400/20', icon: Award, label: 'Silver', minSpent: '500K' },
    GOLD: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Star, label: 'Gold', minSpent: '2M' },
    PLATINUM: { color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Crown, label: 'Platinum', minSpent: '5M' },
};

const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', address: '', phone: '' });
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [showDetail, setShowDetail] = useState(false);

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async () => {
        try {
            const r = await api.get('/customers', { params: search ? { search } : {} });
            setCustomers(r.data);
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        const timeout = setTimeout(() => fetchCustomers(), 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCustomer) { await api.put(`/customers/${editingCustomer.id}`, formData); }
            else { await api.post('/customers', formData); }
            fetchCustomers(); handleCloseModal();
        } catch (e) { console.error(e); }
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({ name: customer.name, email: customer.email || '', address: customer.address || '', phone: customer.phone || '' });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus customer ini?')) return;
        try { await api.delete(`/customers/${id}`); fetchCustomers(); } catch (e) { console.error(e); }
    };

    const viewDetail = async (id: number) => {
        try { const r = await api.get(`/customers/${id}`); setSelectedCustomer(r.data); setShowDetail(true); } catch (e) { console.error(e); }
    };

    const handleCloseModal = () => { setIsModalOpen(false); setEditingCustomer(null); setFormData({ name: '', email: '', address: '', phone: '' }); };

    // Stats
    const totalCustomers = customers.length;
    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
    const goldPlus = customers.filter(c => c.membershipTier === 'GOLD' || c.membershipTier === 'PLATINUM').length;

    return (
        <div className="space-y-5 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="w-7 h-7 text-indigo-400" /> CRM & Pelanggan
                    </h1>
                    <p className="text-white/40 text-sm mt-0.5">Kelola pelanggan, loyalty points, dan membership</p>
                </div>
                <button onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Customer
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass-card rounded-2xl border border-white/10 p-4">
                    <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-indigo-400" /><span className="text-white/40 text-[10px] uppercase tracking-wider">Total</span></div>
                    <p className="text-white text-2xl font-bold">{totalCustomers}</p>
                </div>
                <div className="glass-card rounded-2xl border border-white/10 p-4">
                    <div className="flex items-center gap-2 mb-1"><Star className="w-4 h-4 text-amber-400" /><span className="text-white/40 text-[10px] uppercase tracking-wider">Total Points</span></div>
                    <p className="text-amber-400 text-2xl font-bold">{totalLoyaltyPoints.toLocaleString('id-ID')}</p>
                </div>
                <div className="glass-card rounded-2xl border border-white/10 p-4">
                    <div className="flex items-center gap-2 mb-1"><Crown className="w-4 h-4 text-purple-400" /><span className="text-white/40 text-[10px] uppercase tracking-wider">Gold+</span></div>
                    <p className="text-purple-400 text-2xl font-bold">{goldPlus}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input type="text" placeholder="Cari nama, telepon, atau email..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 placeholder:text-white/30" />
            </div>

            {/* Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {customers.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-white/30">
                        <Users className="w-12 h-12 mx-auto mb-3" />
                        <p className="text-sm">Belum ada customer</p>
                    </div>
                ) : customers.map(customer => {
                    const tier = TIER_CONFIG[customer.membershipTier] || TIER_CONFIG.BRONZE;
                    const TierIcon = tier.icon;
                    return (
                        <div key={customer.id} className="glass-card rounded-2xl border border-white/10 p-4 hover:border-white/20 transition-all group cursor-pointer"
                            onClick={() => viewDetail(customer.id)}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold ${tier.bg} ${tier.color} border ${tier.border}`}>
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-sm group-hover:text-indigo-400 transition-colors">{customer.name}</h3>
                                        <p className="text-white/30 text-[10px]">{customer.phone || customer.email || 'No contact'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleEdit(customer)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-white/10"><Edit className="w-3 h-3" /></button>
                                    <button onClick={() => handleDelete(customer.id)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-white/10"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </div>

                            {/* Tier & Points */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${tier.bg} ${tier.color} ${tier.border}`}>
                                    <TierIcon className="w-3 h-3" /> {tier.label}
                                </span>
                                <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                                    <Star className="w-3 h-3" /> {customer.loyaltyPoints.toLocaleString('id-ID')} pts
                                </span>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center justify-between text-[10px] text-white/30 border-t border-white/5 pt-2">
                                <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> {customer._count.sales} transaksi</span>
                                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Rp {Number(customer.totalSpent).toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Membership Tiers Guide */}
            <div className="glass-card rounded-2xl border border-white/10 p-5">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Crown className="w-4 h-4 text-indigo-400" /> Tingkat Membership</h3>
                <div className="grid grid-cols-4 gap-3">
                    {Object.entries(TIER_CONFIG).map(([key, tier]) => {
                        const TIcon = tier.icon;
                        const count = customers.filter(c => c.membershipTier === key).length;
                        return (
                            <div key={key} className={`rounded-xl border p-3 text-center ${tier.bg} ${tier.border}`}>
                                <TIcon className={`w-6 h-6 mx-auto mb-1.5 ${tier.color}`} />
                                <p className={`text-xs font-bold ${tier.color}`}>{tier.label}</p>
                                <p className="text-white/30 text-[10px] mt-0.5">≥ Rp {tier.minSpent}</p>
                                <p className="text-white/50 text-xs font-bold mt-1">{count} member</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCustomer ? 'Edit Pelanggan' : 'Pelanggan Baru'}>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Nama</label>
                        <input type="text" name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Telepon</label>
                            <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="+62..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Email</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Alamat</label>
                        <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/50 resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={handleCloseModal} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium text-sm border border-white/10">Batal</button>
                        <button type="submit" className="flex-[1.5] py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-sm">{editingCustomer ? 'Update' : 'Simpan'}</button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            {showDetail && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDetail(false)}>
                    <div className="w-full max-w-2xl max-h-[85vh] bg-[#0a0f1e]/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        {/* Detail Header */}
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {(() => {
                                        const tier = TIER_CONFIG[selectedCustomer.membershipTier] || TIER_CONFIG.BRONZE;
                                        return (
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold ${tier.bg} ${tier.color} border-2 ${tier.border}`}>
                                                {selectedCustomer.name.charAt(0).toUpperCase()}
                                            </div>
                                        );
                                    })()}
                                    <div>
                                        <h2 className="text-white font-bold text-xl">{selectedCustomer.name}</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            {(() => {
                                                const tier = TIER_CONFIG[selectedCustomer.membershipTier] || TIER_CONFIG.BRONZE;
                                                const TierIcon = tier.icon;
                                                return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${tier.bg} ${tier.color} ${tier.border}`}><TierIcon className="w-3.5 h-3.5" />{tier.label} Member</span>;
                                            })()}
                                            <span className="text-amber-400 text-xs font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5" />{selectedCustomer.loyaltyPoints.toLocaleString('id-ID')} pts</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowDetail(false)} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Info Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <p className="text-white/40 text-[10px]">Total Belanja</p>
                                    <p className="text-indigo-400 text-sm font-bold mt-0.5">Rp {Number(selectedCustomer.totalSpent).toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <p className="text-white/40 text-[10px]">Transaksi</p>
                                    <p className="text-white text-sm font-bold mt-0.5">{selectedCustomer.sales?.length || 0}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <p className="text-white/40 text-[10px]">Member Sejak</p>
                                    <p className="text-white text-sm font-bold mt-0.5">{new Date(selectedCustomer.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-white/5 rounded-xl p-4 space-y-2">
                                <p className="text-white/40 text-xs font-medium mb-2">Info Kontak</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-white/30">Telepon:</span> <span className="text-white/80">{selectedCustomer.phone || '—'}</span></div>
                                    <div><span className="text-white/30">Email:</span> <span className="text-white/80">{selectedCustomer.email || '—'}</span></div>
                                    <div className="col-span-2"><span className="text-white/30">Alamat:</span> <span className="text-white/80">{selectedCustomer.address || '—'}</span></div>
                                </div>
                            </div>

                            {/* Active Vouchers */}
                            {selectedCustomer.vouchers?.length > 0 && (
                                <div>
                                    <p className="text-white/40 text-xs font-medium mb-2 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Voucher Aktif</p>
                                    <div className="space-y-1.5">
                                        {selectedCustomer.vouchers.map((v: any) => (
                                            <div key={v.id} className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-2.5">
                                                <div>
                                                    <span className="text-emerald-400 text-xs font-bold font-mono">{v.code}</span>
                                                    {v.discount && <span className="text-white/40 text-[10px] ml-2">{v.discount.name}</span>}
                                                </div>
                                                <span className="text-white/30 text-[10px]">Exp: {new Date(v.expiresAt).toLocaleDateString('id-ID')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Transactions */}
                            {selectedCustomer.sales?.length > 0 && (
                                <div>
                                    <p className="text-white/40 text-xs font-medium mb-2 flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> Transaksi Terakhir</p>
                                    <div className="space-y-1.5">
                                        {selectedCustomer.sales.slice(0, 10).map((s: any) => (
                                            <div key={s.id} className="flex items-center justify-between bg-white/3 rounded-xl px-4 py-2.5 text-sm">
                                                <div>
                                                    <span className="text-white/70 font-mono text-xs">{s.receiptNumber}</span>
                                                    <span className="text-white/30 text-[10px] ml-2">{new Date(s.date).toLocaleDateString('id-ID')}</span>
                                                </div>
                                                <span className="text-indigo-400 font-bold text-xs">Rp {Number(s.finalPrice || s.totalPrice).toLocaleString('id-ID')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Loyalty Progress */}
                            <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-xl p-4">
                                <p className="text-amber-400 text-xs font-bold mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Loyalty Progress</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                                                style={{ width: `${Math.min(100, (selectedCustomer.loyaltyPoints / 1000) * 100)}%` }} />
                                        </div>
                                    </div>
                                    <span className="text-amber-400/60 text-[10px]">{selectedCustomer.loyaltyPoints} / 1000 pts</span>
                                </div>
                                <p className="text-white/30 text-[10px] mt-1.5">Dapatkan 1 point setiap belanja Rp 10.000</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
