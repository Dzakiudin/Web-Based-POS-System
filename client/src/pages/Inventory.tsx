import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Selector } from '@astryxdesign/core/Selector';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import HasPermission from '../components/HasPermission';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

interface Product {
    id: number;
    name: string;
    sku: string | null;
    stock: number;
    minStock: number;
    price: string;
    category: { name: string; color: string } | null;
}

interface StockMovement {
    id: number;
    type: string;
    quantity: number;
    reason: string | null;
    reference: string | null;
    createdAt: string;
    product: { name: string; sku: string | null } | null;
    user: { name: string } | null;
}

const TYPE_VARIANTS: Record<string, 'success' | 'error' | 'info' | 'warning' | 'neutral'> = {
    IN: 'success',
    OUT: 'error',
    ADJUSTMENT: 'info',
    SALE: 'neutral',
    REFUND: 'warning',
};

const Inventory = () => {
    const toast = useToast();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [tab, setTab] = useState<'lowstock' | 'movements'>('lowstock');
    const [lowStock, setLowStock] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [showAdjust, setShowAdjust] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [adjustForm, setAdjustForm] = useState({ productId: '', type: 'IN', quantity: 1, reason: '' });

    useEffect(() => { fetchData(); }, [tab]);

    const fetchData = async () => {
        try {
            if (tab === 'lowstock') {
                const r = await api.get('/stock-movements/low-stock');
                setLowStock(Array.isArray(r.data) ? r.data : []);
            } else {
                const r = await api.get('/stock-movements');
                setMovements(Array.isArray(r.data) ? r.data : []);
            }
            const p = await api.get('/products');
            setProducts(Array.isArray(p.data) ? p.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/stock-movements', {
                productId: Number(adjustForm.productId),
                type: adjustForm.type,
                quantity: Number(adjustForm.quantity),
                reason: adjustForm.reason,
            });
            toast.success('Stok berhasil disesuaikan');
            setShowAdjust(false);
            setAdjustForm({ productId: '', type: 'IN', quantity: 1, reason: '' });
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menyesuaikan stok');
        }
    };

    return (
        <VStack gap={4} width="100%">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 10, width: '100%' }}>
                <TabList value={tab} onChange={(v) => setTab(v as 'lowstock' | 'movements')} overflow="visible">
                    <Tab
                        value="lowstock"
                        label="Stok Rendah"
                        icon={<AlertTriangle size={15} />}
                        endContent={<Badge variant={lowStock.length > 0 ? 'warning' : 'neutral'} label={lowStock.length} />}
                    />
                    <Tab
                        value="movements"
                        label="Riwayat Pergerakan"
                        icon={<RefreshCw size={15} />}
                    />
                </TabList>

                <HasPermission permission={['stock.in_out', 'stock.opname']}>
                    <Button
                        variant="primary"
                        label="Sesuaikan Stok"
                        icon={<SlidersHorizontal size={16} />}
                        onClick={() => setShowAdjust(true)}
                        width={isMobile ? '100%' : undefined}
                    />
                </HasPermission>
            </div>

            {tab === 'lowstock' ? (
                lowStock.length > 0 ? (
                    isMobile ? (
                        <VStack gap={2}>
                            {lowStock.map((p) => (
                                <Card key={p.id} padding={3} elevation="none">
                                    <HStack justify="between" align="center">
                                        <VStack gap={0.5}>
                                            <Text size="sm" weight="semibold">{p.name}</Text>
                                            <Text size="xsm" color="secondary">{p.category?.name || 'Umum'} · {p.sku || 'No SKU'}</Text>
                                        </VStack>
                                        <HStack gap={2} align="center">
                                            <VStack align="end" gap={0}>
                                                <Text size="sm" weight="bold" hasTabularNumbers>Stok: {p.stock}</Text>
                                                <Text size="2xs" color="secondary">Min: {p.minStock}</Text>
                                            </VStack>
                                            <Badge variant={p.stock === 0 ? 'error' : 'warning'} label={p.stock === 0 ? 'Habis' : 'Menipis'} />
                                        </HStack>
                                    </HStack>
                                </Card>
                            ))}
                        </VStack>
                    ) : (
                        <Card padding={0} elevation="none">
                            <ScrollableArea label="Tabel data">
                                <Table density="balanced" dividers="rows" hasHover>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHeaderCell>Produk</TableHeaderCell>
                                            <TableHeaderCell>Kategori</TableHeaderCell>
                                            <TableHeaderCell>Stok Saat Ini</TableHeaderCell>
                                            <TableHeaderCell>Min. Stok</TableHeaderCell>
                                            <TableHeaderCell>Status</TableHeaderCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lowStock.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <VStack gap={0}>
                                                        <Text size="sm" weight="semibold">{p.name}</Text>
                                                        {p.sku && <Text size="xsm" color="secondary">{p.sku}</Text>}
                                                    </VStack>
                                                </TableCell>
                                                <TableCell><Text size="sm" color="secondary">{p.category?.name || '-'}</Text></TableCell>
                                                <TableCell><Text size="sm" weight="bold" hasTabularNumbers>{p.stock}</Text></TableCell>
                                                <TableCell><Text size="sm" color="secondary" hasTabularNumbers>{p.minStock}</Text></TableCell>
                                                <TableCell>
                                                    <Badge variant={p.stock === 0 ? 'error' : 'warning'} label={p.stock === 0 ? 'Habis' : 'Menipis'} />
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
                        <EmptyState
                            title="Semua stok aman"
                            description="Tidak ada produk dengan stok di bawah batas minimum."
                            isCompact
                        />
                    </Card>
                )
            ) : movements.length > 0 ? (
                isMobile ? (
                    <VStack gap={2}>
                        {movements.map((m) => (
                            <Card key={m.id} padding={3} elevation="none">
                                <VStack gap={1.5}>
                                    <HStack justify="between" align="center">
                                        <Text size="sm" weight="semibold">{m.product?.name || '-'}</Text>
                                        <Badge variant={TYPE_VARIANTS[m.type] || 'neutral'} label={m.type} />
                                    </HStack>
                                    <HStack justify="between" align="center">
                                        <Text size="xsm" color="secondary">
                                            {new Date(m.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} · {m.user?.name || 'Sistem'}
                                        </Text>
                                        <Text size="sm" weight="bold" hasTabularNumbers style={{ color: m.type === 'IN' || m.type === 'REFUND' ? '#16a34a' : '#dc2626' }}>
                                            {m.type === 'IN' || m.type === 'REFUND' ? `+${m.quantity}` : m.quantity}
                                        </Text>
                                    </HStack>
                                    {m.reason && (
                                        <Text size="xsm" color="secondary">Alasan: {m.reason}</Text>
                                    )}
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
                                        <TableHeaderCell>Waktu</TableHeaderCell>
                                        <TableHeaderCell>Produk</TableHeaderCell>
                                        <TableHeaderCell>Tipe</TableHeaderCell>
                                        <TableHeaderCell>Jumlah</TableHeaderCell>
                                        <TableHeaderCell>Alasan</TableHeaderCell>
                                        <TableHeaderCell>Petugas</TableHeaderCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell>
                                                <Text size="xsm" color="secondary">
                                                    {new Date(m.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                                </Text>
                                            </TableCell>
                                            <TableCell><Text size="sm" weight="medium">{m.product?.name || '-'}</Text></TableCell>
                                            <TableCell>
                                                <Badge variant={TYPE_VARIANTS[m.type] || 'neutral'} label={m.type} />
                                            </TableCell>
                                            <TableCell>
                                                <Text size="sm" weight="semibold" hasTabularNumbers>
                                                    {m.type === 'IN' || m.type === 'REFUND' ? `+${m.quantity}` : m.quantity}
                                                </Text>
                                            </TableCell>
                                            <TableCell><Text size="sm" color="secondary">{m.reason || m.reference || '-'}</Text></TableCell>
                                            <TableCell><Text size="sm" color="secondary">{m.user?.name || 'Sistem'}</Text></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollableArea>
                    </Card>
                )
            ) : (
                <Card padding={6} elevation="none">
                    <EmptyState title="Belum ada pergerakan stok" isCompact />
                </Card>
            )}

            <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title="Penyesuaian Stok">
                <form onSubmit={handleAdjust}>
                    <VStack gap={4}>
                        <Selector
                            label="Pilih Produk"
                            options={products.map((p) => ({ value: String(p.id), label: `${p.name} (Stok: ${p.stock})` }))}
                            value={adjustForm.productId}
                            onChange={(v) => setAdjustForm({ ...adjustForm, productId: v })}
                            hasSearch
                            isRequired
                        />
                        <Selector
                            label="Tipe Pergerakan"
                            options={[
                                { value: 'IN', label: 'Stok Masuk (IN)' },
                                { value: 'OUT', label: 'Stok Keluar (OUT)' },
                                { value: 'ADJUSTMENT', label: 'Opname / Penyesuaian (ADJUSTMENT)' },
                            ]}
                            value={adjustForm.type}
                            onChange={(v) => setAdjustForm({ ...adjustForm, type: v })}
                        />
                        <NumberInput
                            label="Jumlah"
                            value={adjustForm.quantity}
                            onChange={(v) => setAdjustForm({ ...adjustForm, quantity: v || 0 })}
                            min={1}
                            isIntegerOnly
                            isRequired
                        />
                        <TextInput
                            label="Catatan / Alasan"
                            placeholder="Contoh: Restock supplier"
                            value={adjustForm.reason}
                            onChange={(v) => setAdjustForm({ ...adjustForm, reason: v })}
                        />
                        <HStack justify="end" gap={2}>
                            <Button variant="secondary" label="Batal" onClick={() => setShowAdjust(false)} />
                            <Button type="submit" variant="primary" label="Simpan" />
                        </HStack>
                    </VStack>
                </form>
            </Modal>
        </VStack>
    );
};

export default Inventory;
