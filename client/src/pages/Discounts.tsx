import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Percent } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Switch } from '@astryxdesign/core/Switch';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import api from '../lib/axios';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';

interface Discount {
    id: number;
    name: string;
    type: string;
    value: string;
    code: string | null;
    minPurchase: string | null;
    maxUses: number | null;
    currentUses: number;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
}

const Discounts = () => {
    const toast = useToast();
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({
        name: '',
        type: 'PERCENTAGE',
        value: 0,
        code: '',
        minPurchase: 0,
        maxUses: 0,
        isActive: true,
        startDate: '',
        endDate: '',
    });

    useEffect(() => { fetchDiscounts(); }, []);

    const fetchDiscounts = async () => {
        try {
            const r = await api.get('/discounts');
            setDiscounts(Array.isArray(r.data) ? r.data : []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat aturan diskon');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: form.name,
            type: form.type,
            value: Number(form.value),
            isActive: form.isActive,
            code: form.code || null,
            minPurchase: form.minPurchase ? Number(form.minPurchase) : null,
            maxUses: form.maxUses ? Number(form.maxUses) : null,
            startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
            endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        };
        try {
            if (editId) {
                await api.put(`/discounts/${editId}`, payload);
                toast.success('Diskon diperbarui');
            } else {
                await api.post('/discounts', payload);
                toast.success('Diskon ditambahkan');
            }
            setShowModal(false);
            resetForm();
            fetchDiscounts();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menyimpan diskon');
        }
    };

    const handleEdit = (d: Discount) => {
        setEditId(d.id);
        setForm({
            name: d.name,
            type: d.type,
            value: Number(d.value) || 0,
            code: d.code || '',
            minPurchase: d.minPurchase ? Number(d.minPurchase) : 0,
            maxUses: d.maxUses || 0,
            isActive: d.isActive,
            startDate: d.startDate ? d.startDate.slice(0, 10) : '',
            endDate: d.endDate ? d.endDate.slice(0, 10) : '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus aturan diskon ini?')) return;
        try {
            await api.delete(`/discounts/${id}`);
            toast.success('Diskon dihapus');
            fetchDiscounts();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menghapus diskon');
        }
    };

    const resetForm = () => {
        setForm({ name: '', type: 'PERCENTAGE', value: 0, code: '', minPurchase: 0, maxUses: 0, isActive: true, startDate: '', endDate: '' });
        setEditId(null);
    };

    return (
        <VStack gap={4} width="100%">
            <PageHeader
                title="Promosi & Diskon"
                subtitle="Atur diskon harga produk, periode promo, dan syarat minimal belanja"
                badge={<Badge variant="neutral" label={`${discounts.length} Promo`} />}
                actions={
                    <Button
                        variant="primary"
                        label="Tambah Diskon"
                        icon={<Plus size={16} />}
                        onClick={() => { resetForm(); setShowModal(true); }}
                    />
                }
            />

            {discounts.length > 0 ? (
                <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
                    {discounts.map((d) => (
                        <Card key={d.id} padding={3} elevation="none" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
                            <VStack gap={3} style={{ minWidth: 0, width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', minWidth: 0 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                            {d.name}
                                        </span>
                                        {d.code && (
                                            <div style={{ marginTop: 2 }}>
                                                <Badge variant="info" label={d.code} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 'auto' }}>
                                        <IconButton variant="ghost" size="sm" label="Edit" icon={<Pencil size={15} />} onClick={() => handleEdit(d)} />
                                        <IconButton variant="ghost" size="sm" label="Hapus" icon={<Trash2 size={15} />} onClick={() => handleDelete(d.id)} />
                                    </div>
                                </div>

                                <Heading level={3} weight="bold">
                                    {d.type === 'PERCENTAGE' ? `${Number(d.value)}%` : `Rp ${Number(d.value).toLocaleString('id-ID')}`}
                                </Heading>

                                <Divider />

                                <HStack justify="between" align="center">
                                    <Badge variant={d.isActive ? 'success' : 'neutral'} label={d.isActive ? 'Aktif' : 'Nonaktif'} />
                                    <Text size="xsm" color="secondary">
                                        Terpakai: {d.currentUses}{d.maxUses ? ` / ${d.maxUses}` : ''}
                                    </Text>
                                </HStack>
                            </VStack>
                        </Card>
                    ))}
                </Grid>
            ) : (
                <EmptyState icon={<Percent size={28} />} title="Belum ada aturan diskon" description="Buat diskon persentase atau potongan harga untuk pelanggan." />
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Diskon' : 'Tambah Diskon'}>
                <form onSubmit={handleSubmit}>
                    <VStack gap={4}>
                        <TextInput label="Nama Promo" value={form.name} onChange={(v) => setForm({ ...form, name: v })} isRequired />
                        <SegmentedControl label="Tipe Diskon" value={form.type} onChange={(v) => setForm({ ...form, type: v })} layout="fill">
                            <SegmentedControlItem value="PERCENTAGE" label="Persentase (%)" />
                            <SegmentedControlItem value="FIXED" label="Nominal (Rp)" />
                        </SegmentedControl>
                        <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                            <NumberInput label="Nilai Diskon" value={form.value} onChange={(v) => setForm({ ...form, value: v || 0 })} min={0} isRequired />
                            <TextInput label="Kode Promo (Opsional)" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} />
                        </Grid>
                        <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                            <NumberInput label="Min. Belanja (Rp)" value={form.minPurchase} onChange={(v) => setForm({ ...form, minPurchase: v || 0 })} min={0} />
                            <NumberInput label="Batas Pemakaian" value={form.maxUses} onChange={(v) => setForm({ ...form, maxUses: v || 0 })} min={0} isIntegerOnly />
                        </Grid>
                        <Switch label="Status Aktif" value={form.isActive} onChange={(checked) => setForm({ ...form, isActive: checked })} />
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

export default Discounts;
