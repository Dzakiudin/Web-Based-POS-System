import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

import Modal from '../components/Modal';

interface Product {
    id: number;
    name: string;
    price: string;
    stock: number;
    image: string | null;
}

const Products = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({ name: '', price: '', stock: '', image: null as File | null });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products');
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, image: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();
        data.append('name', formData.name);
        data.append('price', formData.price);
        data.append('stock', formData.stock);
        if (formData.image) {
            data.append('image', formData.image);
        }

        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/products', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            fetchProducts();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving product', error);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price,
            stock: product.stock.toString(),
            image: null,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await api.delete(`/products/${id}`);
                fetchProducts();
            } catch (error) {
                console.error('Error deleting product', error);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData({ name: '', price: '', stock: '', image: null });
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-indigo-400">
                        <Package className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Inventory Management</span>
                    </div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">Products</h2>
                    <p className="text-slate-400">Manage your store's inventory and pricing with precision.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-105 active:scale-95 group"
                >
                    <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                    Add New Product
                </button>
            </div>

            {/* Table Section */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Image</th>
                                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Name</th>
                                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Price</th>
                                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Stock</th>
                                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="p-4 bg-white/5 rounded-3xl">
                                                <Package className="w-12 h-12 text-slate-600" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No products found. Start by adding one!</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : products.map((product) => (
                                <tr key={product.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="relative inline-block w-12 h-12 p-0.5 bg-indigo-500/20 rounded-2xl border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                                            {product.image ? (
                                                <img
                                                    src={`http://localhost:5000${product.image}`}
                                                    alt={product.name}
                                                    className="w-full h-full rounded-2xl object-cover shadow-lg"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                                                    <Package size={20} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {product.name}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-black text-white tabular-nums">
                                            Rp {parseFloat(product.price).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.stock > 10
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                            {product.stock} units
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2.5 bg-white/5 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-300 active:scale-90 border border-white/5 shadow-lg"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2.5 bg-white/5 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-300 active:scale-90 border border-white/5 shadow-lg"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingProduct ? 'Update Product' : 'Add New Product'}
            >
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Product Name</label>
                        <div className="relative group">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                                placeholder="Enter name..."
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Price (IDR)</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all tabular-nums"
                                placeholder="0"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Stock Amount</label>
                            <input
                                type="number"
                                name="stock"
                                value={formData.stock}
                                onChange={handleInputChange}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all tabular-nums"
                                placeholder="0"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Product Image</label>
                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="w-full bg-white/5 border border-dashed border-white/10 rounded-2xl px-5 py-8 text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 transition-all cursor-pointer"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 px-1 italic">Optional: Upload a clear image for better representation.</p>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all duration-300 border border-white/5 active:scale-95"
                        >
                            Review Later
                        </button>
                        <button
                            type="submit"
                            className="flex-[1.5] px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {editingProduct ? 'UPDATE DATA' : 'CONFIRM & CREATE'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Products;

