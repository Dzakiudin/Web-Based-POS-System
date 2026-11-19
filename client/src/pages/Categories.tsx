import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag, Package } from 'lucide-react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Badge } from '@astryxdesign/core/Badge';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import api from '../lib/axios';
import Modal from '../components/Modal';
import HasPermission from '../components/HasPermission';
import { useToast } from '../components/Toast';

interface Category {
    id: number;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    isActive: boolean;
    _count?: { products: number };
}

const COLOR_OPTIONS = ['#18181b', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];

const Categories = () => {
    const toast = useToast();
    const [categories, setCategories] = useState<Category[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', description: '', color: '#18181b' });

    useEffect(() => { fetchCategories(); }, []);

    const fetchCategories = async () => {
        try {
            const r = await api.get('/categories');
            setCategories(Array.isArray(r.data) ? r.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                await api.put(`/categories/${editId}`, form);
                toast.success('Kategori berhasil diperbarui');
            } else {
                await api.post('/categories', form);
                toast.success('Kategori berhasil ditambahkan');
            }
            setShowModal(false);
            resetForm();
            fetchCategories();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menyimpan kategori');
        }
    };

    const handleEdit = (cat: Category) => {
        setEditId(cat.id);
        setForm({ name: cat.name, description: cat.description || '', color: cat.color || '#18181b' });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus kategori ini?')) return;
        try {
            await api.delete(`/categories/${id}`);
            toast.success('Kategori dihapus');
            fetchCategories();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menghapus kategori');
        }
    };

    const resetForm = () => {
        setForm({ name: '', description: '', color: '#18181b' });
        setEditId(null);
    };

    return (
        <VStack gap={4} width="100%">
            <HStack justify="between" align="center" wrap="wrap" gap={3}>
                <HStack gap={2} align="center">
                    <Text size="sm" color="secondary">Total kategori</Text>
                    <Badge variant="neutral" label={categories.length} />
                </HStack>
                <HasPermission permission="category.manage">
                    <Button
                        variant="primary"
                        label="Tambah Kategori"
                        icon={<Plus size={16} />}
                        onClick={() => { resetForm(); setShowModal(true); }}
                    />
                </HasPermission>
            </HStack>

            {categories.length > 0 ? (
                <Grid columns={{ minWidth: 260, max: 3 }} gap={3}>
                    {categories.map((cat) => (
                        <Card key={cat.id} padding={3} elevation="none" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
                            <VStack gap={3} style={{ minWidth: 0, width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: 10,
                                                backgroundColor: `${cat.color || '#18181b'}18`,
                                                color: cat.color || '#18181b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Tag size={18} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                                {cat.name}
                                            </span>
                                            {cat.description && (
                                                <span style={{ fontSize: 12, color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                                    {cat.description}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <HasPermission permission="category.manage">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 'auto' }}>
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                label="Edit kategori"
                                                icon={<Pencil size={15} />}
                                                onClick={() => handleEdit(cat)}
                                            />
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                label="Hapus kategori"
                                                icon={<Trash2 size={15} />}
                                                onClick={() => handleDelete(cat.id)}
                                            />
                                        </div>
                                    </HasPermission>
                                </div>

                                <HStack gap={1.5} align="center">
                                    <Package size={14} color="#71717a" />
                                    <Text size="xsm" color="secondary">
                                        {cat._count?.products ?? 0} produk
                                    </Text>
                                </HStack>
                            </VStack>
                        </Card>
                    ))}
                </Grid>
            ) : (
                <EmptyState
                    icon={<Tag size={28} />}
                    title="Belum ada kategori"
                    description="Tambahkan kategori untuk mengelompokkan produk Anda."
                />
            )}

            <Modal isOpen={showModal} title={editId ? 'Edit Kategori' : 'Tambah Kategori'} onClose={() => setShowModal(false)}>
                <form onSubmit={handleSubmit}>
                    <VStack gap={4}>
                        <TextInput
                            label="Nama Kategori"
                            placeholder="Contoh: Minuman"
                            value={form.name}
                            onChange={(val) => setForm({ ...form, name: val })}
                            isRequired
                        />
                        <TextInput
                            label="Deskripsi"
                            placeholder="Opsional"
                            value={form.description}
                            onChange={(val) => setForm({ ...form, description: val })}
                        />
                        <VStack gap={2}>
                            <Text size="sm" weight="medium">Warna Label</Text>
                            <HStack gap={2} wrap="wrap">
                                {COLOR_OPTIONS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setForm({ ...form, color: c })}
                                        aria-label={`Pilih warna ${c}`}
                                        style={{
                                            width: 30,
                                            height: 30,
                                            borderRadius: 8,
                                            backgroundColor: c,
                                            border: form.color === c ? '2px solid #000' : '2px solid transparent',
                                            outline: form.color === c ? '2px solid #fff' : 'none',
                                            outlineOffset: -4,
                                            cursor: 'pointer',
                                        }}
                                    />
                                ))}
                            </HStack>
                        </VStack>
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

export default Categories;
