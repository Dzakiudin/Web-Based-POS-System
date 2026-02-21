import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Layers, Plus, Edit2, Trash2, Package } from 'lucide-react';
import Modal from '../components/Modal';

interface Category { id: number; name: string; description: string | null; color: string; icon: string; isActive: boolean; _count: { products: number }; }

const Categories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => { try { const r = await api.get('/categories'); setCategories(r.data); } catch (e) { console.error(e); } };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) { await api.put(`/categories/${editId}`, form); }
            else { await api.post('/categories', form); }
            setShowModal(false); resetForm(); fetchCategories();
        } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleEdit = (cat: Category) => {
        setEditId(cat.id);
        setForm({ name: cat.name, description: cat.description || '', color: cat.color });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus kategori ini?')) return;
        try { await api.delete(`/categories/${id}`); fetchCategories(); } catch (e) { console.error(e); }
    };

    const resetForm = () => { setForm({ name: '', description: '', color: '#6366f1' }); setEditId(null); };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Layers className="w-7 h-7 text-indigo-400" /> Kategori Produk
                </h1>
                <button onClick={() => { resetForm(); setShowModal(true); }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Kategori
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map(cat => (
                    <div key={cat.id} className="glass-card rounded-2xl border border-white/10 p-5 hover:border-white/20 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '30' }}>
                                <Layers className="w-5 h-5" style={{ color: cat.color }} />
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-white/10 transition-colors">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-white font-bold text-sm mb-1">{cat.name}</h3>
                        {cat.description && <p className="text-white/40 text-xs mb-2">{cat.description}</p>}
                        <div className="flex items-center gap-1.5 text-white/30 text-xs">
                            <Package className="w-3 h-3" /> {cat._count.products} produk
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <Modal isOpen={showModal} title={editId ? 'Edit Kategori' : 'Tambah Kategori'} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-white/40 text-xs mb-1.5 block">Nama</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div>
                            <label className="text-white/40 text-xs mb-1.5 block">Deskripsi</label>
                            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div>
                            <label className="text-white/40 text-xs mb-1.5 block">Warna</label>
                            <div className="flex gap-2">
                                {['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'].map(c => (
                                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                                        className={`w-8 h-8 rounded-lg border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium">
                            {editId ? 'Update' : 'Simpan'}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Categories;
