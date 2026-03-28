import { useState, useEffect } from 'react';
import api from '../lib/axios';

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
        <div className="space-y-6">
            {/* Active Session Card */}
            {activeSession ? (
                <div className="bg-card-dark rounded-xl border border-primary/20 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="size-3 rounded-full bg-primary animate-pulse" />
                            <span className="text-primary text-sm font-semibold">Sesi Aktif — {activeSession.user?.name || 'Kasir'}</span>
                        </div>
                        <span className="text-text-subtle text-xs">{new Date(activeSession.openedAt).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div><p className="text-text-subtle text-xs mb-1">Saldo Awal</p><p className="text-white text-lg font-bold">Rp {Number(activeSession.openingBalance).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-text-subtle text-xs mb-1">Saldo Diharapkan</p><p className="text-primary text-lg font-bold">Rp {Number(activeSession.expectedBalance || 0).toLocaleString('id-ID')}</p></div>
                        <div><p className="text-text-subtle text-xs mb-1">Pergerakan</p><p className="text-white text-lg font-bold">{activeSession.movements?.length || 0}</p></div>
                    </div>

                    {activeSession.movements?.length > 0 && (
                        <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto">
                            {activeSession.movements.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-background-dark rounded-lg px-3 py-2 border border-border-dark">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[16px]" style={{ color: m.type === 'CASH_IN' ? '#13ec5b' : '#ef4444' }}>
                                            {m.type === 'CASH_IN' ? 'trending_up' : 'trending_down'}
                                        </span>
                                        <span className="text-white text-xs">{m.reason}</span>
                                    </div>
                                    <span className={`text-xs font-semibold ${m.type === 'CASH_IN' ? 'text-primary' : 'text-red-400'}`}>
                                        {m.type === 'CASH_IN' ? '+' : '-'}Rp {Number(m.amount).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={() => setShowMovement(true)} className="flex-1 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors border border-primary/20 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">add</span> Kas Masuk/Keluar
                        </button>
                        <button onClick={() => setShowClose(true)} className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">schedule</span> Tutup Sesi
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-card-dark rounded-xl border border-border-dark p-8 text-center shadow-lg">
                    <span className="material-symbols-outlined text-5xl text-text-subtle/30 mb-3 block">account_balance_wallet</span>
                    <p className="text-text-subtle text-sm mb-4">Tidak ada sesi kas aktif</p>
                    <button onClick={() => setShowOpen(true)}
                        className="px-6 py-3 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-green-400 transition-all shadow-lg shadow-primary/20">
                        Buka Sesi Kas
                    </button>
                </div>
            )}

            {/* Past Sessions */}
            <div className="bg-card-dark rounded-xl border border-border-dark overflow-hidden shadow-lg">
                <div className="p-4 border-b border-border-dark"><h3 className="text-white font-bold text-sm flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[18px]">history</span> Riwayat Sesi Kas</h3></div>
                <table className="w-full">
                    <thead><tr className="border-b border-border-dark bg-background-dark">
                        <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Tanggal</th>
                        <th className="text-left px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Kasir</th>
                        <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Saldo Awal</th>
                        <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Saldo Akhir</th>
                        <th className="text-right px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Selisih</th>
                        <th className="text-center px-5 py-3 text-xs text-text-subtle font-semibold uppercase tracking-wider">Status</th>
                    </tr></thead>
                    <tbody>
                        {sessions.filter(s => s.status === 'CLOSED').map(s => (
                            <tr key={s.id} className="border-b border-border-dark hover:bg-card-hover transition-colors">
                                <td className="px-5 py-3.5 text-text-subtle text-xs">{new Date(s.openedAt).toLocaleString('id-ID', { dateStyle: 'short' })}</td>
                                <td className="px-5 py-3.5 text-white text-sm">{s.user?.name || '-'}</td>
                                <td className="px-5 py-3.5 text-right text-text-subtle text-sm">Rp {Number(s.openingBalance).toLocaleString('id-ID')}</td>
                                <td className="px-5 py-3.5 text-right text-white text-sm font-semibold">Rp {Number(s.closingBalance || 0).toLocaleString('id-ID')}</td>
                                <td className="px-5 py-3.5 text-right">
                                    <span className={`text-xs font-semibold ${Number(s.difference) === 0 ? 'text-primary' : Number(s.difference) > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        {Number(s.difference) > 0 ? '+' : ''}Rp {Number(s.difference || 0).toLocaleString('id-ID')}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${Number(s.difference) === 0 ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-400'}`}>
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
                    <div className="w-full max-w-sm bg-card-dark rounded-xl border border-border-dark p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">account_balance_wallet</span> Buka Sesi Kas
                        </h2>
                        <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Saldo Awal (Rp)</label>
                        <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)}
                            placeholder="Contoh: 500000" autoFocus
                            className="w-full px-4 py-3 rounded-lg bg-background-dark border border-border-dark text-white text-lg font-bold text-right focus:outline-none focus:ring-1 focus:ring-primary mb-4" />
                        <button onClick={handleOpen} disabled={!openingBalance}
                            className="w-full py-3 rounded-lg bg-primary text-background-dark text-sm font-bold disabled:opacity-30 hover:bg-green-400 shadow-lg shadow-primary/20 transition-all">
                            Buka Sesi
                        </button>
                    </div>
                </div>
            )}

            {/* Close Session Modal */}
            {showClose && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowClose(false)}>
                    <div className="w-full max-w-sm bg-card-dark rounded-xl border border-border-dark p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-400">schedule</span> Tutup Sesi Kas
                        </h2>
                        <label className="text-text-subtle text-xs mb-1.5 block font-semibold">Saldo Akhir (Rp)</label>
                        <input type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)}
                            placeholder="Hitung uang di laci kas" autoFocus
                            className="w-full px-4 py-3 rounded-lg bg-background-dark border border-border-dark text-white text-lg font-bold text-right focus:outline-none focus:ring-1 focus:ring-primary mb-2" />
                        {activeSession && (
                            <p className="text-text-subtle text-xs mb-4">Diharapkan: Rp {Number(activeSession.expectedBalance || 0).toLocaleString('id-ID')}</p>
                        )}
                        <button onClick={handleClose} disabled={!closingBalance}
                            className="w-full py-3 rounded-lg bg-red-500/10 text-red-400 text-sm font-bold border border-red-500/20 disabled:opacity-30 hover:bg-red-500/20 transition-colors">
                            Tutup Sesi
                        </button>
                    </div>
                </div>
            )}

            {/* Movement Modal */}
            {showMovement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowMovement(false)}>
                    <div className="w-full max-w-sm bg-card-dark rounded-xl border border-border-dark p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">swap_vert</span> Pergerakan Kas
                        </h2>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setMovementForm({ ...movementForm, type: 'CASH_IN' })}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${movementForm.type === 'CASH_IN' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background-dark border-border-dark text-text-subtle'}`}>
                                Kas Masuk
                            </button>
                            <button onClick={() => setMovementForm({ ...movementForm, type: 'CASH_OUT' })}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${movementForm.type === 'CASH_OUT' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-background-dark border-border-dark text-text-subtle'}`}>
                                Kas Keluar
                            </button>
                        </div>
                        <div className="space-y-3">
                            <input type="number" value={movementForm.amount} onChange={e => setMovementForm({ ...movementForm, amount: e.target.value })}
                                placeholder="Jumlah"
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                            <input type="text" value={movementForm.reason} onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })}
                                placeholder="Alasan (contoh: Tukar pecahan)"
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                            <button onClick={handleMovement} disabled={!movementForm.amount || !movementForm.reason}
                                className="w-full py-2.5 rounded-lg bg-primary text-background-dark text-sm font-bold disabled:opacity-30 hover:bg-green-400 shadow-lg shadow-primary/20 transition-all">
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
