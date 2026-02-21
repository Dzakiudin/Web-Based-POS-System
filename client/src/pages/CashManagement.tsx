import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Banknote, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Plus, AlertTriangle, Wallet, BarChart3 } from 'lucide-react';

interface CashSession {
    id: number; openingBalance: string; closingBalance: string | null;
    expectedBalance: string | null; difference: string | null;
    status: string; openedAt: string; closedAt: string | null;
    user: { name: string };
    movements: { id: number; type: string; amount: string; reason: string; createdAt: string }[];
}

const CashManagement = () => {
    const [activeSession, setActiveSession] = useState<CashSession | null>(null);
    const [sessions, setSessions] = useState<CashSession[]>([]);
    const [showOpen, setShowOpen] = useState(false);
    const [showClose, setShowClose] = useState(false);
    const [showMovement, setShowMovement] = useState(false);
    const [openingBalance, setOpeningBalance] = useState('');
    const [closingBalance, setClosingBalance] = useState('');
    const [movementForm, setMovementForm] = useState({ type: 'CASH_IN', amount: '', reason: '' });

    useEffect(() => { fetchActive(); fetchSessions(); }, []);

    const fetchActive = async () => { try { const r = await api.get('/cash-sessions/active'); setActiveSession(r.data); } catch { setActiveSession(null); } };
    const fetchSessions = async () => { try { const r = await api.get('/cash-sessions'); setSessions(r.data); } catch (e) { console.error(e); } };

    const handleOpen = async () => {
        if (!openingBalance) return;
        try { await api.post('/cash-sessions/open', { openingBalance: Number(openingBalance) }); setShowOpen(false); setOpeningBalance(''); fetchActive(); fetchSessions(); }
        catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleClose = async () => {
        if (!closingBalance || !activeSession) return;
        try { await api.post(`/cash-sessions/${activeSession.id}/close`, { closingBalance: Number(closingBalance) }); setShowClose(false); setClosingBalance(''); fetchActive(); fetchSessions(); }
        catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    const handleMovement = async () => {
        if (!movementForm.amount || !movementForm.reason || !activeSession) return;
        try {
            await api.post(`/cash-sessions/${activeSession.id}/movement`, { type: movementForm.type, amount: Number(movementForm.amount), reason: movementForm.reason });
            setShowMovement(false); setMovementForm({ type: 'CASH_IN', amount: '', reason: '' }); fetchActive();
        }
        catch (e: any) { alert(e.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Wallet className="w-7 h-7 text-indigo-400" /> Manajemen Kas
                </h1>
            </div>

            {/* Active Session Card */}
            {activeSession ? (
                <div className="glass-card rounded-2xl border border-emerald-500/20 p-6 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 text-sm font-medium">Sesi Aktif — {activeSession.user.name}</span>
                        </div>
                        <span className="text-white/30 text-xs">{new Date(activeSession.openedAt).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div><p className="text-white/40 text-[10px] mb-1">Saldo Awal</p><p className="text-white text-lg font-bold">Rp {Number(activeSession.openingBalance).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-white/40 text-[10px] mb-1">Saldo Diharapkan</p><p className="text-indigo-400 text-lg font-bold">Rp {Number(activeSession.expectedBalance || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-white/40 text-[10px] mb-1">Pergerakan</p><p className="text-white/70 text-lg font-bold">{activeSession.movements?.length || 0}</p></div>
                    </div>

                    {/* Movements list */}
                    {activeSession.movements?.length > 0 && (
                        <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                            {activeSession.movements.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        {m.type === 'CASH_IN' ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
                                        <span className="text-white/70 text-xs">{m.reason}</span>
                                    </div>
                                    <span className={`text-xs font-medium ${m.type === 'CASH_IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {m.type === 'CASH_IN' ? '+' : '-'}Rp {Number(m.amount).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={() => setShowMovement(true)} className="flex-1 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> Kas Masuk/Keluar
                        </button>
                        <button onClick={() => setShowClose(true)} className="flex-1 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" /> Tutup Sesi
                        </button>
                    </div>
                </div>
            ) : (
                <div className="glass-card rounded-2xl border border-white/10 p-8 text-center">
                    <Banknote className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 text-sm mb-4">Tidak ada sesi kas aktif</p>
                    <button onClick={() => setShowOpen(true)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold hover:from-indigo-600 hover:to-purple-600 transition-all">
                        Buka Sesi Kas
                    </button>
                </div>
            )}

            {/* Past Sessions */}
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10"><h3 className="text-white font-bold text-sm">Riwayat Sesi Kas</h3></div>
                <table className="w-full">
                    <thead><tr className="border-b border-white/10 bg-white/3">
                        <th className="text-left px-4 py-2.5 text-xs text-white/50">Tanggal</th>
                        <th className="text-left px-4 py-2.5 text-xs text-white/50">Kasir</th>
                        <th className="text-right px-4 py-2.5 text-xs text-white/50">Saldo Awal</th>
                        <th className="text-right px-4 py-2.5 text-xs text-white/50">Saldo Akhir</th>
                        <th className="text-right px-4 py-2.5 text-xs text-white/50">Selisih</th>
                        <th className="text-center px-4 py-2.5 text-xs text-white/50">Status</th>
                    </tr></thead>
                    <tbody>
                        {sessions.filter(s => s.status === 'CLOSED').map(s => (
                            <tr key={s.id} className="border-b border-white/5 hover:bg-white/3">
                                <td className="px-4 py-2.5 text-white/60 text-xs">{new Date(s.openedAt).toLocaleString('id-ID', { dateStyle: 'short' })}</td>
                                <td className="px-4 py-2.5 text-white/70 text-sm">{s.user.name}</td>
                                <td className="px-4 py-2.5 text-right text-white/60 text-sm">Rp {Number(s.openingBalance).toLocaleString('id-ID')}</td>
                                <td className="px-4 py-2.5 text-right text-white/80 text-sm font-medium">Rp {Number(s.closingBalance || 0).toLocaleString('id-ID')}</td>
                                <td className="px-4 py-2.5 text-right">
                                    <span className={`text-xs font-medium ${Number(s.difference) === 0 ? 'text-emerald-400' : Number(s.difference) > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        {Number(s.difference) > 0 ? '+' : ''}Rp {Number(s.difference || 0).toLocaleString('id-ID')}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${Number(s.difference) === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                        {Number(s.difference) === 0 ? 'Sesuai' : 'Selisih'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Open Session Modal */}
            {showOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowOpen(false)}>
                    <div className="w-full max-w-sm bg-[#0a0f1e]/95 rounded-2xl border border-white/10 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4">Buka Sesi Kas</h2>
                        <label className="text-white/40 text-xs mb-1.5 block">Saldo Awal (Rp)</label>
                        <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
                            placeholder="Contoh: 500000" autoFocus
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg font-bold text-right focus:outline-none focus:border-indigo-500/50 mb-4" />
                        <button onClick={handleOpen} disabled={!openingBalance}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold disabled:opacity-30">
                            Buka Sesi
                        </button>
                    </div>
                </div>
            )}

            {/* Close Session Modal */}
            {showClose && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowClose(false)}>
                    <div className="w-full max-w-sm bg-[#0a0f1e]/95 rounded-2xl border border-white/10 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4">Tutup Sesi Kas</h2>
                        <label className="text-white/40 text-xs mb-1.5 block">Saldo Akhir (Rp)</label>
                        <input type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)}
                            placeholder="Hitung uang di laci kas" autoFocus
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg font-bold text-right focus:outline-none focus:border-indigo-500/50 mb-2" />
                        {activeSession && (
                            <p className="text-white/30 text-xs mb-4">Diharapkan: Rp {Number(activeSession.expectedBalance || 0).toLocaleString('id-ID')}</p>
                        )}
                        <button onClick={handleClose} disabled={!closingBalance}
                            className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold border border-red-500/30 disabled:opacity-30">
                            Tutup Sesi
                        </button>
                    </div>
                </div>
            )}

            {/* Movement Modal */}
            {showMovement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowMovement(false)}>
                    <div className="w-full max-w-sm bg-[#0a0f1e]/95 rounded-2xl border border-white/10 p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4">Pergerakan Kas</h2>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setMovementForm({ ...movementForm, type: 'CASH_IN' })}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${movementForm.type === 'CASH_IN' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                Kas Masuk
                            </button>
                            <button onClick={() => setMovementForm({ ...movementForm, type: 'CASH_OUT' })}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${movementForm.type === 'CASH_OUT' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                Kas Keluar
                            </button>
                        </div>
                        <div className="space-y-3">
                            <input type="number" value={movementForm.amount} onChange={e => setMovementForm({ ...movementForm, amount: e.target.value })}
                                placeholder="Jumlah"
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                            <input type="text" value={movementForm.reason} onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })}
                                placeholder="Alasan (contoh: Tukar pecahan)"
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none" />
                            <button onClick={handleMovement} disabled={!movementForm.amount || !movementForm.reason}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium disabled:opacity-30">
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashManagement;
