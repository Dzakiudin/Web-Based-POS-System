import { useState, useEffect } from 'react';
import api from '../lib/axios';

interface Discount {
    id: number; name: string; type: string; value: string;
    code: string | null; minPurchase: string | null;
    maxUses: number | null; currentUses: number;
    isActive: boolean; startDate: string | null; endDate: string | null;
}

const Discounts = () => {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', type: 'PERCENTAGE', value: '', code: '', minPurchase: '', maxUses: '', isActive: true, startDate: '', endDate: '' });

    useEffect(() => { fetchDiscounts(); }, []);
    const fetchDiscounts = async () => { try { const r = await api.get('/discounts'); setDiscounts(r.data); } catch (e) { console.error(e); } };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: form.name, type: form.type, value: Number(form.value), isActive: form.isActive,
            code: form.code || null, minPurchase: form.minPurchase ? Number(form.minPurchase) : null,
            maxUses: form.maxUses ? Number(form.maxUses) : null,
            startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
            endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        };
        try {
            if (editId) await api.put(`/discounts/${editId}`, payload);
            else await api.post('/discounts', payload);
            setShowModal(false); resetForm(); fetchDiscounts();
        } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleEdit = (d: Discount) => {
        setEditId(d.id);
        setForm({
            name: d.name, type: d.type, value: d.value, code: d.code || '', minPurchase: d.minPurchase || '', maxUses: d.maxUses?.toString() || '', isActive: d.isActive,
            startDate: d.startDate ? d.startDate.slice(0, 10) : '', endDate: d.endDate ? d.endDate.slice(0, 10) : ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus diskon ini?')) return;
        try { await api.delete(`/discounts/${id}`); fetchDiscounts(); } catch (e) { console.error(e); }
    };

    const resetForm = () => { setForm({ name: '', type: 'PERCENTAGE', value: '', code: '', minPurchase: '', maxUses: '', isActive: true, startDate: '', endDate: '' }); setEditId(null); };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-text-subtle text-sm">{discounts.length} diskon</p>
                <button onClick={() => { resetForm(); setShowModal(true); }}
                    className="px-4 py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[18px]">add</span> Buat Diskon
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discounts.map(d => (
                    <div key={d.id} className={`bg-card-dark rounded-xl border p-5 hover:border-primary/30 transition-all group shadow-lg ${d.isActive ? 'border-border-dark' : 'border-border-dark opacity-50'}`}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[20px]">{d.type === 'PERCENTAGE' ? 'percent' : 'payments'}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(d)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-primary border border-border-dark">
                                    <span className="material-symbols-outlined text-[14px]">edit</span></button>
                                <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-red-400 border border-border-dark">
                                    <span className="material-symbols-outlined text-[14px]">delete</span></button>
                            </div>
                        </div>
                        <h3 className="text-white font-bold text-sm mb-1">{d.name}</h3>
                        <p className="text-primary text-xl font-bold mb-2">{d.type === 'PERCENTAGE' ? `${d.value}%` : `Rp ${Number(d.value).toLocaleString('id-ID')}`}</p>
                        {d.code && <p className="text-text-subtle text-xs mb-1 font-mono">Kode: <span className="text-white">{d.code}</span></p>}
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-text-subtle/60 text-xs">{d.currentUses}{d.maxUses ? `/${d.maxUses}` : ''} digunakan</span>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${d.isActive ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-400'}`}>
                                {d.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-md bg-card-dark rounded-xl border border-border-dark p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-white font-bold text-lg">{editId ? 'Edit Diskon' : 'Buat Diskon'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-text-subtle hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Nama</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                            <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Tipe</label>
                                <div className="flex gap-2">
                                    {['PERCENTAGE', 'FIXED'].map(t => (
                                        <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${form.type === t ? 'bg-primary/10 text-primary border-primary/20' : 'bg-background-dark border-border-dark text-text-subtle'}`}>
                                            {t === 'PERCENTAGE' ? 'Persentase (%)' : 'Nominal (Rp)'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Nilai</label>
                                <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                            <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Kode (Opsional)</label>
                                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Min. Pembelian</label>
                                    <input type="number" value={form.minPurchase} onChange={e => setForm({ ...form, minPurchase: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                                <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Maks. Penggunaan</label>
                                    <input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Mulai</label>
                                    <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                                <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Berakhir</label>
                                    <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                            </div>
                            <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 shadow-lg shadow-primary/20">{editId ? 'Update' : 'Simpan'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Discounts;
