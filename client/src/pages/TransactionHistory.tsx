import { useState, useEffect } from 'react';
import { Eye, Ban, RotateCcw, ReceiptText, Search, RefreshCw, Printer } from 'lucide-react';
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
                title={selectedSale ? `Rincian Struk ${selectedSale.receiptNumber}` : 'Detail Transaksi'}
                width={580}
            >
                {selectedSale && (() => {
                    const primaryPayment = selectedSale.payments?.[0];
                    const paymentMethod = primaryPayment?.method || 'CASH';
                    const paidAmount = Number(primaryPayment?.amount || selectedSale.finalPrice || 0);
                    const changeAmount = Number(primaryPayment?.change || 0);
                    const discountAmt = Number(selectedSale.discountAmount || 0);
                    const grossTotal = Number(selectedSale.totalPrice || selectedSale.finalPrice || 0);
                    const finalTotal = Number(selectedSale.finalPrice || 0);

                    return (
                        <VStack gap={4}>
                            {/* Metadata Ringkasan */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs">
                                <div className="space-y-1">
                                    <div className="text-zinc-500">Waktu Transaksi</div>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {new Date(selectedSale.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-zinc-500">Status Transaksi</div>
                                    <div>
                                        <Badge variant={STATUS_VARIANT[selectedSale.status] || 'neutral'} label={selectedSale.status} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-zinc-500">Kasir</div>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {selectedSale.user?.name || 'Kasir Utama'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-zinc-500">Pelanggan</div>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {selectedSale.customer?.name || 'Pelanggan Umum'}
                                    </div>
                                </div>
                            </div>

                            {/* Alert catatan atau alasan refund/void jika ada */}
                            {selectedSale.refundReason && (
                                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                                    <span className="font-bold">Alasan Void / Refund:</span> {selectedSale.refundReason}
                                </div>
                            )}
                            {selectedSale.notes && (
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs text-blue-800 dark:text-blue-200">
                                    <span className="font-bold">Catatan:</span> {selectedSale.notes}
                                </div>
                            )}

                            {/* Daftar Barang Belanja */}
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                                    Daftar Barang Belanja ({selectedSale.details?.length || 0} item)
                                </div>
                                <Table density="compact" dividers="rows">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHeaderCell>Produk</TableHeaderCell>
                                            <TableHeaderCell>Harga Satuan</TableHeaderCell>
                                            <TableHeaderCell>Qty</TableHeaderCell>
                                            <TableHeaderCell>Subtotal</TableHeaderCell>
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
                                                    <TableCell>
                                                        <div>
                                                            <Text size="sm" weight="medium">{d.product?.name || `Produk #${d.productId}`}</Text>
                                                            {d.variant?.name && (
                                                                <Text size="xsm" color="secondary">{d.variant.name}</Text>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Text size="sm" hasTabularNumbers color="secondary">
                                                            Rp {unitPrice.toLocaleString('id-ID')}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Text size="sm" hasTabularNumbers weight="medium">
                                                            {qty}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <Text size="sm" hasTabularNumbers weight="semibold">
                                                                Rp {itemSubtotal.toLocaleString('id-ID')}
                                                            </Text>
                                                            {itemDisc > 0 && (
                                                                <div className="text-xs text-emerald-600 font-mono tabular-nums font-medium">
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

                            {/* Ringkasan Keuangan & Pembayaran (Receipt Breakdown) */}
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                                <div className="flex justify-between items-center text-sm text-zinc-600 dark:text-zinc-400">
                                    <span>Subtotal Kotor</span>
                                    <span className="font-mono tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                                        Rp {grossTotal.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                {discountAmt > 0 && (
                                    <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                        <span>Diskon / Potongan Harga</span>
                                        <span className="font-mono tabular-nums">
                                            - Rp {discountAmt.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                )}

                                <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-1" />

                                <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">Total Akhir</span>
                                    <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                        Rp {finalTotal.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 my-1" />

                                {/* Informasi Pembayaran */}
                                <div className="space-y-1.5 pt-1 text-xs">
                                    <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                                        <span>Metode Pembayaran</span>
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                            {paymentMethod === 'CASH' ? 'Tunai (Cash)' : paymentMethod}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                                        <span>Uang Diterima / Dibayar</span>
                                        <span className="font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                                            Rp {paidAmount.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400 font-medium">
                                        <span>Kembalian</span>
                                        <span className="font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                                            Rp {changeAmount.toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    {primaryPayment?.reference && (
                                        <div className="flex justify-between items-center text-zinc-500 text-[11px]">
                                            <span>No. Referensi Transaksi</span>
                                            <span className="font-mono">{primaryPayment.reference}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Divider />

                            {/* Tombol Aksi */}
                            <HStack justify="end" gap={2} wrap="wrap">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={<Printer size={14} />}
                                    label="Cetak Struk"
                                    onClick={() => printThermalReceipt(selectedSale)}
                                />
                            </HStack>
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
