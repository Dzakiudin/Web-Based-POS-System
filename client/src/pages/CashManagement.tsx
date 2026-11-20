import { useState, useEffect } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Lock, Unlock } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

interface CashSession {
    id: number;
    openingBalance: string;
    closingBalance: string | null;
    expectedBalance: string | null;
    difference: string | null;
    status: string;
    openedAt: string;
    closedAt: string | null;
    user?: { name: string } | null;
    movements?: { id: number; type: string; amount: string; reason: string; createdAt: string }[];
}

const CashManagement = () => {
    const toast = useToast();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [activeSession, setActiveSession] = useState<CashSession | null>(null);
    const [sessions, setSessions] = useState<CashSession[]>([]);
    const [showOpen, setShowOpen] = useState(false);
    const [showClose, setShowClose] = useState(false);
    const [showMovement, setShowMovement] = useState(false);
    const [openingBalance, setOpeningBalance] = useState<number>(0);
    const [closingBalance, setClosingBalance] = useState<number>(0);
    const [movementForm, setMovementForm] = useState({ type: 'CASH_IN', amount: 0, reason: '' });

    useEffect(() => {
        fetchActive();
        fetchSessions();
    }, []);

    const fetchActive = async () => {
        try {
            const r = await api.get('/cash-sessions/active');
            if (!r.data) {
                setActiveSession(null);
                return;
            }
            const active = r.data.id ? r.data : (r.data.session?.id ? { ...r.data.session, movements: r.data.movements } : null);
            setActiveSession(active);
        } catch {
            setActiveSession(null);
        }
    };

    const fetchSessions = async () => {
        try {
            const r = await api.get('/cash-sessions');
            setSessions(Array.isArray(r.data) ? r.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpen = async () => {
        try {
            await api.post('/cash-sessions/open', { openingBalance: Number(openingBalance) });
            toast.success('Sesi kas berhasil dibuka');
            setShowOpen(false);
            setOpeningBalance(0);
            fetchActive();
            fetchSessions();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal membuka sesi kas');
        }
    };

    const handleClose = async () => {
        if (!activeSession) return;
        try {
            await api.post(`/cash-sessions/${activeSession.id}/close`, { closingBalance: Number(closingBalance) });
            toast.success('Sesi kas ditutup');
            setShowClose(false);
            setClosingBalance(0);
            fetchActive();
            fetchSessions();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menutup sesi kas');
        }
    };

    const handleMovement = async () => {
        if (!movementForm.amount || !movementForm.reason || !activeSession) return;
        try {
            await api.post(`/cash-sessions/${activeSession.id}/movement`, {
                type: movementForm.type,
                amount: Number(movementForm.amount),
                reason: movementForm.reason,
            });
            toast.success('Arus kas dicatat');
            setShowMovement(false);
            setMovementForm({ type: 'CASH_IN', amount: 0, reason: '' });
            fetchActive();
            fetchSessions();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal mencatat arus kas');
        }
    };

    return (
        <VStack gap={5} width="100%">
            {/* Active Session Card */}
            {activeSession ? (
                <Card padding={4} elevation="none">
                    <VStack gap={4}>
                        <HStack justify="between" align="center" wrap="wrap" gap={3}>
                            <HStack gap={2} align="center">
                                <Wallet size={20} />
                                <VStack gap={0}>
                                    <HStack gap={2} align="center">
                                        <Heading level={4} weight="semibold">Sesi Kas Aktif #{activeSession.id}</Heading>
                                        <Badge variant="success" label="OPEN" />
                                    </HStack>
                                    <Text size="xsm" color="secondary">
                                        Dibuka oleh {activeSession.user?.name || 'Kasir'} · {new Date(activeSession.openedAt).toLocaleString('id-ID')}
                                    </Text>
                                </VStack>
                            </HStack>

                            <HStack gap={2} wrap="wrap">
                                <Button
                                    variant="secondary"
                                    label="Kas Masuk / Keluar"
                                    icon={<ArrowDownLeft size={16} />}
                                    onClick={() => setShowMovement(true)}
                                />
                                <Button
                                    variant="destructive"
                                    label="Tutup Shift"
                                    icon={<Lock size={16} />}
                                    onClick={() => setShowClose(true)}
                                />
                            </HStack>
                        </HStack>

                        <Divider />

                        <Grid columns={{ minWidth: 180, max: 3 }} gap={3}>
                            <Card padding={3} variant="muted" elevation="none">
                                <VStack gap={0.5}>
                                    <Text size="xsm" color="secondary">Saldo Awal</Text>
                                    <Heading level={4} weight="bold">
                                        Rp {Number(activeSession.openingBalance || 0).toLocaleString('id-ID')}
                                    </Heading>
                                </VStack>
                            </Card>
                            <Card padding={3} variant="muted" elevation="none">
                                <VStack gap={0.5}>
                                    <Text size="xsm" color="secondary">Estimasi Kas</Text>
                                    <Heading level={4} weight="bold">
                                        Rp {Number(activeSession.expectedBalance ?? activeSession.openingBalance ?? 0).toLocaleString('id-ID')}
                                    </Heading>
                                </VStack>
                            </Card>
                            <Card padding={3} variant="muted" elevation="none">
                                <VStack gap={0.5}>
                                    <Text size="xsm" color="secondary">Pergerakan Kas</Text>
                                    <Heading level={4} weight="bold">{activeSession.movements?.length || 0} catatan</Heading>
                                </VStack>
                            </Card>
                        </Grid>

                        {activeSession.movements && activeSession.movements.length > 0 && (
                            <VStack gap={2}>
                                <Text size="sm" weight="semibold">Pergerakan Shift Ini</Text>
                                {activeSession.movements.map((m) => (
                                    <HStack key={m.id} justify="between" align="center" padding={2} style={{ borderBottom: '1px solid var(--color-border-subtle, #e5e7eb)' }}>
                                        <HStack gap={2} align="center">
                                            {m.type === 'CASH_IN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                            <VStack gap={0}>
                                                <Text size="sm" weight="medium">{m.reason}</Text>
                                                <Text size="xsm" color="secondary">{new Date(m.createdAt).toLocaleTimeString('id-ID')}</Text>
                                            </VStack>
                                        </HStack>
                                        <Badge
                                            variant={m.type === 'CASH_IN' ? 'success' : 'error'}
                                            label={`${m.type === 'CASH_IN' ? '+' : '-'} Rp ${Number(m.amount).toLocaleString('id-ID')}`}
                                        />
                                    </HStack>
                                ))}
                            </VStack>
                        )}
                    </VStack>
                </Card>
            ) : (
                <Banner
                    status="info"
                    title="Belum ada sesi kas yang aktif"
                    description="Buka shift kasir terlebih dahulu untuk mencatat saldo awal dan pergerakan uang tunai."
                    container="card"
                    elevation="none"
                    endContent={
                        <Button
                            variant="primary"
                            label="Buka Shift Kas"
                            icon={<Unlock size={16} />}
                            onClick={() => setShowOpen(true)}
                        />
                    }
                />
            )}

            {/* History Records */}
            <VStack gap={2}>
                <Heading level={4} weight="semibold">Riwayat Sesi Kas</Heading>
                {sessions.length > 0 ? (
                    isMobile ? (
                        <VStack gap={2}>
                            {sessions.map((s) => (
                                <Card key={s.id} padding={3} elevation="none">
                                    <VStack gap={2}>
                                        <HStack justify="between" align="center">
                                            <HStack gap={1.5} align="center">
                                                <Wallet size={16} />
                                                <Text size="sm" weight="bold">Sesi #{s.id}</Text>
                                            </HStack>
                                            <Badge variant={s.status === 'OPEN' ? 'success' : 'neutral'} label={s.status} />
                                        </HStack>
                                        <HStack justify="between" align="center">
                                            <Text size="xsm" color="secondary">
                                                Kasir: {s.user?.name || '-'}
                                            </Text>
                                            <Text size="xsm" color="secondary">
                                                {new Date(s.openedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                            </Text>
                                        </HStack>
                                        <Divider />
                                        <HStack justify="between" align="center">
                                            <VStack gap={0}>
                                                <Text size="2xs" color="secondary">Saldo Awal</Text>
                                                <Text size="sm" weight="bold" hasTabularNumbers>Rp {Number(s.openingBalance || 0).toLocaleString('id-ID')}</Text>
                                            </VStack>
                                            <VStack gap={0} align="center">
                                                <Text size="2xs" color="secondary">Saldo Akhir</Text>
                                                <Text size="sm" weight="bold" hasTabularNumbers>{s.closingBalance != null ? `Rp ${Number(s.closingBalance).toLocaleString('id-ID')}` : '-'}</Text>
                                            </VStack>
                                            <VStack gap={0} align="end">
                                                <Text size="2xs" color="secondary">Selisih</Text>
                                                <Text size="sm" weight="bold" hasTabularNumbers style={{ color: Number(s.difference || 0) < 0 ? '#dc2626' : '#16a34a' }}>
                                                    {s.difference != null ? `Rp ${Number(s.difference).toLocaleString('id-ID')}` : '-'}
                                                </Text>
                                            </VStack>
                                        </HStack>
                                    </VStack>
                                </Card>
                            ))}
                        </VStack>
                    ) : (
                        <Card padding={0} elevation="none">
                            <ScrollableArea label="Tabel data">
                                <Table density="balanced" dividers="rows" hasHover style={{ width: '100%', tableLayout: 'fixed' }}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHeaderCell style={{ width: '8%', textAlign: 'center' }}>ID</TableHeaderCell>
                                            <TableHeaderCell style={{ width: '18%' }}>Kasir</TableHeaderCell>
                                            <TableHeaderCell style={{ width: '18%' }}>Dibuka</TableHeaderCell>
                                            <TableHeaderCell style={{ width: '16%', textAlign: 'right' }}>Saldo Awal</TableHeaderCell>
                                            <TableHeaderCell style={{ width: '16%', textAlign: 'right' }}>Saldo Akhir</TableHeaderCell>
                                            <TableHeaderCell style={{ width: '14%', textAlign: 'right' }}>Selisih</TableHeaderCell>
                                            <TableHeaderCell style={{ width: '10%', textAlign: 'center' }}>Status</TableHeaderCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessions.map((s) => (
                                            <TableRow key={s.id}>
                                                <TableCell style={{ width: '8%', textAlign: 'center' }}><Text size="sm" weight="medium">#{s.id}</Text></TableCell>
                                                <TableCell style={{ width: '18%' }}><Text size="sm">{s.user?.name || '-'}</Text></TableCell>
                                                <TableCell style={{ width: '18%' }}><Text size="xsm" color="secondary">{new Date(s.openedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</Text></TableCell>
                                                <TableCell style={{ width: '16%', textAlign: 'right' }}><Text size="sm" hasTabularNumbers>Rp {Number(s.openingBalance || 0).toLocaleString('id-ID')}</Text></TableCell>
                                                <TableCell style={{ width: '16%', textAlign: 'right' }}><Text size="sm" hasTabularNumbers>{s.closingBalance != null ? `Rp ${Number(s.closingBalance).toLocaleString('id-ID')}` : '-'}</Text></TableCell>
                                                <TableCell style={{ width: '14%', textAlign: 'right' }}>
                                                    <span style={{
                                                        fontFamily: 'Inter, sans-serif',
                                                        fontVariantNumeric: 'tabular-nums',
                                                        fontWeight: 700,
                                                        fontSize: 13,
                                                        color: Number(s.difference || 0) < 0 ? '#dc2626' : (Number(s.difference || 0) > 0 ? '#16a34a' : '#64748b')
                                                    }}>
                                                        {s.difference != null ? `Rp ${Number(s.difference).toLocaleString('id-ID')}` : '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell style={{ width: '10%', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        <Badge variant={s.status === 'OPEN' ? 'success' : 'neutral'} label={s.status} />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollableArea>
                        </Card>
                    )
                ) : (
                    <Card padding={6} elevation="none">
                        <EmptyState title="Belum ada riwayat sesi kas" isCompact />
                    </Card>
                )}
            </VStack>

            {/* Modal Buka Shift (Modal Awal Toko) */}
            <Modal isOpen={showOpen} onClose={() => setShowOpen(false)} title="Buka Shift Kas (Modal Awal Toko)" width={460}>
                <VStack gap={4}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Modal Awal Kas / Laci (Rp)</span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            border: '2px solid #e5e7eb',
                            borderRadius: 10,
                            padding: '8px 12px',
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#9ca3af', marginRight: 8 }}>Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    fontFamily: 'Inter, monospace',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: '#111827',
                                    backgroundColor: 'transparent',
                                }}
                                placeholder="0"
                                value={openingBalance === 0 ? '' : openingBalance.toLocaleString('id-ID')}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setOpeningBalance(raw ? Math.min(999999999999, Number(raw)) : 0);
                                }}
                            />
                        </div>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>
                            Uang modal awal perusahaan untuk kembalian & operasional laci (terpisah dari uang pribadi).
                        </span>
                    </div>

                    {/* Quick Preset Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {[500000, 1000000, 5000000, 10000000, 20000000, 50000000].map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => setOpeningBalance(amt)}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    fontFamily: 'Inter, monospace',
                                    cursor: 'pointer',
                                    border: openingBalance === amt ? '1px solid #18181b' : '1px solid #e5e7eb',
                                    backgroundColor: openingBalance === amt ? '#18181b' : '#f9fafb',
                                    color: openingBalance === amt ? '#ffffff' : '#374151',
                                    transition: 'all 120ms ease',
                                }}
                            >
                                Rp {amt.toLocaleString('id-ID')}
                            </button>
                        ))}
                    </div>

                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowOpen(false)} />
                        <Button variant="primary" label="Buka Shift" onClick={handleOpen} />
                    </HStack>
                </VStack>
            </Modal>

            {/* Modal Tutup Shift Kas (Rekonsiliasi) */}
            <Modal isOpen={showClose} onClose={() => setShowClose(false)} title="Tutup Shift Kas & Rekonsiliasi" width={460}>
                <VStack gap={4}>
                    <div style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Estimasi Kas Sistem:</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', fontFamily: 'Inter, monospace', fontVariantNumeric: 'tabular-nums' }}>
                            Rp {Number(activeSession?.expectedBalance ?? activeSession?.openingBalance ?? 0).toLocaleString('id-ID')}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Saldo Fisik Aktual di Laci (Rp)</span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            border: '2px solid #e5e7eb',
                            borderRadius: 10,
                            padding: '8px 12px',
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#9ca3af', marginRight: 8 }}>Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    fontFamily: 'Inter, monospace',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: '#111827',
                                    backgroundColor: 'transparent',
                                }}
                                placeholder="0"
                                value={closingBalance === 0 ? '' : closingBalance.toLocaleString('id-ID')}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setClosingBalance(raw ? Math.min(999999999999, Number(raw)) : 0);
                                }}
                            />
                        </div>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>
                            Hitung seluruh uang fisik di laci saat ini. Sistem akan otomatis menghitung selisih (jika ada).
                        </span>
                    </div>

                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowClose(false)} />
                        <Button variant="destructive" label="Tutup Shift Sekarang" onClick={handleClose} />
                    </HStack>
                </VStack>
            </Modal>

            {/* Modal Catat Arus Kas (Uang Masuk / Keluar) */}
            <Modal isOpen={showMovement} onClose={() => setShowMovement(false)} title="Catat Arus Kas Operasional" width={480}>
                <VStack gap={4}>
                    <SegmentedControl
                        label="Jenis arus kas"
                        value={movementForm.type}
                        onChange={(v) => setMovementForm({ ...movementForm, type: v })}
                        layout="fill"
                    >
                        <SegmentedControlItem value="CASH_IN" label="Kas Masuk (Tambah Modal)" />
                        <SegmentedControlItem value="CASH_OUT" label="Kas Keluar (Belanja / Biaya)" />
                    </SegmentedControl>

                    <div style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        backgroundColor: movementForm.type === 'CASH_OUT' ? '#fff7ed' : '#ecfdf5',
                        border: movementForm.type === 'CASH_OUT' ? '1px solid #fed7aa' : '1px solid #a7f3d0',
                        fontSize: 12,
                        color: movementForm.type === 'CASH_OUT' ? '#c2410c' : '#047857',
                        fontWeight: 500,
                    }}>
                        {movementForm.type === 'CASH_OUT'
                            ? '📉 Kas Keluar: Pengeluaran untuk belanja bahan baku, operasional, atau kulakan akan mengurangi estimasi kas laci.'
                            : '📈 Kas Masuk: Suntikan dana tambahan modal atau penerimaan kas tunai akan menambah estimasi kas laci.'}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Nominal Uang (Rp)</span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            border: '2px solid #e5e7eb',
                            borderRadius: 10,
                            padding: '8px 12px',
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#9ca3af', marginRight: 8 }}>Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    fontFamily: 'Inter, monospace',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: '#111827',
                                    backgroundColor: 'transparent',
                                }}
                                placeholder="0"
                                value={movementForm.amount === 0 ? '' : movementForm.amount.toLocaleString('id-ID')}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setMovementForm({ ...movementForm, amount: raw ? Math.min(999999999999, Number(raw)) : 0 });
                                }}
                            />
                        </div>
                    </div>

                    {/* Quick Preset Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {[100000, 500000, 1000000, 5000000, 10000000, 20000000].map((amt) => (
                            <button
                                key={amt}
                                type="button"
                                onClick={() => setMovementForm({ ...movementForm, amount: amt })}
                                style={{
                                    padding: '5px 10px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    fontFamily: 'Inter, monospace',
                                    cursor: 'pointer',
                                    border: movementForm.amount === amt ? '1px solid #18181b' : '1px solid #e5e7eb',
                                    backgroundColor: movementForm.amount === amt ? '#18181b' : '#f9fafb',
                                    color: movementForm.amount === amt ? '#ffffff' : '#374151',
                                    transition: 'all 120ms ease',
                                }}
                            >
                                Rp {amt.toLocaleString('id-ID')}
                            </button>
                        ))}
                    </div>

                    <TextInput
                        label="Keterangan Pengeluaran / Pemasukan"
                        placeholder="Contoh: Belanja bahan baku 20jt / Beli es batu / Bensin operasional"
                        value={movementForm.reason}
                        onChange={(v) => setMovementForm({ ...movementForm, reason: v })}
                        isRequired
                    />

                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowMovement(false)} />
                        <Button
                            variant="primary"
                            label="Simpan Arus Kas"
                            isDisabled={!movementForm.amount || !movementForm.reason.trim()}
                            onClick={handleMovement}
                        />
                    </HStack>
                </VStack>
            </Modal>
        </VStack>
    );
};

export default CashManagement;
