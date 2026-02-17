import React, { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Plus, Edit, Trash2, Users } from 'lucide-react';

import Modal from '../components/Modal';

interface Customer {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
}

const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({ name: '', address: '', phone: '' });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, formData);
            } else {
                await api.post('/customers', formData);
            }
            fetchCustomers();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving customer', error);
        }
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            address: customer.address || '',
            phone: customer.phone || '',
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                await api.delete(`/customers/${id}`);
                fetchCustomers();
            } catch (error) {
                console.error('Error deleting customer', error);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
        setFormData({ name: '', address: '', phone: '' });
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-indigo-400">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Customer Relations</span>
                    </div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">Customers</h2>
                    <p className="text-slate-400">Manage your loyal customer base and their contact details.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-105 active:scale-95 group"
                >
                    <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                    Add New Customer
                </button>
            </div>

            {/* Table Section */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Name</th>
                                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Address</th>
                                <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Phone</th>
                                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="p-4 bg-white/5 rounded-3xl">
                                                <Users className="w-12 h-12 text-slate-600" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No customers found. Database is on standby.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : customers.map((customer) => (
                                <tr key={customer.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center mr-4 text-indigo-400 font-bold border border-indigo-500/20 shadow-lg">
                                                {customer.name[0].toUpperCase()}
                                            </div>
                                            <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                {customer.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-sm text-slate-400 line-clamp-1 max-w-xs">
                                            {customer.address || <span className="text-slate-600 italic">Not set</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-300 tabular-nums">
                                            {customer.phone || '—'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleEdit(customer)}
                                                className="p-2.5 bg-white/5 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-300 active:scale-90 border border-white/5 shadow-lg"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer.id)}
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
                title={editingCustomer ? 'Update Profile' : 'Register Customer'}
            >
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all border-white/10"
                            placeholder="e.g. John Doe"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Phone Number</label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all tabular-nums border-white/10"
                            placeholder="+62..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-1">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none border-white/10"
                            placeholder="Enter full address..."
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all duration-300 border border-white/5 active:scale-95"
                        >
                            Dismiss
                        </button>
                        <button
                            type="submit"
                            className="flex-[1.5] px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {editingCustomer ? 'UPDATE PROFILE' : 'REGISTER NOW'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Customers;

