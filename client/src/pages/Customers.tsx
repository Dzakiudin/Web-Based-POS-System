import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import Modal from '../components/Modal';

interface Customer {
    id: number; name: string; email: string | null; address: string | null; phone: string | null;
    loyaltyPoints: number; membershipTier: string; totalSpent: string;
    createdAt: string; _count: { sales: number };
}

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string; label: string; minSpent: string }> = {
    BRONZE: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: 'military_tech', label: 'Bronze', minSpent: '0' },
    SILVER: { color: 'text-gray-300', bg: 'bg-gray-400/10', border: 'border-gray-400/20', icon: 'military_tech', label: 'Silver', minSpent: '500K' },
    GOLD: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'star', label: 'Gold', minSpent: '2M' },
    PLATINUM: { color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'workspace_premium', label: 'Platinum', minSpent: '5M' },
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
        try { const r = await api.get('/customers', { params: search ? { search } : {} }); setCustomers(r.data); }
        catch (e) { console.error(e); }
    };

    useEffect(() => { const t = setTimeout(() => fetchCustomers(), 300); return () => clearTimeout(t); }, [search]);

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

    const totalCustomers = customers.length;
    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
    const goldPlus = customers.filter(c => c.membershipTier === 'GOLD' || c.membershipTier === 'PLATINUM').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-text-subtle text-sm">Kelola pelanggan, loyalty points, dan membership</p>
                <button onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[18px]">person_add</span> Tambah Customer
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-card-dark rounded-xl border border-border-dark p-4">
                    <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-primary text-[18px]">group</span><span className="text-text-subtle text-xs uppercase tracking-wider font-semibold">Total</span></div>
                    <p className="text-white text-2xl font-bold">{totalCustomers}</p>
                </div>
                <div className="bg-card-dark rounded-xl border border-border-dark p-4">
                    <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-amber-400 text-[18px]">star</span><span className="text-text-subtle text-xs uppercase tracking-wider font-semibold">Total Points</span></div>
                    <p className="text-amber-400 text-2xl font-bold">{totalLoyaltyPoints.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-card-dark rounded-xl border border-border-dark p-4">
                    <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-purple-400 text-[18px]">workspace_premium</span><span className="text-text-subtle text-xs uppercase tracking-wider font-semibold">Gold+</span></div>
                    <p className="text-purple-400 text-2xl font-bold">{goldPlus}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">search</span>
                <input type="text" placeholder="Cari nama, telepon, atau email..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-subtle" />
            </div>

            {/* Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-text-subtle">
                        <span className="material-symbols-outlined text-4xl mb-3 block">group</span>
                        <p className="text-sm">Belum ada customer</p>
                    </div>
                ) : customers.map(customer => {
                    const tier = TIER_CONFIG[customer.membershipTier] || TIER_CONFIG.BRONZE;
                    return (
                        <div key={customer.id} className="bg-card-dark rounded-xl border border-border-dark p-4 hover:border-primary/30 transition-all group cursor-pointer shadow-lg"
                            onClick={() => viewDetail(customer.id)}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`size-11 rounded-lg flex items-center justify-center text-sm font-bold ${tier.bg} ${tier.color} border ${tier.border}`}>
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-sm group-hover:text-primary transition-colors">{customer.name}</h3>
                                        <p className="text-text-subtle/60 text-xs">{customer.phone || customer.email || 'No contact'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleEdit(customer)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-primary border border-border-dark">
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(customer.id)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-red-400 border border-border-dark">
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${tier.bg} ${tier.color} ${tier.border}`}>
                                    <span className="material-symbols-outlined text-[14px]">{tier.icon}</span> {tier.label}
                                </span>
                                <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                                    <span className="material-symbols-outlined text-[14px]">star</span> {customer.loyaltyPoints.toLocaleString('id-ID')} pts
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-text-subtle/60 border-t border-border-dark pt-2">
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">shopping_bag</span> {customer._count.sales} transaksi</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">trending_up</span> Rp {Number(customer.totalSpent).toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Membership Tiers */}
            <div className="bg-card-dark rounded-xl border border-border-dark p-5">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">workspace_premium</span> Tingkat Membership</h3>
                <div className="grid grid-cols-4 gap-3">
                    {Object.entries(TIER_CONFIG).map(([key, tier]) => {
                        const count = customers.filter(c => c.membershipTier === key).length;
                        return (
                            <div key={key} className={`rounded-lg border p-3 text-center ${tier.bg} ${tier.border}`}>
                                <span className={`material-symbols-outlined text-2xl ${tier.color}`}>{tier.icon}</span>
                                <p className={`text-xs font-bold mt-1 ${tier.color}`}>{tier.label}</p>
                                <p className="text-text-subtle text-xs mt-0.5">≥ Rp {tier.minSpent}</p>
                                <p className="text-white text-xs font-bold mt-1">{count} member</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCustomer ? 'Edit Pelanggan' : 'Pelanggan Baru'}>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div>
                        <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Nama</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                            className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Telepon</label>
                            <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+62..."
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Email</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                    </div>
                    <div>
                        <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Alamat</label>
                        <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2}
                            className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={handleCloseModal}
                            className="flex-1 py-2.5 bg-background-dark border border-border-dark text-text-subtle rounded-lg font-semibold text-sm hover:bg-card-hover hover:text-white transition-colors">Batal</button>
                        <button type="submit"
                            className="flex-[1.5] py-2.5 bg-primary text-background-dark rounded-lg font-bold text-sm hover:bg-green-400 shadow-lg shadow-primary/20 transition-all">{editingCustomer ? 'Update' : 'Simpan'}</button>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            {showDetail && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDetail(false)}>
                    <div className="w-full max-w-2xl max-h-[85vh] bg-card-dark rounded-xl border border-border-dark shadow-2xl overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        {/* Detail Header */}
                        <div className="p-6 border-b border-border-dark">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {(() => {
                                        const tier = TIER_CONFIG[selectedCustomer.membershipTier] || TIER_CONFIG.BRONZE;
                                        return (
                                            <div className={`size-14 rounded-xl flex items-center justify-center text-lg font-bold ${tier.bg} ${tier.color} border-2 ${tier.border}`}>
                                                {selectedCustomer.name.charAt(0).toUpperCase()}
                                            </div>
                                        );
                                    })()}
                                    <div>
                                        <h2 className="text-white font-bold text-xl">{selectedCustomer.name}</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            {(() => {
                                                const tier = TIER_CONFIG[selectedCustomer.membershipTier] || TIER_CONFIG.BRONZE;
                                                return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${tier.bg} ${tier.color} ${tier.border}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{tier.icon}</span>{tier.label} Member
                                                </span>;
                                            })()}
                                            <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">star</span>{selectedCustomer.loyaltyPoints.toLocaleString('id-ID')} pts
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowDetail(false)} className="p-2 text-text-subtle hover:text-white rounded-lg hover:bg-card-hover transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-background-dark rounded-lg p-3 text-center border border-border-dark">
                                    <p className="text-text-subtle text-xs">Total Belanja</p>
                                    <p className="text-primary text-sm font-bold mt-0.5">Rp {Number(selectedCustomer.totalSpent).toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-background-dark rounded-lg p-3 text-center border border-border-dark">
                                    <p className="text-text-subtle text-xs">Transaksi</p>
                                    <p className="text-white text-sm font-bold mt-0.5">{selectedCustomer.sales?.length || 0}</p>
                                </div>
                                <div className="bg-background-dark rounded-lg p-3 text-center border border-border-dark">
                                    <p className="text-text-subtle text-xs">Member Sejak</p>
                                    <p className="text-white text-sm font-bold mt-0.5">{new Date(selectedCustomer.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="bg-background-dark rounded-lg p-4 border border-border-dark space-y-2">
                                <p className="text-text-subtle text-xs font-semibold mb-2">Info Kontak</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-text-subtle/60">Telepon:</span> <span className="text-white">{selectedCustomer.phone || '—'}</span></div>
                                    <div><span className="text-text-subtle/60">Email:</span> <span className="text-white">{selectedCustomer.email || '—'}</span></div>
                                    <div className="col-span-2"><span className="text-text-subtle/60">Alamat:</span> <span className="text-white">{selectedCustomer.address || '—'}</span></div>
                                </div>
                            </div>

                            {selectedCustomer.vouchers?.length > 0 && (
                                <div>
                                    <p className="text-text-subtle text-xs font-semibold mb-2 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">confirmation_number</span> Voucher Aktif
                                    </p>
                                    <div className="space-y-1.5">
                                        {selectedCustomer.vouchers.map((v: any) => (
                                            <div key={v.id} className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-lg px-4 py-2.5">
                                                <div>
                                                    <span className="text-primary text-xs font-bold font-mono">{v.code}</span>
                                                    {v.discount && <span className="text-text-subtle text-xs ml-2">{v.discount.name}</span>}
                                                </div>
                                                <span className="text-text-subtle/60 text-xs">Exp: {new Date(v.expiresAt).toLocaleDateString('id-ID')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedCustomer.sales?.length > 0 && (
                                <div>
                                    <p className="text-text-subtle text-xs font-semibold mb-2 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[14px]">shopping_bag</span> Transaksi Terakhir
                                    </p>
                                    <div className="space-y-1.5">
                                        {selectedCustomer.sales.slice(0, 10).map((s: any) => (
                                            <div key={s.id} className="flex items-center justify-between bg-background-dark rounded-lg px-4 py-2.5 text-sm border border-border-dark">
                                                <div>
                                                    <span className="text-white font-mono text-xs">{s.receiptNumber}</span>
                                                    <span className="text-text-subtle/60 text-xs ml-2">{new Date(s.date).toLocaleDateString('id-ID')}</span>
                                                </div>
                                                <span className="text-primary font-bold text-xs">Rp {Number(s.finalPrice || s.totalPrice).toLocaleString('id-ID')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                                <p className="text-primary text-xs font-bold mb-2 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">star</span> Loyalty Progress
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="h-2 bg-background-dark rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${Math.min(100, (selectedCustomer.loyaltyPoints / 1000) * 100)}%` }} />
                                        </div>
                                    </div>
                                    <span className="text-primary/60 text-xs">{selectedCustomer.loyaltyPoints} / 1000 pts</span>
                                </div>
                                <p className="text-text-subtle/60 text-xs mt-1.5">Dapatkan 1 point setiap belanja Rp 10.000</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
