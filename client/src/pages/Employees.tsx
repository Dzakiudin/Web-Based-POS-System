import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Users, Plus, Edit2, Trash2, Key, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Employee {
    id: number; name: string; username: string; email: string | null;
    role: string; isActive: boolean; createdAt: string;
    _count: { sales: number; cashSessions: number };
}

const ROLE_STYLES: Record<string, { bg: string; icon: any }> = {
    OWNER: { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: ShieldAlert },
    ADMIN: { bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: ShieldCheck },
    CASHIER: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Shield },
};

const Employees = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', username: '', password: '', email: '', role: 'CASHIER' });
    const [showResetPass, setShowResetPass] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => { fetchEmployees(); }, []);

    const fetchEmployees = async () => { try { const r = await api.get('/users'); setEmployees(r.data); } catch (e) { console.error(e); } };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) { await api.put(`/users/${editId}`, { name: form.name, email: form.email, role: form.role }); }
            else { await api.post('/users', form); }
            setShowModal(false); resetForm(); fetchEmployees();
        } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleEdit = (emp: Employee) => {
        setEditId(emp.id);
        setForm({ name: emp.name, username: emp.username, password: '', email: emp.email || '', role: emp.role });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Nonaktifkan karyawan ini?')) return;
        try { await api.delete(`/users/${id}`); fetchEmployees(); } catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !showResetPass) return;
        try { await api.post(`/users/${showResetPass}/reset-password`, { newPassword }); setShowResetPass(null); setNewPassword(''); alert('Password berhasil direset'); }
        catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const resetForm = () => { setForm({ name: '', username: '', password: '', email: '', role: 'CASHIER' }); setEditId(null); };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Users className="w-7 h-7 text-indigo-400" /> Karyawan
                </h1>
                <button onClick={() => { resetForm(); setShowModal(true); }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Tambah Karyawan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {employees.map(emp => {
                    const roleStyle = ROLE_STYLES[emp.role] || ROLE_STYLES.CASHIER;
                    const RoleIcon = roleStyle.icon;
                    return (
                        <div key={emp.id} className={`glass-card rounded-2xl border p-5 hover:border-white/20 transition-all group ${emp.isActive ? 'border-white/10' : 'border-red-500/10 opacity-60'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-white/50 text-sm font-bold">
                                    {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setShowResetPass(emp.id)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-amber-400 hover:bg-white/10 transition-colors" title="Reset Password">
                                        <Key className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleEdit(emp)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-white/10 transition-colors">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-white font-bold text-sm">{emp.name}</h3>
                            <p className="text-white/30 text-xs mb-2">@{emp.username}</p>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${roleStyle.bg}`}>
                                    <RoleIcon className="w-3 h-3" />{emp.role}
                                </span>
                                {!emp.isActive && <span className="px-2 py-0.5 rounded-md text-[10px] bg-red-500/20 text-red-400">Nonaktif</span>}
                            </div>
                            <div className="flex gap-4 text-[10px] text-white/30">
                                <span>{emp._count.sales} penjualan</span>
                                <span>{emp._count.cashSessions} sesi kas</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-md bg-[#0a0f1e]/95 rounded-2xl border border-white/10 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4">{editId ? 'Edit Karyawan' : 'Tambah Karyawan'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="text-white/40 text-xs mb-1 block">Nama</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                            </div>
                            {!editId && (
                                <>
                                    <div>
                                        <label className="text-white/40 text-xs mb-1 block">Username</label>
                                        <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required
                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                                    </div>
                                    <div>
                                        <label className="text-white/40 text-xs mb-1 block">Password</label>
                                        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="text-white/40 text-xs mb-1 block">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                            </div>
                            <div>
                                <label className="text-white/40 text-xs mb-1 block">Role</label>
                                <div className="flex gap-2">
                                    {(['CASHIER', 'ADMIN', 'OWNER'] as const).map(r => (
                                        <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                                            className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${form.role === r ? ROLE_STYLES[r].bg : 'bg-white/5 border-white/10 text-white/50'}`}>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium mt-2">
                                {editId ? 'Update' : 'Simpan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowResetPass(null)}>
                    <div className="w-full max-w-sm bg-[#0a0f1e]/95 rounded-2xl border border-white/10 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4">Reset Password</h2>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            placeholder="Password baru" autoFocus
                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50 mb-4" />
                        <button onClick={handleResetPassword} disabled={!newPassword}
                            className="w-full py-2.5 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-medium border border-amber-500/30 disabled:opacity-30">
                            Reset Password
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
