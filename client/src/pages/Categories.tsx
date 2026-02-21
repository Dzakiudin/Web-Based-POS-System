import { useState, useEffect } from 'react';
import api from '../lib/axios';
import Modal from '../components/Modal';

interface Category { id: number; name: string; description: string | null; color: string; icon: string; isActive: boolean; _count: { products: number }; }

const Categories = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', description: '', color: '#13ec5b' });

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

    const resetForm = () => { setForm({ name: '', description: '', color: '#13ec5b' }); setEditId(null); };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-text-subtle text-sm">{categories.length} total</span>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }}
                    className="px-4 py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[18px]">add</span> Tambah Kategori
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-card-dark rounded-xl border border-border-dark p-5 hover:border-primary/30 transition-all group shadow-lg">
                        <div className="flex items-start justify-between mb-3">
                            <div className="size-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                                <span className="material-symbols-outlined" style={{ color: cat.color }}>category</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-primary hover:bg-card-hover transition-colors border border-border-dark">
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                                <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors border border-border-dark">
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                            </div>
                        </div>
                        <h3 className="text-white font-bold text-sm mb-1">{cat.name}</h3>
                        {cat.description && <p className="text-text-subtle text-xs mb-2">{cat.description}</p>}
                        <div className="flex items-center gap-1.5 text-text-subtle text-xs">
                            <span className="material-symbols-outlined text-[14px]">inventory_2</span> {cat._count.products} produk
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <Modal isOpen={showModal} title={editId ? 'Edit Kategori' : 'Tambah Kategori'} onClose={() => setShowModal(false)}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Nama</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Deskripsi</label>
                            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Warna</label>
                            <div className="flex gap-2">
                                {['#13ec5b', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'].map(c => (
                                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                                        className={`size-8 rounded-lg border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-colors shadow-lg shadow-primary/20">
                            {editId ? 'Update' : 'Simpan'}
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Categories;
