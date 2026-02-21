import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import Modal from '../components/Modal';

interface Product {
    id: number; name: string; price: string; stock: number;
    image: string | null; categoryId: number | null;
    category?: { id: number; name: string; color: string } | null;
}
interface Category { id: number; name: string; color: string; }

const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({ name: '', price: '', stock: '', categoryId: '', image: null as File | null });

    useEffect(() => { fetchProducts(); fetchCategories(); }, []);

    const fetchProducts = async () => { try { const r = await api.get('/products'); setProducts(r.data); } catch (e) { console.error(e); } };
    const fetchCategories = async () => { try { const r = await api.get('/categories'); setCategories(r.data); } catch (e) { console.error(e); } };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFormData({ ...formData, image: e.target.files[0] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();
        data.append('name', formData.name);
        data.append('price', formData.price);
        data.append('stock', formData.stock);
        if (formData.categoryId) data.append('categoryId', formData.categoryId);
        if (formData.image) data.append('image', formData.image);

        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            fetchProducts(); handleCloseModal();
        } catch (e) { console.error(e); }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({ name: product.name, price: product.price, stock: product.stock.toString(), categoryId: product.categoryId?.toString() || '', image: null });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus produk ini?')) return;
        try { await api.delete(`/products/${id}`); fetchProducts(); } catch (e) { console.error(e); }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false); setEditingProduct(null);
        setFormData({ name: '', price: '', stock: '', categoryId: '', image: null });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-text-subtle text-sm">{products.length} produk</span>
                <button onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[18px]">add</span> Tambah Produk
                </button>
            </div>

            {/* Table */}
            <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-background-dark border-b border-border-dark">
                                <th className="px-5 py-3 text-left text-xs text-text-subtle font-semibold uppercase tracking-wider">Image</th>
                                <th className="px-5 py-3 text-left text-xs text-text-subtle font-semibold uppercase tracking-wider">Name</th>
                                <th className="px-5 py-3 text-left text-xs text-text-subtle font-semibold uppercase tracking-wider">Category</th>
                                <th className="px-5 py-3 text-left text-xs text-text-subtle font-semibold uppercase tracking-wider">Price</th>
                                <th className="px-5 py-3 text-left text-xs text-text-subtle font-semibold uppercase tracking-wider">Stock</th>
                                <th className="px-5 py-3 text-right text-xs text-text-subtle font-semibold uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-16 text-center">
                                    <span className="material-symbols-outlined text-4xl text-text-subtle/40 block mb-3">inventory_2</span>
                                    <p className="text-text-subtle text-sm">No products found</p>
                                </td></tr>
                            ) : products.map((product) => (
                                <tr key={product.id} className="border-b border-border-dark hover:bg-card-hover transition-colors group">
                                    <td className="px-5 py-3.5">
                                        <div className="size-10 rounded-lg overflow-hidden border border-border-dark bg-background-dark">
                                            {product.image ? (
                                                <img src={`http://localhost:5000${product.image}`} alt={product.name} className="size-full object-cover" />
                                            ) : (
                                                <div className="size-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-text-subtle/40 text-[18px]">inventory_2</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-white text-sm font-semibold group-hover:text-primary transition-colors">{product.name}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        {product.category ? (
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
                                                style={{ backgroundColor: product.category.color + '15', borderColor: product.category.color + '30', color: product.category.color }}>
                                                {product.category.name}
                                            </span>
                                        ) : <span className="text-text-subtle text-xs">—</span>}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-primary text-sm font-bold">Rp {parseFloat(product.price).toLocaleString('id-ID')}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${product.stock > 10
                                            ? 'bg-primary/10 text-primary border-primary/20'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {product.stock} unit
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            <button onClick={() => handleEdit(product)}
                                                className="p-2 rounded-lg bg-background-dark text-text-subtle hover:text-primary hover:bg-card-hover transition-colors border border-border-dark">
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(product.id)}
                                                className="p-2 rounded-lg bg-background-dark text-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors border border-border-dark">
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? 'Edit Produk' : 'Tambah Produk'}>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div>
                        <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Nama Produk</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} required
                            className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Masukkan nama..." />
                    </div>
                    <div>
                        <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Kategori</label>
                        <select name="categoryId" value={formData.categoryId} onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer">
                            <option value="">— Tanpa Kategori —</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Harga (IDR)</label>
                            <input type="number" name="price" value={formData.price} onChange={handleInputChange} required
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" />
                        </div>
                        <div>
                            <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Stok</label>
                            <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="0" />
                        </div>
                    </div>
                    <div>
                        <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Gambar Produk</label>
                        <input type="file" onChange={handleFileChange}
                            className="w-full bg-background-dark border border-dashed border-border-dark rounded-lg px-4 py-6 text-text-subtle text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-background-dark cursor-pointer" />
                        <p className="text-text-subtle/60 text-xs mt-1">Opsional: gambar akan ditampilkan di POS</p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={handleCloseModal}
                            className="flex-1 px-4 py-2.5 bg-background-dark border border-border-dark text-text-subtle rounded-lg font-semibold text-sm hover:bg-card-hover hover:text-white transition-colors">
                            Batal
                        </button>
                        <button type="submit"
                            className="flex-[1.5] px-4 py-2.5 bg-primary text-background-dark rounded-lg font-bold text-sm hover:bg-green-400 shadow-lg shadow-primary/20 transition-all">
                            {editingProduct ? 'Update' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Products;
