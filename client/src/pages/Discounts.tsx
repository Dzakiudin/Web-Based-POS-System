import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Percent, Plus, Edit2, Trash2, Tag, Calendar, Hash } from 'lucide-react';

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
    const [form, setForm] = useState({ name: '', type: 'PERCENTAGE', value: '', code: '', minPurchase: '', maxUses: '', startDate: '', endDate: '' });

    useEffect(() => { fetchDiscounts(); }, []);

    const fetchDiscounts = async () => { try { const r = await api.get('/discounts'); setDiscounts(r.data); } catch (e) { console.error(e); } };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            name: form.name, type: form.type,
            value: Number(form.value),
        };
        if (form.code) payload.code = form.code.toUpperCase();
        if (form.minPurchase) payload.minPurchase = Number(form.minPurchase);
        if (form.maxUses) payload.maxUses = Number(form.maxUses);
        if (form.startDate) payload.startDate = new Date(form.startDate).toISOString();
        if (form.endDate) payload.endDate = new Date(form.endDate).toISOString();

        try {
            if (editId) { await api.put(`/discounts/${editId}`, payload); }
            else { await api.post('/discounts', payload); }
            setShowModal(false); resetForm(); fetchDiscounts();
        } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleEdit = (d: Discount) => {
        setEditId(d.id);
        setForm({
            name: d.name, type: d.type, value: d.value,
            code: d.code || '', minPurchase: d.minPurchase || '',
            maxUses: d.maxUses?.toString() || '',
            startDate: d.startDate ? d.startDate.split('T')[0] : '',
            endDate: d.endDate ? d.endDate.split('T')[0] : '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus diskon ini?')) return;
        try { await api.delete(`/discounts/${id}`); fetchDiscounts(); } catch (e) { console.error(e); }
    };

    const resetForm = () => { setForm({ name: '', type: 'PERCENTAGE', value: '', code: '', minPurchase: '', maxUses: '', startDate: '', endDate: '' }); setEditId(null); };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Percent className="w-7 h-7 text-indigo-400" /> Diskon & Promo
                </h1>
                <button onClick={() => { resetForm(); setShowModal(true); }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Diskon
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {discounts.map(d => (
                    <div key={d.id} className={`glass-card rounded-2xl border p-5 transition-all group ${d.isActive ? 'border-white/10 hover:border-white/20' : 'border-red-500/10 opacity-60'}`}>
                        <div className="flex items-start justify-between mb-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${d.type === 'PERCENTAGE' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {d.type === 'PERCENTAGE' ? `${d.value}%` : 'Rp'}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(d)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-white/10"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-white/10"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                        <h3 className="text-white font-bold text-sm mb-1">{d.name}</h3>
                        <p className="text-white/40 text-xs mb-3">
                            {d.type === 'PERCENTAGE' ? `Diskon ${d.value}%` : `Potongan Rp ${Number(d.value).toLocaleString('id-ID')}`}
                        </p>
                        <div className="space-y-1.5 text-[10px] text-white/30">
                            {d.code && (
                                <div className="flex items-center gap-1.5"><Tag className="w-3 h-3" /> Kode: <span className="text-indigo-400 font-mono font-bold">{d.code}</span></div>
                            )}
                            {d.minPurchase && (
                                <div className="flex items-center gap-1.5">Min belanja Rp {Number(d.minPurchase).toLocaleString('id-ID')}</div>
                            )}
                            {d.maxUses && (
                                <div className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> {d.currentUses}/{d.maxUses} penggunaan</div>
                            )}
                            {d.endDate && (
                                <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> s/d {new Date(d.endDate).toLocaleDateString('id-ID')}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {discounts.length === 0 && (
                <div className="text-center py-16 text-white/30"><Percent className="w-12 h-12 mx-auto mb-3" /><p className="text-sm">Belum ada diskon</p></div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-md max-h-[85vh] bg-[#0a0f1e]/95 rounded-2xl border border-white/10 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4">{editId ? 'Edit Diskon' : 'Tambah Diskon'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="text-white/40 text-xs mb-1 block">Nama</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1 block">Tipe</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setForm({ ...form, type: 'PERCENTAGE' })}
                                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${form.type === 'PERCENTAGE' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                        Persentase (%)
                                    </button>
                                    <button type="button" onClick={() => setForm({ ...form, type: 'FIXED' })}
                                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${form.type === 'FIXED' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                        Nominal (Rp)
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1 block">{form.type === 'PERCENTAGE' ? 'Persentase' : 'Nominal (Rp)'}</label>
                                <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1 block">Kode Promo (Opsional)</label>
                                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none" placeholder="DISKON20" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-white/40 text-xs mb-1 block">Min Belanja</label>
                                    <input type="number" value={form.minPurchase} onChange={e => setForm({ ...form, minPurchase: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                                </div>
                                <div><label className="text-white/40 text-xs mb-1 block">Max Penggunaan</label>
                                    <input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-white/40 text-xs mb-1 block">Mulai</label>
                                    <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                                </div>
                                <div><label className="text-white/40 text-xs mb-1 block">Berakhir</label>
                                    <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium mt-2">
                                {editId ? 'Update' : 'Simpan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Discounts;
