import { useState, useEffect } from 'react';
import { Eye, Ban, RotateCcw, ReceiptText, Search, RefreshCw, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { printThermalReceipt } from '../lib/thermalPrinter';
import { downloadOrShareFile } from '../lib/fileHelper';
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

    const downloadReceiptPDF = async (sale: any) => {
        if (!sale) return;
        const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
        doc.setFontSize(12);
        doc.text('POS SYSTEM STORE', 40, 10, { align: 'center' });
        doc.setFontSize(8);
        doc.text(`Struk: ${sale.receiptNumber || '-'}`, 5, 18);
        doc.text(`Tanggal: ${new Date(sale.date).toLocaleString('id-ID')}`, 5, 23);
        doc.text(`Kasir: ${sale.user?.name || 'Kasir'}`, 5, 28);

        autoTable(doc, {
            startY: 33,
            margin: { left: 5, right: 5 },
            head: [['Item', 'Qty', 'Total']],
            body: (sale.details || []).map((d: any) => [
                d.product?.name || `Produk #${d.productId}`,
                String(d.quantity),
                `Rp ${Number(d.subtotal || 0).toLocaleString('id-ID')}`,
            ]),
            styles: { fontSize: 7, cellPadding: 1.5 },
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 65;
        doc.setFontSize(9);
        doc.text(`Total: Rp ${Number(sale.finalPrice || 0).toLocaleString('id-ID')}`, 5, finalY + 8);
        const method = sale.payments?.[0]?.method || 'TUNAI';
        const paid = sale.payments?.[0]?.amount || sale.finalPrice;
        const change = sale.payments?.[0]?.change || 0;
        doc.text(`Bayar (${method}): Rp ${Number(paid).toLocaleString('id-ID')}`, 5, finalY + 13);
        doc.text(`Kembali: Rp ${Number(change).toLocaleString('id-ID')}`, 5, finalY + 18);

        const blob = doc.output('blob');
        await downloadOrShareFile(blob, `struk-${sale.receiptNumber || 'pos'}.pdf`, 'application/pdf');
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
                            <Table density="balanced" dividers="rows" hasHover>
                                <TableHeader>
                                    <TableRow>
                                        <TableHeaderCell>No. Struk</TableHeaderCell>
                                        <TableHeaderCell>Tanggal</TableHeaderCell>
                                        <TableHeaderCell>Kasir</TableHeaderCell>
                                        <TableHeaderCell>Pelanggan</TableHeaderCell>
                                        <TableHeaderCell>Total</TableHeaderCell>
                                        <TableHeaderCell>Status</TableHeaderCell>
                                        <TableHeaderCell>Aksi</TableHeaderCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSales.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell><Text size="sm" weight="semibold">{s.receiptNumber}</Text></TableCell>
                                            <TableCell>
                                                <Text size="xsm" color="secondary" hasTabularNumbers>
                                                    {new Date(s.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                                </Text>
                                            </TableCell>
                                            <TableCell><Text size="sm">{s.user?.name || '-'}</Text></TableCell>
                                            <TableCell><Text size="sm" color="secondary">{s.customer?.name || 'Umum'}</Text></TableCell>
                                            <TableCell><Text size="sm" weight="bold" hasTabularNumbers>Rp {Number(s.finalPrice || 0).toLocaleString('id-ID')}</Text></TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[s.status] || 'neutral'} label={s.status} />
                                            </TableCell>
                                            <TableCell>
                                                <HStack gap={1}>
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
                title={selectedSale ? `Struk ${selectedSale.receiptNumber}` : 'Detail Transaksi'}
                width={560}
            >
                {selectedSale && (
                    <VStack gap={3}>
                        <HStack justify="between">
                            <Text size="sm" color="secondary">Tanggal</Text>
                            <Text size="sm">{new Date(selectedSale.date).toLocaleString('id-ID')}</Text>
                        </HStack>
                        <HStack justify="between">
                            <Text size="sm" color="secondary">Status</Text>
                            <Badge variant={STATUS_VARIANT[selectedSale.status] || 'neutral'} label={selectedSale.status} />
                        </HStack>
                        <Divider />
                        <Table density="compact" dividers="rows">
                            <TableHeader>
                                <TableRow>
                                    <TableHeaderCell>Item</TableHeaderCell>
                                    <TableHeaderCell>Qty</TableHeaderCell>
                                    <TableHeaderCell>Subtotal</TableHeaderCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(selectedSale.details || []).map((d: any) => (
                                    <TableRow key={d.id}>
                                        <TableCell><Text size="sm">{d.product?.name || `Produk #${d.productId}`}</Text></TableCell>
                                        <TableCell><Text size="sm" hasTabularNumbers>{d.quantity}</Text></TableCell>
                                        <TableCell><Text size="sm" hasTabularNumbers>Rp {Number(d.subtotal || 0).toLocaleString('id-ID')}</Text></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Divider />
                        <HStack justify="between">
                            <Text size="base" weight="bold">Total Bayar</Text>
                            <Text size="base" weight="bold" hasTabularNumbers>Rp {Number(selectedSale.finalPrice || 0).toLocaleString('id-ID')}</Text>
                        </HStack>
                        <Divider />
                        <HStack justify="end" gap={2} wrap="wrap">
                            <Button
                                size="sm"
                                variant="secondary"
                                icon={<Printer size={14} />}
                                label="Cetak Struk"
                                onClick={() => printThermalReceipt(selectedSale)}
                            />
                            <Button
                                size="sm"
                                variant="secondary"
                                icon={<Printer size={14} />}
                                label="Download PDF"
                                onClick={() => downloadReceiptPDF(selectedSale)}
                            />
                        </HStack>
                    </VStack>
                )}
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
