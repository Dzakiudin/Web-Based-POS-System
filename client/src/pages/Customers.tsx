import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Mail, Phone, MapPin, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import Modal from '../components/Modal';
import HasPermission from '../components/HasPermission';
import { useToast } from '../components/Toast';

interface Customer {
    id: number;
    name: string;
    email: string | null;
    address: string | null;
    phone: string | null;
    loyaltyPoints: number;
    membershipTier: string;
    totalSpent: string;
    createdAt: string;
    _count?: { sales: number };
}

const TIER_VARIANT: Record<string, 'neutral' | 'info' | 'warning' | 'success'> = {
    BRONZE: 'neutral',
    SILVER: 'info',
    GOLD: 'warning',
    PLATINUM: 'success',
};

const Customers = () => {
    const toast = useToast();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async () => {
        try {
            const r = await api.get('/customers');
            setCustomers(Array.isArray(r.data) ? r.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                await api.put(`/customers/${editId}`, form);
                toast.success('Data pelanggan diperbarui');
            } else {
                await api.post('/customers', form);
                toast.success('Pelanggan ditambahkan');
            }
            setShowModal(false);
            resetForm();
            fetchCustomers();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menyimpan pelanggan');
        }
    };

    const handleEdit = (c: Customer) => {
        setEditId(c.id);
        setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus pelanggan ini?')) return;
        try {
            await api.delete(`/customers/${id}`);
            toast.success('Pelanggan dihapus');
            fetchCustomers();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menghapus pelanggan');
        }
    };

    const resetForm = () => {
        setForm({ name: '', email: '', phone: '', address: '' });
        setEditId(null);
    };

    const filtered = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.phone && c.phone.includes(search)) ||
            (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <VStack gap={4} width="100%">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 10, width: '100%' }}>
                <div style={{ flex: 1, minWidth: 0, maxWidth: isMobile ? '100%' : 360 }}>
                    <TextInput
                        label="Cari pelanggan"
                        isLabelHidden
                        type="search"
                        placeholder="Cari nama, telepon, atau email..."
                        value={search}
                        onChange={(v) => setSearch(v)}
                        startIcon={<Search size={16} />}
                        hasClear
                        width="100%"
                    />
                </div>
                <HasPermission permission={['customer.manage', 'customer.create_basic']}>
                    <Button
                        variant="primary"
                        label="Tambah Pelanggan"
                        icon={<Plus size={16} />}
                        onClick={() => { resetForm(); setShowModal(true); }}
                        width={isMobile ? '100%' : undefined}
                    />
                </HasPermission>
            </div>

            {filtered.length > 0 ? (
                <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
                    {filtered.map((customer) => (
                        <Card key={customer.id} padding={3} elevation="none" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
                            <VStack gap={3} style={{ minWidth: 0, width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                                        <Avatar name={customer.name} size="md" />
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                                {customer.name}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                <Badge
                                                    variant={TIER_VARIANT[customer.membershipTier] || 'neutral'}
                                                    label={customer.membershipTier || 'BRONZE'}
                                                />
                                                <span style={{ fontSize: 11, color: '#71717a' }}>{customer.loyaltyPoints || 0} poin</span>
                                            </div>
                                        </div>
                                    </div>

                                    <HasPermission permission="customer.manage">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 'auto' }}>
                                            <IconButton variant="ghost" size="sm" label="Edit" icon={<Pencil size={15} />} onClick={() => handleEdit(customer)} />
                                            <IconButton variant="ghost" size="sm" label="Hapus" icon={<Trash2 size={15} />} onClick={() => handleDelete(customer.id)} />
                                        </div>
                                    </HasPermission>
                                </div>

                                <VStack gap={1}>
                                    {customer.phone && (
                                        <HStack gap={1.5} align="center">
                                            <Phone size={13} />
                                            <Text size="xsm" color="secondary">{customer.phone}</Text>
                                        </HStack>
                                    )}
                                    {customer.email && (
                                        <HStack gap={1.5} align="center">
                                            <Mail size={13} />
                                            <Text size="xsm" color="secondary">{customer.email}</Text>
                                        </HStack>
                                    )}
                                    {customer.address && (
                                        <HStack gap={1.5} align="center">
                                            <MapPin size={13} />
                                            <Text size="xsm" color="secondary" maxLines={1}>{customer.address}</Text>
                                        </HStack>
                                    )}
                                </VStack>

                                <Divider />

                                <HStack justify="between" align="center">
                                    <HStack gap={1} align="center">
                                        <ShoppingBag size={14} />
                                        <Text size="xsm" color="secondary">{customer._count?.sales ?? 0} transaksi</Text>
                                    </HStack>
                                    <HStack gap={1} align="center">
                                        <TrendingUp size={14} />
                                        <Text size="xsm" weight="semibold" hasTabularNumbers>
                                            Rp {Number(customer.totalSpent || 0).toLocaleString('id-ID')}
                                        </Text>
                                    </HStack>
                                </HStack>
                            </VStack>
                        </Card>
                    ))}
                </Grid>
            ) : (
                <EmptyState
                    icon={<Users size={28} />}
                    title="Belum ada pelanggan"
                    description="Tambahkan pelanggan untuk mencatat riwayat belanja dan poin loyalitas."
                />
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}>
                <form onSubmit={handleSubmit}>
                    <VStack gap={4}>
                        <TextInput label="Nama Lengkap" value={form.name} onChange={(v) => setForm({ ...form, name: v })} isRequired />
                        <TextInput label="No. Telepon" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                        <TextInput label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                        <TextInput label="Alamat" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                        <HStack justify="end" gap={2}>
                            <Button variant="secondary" label="Batal" onClick={() => setShowModal(false)} />
                            <Button type="submit" variant="primary" label={editId ? 'Simpan Perubahan' : 'Simpan'} />
                        </HStack>
                    </VStack>
                </form>
            </Modal>
        </VStack>
    );
};

export default Customers;
