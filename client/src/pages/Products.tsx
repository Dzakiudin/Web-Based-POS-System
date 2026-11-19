import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
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
import { Selector } from '@astryxdesign/core/Selector';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Badge } from '@astryxdesign/core/Badge';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Divider } from '@astryxdesign/core/Divider';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import Modal from '../components/Modal';
import HasPermission from '../components/HasPermission';
import { useToast } from '../components/Toast';

interface Product {
    id: number;
    name: string;
    price: string;
    stock: number;
    minStock?: number;
    image: string | null;
    categoryId: number | null;
    category?: { id: number; name: string; color: string } | null;
}

interface Category {
    id: number;
    name: string;
    color: string;
}

const Products = () => {
    const toast = useToast();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        stock: 0,
        categoryId: '',
        image: null as File | null,
    });

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        try {
            const r = await api.get('/products');
            setProducts(Array.isArray(r.data) ? r.data : []);
        } catch (e) {
            console.error(e);
        }
    };

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
        const data = new FormData();
        data.append('name', formData.name);
        data.append('price', String(formData.price));
        data.append('stock', String(formData.stock));
        if (formData.categoryId) data.append('categoryId', formData.categoryId);
        if (formData.image) data.append('image', formData.image);

        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Produk berhasil diperbarui');
            } else {
                await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Produk berhasil ditambahkan');
            }
            fetchProducts();
            handleCloseModal();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menyimpan produk');
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: Number(product.price) || 0,
            stock: product.stock || 0,
            categoryId: product.categoryId ? String(product.categoryId) : '',
            image: null,
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Hapus produk ini?')) return;
        try {
            await api.delete(`/products/${id}`);
            toast.success('Produk dihapus');
            fetchProducts();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menghapus produk');
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData({ name: '', price: 0, stock: 0, categoryId: '', image: null });
    };

    const filtered = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = !catFilter || String(p.categoryId) === catFilter;
        return matchSearch && matchCat;
    });

    const categoryOptions = [
        { value: '', label: 'Semua Kategori' },
        ...categories.map((c) => ({ value: String(c.id), label: c.name })),
    ];

    const formCategoryOptions = [
        { value: '', label: 'Tanpa Kategori' },
        ...categories.map((c) => ({ value: String(c.id), label: c.name })),
    ];

    return (
        <VStack gap={4} width="100%">
            {/* Toolbar */}
            <HStack justify="between" align="end" wrap="wrap" gap={3}>
                <HStack gap={2} wrap="wrap" align="end" style={{ flex: 1, minWidth: isMobile ? '100%' : 240 }}>
                    <TextInput
                        label="Cari produk"
                        isLabelHidden
                        type="search"
                        placeholder="Cari nama produk..."
                        value={search}
                        onChange={(v) => setSearch(v)}
                        startIcon={<Search size={16} />}
                        hasClear
                        width={isMobile ? '100%' : 260}
                    />
                    <Selector
                        label="Filter kategori"
                        isLabelHidden
                        options={categoryOptions}
                        value={catFilter}
                        onChange={(v) => setCatFilter(v)}
                        placeholder="Semua Kategori"
                        width={isMobile ? '100%' : 200}
                    />
                </HStack>

                <HasPermission permission="product.crud">
                    <Button
                        variant="primary"
                        label="Tambah Produk"
                        width={isMobile ? '100%' : undefined}
                        icon={<Plus size={16} />}
                        onClick={() => { handleCloseModal(); setIsModalOpen(true); }}
                    />
                </HasPermission>
            </HStack>

            {/* Product Grid */}
            {filtered.length > 0 ? (
                <Grid columns={{ minWidth: isMobile ? 145 : 230, max: 4 }} gap={isMobile ? 2 : 3}>
                    {filtered.map((product) => {
                        const isLow = product.stock <= (product.minStock ?? 5);
                        return (
                            <Card key={product.id} padding={3} elevation="none">
                                <VStack gap={3}>
                                    <div
                                        style={{
                                            width: '100%',
                                            aspectRatio: '16 / 10',
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            backgroundColor: '#f4f4f5',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {product.image ? (
                                            <img
                                                src={product.image.startsWith('http') ? product.image : `http://localhost:5000${product.image}`}
                                                alt={product.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <Package size={28} color="#a1a1aa" />
                                        )}
                                    </div>

                                    <VStack gap={1}>
                                        <HStack justify="between" align="start" gap={2}>
                                            <Heading level={5} weight="semibold" maxLines={1}>{product.name}</Heading>
                                            <Badge
                                                variant={product.stock === 0 ? 'error' : isLow ? 'warning' : 'success'}
                                                label={`Stok ${product.stock}`}
                                            />
                                        </HStack>
                                        <Text size="xsm" color="secondary">
                                            {product.category?.name || 'Umum'}
                                        </Text>
                                    </VStack>

                                    <Divider />

                                    <HStack justify="between" align="center">
                                        <Text size="base" weight="bold" hasTabularNumbers>
                                            Rp {Number(product.price).toLocaleString('id-ID')}
                                        </Text>
                                        <HasPermission permission="product.crud">
                                            <HStack gap={1}>
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    label="Edit produk"
                                                    icon={<Pencil size={15} />}
                                                    onClick={() => handleEdit(product)}
                                                />
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    label="Hapus produk"
                                                    icon={<Trash2 size={15} />}
                                                    onClick={() => handleDelete(product.id)}
                                                />
                                            </HStack>
                                        </HasPermission>
                                    </HStack>
                                </VStack>
                            </Card>
                        );
                    })}
                </Grid>
            ) : (
                <EmptyState
                    icon={<Package size={28} />}
                    title="Produk tidak ditemukan"
                    description="Tambahkan produk baru atau ubah kata kunci pencarian."
                />
            )}

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            >
                <form onSubmit={handleSubmit}>
                    <VStack gap={4}>
                        <TextInput
                            label="Nama Produk"
                            placeholder="Contoh: Kopi Susu Gula Aren"
                            value={formData.name}
                            onChange={(val) => setFormData({ ...formData, name: val })}
                            isRequired
                        />
                        <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                            <NumberInput
                                label="Harga (Rp)"
                                value={formData.price}
                                onChange={(val) => setFormData({ ...formData, price: val || 0 })}
                                min={0}
                                isRequired
                            />
                            <NumberInput
                                label="Stok"
                                value={formData.stock}
                                onChange={(val) => setFormData({ ...formData, stock: val || 0 })}
                                min={0}
                                isIntegerOnly
                                isRequired
                            />
                        </Grid>
                        <Selector
                            label="Kategori"
                            options={formCategoryOptions}
                            value={formData.categoryId}
                            onChange={(val) => setFormData({ ...formData, categoryId: val })}
                            placeholder="Pilih kategori"
                        />
                        <FileInput
                            label="Gambar Produk"
                            isOptional
                            accept="image/*"
                            value={formData.image}
                            onChange={(files) => {
                                const file = Array.isArray(files) ? files[0] : files;
                                setFormData({ ...formData, image: file || null });
                            }}
                        />
                        <HStack justify="end" gap={2}>
                            <Button variant="secondary" label="Batal" onClick={handleCloseModal} />
                            <Button type="submit" variant="primary" label={editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'} />
                        </HStack>
                    </VStack>
                </form>
            </Modal>
        </VStack>
    );
};

export default Products;
