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

const AuditLogs = () => {
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
        } catch (e) {
            console.error(e);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <VStack gap={4} width="100%">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 10, width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, flex: 1, width: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                <div style={{ alignSelf: isMobile ? 'flex-end' : 'auto' }}>
                    <Badge variant="neutral" label={`${total} entri`} />
                </div>
            </div>

            <Card padding={0} elevation="none">
                <ScrollableArea label="Tabel data">
                    {logs.length > 0 ? (
                        <Table density="balanced" dividers="rows" hasHover>
                            <TableHeader>
                                <TableRow>
                                    <TableHeaderCell>Waktu</TableHeaderCell>
                                    <TableHeaderCell>Pengguna</TableHeaderCell>
                                    <TableHeaderCell>Aksi</TableHeaderCell>
                                    <TableHeaderCell>Entitas</TableHeaderCell>
                                    <TableHeaderCell>Detail</TableHeaderCell>
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
                                            <Text size="xsm" color="secondary" maxLines={2}>{log.details || '-'}</Text>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <VStack padding={6}>
                            <EmptyState icon={<ShieldCheck size={28} />} title="Belum ada catatan audit" isCompact />
                        </VStack>
                    )}
                </ScrollableArea>
            </Card>

            {totalPages > 1 && (
                <HStack justify="center">
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </HStack>
            )}
        </VStack>
    );
};

export default AuditLogs;
