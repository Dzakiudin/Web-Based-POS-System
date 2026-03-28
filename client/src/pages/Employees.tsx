import { useState, useEffect } from 'react';
import api from '../lib/axios';
import HasPermission from '../components/HasPermission';

interface Employee {
    id: number; name: string; username: string; email: string | null;
    role: string; isActive: boolean; createdAt: string;
    _count: { sales: number; cashSessions: number };
}

const ROLE_STYLES: Record<string, { bg: string; icon: string }> = {
    OWNER: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: 'shield_person' },
    ADMIN: { bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: 'admin_panel_settings' },
    CASHIER: { bg: 'bg-primary/10 text-primary border-primary/20', icon: 'badge' },
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
            if (editId) await api.put(`/users/${editId}`, { name: form.name, email: form.email, role: form.role });
            else await api.post('/users', form);
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-text-subtle text-sm">{employees.length} karyawan</p>
                <HasPermission permission="user.create_cashier">
                    <button onClick={() => { resetForm(); setShowModal(true); }}
                        className="px-4 py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-[18px]">person_add</span> Tambah Karyawan
                    </button>
                </HasPermission>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map(emp => {
                    const rs = ROLE_STYLES[emp.role] || ROLE_STYLES.CASHIER;
                    return (
                        <div key={emp.id} className={`bg-card-dark rounded-xl border p-5 hover:border-primary/30 transition-all group shadow-lg ${emp.isActive ? 'border-border-dark' : 'border-red-500/10 opacity-60'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">{emp.name.charAt(0).toUpperCase()}</div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <HasPermission permission="user.reset_pin">
                                        <button onClick={() => setShowResetPass(emp.id)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-amber-400 border border-border-dark" title="Reset Password">
                                            <span className="material-symbols-outlined text-[14px]">key</span>
                                        </button>
                                    </HasPermission>
                                    <HasPermission permission="user.manage">
                                        <button onClick={() => handleEdit(emp)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-primary border border-border-dark">
                                            <span className="material-symbols-outlined text-[14px]">edit</span>
                                        </button>
                                    </HasPermission>
                                    <HasPermission permission="role.manage">
                                        <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg bg-background-dark text-text-subtle hover:text-red-400 border border-border-dark">
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                        </button>
                                    </HasPermission>
                                </div>
                            </div>
                            <h3 className="text-white font-bold text-sm">{emp.name}</h3>
                            <p className="text-text-subtle/60 text-xs mb-2">@{emp.username}</p>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${rs.bg}`}>
                                    <span className="material-symbols-outlined text-[14px]">{rs.icon}</span>{emp.role}
                                </span>
                                {!emp.isActive && <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Nonaktif</span>}
                            </div>
                            <div className="flex gap-4 text-xs text-text-subtle/60">
                                <span>{emp._count.sales} penjualan</span>
                                <span>{emp._count.cashSessions} sesi kas</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="w-full max-w-md bg-card-dark rounded-xl border border-border-dark p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-white font-bold text-lg">{editId ? 'Edit Karyawan' : 'Tambah Karyawan'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-text-subtle hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Nama</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                            {!editId && (<>
                                <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Username</label>
                                    <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                                <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Password</label>
                                    <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                            </>)}
                            <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                            <div><label className="text-text-subtle text-xs mb-1.5 block font-semibold">Role</label>
                                <div className="flex gap-2">
                                    {(['CASHIER', 'ADMIN', 'OWNER'] as const).map(r => (
                                        <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${form.role === r ? (ROLE_STYLES[r]?.bg || '') : 'bg-background-dark border-border-dark text-text-subtle'}`}>{r}</button>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 shadow-lg shadow-primary/20">{editId ? 'Update' : 'Simpan'}</button>
                        </form>
                    </div>
                </div>
            )}

            {showResetPass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowResetPass(null)}>
                    <div className="w-full max-w-sm bg-card-dark rounded-xl border border-border-dark p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-amber-400">key</span> Reset Password</h2>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password baru" autoFocus
                            className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary mb-4" />
                        <button onClick={handleResetPassword} disabled={!newPassword}
                            className="w-full py-2.5 rounded-lg bg-amber-500/10 text-amber-400 text-sm font-bold border border-amber-500/20 disabled:opacity-30 hover:bg-amber-500/20">Reset Password</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
