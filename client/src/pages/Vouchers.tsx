import { useState, useEffect } from 'react';
import { Plus, Trash2, Ticket } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Badge } from '@astryxdesign/core/Badge';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';

interface Voucher {
    id: number;
    code: string;
    isUsed: boolean;
    usedAt: string | null;
    expiresAt: string;
    createdAt: string;
    customer: { id: number; name: string } | null;
    discount: { id: number; name: string; type: string; value: string } | null;
}
interface Discount { id: number; name: string; type: string; value: string; scope?: string; autoApply?: boolean; }
interface Customer { id: number; name: string; }

const Vouchers = () => {
    const toast = useToast();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ code: '', customerId: '', discountId: '', expiresAt: '' });

    useEffect(() => {
        fetchVouchers();
        fetchDiscounts();
        fetchCustomers();
    }, [statusFilter]);

    const fetchVouchers = async () => {
        try {
            const r = await api.get('/vouchers', { params: statusFilter ? { status: statusFilter } : {} });
            setVouchers(Array.isArray(r.data) ? r.data : []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat daftar voucher');
        }
    };
    const fetchDiscounts = async () => {
        try {
            const r = await api.get('/discounts');
            const list = Array.isArray(r.data) ? r.data : [];
            setDiscounts(list.filter((d: Discount) => (!d.scope || d.scope === 'ORDER') && !d.autoApply));
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat aturan diskon');
        }
    };
    const fetchCustomers = async () => {
        try {
            const r = await api.get('/customers');
            setCustomers(Array.isArray(r.data) ? r.data : []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat daftar pelanggan');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/vouchers', {
                code: form.code ? form.code.trim() : null,
                customerId: form.customerId ? Number(form.customerId) : null,
                discountId: form.discountId ? Number(form.discountId) : null,
                expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
            });
            toast.success('Voucher dibuat');
            setShowCreate(false);
            setForm({ code: '', customerId: '', discountId: '', expiresAt: '' });
            fetchVouchers();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal membuat voucher');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus voucher ini?')) return;
        try {
            await api.delete(`/vouchers/${id}`);
            toast.success('Voucher dihapus');
            fetchVouchers();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menghapus voucher');
        }
    };

    return (
        <VStack gap={4} width="100%">
            <PageHeader
                title="Voucher & Kupon Belanja"
                subtitle="Kelola kode kupon diskon nominal dan persentase untuk promosi kasir"
                badge={<Badge variant="neutral" label={`${vouchers.length} Voucher`} />}
                actions={
                    !isMobile ? (
                        <Button
                            variant="primary"
                            label="Buat Voucher"
                            icon={<Plus size={16} />}
                            onClick={() => setShowCreate(true)}
                        />
                    ) : undefined
                }
            />
            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', paddingTop: 4, paddingBottom: 2 }}>
                    <div style={{ width: '100%', minWidth: 0 }}>
                        <Button
                            variant="primary"
                            label="Buat Voucher"
                            icon={<Plus size={16} />}
                            onClick={() => setShowCreate(true)}
                            width="100%"
                        />
                    </div>
                    <div style={{ width: '100%', minWidth: 0 }}>
                        <SegmentedControl
                            label="Filter status voucher"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            size="sm"
                            layout="fill"
                            style={{ width: '100%' }}
                        >
                            <SegmentedControlItem value="" label="Semua" />
                            <SegmentedControlItem value="active" label="Aktif" />
                            <SegmentedControlItem value="used" label="Terpakai" />
                            <SegmentedControlItem value="expired" label={isMobile ? 'Hangus' : 'Kedaluwarsa'} />
                        </SegmentedControl>
                    </div>
                </div>
            ) : (
                <HStack justify="between" align="center" width="100%">
                    <SegmentedControl
                        label="Filter status voucher"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        size="sm"
                    >
                        <SegmentedControlItem value="" label="Semua" />
                        <SegmentedControlItem value="active" label="Aktif" />
                        <SegmentedControlItem value="used" label="Terpakai" />
                        <SegmentedControlItem value="expired" label="Kedaluwarsa" />
                    </SegmentedControl>
                    <Button variant="primary" label="Buat Voucher" icon={<Plus size={16} />} onClick={() => setShowCreate(true)} />
                </HStack>
            )}

            {isMobile ? (
                vouchers.length > 0 ? (
                    <VStack gap={2} width="100%">
                        {vouchers.map((v) => {
                            const expired = new Date(v.expiresAt) < new Date();
                            return (
                                <Card key={v.id} padding={3} elevation="none" style={{ width: '100%', minWidth: 0 }}>
                                    <VStack gap={2}>
                                        <HStack justify="between" align="center" gap={2}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                <span
                                                    style={{
                                                        fontFamily: 'JetBrains Mono, monospace',
                                                        fontSize: 14,
                                                        fontWeight: 750,
                                                        color: '#09090b',
                                                        letterSpacing: '0.02em',
                                                    }}
                                                >
                                                    {v.code}
                                                </span>
                                                <Badge
                                                    variant={v.isUsed ? 'neutral' : expired ? 'error' : 'success'}
                                                    label={v.isUsed ? 'Terpakai' : expired ? 'Hangus' : 'Aktif'}
                                                />
                                            </div>
                                            <IconButton
                                                variant="ghost"
                                                size="md"
                                                label="Hapus voucher"
                                                icon={<Trash2 size={16} color="#dc2626" />}
                                                onClick={() => handleDelete(v.id)}
                                            />
                                        </HStack>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 8,
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                backgroundColor: '#fafafa',
                                                border: '1px solid #f4f4f5',
                                                fontSize: 12,
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: 10.5, color: '#71717a' }}>Aturan Diskon</div>
                                                <div style={{ fontWeight: 600, color: '#18181b', marginTop: 1 }}>
                                                    {v.discount ? v.discount.name : '-'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10.5, color: '#71717a' }}>Pelanggan</div>
                                                <div style={{ fontWeight: 600, color: '#18181b', marginTop: 1 }}>
                                                    {v.customer ? v.customer.name : 'Umum'}
                                                </div>
                                            </div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <div style={{ fontSize: 10.5, color: '#71717a' }}>
                                                    Berlaku sampai: <strong style={{ color: '#3f3f46' }}>{new Date(v.expiresAt).toLocaleDateString('id-ID')}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </VStack>
                                </Card>
                            );
                        })}
                    </VStack>
                ) : (
                    <Card padding={6} elevation="none">
                        <EmptyState icon={<Ticket size={28} />} title="Belum ada voucher" isCompact />
                    </Card>
                )
            ) : (
                <Card padding={0} elevation="none">
                    <ScrollableArea label="Tabel data">
                        {vouchers.length > 0 ? (
                            <Table density="balanced" dividers="rows" hasHover>
                                <TableHeader>
                                    <TableRow>
                                        <TableHeaderCell>Kode</TableHeaderCell>
                                        <TableHeaderCell>Diskon</TableHeaderCell>
                                        <TableHeaderCell>Pelanggan</TableHeaderCell>
                                        <TableHeaderCell>Berlaku Sampai</TableHeaderCell>
                                        <TableHeaderCell>Status</TableHeaderCell>
                                        <TableHeaderCell>Aksi</TableHeaderCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {vouchers.map((v) => {
                                        const expired = new Date(v.expiresAt) < new Date();
                                        return (
                                            <TableRow key={v.id}>
                                                <TableCell><Text size="sm" weight="bold">{v.code}</Text></TableCell>
                                                <TableCell><Text size="sm" color="secondary">{v.discount ? v.discount.name : '-'}</Text></TableCell>
                                                <TableCell><Text size="sm" color="secondary">{v.customer ? v.customer.name : 'Umum'}</Text></TableCell>
                                                <TableCell><Text size="xsm" color="secondary">{new Date(v.expiresAt).toLocaleDateString('id-ID')}</Text></TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={v.isUsed ? 'neutral' : expired ? 'error' : 'success'}
                                                        label={v.isUsed ? 'Terpakai' : expired ? 'Kedaluwarsa' : 'Aktif'}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton variant="ghost" size="sm" label="Hapus" icon={<Trash2 size={15} />} onClick={() => handleDelete(v.id)} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <VStack padding={6}>
                                <EmptyState icon={<Ticket size={28} />} title="Belum ada voucher" isCompact />
                            </VStack>
                        )}
                    </ScrollableArea>
                </Card>
            )}

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Buat Voucher Baru">
                <form onSubmit={handleCreate}>
                    <VStack gap={4}>
                        <TextInput label="Kode Voucher" placeholder="Contoh: PROMO2026 (kosongkan untuk auto-generate)" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} />
                        <Selector
                            label="Aturan Diskon"
                            options={[{ value: '', label: 'Pilih Diskon' }, ...discounts.map((d) => ({ value: String(d.id), label: d.name }))]}
                            value={form.discountId}
                            onChange={(v) => setForm({ ...form, discountId: v })}
                        />
                        <Selector
                            label="Pelanggan (Opsional)"
                            options={[{ value: '', label: 'Semua Pelanggan' }, ...customers.map((c) => ({ value: String(c.id), label: c.name }))]}
                            value={form.customerId}
                            onChange={(v) => setForm({ ...form, customerId: v })}
                            hasSearch
                        />
                        <DateInput
                            label="Tanggal Kedaluwarsa"
                            value={(form.expiresAt || undefined) as any}
                            onChange={(v) => setForm({ ...form, expiresAt: v || '' })}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
                            <Button variant="secondary" label="Batal" width={isMobile ? '100%' : undefined} onClick={() => setShowCreate(false)} />
                            <Button type="submit" variant="primary" label="Simpan Voucher" width={isMobile ? '100%' : undefined} />
                        </div>
                    </VStack>
                </form>
            </Modal>
        </VStack>
    );
};

export default Vouchers;
