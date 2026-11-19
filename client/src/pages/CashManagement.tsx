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
import { NumberInput } from '@astryxdesign/core/NumberInput';
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
            setActiveSession(r.data && r.data.id ? r.data : null);
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
                                <Table density="balanced" dividers="rows" hasHover>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHeaderCell>ID</TableHeaderCell>
                                            <TableHeaderCell>Kasir</TableHeaderCell>
                                            <TableHeaderCell>Dibuka</TableHeaderCell>
                                            <TableHeaderCell>Saldo Awal</TableHeaderCell>
                                            <TableHeaderCell>Saldo Akhir</TableHeaderCell>
                                            <TableHeaderCell>Selisih</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessions.map((s) => (
                                            <TableRow key={s.id}>
                                                <TableCell><Text size="sm" weight="medium">#{s.id}</Text></TableCell>
                                                <TableCell><Text size="sm">{s.user?.name || '-'}</Text></TableCell>
                                                <TableCell><Text size="xsm" color="secondary">{new Date(s.openedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</Text></TableCell>
                                                <TableCell><Text size="sm" hasTabularNumbers>Rp {Number(s.openingBalance || 0).toLocaleString('id-ID')}</Text></TableCell>
                                                <TableCell><Text size="sm" hasTabularNumbers>{s.closingBalance != null ? `Rp ${Number(s.closingBalance).toLocaleString('id-ID')}` : '-'}</Text></TableCell>
                                                <TableCell><Text size="sm" hasTabularNumbers>{s.difference != null ? `Rp ${Number(s.difference).toLocaleString('id-ID')}` : '-'}</Text></TableCell>
                                                <TableCell>
                                                    <Badge variant={s.status === 'OPEN' ? 'success' : 'neutral'} label={s.status} />
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

            <Modal isOpen={showOpen} onClose={() => setShowOpen(false)} title="Buka Shift Kas" width={420}>
                <VStack gap={4}>
                    <NumberInput label="Saldo Awal Laci (Rp)" value={openingBalance} onChange={(v) => setOpeningBalance(v || 0)} min={0} hasAutoFocus />
                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowOpen(false)} />
                        <Button variant="primary" label="Buka Shift" onClick={handleOpen} />
                    </HStack>
                </VStack>
            </Modal>

            <Modal isOpen={showClose} onClose={() => setShowClose(false)} title="Tutup Shift Kas" width={420}>
                <VStack gap={4}>
                    <NumberInput label="Saldo Aktual di Laci (Rp)" value={closingBalance} onChange={(v) => setClosingBalance(v || 0)} min={0} hasAutoFocus />
                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowClose(false)} />
                        <Button variant="destructive" label="Tutup Shift" onClick={handleClose} />
                    </HStack>
                </VStack>
            </Modal>

            <Modal isOpen={showMovement} onClose={() => setShowMovement(false)} title="Catat Arus Kas" width={440}>
                <VStack gap={4}>
                    <SegmentedControl
                        label="Jenis arus kas"
                        value={movementForm.type}
                        onChange={(v) => setMovementForm({ ...movementForm, type: v })}
                        layout="fill"
                    >
                        <SegmentedControlItem value="CASH_IN" label="Kas Masuk" />
                        <SegmentedControlItem value="CASH_OUT" label="Kas Keluar" />
                    </SegmentedControl>
                    <NumberInput label="Nominal (Rp)" value={movementForm.amount} onChange={(v) => setMovementForm({ ...movementForm, amount: v || 0 })} min={1} />
                    <TextInput label="Keterangan" placeholder="Contoh: Beli es batu / Tambah kembalian" value={movementForm.reason} onChange={(v) => setMovementForm({ ...movementForm, reason: v })} />
                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowMovement(false)} />
                        <Button variant="primary" label="Simpan" isDisabled={!movementForm.amount || !movementForm.reason} onClick={handleMovement} />
                    </HStack>
                </VStack>
            </Modal>
        </VStack>
    );
};

export default CashManagement;
