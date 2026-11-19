import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Package, Search, Camera, Barcode, Sparkles, Loader2 } from 'lucide-react';
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
import { Badge } from '@astryxdesign/core/Badge';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Divider } from '@astryxdesign/core/Divider';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import { sound } from '../lib/sound';
import Modal from '../components/Modal';
import HasPermission from '../components/HasPermission';
import { useToast } from '../components/Toast';
import useHardwareScanner from '../hooks/useHardwareScanner';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { lookupBarcodeInfo } from '../lib/barcodeCatalog';

interface Product {
    id: number;
    name: string;
    sku?: string | null;
    barcode?: string | null;
    price: string;
    costPrice?: string;
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
    const [cameraScanOpen, setCameraScanOpen] = useState(false);
    const [isLookingUp, setIsLookingUp] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        barcode: '',
        price: 0,
        costPrice: 0,
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

    // Packaging Barcode Auto-Fill from Catalog & Internet Databases
    const handleBarcodeAutoFill = async (scannedBarcode: string) => {
        const cleanBarcode = scannedBarcode.trim();
        setIsModalOpen(true);
        setFormData((prev) => ({ ...prev, barcode: cleanBarcode }));
        setIsLookingUp(true);
        try {
            const info = await lookupBarcodeInfo(cleanBarcode);
            if (info) {
                sound.playSuccess();
                toast.success(`Ditemukan di internet: "${info.name}"!`);

                // Match category name or keywords
                let matchedCatId = '';
                if (info.category) {
                    const catLower = info.category.toLowerCase();
                    let matched = categories.find(
                        (c) =>
                            c.name.toLowerCase().includes(catLower) ||
                            catLower.includes(c.name.toLowerCase())
                    );
                    if (!matched) {
                        if (catLower.match(/drink|beverage|water|tea|coffee|milk|juice|air|teh|kopi|susu/)) {
                            matched = categories.find((c) => c.name.toLowerCase().match(/minuman|coffee|tea/));
                        } else if (catLower.match(/noodle|mie|biscuit|snack|food|makanan|rice|bread|roti/)) {
                            matched = categories.find((c) => c.name.toLowerCase().match(/makanan|snack|pastry/));
                        }
                    }
                    if (matched) matchedCatId = String(matched.id);
                }

                setFormData((prev) => ({
                    ...prev,
                    barcode: cleanBarcode,
                    name: info.name,
                    sku: prev.sku
                        ? prev.sku
                        : info.brand
                        ? `${info.brand.slice(0, 3).toUpperCase()}-${cleanBarcode.slice(-4)}`
                        : `SKU-${cleanBarcode.slice(-4)}`,
                    price: prev.price > 0 ? prev.price : (info.suggestedPrice || 0),
                    costPrice: prev.costPrice > 0 ? prev.costPrice : (info.costPrice || 0),
                    categoryId: matchedCatId || prev.categoryId,
                }));
            } else {
                toast.info(`Barcode ${cleanBarcode} tercatat. Data nama belum ada di internet, silakan lengkapi nama produk.`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLookingUp(false);
        }
    };

    // Scan Barcode from main list: if exists, search it; if not, open Add form!
    const handleScanOrSearch = async (scannedBarcode: string) => {
        const cleanBarcode = scannedBarcode.trim();
        if (!cleanBarcode) return;

        const existing = products.find(
            (p) =>
                (p.barcode && p.barcode.toLowerCase() === cleanBarcode.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase() === cleanBarcode.toLowerCase())
        );

        if (existing) {
            setSearch(existing.name);
            toast.success(`Produk ditemukan: "${existing.name}"`);
            sound.playBeep();
        } else {
            toast.info(`Barcode belum terdaftar. Membuka form tambah produk...`);
            handleBarcodeAutoFill(cleanBarcode);
        }
    };

    // Hardware USB/Bluetooth barcode scanner listener
    useHardwareScanner({
        enabled: !cameraScanOpen,
        onScan: (code) => {
            if (isModalOpen) {
                handleBarcodeAutoFill(code);
            } else {
                handleScanOrSearch(code);
            }
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: formData.name,
            sku: formData.sku || null,
            barcode: formData.barcode || null,
            price: Number(formData.price),
            costPrice: Number(formData.costPrice || 0),
            stock: Number(formData.stock),
            categoryId: formData.categoryId ? Number(formData.categoryId) : null,
        };

        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, payload);
                toast.success('Produk berhasil diperbarui');
            } else {
                await api.post('/products', payload);
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
            sku: product.sku || '',
            barcode: product.barcode || '',
            price: Number(product.price) || 0,
            costPrice: Number(product.costPrice) || 0,
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
        setFormData({ name: '', sku: '', barcode: '', price: 0, costPrice: 0, stock: 0, categoryId: '', image: null });
    };

    const filtered = products.filter((p) => {
        const q = search.toLowerCase().trim();
        const matchSearch =
            !q ||
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q));
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
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 10, width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, flex: 1, minWidth: 0, width: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <TextInput
                            label="Cari produk"
                            isLabelHidden
                            type="search"
                            placeholder="Cari nama produk, SKU, barcode..."
                            value={search}
                            onChange={(v) => setSearch(v)}
                            startIcon={<Search size={16} />}
                            hasClear
                            width="100%"
                        />
                    </div>
                    <div style={{ width: isMobile ? '100%' : 200, minWidth: 0 }}>
                        <Selector
                            label="Filter kategori"
                            isLabelHidden
                            options={categoryOptions}
                            value={catFilter}
                            onChange={(v) => setCatFilter(v)}
                            placeholder="Semua Kategori"
                            width="100%"
                        />
                    </div>
                </div>

                <HasPermission permission="product.crud">
                    <div style={{ width: isMobile ? '100%' : 'auto', flexShrink: 0 }}>
                        <Button
                            variant="primary"
                            label="Tambah Produk"
                            width={isMobile ? '100%' : undefined}
                            icon={<Plus size={16} />}
                            onClick={() => { handleCloseModal(); setIsModalOpen(true); }}
                        />
                    </div>
                </HasPermission>
            </div>

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
                                        <HStack justify="between" align="center">
                                            <Text size="xsm" color="secondary">
                                                {product.category?.name || 'Umum'}
                                            </Text>
                                            {product.barcode && (
                                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#71717a', backgroundColor: '#f4f4f5', padding: '1px 6px', borderRadius: 4, border: '1px solid #e4e4e7' }}>
                                                    {product.barcode}
                                                </span>
                                            )}
                                        </HStack>
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

            {/* Modal Tambah / Edit Produk */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                width={520}
            >
                <form onSubmit={handleSubmit}>
                    <VStack gap={4}>
                        {/* Barcode & Packaging Auto-Lookup Section */}
                        <VStack gap={1.5} width="100%">
                            <Text size="sm" weight="semibold">Barcode Kemasan (Isi Data Otomatis)</Text>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <TextInput
                                        label="Barcode Kemasan"
                                        isLabelHidden
                                        placeholder="Ketik / scan barcode..."
                                        value={formData.barcode}
                                        onChange={(val) => setFormData({ ...formData, barcode: val })}
                                        startIcon={<Barcode size={16} />}
                                        width="100%"
                                        hasClear
                                        onEnter={() => {
                                            if (formData.barcode.trim()) {
                                                handleBarcodeAutoFill(formData.barcode.trim());
                                            }
                                        }}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="md"
                                    icon={<Camera size={16} />}
                                    label="Scan Kemasan"
                                    style={{ flexShrink: 0 }}
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setCameraScanOpen(true);
                                    }}
                                />
                                {formData.barcode && (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="md"
                                        icon={isLookingUp ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                        tooltip="Cari otomatis data produk dari kemasan"
                                        label={isLookingUp ? 'Mencari...' : 'Cari Info'}
                                        style={{ flexShrink: 0 }}
                                        onClick={() => handleBarcodeAutoFill(formData.barcode)}
                                        isDisabled={isLookingUp}
                                    />
                                )}
                            </div>
                            <span style={{ fontSize: 11, color: '#71717a' }}>
                                Scan barcode kemasan produk (Aqua, Indomie, Ultra Milk, dll) untuk mengisi nama, kategori, & harga secara otomatis.
                            </span>
                        </VStack>

                        <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                            <TextInput
                                label="Nama Produk *"
                                placeholder="Contoh: Indomie Mi Goreng Spesial 85g"
                                value={formData.name}
                                onChange={(val) => setFormData({ ...formData, name: val })}
                            />
                            <TextInput
                                label="SKU / Kode Barang"
                                placeholder="Contoh: IND-85G / Minyak-01"
                                value={formData.sku}
                                onChange={(val) => setFormData({ ...formData, sku: val })}
                            />
                        </Grid>

                        <Grid columns={{ minWidth: 140, max: 2 }} gap={3}>
                            <NumberInput
                                label="Harga Jual (Rp) *"
                                value={formData.price}
                                onChange={(val) => setFormData({ ...formData, price: val || 0 })}
                                min={0}
                            />
                            <NumberInput
                                label="Harga Modal (Rp)"
                                value={formData.costPrice}
                                onChange={(val) => setFormData({ ...formData, costPrice: val || 0 })}
                                min={0}
                            />
                        </Grid>

                        <Grid columns={{ minWidth: 140, max: 2 }} gap={3}>
                            <NumberInput
                                label="Stok Barang *"
                                value={formData.stock}
                                onChange={(val) => setFormData({ ...formData, stock: val || 0 })}
                                min={0}
                                isIntegerOnly
                            />
                            <Selector
                                label="Kategori Produk"
                                options={formCategoryOptions}
                                value={formData.categoryId}
                                onChange={(val) => setFormData({ ...formData, categoryId: val })}
                                placeholder="Pilih kategori"
                            />
                        </Grid>
                        <HStack justify="end" gap={2}>
                            <Button variant="secondary" label="Batal" onClick={handleCloseModal} />
                            <Button type="submit" variant="primary" label={editingProduct ? 'Simpan Perubahan' : 'Simpan Produk'} />
                        </HStack>
                    </VStack>
                </form>
            </Modal>

            {/* Mobile / Camera Barcode Scanner Modal for Packaging */}
            <BarcodeScannerModal
                isOpen={cameraScanOpen}
                onClose={() => {
                    setCameraScanOpen(false);
                    setIsModalOpen(true);
                }}
                onScan={(code) => {
                    setCameraScanOpen(false);
                    setIsModalOpen(true);
                    handleBarcodeAutoFill(code);
                }}
                title="Scan Barcode Kemasan Produk"
                subtitle="Posisikan barcode pada kemasan produk di dalam kotak pemindai"
            />
        </VStack>
    );
};

export default Products;
