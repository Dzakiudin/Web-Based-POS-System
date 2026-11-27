import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { Selector } from '@astryxdesign/core/Selector';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '@astryxdesign/core/Table';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Pagination } from '@astryxdesign/core/Pagination';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';

interface AuditLog {
    id: number;
    action: string;
    entity: string;
    entityId: string | null;
    details: string | null;
    ipAddress: string | null;
    createdAt: string;
    user: { id: number; name: string; role: string } | null;
}

const ACTION_VARIANT: Record<string, 'success' | 'info' | 'error' | 'warning' | 'neutral'> = {
    CREATE: 'success',
    CREATE_SALE: 'success',
    UPDATE: 'info',
    DELETE: 'error',
    LOGIN: 'info',
    VOID: 'warning',
    REFUND: 'warning',
};

const renderAuditDetails = (details: string | null) => {
    if (!details || details.trim() === '' || details === '-') {
        return <Text size="xsm" color="secondary">-</Text>;
    }

    try {
        const parsed = JSON.parse(details);
        if (typeof parsed === 'object' && parsed !== null) {
            // Format transaksi penjualan / void / refund: No. Struk, Total, dan Alasan (jika ada)
            if (parsed.receiptNumber || parsed.finalPrice !== undefined) {
                return (
                    <VStack gap={0.5}>
                        {parsed.receiptNumber && (
                            <Text size="xsm" weight="semibold" style={{ color: '#09090b', letterSpacing: '-0.01em' }}>
                                {parsed.receiptNumber}
                            </Text>
                        )}
                        {parsed.finalPrice !== undefined && (
                            <Text size="2xs" color="secondary" hasTabularNumbers>
                                Total:{' '}
                                <span style={{ fontWeight: 600, color: '#059669' }}>
                                    Rp {Number(parsed.finalPrice).toLocaleString('id-ID')}
                                </span>
                            </Text>
                        )}
                        {parsed.reason && (
                            <Text size="2xs" color="secondary" maxLines={1}>
                                Alasan: <span style={{ fontWeight: 600, color: '#b91c1c' }}>{parsed.reason}</span>
                            </Text>
                        )}
                    </VStack>
                );
            }

            // Objek metadata lainnya: format key-value manusiawi
            const entries = Object.entries(parsed).filter(([, v]) => v !== '' && v !== null && v !== undefined);
            if (entries.length === 0) return <Text size="xsm" color="secondary">-</Text>;

            const formatLabel = (key: string) => {
                const map: Record<string, string> = {
                    reason: 'Alasan',
                    note: 'Catatan',
                    status: 'Status',
                    name: 'Nama',
                    price: 'Harga',
                    stock: 'Stok',
                    quantity: 'Jumlah',
                    method: 'Metode',
                    type: 'Tipe',
                    amount: 'Nominal',
                    openingbalance: 'Saldo Awal',
                    closingbalance: 'Saldo Akhir',
                    expectedbalance: 'Ekspektasi',
                    difference: 'Selisih',
                    paperwidth: 'Lebar Kertas',
                    taxrate: 'PPN (%)',
                    servicechargerate: 'Layanan (%)',
                };
                if (map[key.toLowerCase()]) return map[key.toLowerCase()];
                return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
            };

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {entries.map(([k, v]) => {
                        const isMoney = /price|total|nominal|amount|balance|difference/i.test(k) && !isNaN(Number(v));
                        const valDisplay = isMoney ? `Rp ${Number(v).toLocaleString('id-ID')}` : String(v);
                        return (
                            <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontSize: 11.5 }}>
                                <span style={{ color: '#71717a', fontWeight: 500 }}>{formatLabel(k)}:</span>
                                <span style={{ color: '#18181b', fontWeight: 600 }}>{valDisplay}</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
    } catch {
        // Jika plain text, render langsung
    }

    return (
        <Text size="xsm" color="secondary" maxLines={2}>
            {details}
        </Text>
    );
};

const AuditLogs = () => {
    const toast = useToast();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const limit = 20;

    useEffect(() => { fetchLogs(); }, [page, actionFilter, entityFilter]);

    const fetchLogs = async () => {
        try {
            const params: any = { limit, offset: (page - 1) * limit };
            if (actionFilter) params.action = actionFilter;
            if (entityFilter) params.entity = entityFilter;
            const r = await api.get('/audit-logs', { params });
            setLogs(Array.isArray(r.data?.logs) ? r.data.logs : []);
            setTotal(Number(r.data?.total) || 0);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat catatan audit');
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <VStack gap={4} width="100%">
            <PageHeader
                title="Audit Log & Jejak Aktivitas"
                subtitle="Rekam jejak seluruh aktivitas pengguna, perubahan data, dan transaksi sistem"
            />
            <div
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: isMobile ? 8 : 12,
                    width: '100%',
                }}
            >
                {isMobile && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text size="xsm" color="secondary" weight="medium">Filter Aktivitas</Text>
                        <Badge variant="neutral" label={`${total} entri`} />
                    </div>
                )}
                <div
                    style={{
                        display: isMobile ? 'grid' : 'flex',
                        gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : undefined,
                        gap: 8,
                        width: isMobile ? '100%' : 'auto',
                        minWidth: 0,
                    }}
                >
                    <div style={{ width: isMobile ? '100%' : 200, minWidth: 0 }}>
                        <Selector
                            label="Filter Aksi"
                            isLabelHidden
                            value={actionFilter}
                            onChange={(v) => { setActionFilter(v); setPage(1); }}
                            options={[
                                { value: '', label: 'Semua Aksi' },
                                { value: 'CREATE', label: 'Create' },
                                { value: 'CREATE_SALE', label: 'Create Sale' },
                                { value: 'UPDATE', label: 'Update' },
                                { value: 'DELETE', label: 'Delete' },
                                { value: 'LOGIN', label: 'Login' },
                                { value: 'VOID', label: 'Void' },
                                { value: 'REFUND', label: 'Refund' },
                            ]}
                            width="100%"
                        />
                    </div>
                    <div style={{ width: isMobile ? '100%' : 200, minWidth: 0 }}>
                        <Selector
                            label="Filter Entitas"
                            isLabelHidden
                            value={entityFilter}
                            onChange={(v) => { setEntityFilter(v); setPage(1); }}
                            options={[
                                { value: '', label: 'Semua Entitas' },
                                { value: 'Sale', label: 'Sale' },
                                { value: 'Product', label: 'Product' },
                                { value: 'Customer', label: 'Customer' },
                                { value: 'User', label: 'User' },
                                { value: 'Category', label: 'Category' },
                                { value: 'Discount', label: 'Discount' },
                                { value: 'CashSession', label: 'CashSession' },
                            ]}
                            width="100%"
                        />
                    </div>
                </div>
                {!isMobile && (
                    <div style={{ flexShrink: 0 }}>
                        <Badge variant="neutral" label={`${total} entri`} />
                    </div>
                )}
            </div>

            {logs.length > 0 ? (
                isMobile ? (
                    <VStack gap={2}>
                        {logs.map((log) => (
                            <Card key={log.id} padding={3} elevation="none">
                                <VStack gap={2}>
                                    <HStack justify="between" align="center">
                                        <HStack gap={1.5} align="center">
                                            <Text size="sm" weight="semibold">{log.user?.name || 'Sistem'}</Text>
                                            {log.user?.role && (
                                                <Badge variant="neutral" label={log.user.role} />
                                            )}
                                        </HStack>
                                        <Badge variant={ACTION_VARIANT[log.action] || 'neutral'} label={log.action} />
                                    </HStack>

                                    <HStack justify="between" align="center">
                                        <Text size="xsm" color="secondary">
                                            {log.entity}{log.entityId ? ` #${log.entityId}` : ''}
                                        </Text>
                                        <Text size="xsm" color="secondary" hasTabularNumbers>
                                            {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                        </Text>
                                    </HStack>

                                    {log.details && log.details !== '-' && (
                                        <div
                                            style={{
                                                paddingTop: 6,
                                                borderTop: '1px solid #f4f4f5',
                                                fontSize: 12,
                                            }}
                                        >
                                            {renderAuditDetails(log.details)}
                                        </div>
                                    )}
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
                                        <TableHeaderCell style={{ width: '18%', minWidth: 140 }}>Waktu</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '20%', minWidth: 160 }}>Pengguna</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '16%', minWidth: 120 }}>Aksi</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '16%', minWidth: 120 }}>Entitas</TableHeaderCell>
                                        <TableHeaderCell style={{ width: '30%', minWidth: 220 }}>Detail</TableHeaderCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <Text size="xsm" color="secondary" hasTabularNumbers>
                                                    {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                                </Text>
                                            </TableCell>
                                            <TableCell>
                                                <VStack gap={0}>
                                                    <Text size="sm" weight="medium">{log.user?.name || 'Sistem'}</Text>
                                                    {log.user?.role && <Text size="2xs" color="secondary">{log.user.role}</Text>}
                                                </VStack>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={ACTION_VARIANT[log.action] || 'neutral'} label={log.action} />
                                            </TableCell>
                                            <TableCell>
                                                <Text size="sm" color="secondary">
                                                    {log.entity}{log.entityId ? ` #${log.entityId}` : ''}
                                                </Text>
                                            </TableCell>
                                            <TableCell>
                                                {renderAuditDetails(log.details)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollableArea>
                    </Card>
                )
            ) : (
                <Card padding={0} elevation="none">
                    <VStack padding={6}>
                        <EmptyState icon={<ShieldCheck size={28} />} title="Belum ada catatan audit" isCompact />
                    </VStack>
                </Card>
            )}

            {totalPages > 1 && (
                <HStack justify="center">
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </HStack>
            )}
        </VStack>
    );
};

export default AuditLogs;
