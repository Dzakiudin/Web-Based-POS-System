import { useState, useEffect } from 'react';
import { Eye, Ban, RotateCcw, ReceiptText, Search, RefreshCw, Printer, Clock, User, Tag, Banknote, QrCode, CreditCard, ArrowRightLeft, Receipt } from 'lucide-react';
import { printThermalReceipt } from '../lib/thermalPrinter';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Badge } from '@astryxdesign/core/Badge';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Divider } from '@astryxdesign/core/Divider';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import Modal from '../components/Modal';
import HasPermission from '../components/HasPermission';
import { useToast } from '../components/Toast';

interface Sale {
    id: number;
    receiptNumber: string;
    date: string;
    totalPrice: string;
    discountAmount: string;
    finalPrice: string;
    status: string;
    notes: string | null;
    refundReason?: string | null;
    customer: { name: string } | null;
    user: { name: string } | null;
    payments: { method: string; amount: string; change: string; reference?: string | null }[];
    _count?: { details: number };
}

const STATUS_VARIANT: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = {
    COMPLETED: 'success',
    VOIDED: 'error',
    REFUNDED: 'warning',
};

const TransactionHistory = () => {
    const toast = useToast();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [sales, setSales] = useState<Sale[]>([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSale, setSelectedSale] = useState<any>(null);
    const [actionModal, setActionModal] = useState<{ id: number; type: 'void' | 'refund' } | null>(null);
    const [reason, setReason] = useState('');

    useEffect(() => { fetchSales(); }, [statusFilter]);

    const fetchSales = async () => {
        setIsLoading(true);
        try {
            const params: any = { limit: 100 };
            if (statusFilter) params.status = statusFilter;
            const r = await api.get('/sales', { params });
            const raw = r.data;
            setSales(Array.isArray(raw) ? raw : (raw.sales || []));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSales = sales.filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (s.receiptNumber && s.receiptNumber.toLowerCase().includes(q)) ||
            (s.customer?.name && s.customer.name.toLowerCase().includes(q)) ||
            (s.user?.name && s.user.name.toLowerCase().includes(q))
        );
    });

    const viewDetail = async (id: number) => {
        try {
            const r = await api.get(`/sales/${id}`);
            setSelectedSale(r.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleVoidOrRefund = async () => {
        if (!actionModal || !reason.trim()) return;
        try {
            await api.post(`/sales/${actionModal.id}/${actionModal.type}`, { reason });
            toast.success(actionModal.type === 'void' ? 'Transaksi di-void' : 'Refund berhasil diproses');
            setActionModal(null);
            setReason('');
            fetchSales();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal memproses aksi');
        }
    };

    return (
        <VStack gap={4} width="100%">
            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', paddingTop: 6, paddingBottom: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text size="sm" color="secondary" weight="medium">Total riwayat</Text>
                            <Badge variant="neutral" label={`${filteredSales.length} transaksi`} />
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />}
                            label="Segarkan"
                            onClick={fetchSales}
                            isDisabled={isLoading}
                        />
                    </div>
                    <TextInput
                        label="Cari transaksi"
                        isLabelHidden
                        placeholder="Cari No. Struk atau Pelanggan..."
                        value={searchQuery}
                        onChange={(v) => setSearchQuery(v)}
                        startIcon={<Search size={14} />}
                        size="sm"
                    />
                    <div style={{ width: '100%', minWidth: 0 }}>
                        <SegmentedControl
                            label="Filter status transaksi"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            size="sm"
                            layout="fill"
                            style={{ width: '100%' }}
                        >
                            <SegmentedControlItem value="" label="Semua" />
                            <SegmentedControlItem value="COMPLETED" label="Selesai" />
                            <SegmentedControlItem value="VOIDED" label="Void" />
                            <SegmentedControlItem value="REFUNDED" label="Refund" />
                        </SegmentedControl>
                    </div>
                </div>
            ) : (
                <VStack gap={3} width="100%">
                    <HStack justify="between" align="center" width="100%">
                        <HStack gap={2} align="center">
                            <Text size="sm" color="secondary">Total riwayat</Text>
                            <Badge variant="neutral" label={`${filteredSales.length} transaksi`} />
                        </HStack>
                        <HStack gap={2} align="center">
                            <div style={{ width: 260 }}>
                                <TextInput
                                    label="Cari transaksi"
                                    isLabelHidden
                                    placeholder="Cari No. Struk / Pelanggan..."
                                    value={searchQuery}
                                    onChange={(v) => setSearchQuery(v)}
                                    startIcon={<Search size={14} />}
                                    size="sm"
                                />
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />}
                                label="Segarkan"
                                onClick={fetchSales}
                                isDisabled={isLoading}
                            />
                            <SegmentedControl
                                label="Filter status transaksi"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                size="sm"
                            >
                                <SegmentedControlItem value="" label="Semua" />
                                <SegmentedControlItem value="COMPLETED" label="Selesai" />
                                <SegmentedControlItem value="VOIDED" label="Void" />
                                <SegmentedControlItem value="REFUNDED" label="Refund" />
                            </SegmentedControl>
                        </HStack>
                    </HStack>
                </VStack>
            )}

            {filteredSales.length > 0 ? (
                isMobile ? (
                    <VStack gap={3}>
                        {filteredSales.map((s) => (
                            <Card key={s.id} padding={3} elevation="none">
                                <VStack gap={2}>
                                    <HStack justify="between" align="center">
                                        <HStack gap={1.5} align="center">
                                            <ReceiptText size={16} />
                                            <Text size="sm" weight="bold">{s.receiptNumber}</Text>
                                        </HStack>
                                        <Badge variant={STATUS_VARIANT[s.status] || 'neutral'} label={s.status} />
                                    </HStack>
                                    <HStack justify="between" align="center">
                                        <Text size="xsm" color="secondary">
                                            {new Date(s.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} · {s.user?.name || 'Kasir'}
                                        </Text>
                                        <Text size="xsm" color="secondary">Pelanggan: {s.customer?.name || 'Umum'}</Text>
                                    </HStack>
                                    <Divider />
                                    <HStack justify="between" align="center">
                                        <Text size="base" weight="bold" hasTabularNumbers>
                                            Rp {Number(s.finalPrice || 0).toLocaleString('id-ID')}
                                        </Text>
                                        <HStack gap={1}>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                label="Detail"
                                                icon={<Eye size={14} />}
                                                onClick={() => viewDetail(s.id)}
                                            />
                                            {s.status === 'COMPLETED' && (
                                                <>
                                                    <HasPermission permission="void.transaction">
                                                        <IconButton
                                                            variant="ghost"
                                                            size="sm"
                                                            label="Void"
                                                            icon={<Ban size={15} />}
                                                            onClick={() => setActionModal({ id: s.id, type: 'void' })}
                                                        />
                                                    </HasPermission>
                                                    <HasPermission permission="refund.process">
                                                        <IconButton
                                                            variant="ghost"
                                                            size="sm"
                                                            label="Refund"
                                                            icon={<RotateCcw size={15} />}
                                                            onClick={() => setActionModal({ id: s.id, type: 'refund' })}
                                                        />
                                                    </HasPermission>
                                                </>
                                            )}
                                        </HStack>
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
                                        <TableHeaderCell style={{ width: '22%', minWidth: 170 }}>No. Struk</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '16%', minWidth: 140 }}>Tanggal</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '15%', minWidth: 130 }}>Kasir</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '15%', minWidth: 130 }}>Pelanggan</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '14%', minWidth: 120, textAlign: 'right' }}>Total</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '10%', minWidth: 110, textAlign: 'center' }}>Status</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '8%', minWidth: 90, textAlign: 'center' }}>Aksi</TableHeaderCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSales.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell style={{ width: '22%', minWidth: 170 }}>
                                                <Text size="sm" weight="semibold">{s.receiptNumber}</Text>
                                            </TableCell>
                                            <TableCell style={{ width: '16%', minWidth: 140 }}>
                                                <Text size="xsm" color="secondary" hasTabularNumbers>
                                                    {new Date(s.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                                </Text>
                                            </TableCell>
                                            <TableCell style={{ width: '15%', minWidth: 130 }}>
                                                <Text size="sm">{s.user?.name || '-'}</Text>
                                            </TableCell>
                                            <TableCell style={{ width: '15%', minWidth: 130 }}>
                                                <Text size="sm" color="secondary">{s.customer?.name || 'Umum'}</Text>
                                            </TableCell>
                                            <TableCell style={{ width: '14%', minWidth: 120, textAlign: 'right' }}>
                                                <Text size="sm" weight="bold" hasTabularNumbers>Rp {Number(s.finalPrice || 0).toLocaleString('id-ID')}</Text>
                                            </TableCell>
                                            <TableCell style={{ width: '10%', minWidth: 110, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <Badge variant={STATUS_VARIANT[s.status] || 'neutral'} label={s.status} />
                                                </div>
                                            </TableCell>
                                            <TableCell style={{ width: '8%', minWidth: 90, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <HStack gap={1} justify="center">
                                                        <IconButton variant="ghost" size="sm" label="Lihat detail" icon={<Eye size={15} />} onClick={() => viewDetail(s.id)} />
                                                        {s.status === 'COMPLETED' && (
                                                            <>
                                                                <HasPermission permission="void.transaction">
                                                                    <IconButton variant="ghost" size="sm" label="Void" icon={<Ban size={15} />} onClick={() => setActionModal({ id: s.id, type: 'void' })} />
                                                                </HasPermission>
                                                                <HasPermission permission="refund.process">
                                                                    <IconButton variant="ghost" size="sm" label="Refund" icon={<RotateCcw size={15} />} onClick={() => setActionModal({ id: s.id, type: 'refund' })} />
                                                                </HasPermission>
                                                            </>
                                                        )}
                                                    </HStack>
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
                    <EmptyState icon={<ReceiptText size={28} />} title="Belum ada riwayat transaksi" isCompact />
                </Card>
            )}

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedSale}
                onClose={() => setSelectedSale(null)}
                title={selectedSale ? `Rincian Struk ${selectedSale.receiptNumber}` : 'Detail Transaksi'}
                width={560}
            >
                {selectedSale && (() => {
                    const primaryPayment = selectedSale.payments?.[0];
                    const paymentMethod = primaryPayment?.method || 'CASH';
                    const paidAmount = Number(primaryPayment?.amount || selectedSale.finalPrice || 0);
                    const changeAmount = Number(primaryPayment?.change || 0);
                    const discountAmt = Number(selectedSale.discountAmount || 0);
                    const grossTotal = Number(selectedSale.totalPrice || selectedSale.finalPrice || 0);
                    const finalTotal = Number(selectedSale.finalPrice || 0);

                    const getMethodBadge = (m: string) => {
                        switch (m) {
                            case 'CASH':
                                return { label: 'Tunai (Cash)', icon: <Banknote size={13} />, bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
                            case 'QRIS':
                                return { label: 'QRIS', icon: <QrCode size={13} />, bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
                            case 'CARD':
                                return { label: 'Kartu / EDC', icon: <CreditCard size={13} />, bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
                            case 'TRANSFER':
                                return { label: 'Transfer Bank', icon: <ArrowRightLeft size={13} />, bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
                            default:
                                return { label: m, icon: <Receipt size={13} />, bg: '#f4f4f5', color: '#3f3f46', border: '#e4e4e7' };
                        }
                    };
                    const methodInfo = getMethodBadge(paymentMethod);

                    return (
                        <VStack gap={4} width="100%">
                            {/* Metadata Ringkasan Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 10,
                                padding: 14,
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 12,
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Waktu Transaksi</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={13} color="#64748b" />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                            {new Date(selectedSale.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status Transaksi</span>
                                    <div>
                                        <Badge variant={STATUS_VARIANT[selectedSale.status] || 'neutral'} label={selectedSale.status} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kasir</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <User size={13} color="#64748b" />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                            {selectedSale.user?.name || 'Kasir Utama'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pelanggan</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                                        {selectedSale.customer?.name || 'Pelanggan Umum'}
                                    </span>
                                </div>
                            </div>

                            {/* Alert catatan atau alasan refund/void jika ada */}
                            {selectedSale.refundReason && (
                                <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#92400e' }}>
                                    <strong>Alasan Void / Refund:</strong> {selectedSale.refundReason}
                                </div>
                            )}
                            {selectedSale.notes && (
                                <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, fontSize: 12, color: '#1e40af' }}>
                                    <strong>Catatan:</strong> {selectedSale.notes}
                                </div>
                            )}

                            {/* Daftar Barang Belanja */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                        Daftar Barang Belanja ({selectedSale.details?.length || 0} item)
                                    </span>
                                </div>

                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                                    <Table density="compact" dividers="rows" style={{ width: '100%', tableLayout: 'fixed' }}>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHeaderCell style={{ width: '44%' }}>Produk</TableHeaderCell>
                                                <TableHeaderCell style={{ width: '24%', textAlign: 'right' }}>Harga Satuan</TableHeaderCell>
                                                <TableHeaderCell style={{ width: '12%', textAlign: 'center' }}>Qty</TableHeaderCell>
                                                <TableHeaderCell style={{ width: '20%', textAlign: 'right' }}>Subtotal</TableHeaderCell>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(selectedSale.details || []).map((d: any) => {
                                                const qty = Number(d.quantity || 1);
                                                const unitPrice = Number(d.unitPrice || (d.subtotal ? Number(d.subtotal) / qty : 0));
                                                const itemSubtotal = Number(d.subtotal || unitPrice * qty);
                                                const itemDisc = Number(d.discountAmount || 0);

                                                return (
                                                    <TableRow key={d.id}>
                                                        <TableCell style={{ width: '44%', wordBreak: 'break-word' }}>
                                                            <div>
                                                                <Text size="sm" weight="medium">{d.product?.name || `Produk #${d.productId}`}</Text>
                                                                {d.variant?.name && (
                                                                    <Text size="xsm" color="secondary">{d.variant.name}</Text>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell style={{ width: '24%', textAlign: 'right' }}>
                                                            <span style={{ fontFamily: 'Inter, sans-serif', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: '#64748b' }}>
                                                                Rp {unitPrice.toLocaleString('id-ID')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell style={{ width: '12%', textAlign: 'center' }}>
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '1px 8px',
                                                                backgroundColor: '#f1f5f9',
                                                                borderRadius: 6,
                                                                fontWeight: 700,
                                                                fontSize: 12,
                                                                color: '#334155'
                                                            }}>
                                                                {qty}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell style={{ width: '20%', textAlign: 'right' }}>
                                                            <div>
                                                                <span style={{ fontFamily: 'Inter, sans-serif', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                                                                    Rp {itemSubtotal.toLocaleString('id-ID')}
                                                                </span>
                                                                {itemDisc > 0 && (
                                                                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                                                                        -Rp {itemDisc.toLocaleString('id-ID')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Ringkasan Finansial Struk (Receipt Breakdown Box) */}
                            <div style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 12,
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}>
                                {/* Subtotal Kotor */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Subtotal Kotor</span>
                                    <span style={{ fontFamily: 'Inter, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                                        Rp {grossTotal.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                {/* Diskon / Potongan Harga */}
                                {discountAmt > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#059669', fontWeight: 600 }}>
                                            <Tag size={13} />
                                            <span>Diskon / Potongan Harga</span>
                                        </span>
                                        <span style={{ fontFamily: 'Inter, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 14, color: '#059669' }}>
                                            - Rp {discountAmt.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                )}

                                {/* Dashed Divider */}
                                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />

                                {/* Total Akhir */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>Total Akhir</span>
                                    <span style={{ fontFamily: 'Inter, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: 18, color: '#059669', letterSpacing: '-0.02em' }}>
                                        Rp {finalTotal.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                {/* Dashed Divider */}
                                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '4px 0' }} />

                                {/* Informasi Pembayaran & Kembalian */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 2 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Metode Pembayaran</span>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            padding: '3px 9px',
                                            backgroundColor: methodInfo.bg,
                                            color: methodInfo.color,
                                            border: `1px solid ${methodInfo.border}`,
                                            borderRadius: 9999,
                                            fontSize: 12,
                                            fontWeight: 700,
                                        }}>
                                            {methodInfo.icon}
                                            {methodInfo.label}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Uang Diterima / Dibayar</span>
                                        <span style={{ fontFamily: 'Inter, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                                            Rp {paidAmount.toLocaleString('id-ID')}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Kembalian</span>
                                        <span style={{ fontFamily: 'Inter, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 14, color: changeAmount > 0 ? '#059669' : '#64748b' }}>
                                            Rp {changeAmount.toLocaleString('id-ID')}
                                        </span>
                                    </div>

                                    {primaryPayment?.reference && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>No. Referensi Transaksi</span>
                                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{primaryPayment.reference}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Divider />

                            {/* Tombol Aksi */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 6 }}>
                                <button
                                    type="button"
                                    onClick={() => printThermalReceipt(selectedSale)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '9px 18px',
                                        backgroundColor: '#18181b',
                                        color: '#ffffff',
                                        border: '1px solid #27272a',
                                        borderRadius: 10,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                        transition: 'all 150ms ease',
                                    }}
                                >
                                    <Printer size={15} color="#34d399" />
                                    <span>Cetak Struk Thermal</span>
                                </button>
                            </div>
                        </VStack>
                    );
                })()}
            </Modal>

            {/* Void / Refund Modal */}
            <Modal
                isOpen={!!actionModal}
                onClose={() => { setActionModal(null); setReason(''); }}
                title={actionModal?.type === 'void' ? 'Void Transaksi' : 'Refund Transaksi'}
                width={420}
            >
                <VStack gap={4}>
                    <TextInput
                        label="Alasan"
                        placeholder="Masukkan alasan pembatalan / refund"
                        value={reason}
                        onChange={(v) => setReason(v)}
                        isRequired
                        hasAutoFocus
                    />
                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => { setActionModal(null); setReason(''); }} />
                        <Button variant="destructive" label="Konfirmasi" isDisabled={!reason.trim()} onClick={handleVoidOrRefund} />
                    </HStack>
                </VStack>
            </Modal>
        </VStack>
    );
};

export default TransactionHistory;
