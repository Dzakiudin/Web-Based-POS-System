import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Percent, Package, Tag, Sparkles, AlertCircle } from 'lucide-react';
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
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Switch } from '@astryxdesign/core/Switch';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import CurrencyInput from '../components/CurrencyInput';
import {
    calculateWholesaleRuleDiscount,
    formatWholesaleSummary,
    type DiscountRule,
    type WholesaleProductInfo,
} from '../lib/wholesale';

const INITIAL_FORM = {
    name: '',
    scope: 'PRODUCT_QTY' as 'PRODUCT_QTY' | 'ORDER',
    type: 'FIXED',
    pricingMode: 'BUNDLE_PRICE' as 'BUNDLE_PRICE' | 'UNIT_PRICE' | 'PERCENTAGE',
    productId: '',
    minQuantity: 24,
    unitLabel: '1 Kardus',
    value: 0,
    code: '',
    minPurchase: 0,
    maxUses: 0,
    isActive: true,
    startDate: '',
    endDate: '',
};

const Discounts = () => {
    const toast = useToast();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
    const [products, setProducts] = useState<WholesaleProductInfo[]>([]);
    const [scopeFilter, setScopeFilter] = useState<string>('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [nameEditedManually, setNameEditedManually] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);

    useEffect(() => {
        fetchDiscounts();
        fetchProducts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const r = await api.get('/discounts');
            setDiscounts(Array.isArray(r.data) ? r.data : []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat aturan diskon');
        }
    };

    const fetchProducts = async () => {
        try {
            const r = await api.get('/products');
            setProducts(Array.isArray(r.data) ? r.data : []);
        } catch {
            // Non-blocking if user only views order promos
        }
    };

    const selectedProduct = products.find((p) => String(p.id) === form.productId) || null;
    const selectedProductPrice = selectedProduct ? Number(selectedProduct.price) : 0;

    // Auto-build readable rule name for wholesale rules unless user edited it manually
    const buildAutoWholesaleName = (prod: WholesaleProductInfo | null, label: string, minQty: number) => {
        if (!prod) return '';
        const unitPart = label.trim() || `Min. ${minQty} pcs`;
        return `Grosir ${prod.name} (${unitPart})`;
    };

    const validateWholesaleValue = (): string | null => {
        if (form.scope !== 'PRODUCT_QTY') return null;
        if (!form.productId || !selectedProduct) return 'Pilih produk target terlebih dahulu.';
        if (form.minQuantity < 2) return 'Minimal jumlah beli grosir minimal 2 pcs.';
        if (form.value <= 0) return 'Nilai harga / diskon grosir harus lebih dari 0.';

        if (form.pricingMode === 'BUNDLE_PRICE') {
            const normalBundle = selectedProductPrice * form.minQuantity;
            if (form.value >= normalBundle) {
                return `Harga paket ${form.minQuantity} pcs harus lebih murah dari harga normal (Rp ${normalBundle.toLocaleString('id-ID')}).`;
            }
        } else if (form.pricingMode === 'UNIT_PRICE') {
            if (form.value >= selectedProductPrice) {
                return `Harga satuan grosir harus lebih murah dari harga normal (Rp ${selectedProductPrice.toLocaleString('id-ID')}/pcs).`;
            }
        } else if (form.pricingMode === 'PERCENTAGE') {
            if (form.value > 100) return 'Persentase diskon maksimal 100%.';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const wholesaleErr = validateWholesaleValue();
        if (wholesaleErr) {
            toast.error(wholesaleErr);
            return;
        }

        const isWholesale = form.scope === 'PRODUCT_QTY';
        const effectiveName = form.name.trim() || (isWholesale ? buildAutoWholesaleName(selectedProduct, form.unitLabel, form.minQuantity) : '');

        if (!effectiveName) {
            toast.error('Nama aturan diskon wajib diisi');
            return;
        }

        const payload = isWholesale
            ? {
                  name: effectiveName,
                  scope: 'PRODUCT_QTY',
                  productId: Number(form.productId),
                  minQuantity: Number(form.minQuantity),
                  pricingMode: form.pricingMode,
                  unitLabel: form.unitLabel.trim() || null,
                  type: form.pricingMode === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
                  value: Number(form.value),
                  isActive: form.isActive,
                  maxUses: form.maxUses ? Number(form.maxUses) : null,
                  code: null,
                  minPurchase: 0,
              }
            : {
                  name: effectiveName,
                  scope: 'ORDER',
                  type: form.type,
                  value: Number(form.value),
                  isActive: form.isActive,
                  code: form.code.trim() || null,
                  minPurchase: form.minPurchase ? Number(form.minPurchase) : 0,
                  maxUses: form.maxUses ? Number(form.maxUses) : null,
                  startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
                  endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
              };

        try {
            if (editId) {
                await api.put(`/discounts/${editId}`, payload);
                toast.success('Aturan diskon diperbarui');
            } else {
                await api.post('/discounts', payload);
                toast.success(isWholesale ? 'Harga grosir produk ditambahkan' : 'Promo diskon ditambahkan');
            }
            setShowModal(false);
            resetForm();
            fetchDiscounts();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menyimpan aturan diskon');
        }
    };

    const handleEdit = (d: DiscountRule) => {
        setEditId(d.id);
        setNameEditedManually(true);
        const isWholesale = d.scope === 'PRODUCT_QTY';
        setForm({
            name: d.name,
            scope: isWholesale ? 'PRODUCT_QTY' : 'ORDER',
            type: d.type,
            pricingMode:
                d.pricingMode === 'BUNDLE_PRICE' || d.pricingMode === 'UNIT_PRICE' || d.pricingMode === 'PERCENTAGE'
                    ? d.pricingMode
                    : 'BUNDLE_PRICE',
            productId: d.productId ? String(d.productId) : '',
            minQuantity: d.minQuantity || 24,
            unitLabel: d.unitLabel || '',
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
            toast.success('Aturan diskon dihapus');
            fetchDiscounts();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal menghapus aturan diskon');
        }
    };

    const resetForm = (defaultScope: 'PRODUCT_QTY' | 'ORDER' = 'PRODUCT_QTY') => {
        setNameEditedManually(false);
        setEditId(null);
        setForm({
            ...INITIAL_FORM,
            scope: defaultScope,
            type: defaultScope === 'ORDER' ? 'PERCENTAGE' : 'FIXED',
        });
    };

    const wholesaleCount = discounts.filter((d) => d.scope === 'PRODUCT_QTY').length;
    const orderCount = discounts.filter((d) => d.scope !== 'PRODUCT_QTY').length;
    const filteredDiscounts = discounts.filter((d) => {
        if (scopeFilter === 'PRODUCT_QTY') return d.scope === 'PRODUCT_QTY';
        if (scopeFilter === 'ORDER') return d.scope !== 'PRODUCT_QTY';
        return true;
    });

    const wholesalePreviewError = form.scope === 'PRODUCT_QTY' ? validateWholesaleValue() : null;
    const previewQty = Math.max(2, form.minQuantity || 2);
    const previewDiscountForMin =
        selectedProductPrice > 0 && form.value > 0
            ? calculateWholesaleRuleDiscount(selectedProductPrice, previewQty, {
                  minQuantity: previewQty,
                  pricingMode: form.pricingMode,
                  value: form.value,
              })
            : 0;
    const previewNormalTotal = selectedProductPrice * previewQty;
    const previewFinalTotal = Math.max(0, previewNormalTotal - previewDiscountForMin);
    const previewExtraDiscount =
        selectedProductPrice > 0 && form.value > 0
            ? calculateWholesaleRuleDiscount(selectedProductPrice, previewQty + 1, {
                  minQuantity: previewQty,
                  pricingMode: form.pricingMode,
                  value: form.value,
              })
            : 0;
    const previewExtraTotal = Math.max(0, selectedProductPrice * (previewQty + 1) - previewExtraDiscount);

    return (
        <VStack gap={4} width="100%">
            <PageHeader
                title="Promosi, Harga Grosir & Diskon"
                subtitle="Atur harga paket/kardus per produk otomatis dan kode promo minimal belanja"
                badge={<Badge variant="neutral" label={`${discounts.length} Aturan`} />}
                actions={
                    <Button
                        variant="primary"
                        label="Tambah Diskon"
                        icon={<Plus size={16} />}
                        width={isMobile ? '100%' : undefined}
                        onClick={() => {
                            resetForm('PRODUCT_QTY');
                            setShowModal(true);
                        }}
                    />
                }
            />

            <div style={{ width: isMobile ? '100%' : 420, maxWidth: '100%' }}>
                <SegmentedControl
                    label="Filter jenis diskon"
                    value={scopeFilter}
                    onChange={setScopeFilter}
                    size="sm"
                    layout="fill"
                >
                    <SegmentedControlItem value="ALL" label={`Semua (${discounts.length})`} />
                    <SegmentedControlItem value="PRODUCT_QTY" label={`Grosir / Paket (${wholesaleCount})`} />
                    <SegmentedControlItem value="ORDER" label={`Promo Struk (${orderCount})`} />
                </SegmentedControl>
            </div>

            {filteredDiscounts.length > 0 ? (
                <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
                    {filteredDiscounts.map((d) => {
                        const isWholesale = d.scope === 'PRODUCT_QTY';
                        const usedCount = d.usedCount ?? d.currentUses ?? 0;
                        const prodPrice = d.product ? Number(d.product.price) : undefined;
                        const wholesaleSummary = isWholesale ? formatWholesaleSummary(d, prodPrice) : null;

                        return (
                            <Card key={d.id} padding={3} elevation="none" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
                                <VStack gap={3} style={{ minWidth: 0, width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, width: '100%', minWidth: 0 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <Badge
                                                    variant={isWholesale ? 'success' : 'info'}
                                                    label={isWholesale ? 'Harga Grosir' : 'Promo Belanja'}
                                                />
                                                {d.code && <Badge variant="neutral" label={d.code} />}
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: 650, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                                {d.name}
                                            </span>
                                            {isWholesale && d.product && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#52525b' }}>
                                                    <Package size={13} color="#71717a" />
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {d.product.name} · Eceran Rp {Number(d.product.price).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 'auto' }}>
                                            <IconButton variant="ghost" size="sm" label="Edit" icon={<Pencil size={15} />} onClick={() => handleEdit(d)} />
                                            <IconButton variant="ghost" size="sm" label="Hapus" icon={<Trash2 size={15} />} onClick={() => handleDelete(d.id)} />
                                        </div>
                                    </div>

                                    {isWholesale && wholesaleSummary ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                                                <Heading level={4} weight="bold" style={{ color: '#059669' }}>
                                                    {wholesaleSummary.priceDisplay}
                                                </Heading>
                                                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#3f3f46', backgroundColor: '#f4f4f5', padding: '1px 7px', borderRadius: 999 }}>
                                                    {wholesaleSummary.packageLabel}
                                                </span>
                                            </div>
                                            {wholesaleSummary.savingsHint && (
                                                <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 500 }}>
                                                    {wholesaleSummary.savingsHint}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <Heading level={3} weight="bold">
                                                {d.type === 'PERCENTAGE' ? `${Number(d.value)}%` : `Rp ${Number(d.value).toLocaleString('id-ID')}`}
                                            </Heading>
                                            {Number(d.minPurchase || 0) > 0 && (
                                                <Text size="xsm" color="secondary">
                                                    Min. belanja Rp {Number(d.minPurchase).toLocaleString('id-ID')}
                                                </Text>
                                            )}
                                        </div>
                                    )}

                                    <Divider />

                                    <HStack justify="between" align="center">
                                        <Badge variant={d.isActive ? 'success' : 'neutral'} label={d.isActive ? 'Aktif' : 'Nonaktif'} />
                                        <Text size="xsm" color="secondary">
                                            Terpakai: {usedCount}{d.maxUses ? ` / ${d.maxUses}` : ''}
                                        </Text>
                                    </HStack>
                                </VStack>
                            </Card>
                        );
                    })}
                </Grid>
            ) : (
                <EmptyState
                    icon={<Percent size={28} />}
                    title={scopeFilter === 'PRODUCT_QTY' ? 'Belum ada aturan harga grosir' : 'Belum ada aturan diskon'}
                    description="Buat harga grosir / paket kardus per produk (beli banyak lebih murah) atau promo minimal belanja."
                />
            )}

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editId ? 'Edit Aturan Diskon' : 'Tambah Aturan Diskon'}
                width={540}
            >
                <form onSubmit={handleSubmit}>
                    <VStack gap={4}>
                        <SegmentedControl
                            label="Jenis Aturan Diskon"
                            value={form.scope}
                            onChange={(v) => {
                                const nextScope = v as 'PRODUCT_QTY' | 'ORDER';
                                setForm((prev) => ({
                                    ...prev,
                                    scope: nextScope,
                                    type: nextScope === 'ORDER' ? 'PERCENTAGE' : 'FIXED',
                                }));
                            }}
                            layout="fill"
                        >
                            <SegmentedControlItem value="PRODUCT_QTY" label="Grosir / Paket Kardus" />
                            <SegmentedControlItem value="ORDER" label="Promo Kode / Struk" />
                        </SegmentedControl>

                        {form.scope === 'PRODUCT_QTY' ? (
                            <>
                                <div
                                    style={{
                                        padding: '9px 12px',
                                        borderRadius: 10,
                                        backgroundColor: '#f0fdf4',
                                        border: '1px solid #bbf7d0',
                                        fontSize: 12,
                                        color: '#166534',
                                        lineHeight: 1.45,
                                        display: 'flex',
                                        gap: 8,
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <Sparkles size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>
                                        <strong>Otomatis di Kasir:</strong> Beli satuan tetap harga normal. Begitu jumlah mencapai isi paket/kardus, harga otomatis turun!
                                    </span>
                                </div>

                                <Selector
                                    label="Produk Target *"
                                    placeholder="Cari dan pilih produk..."
                                    options={products.map((p) => ({
                                        value: String(p.id),
                                        label: `${p.name} (Normal: Rp ${Number(p.price).toLocaleString('id-ID')})`,
                                    }))}
                                    value={form.productId}
                                    onChange={(val) => {
                                        const prod = products.find((p) => String(p.id) === val) || null;
                                        setForm((prev) => ({
                                            ...prev,
                                            productId: val,
                                            name: nameEditedManually
                                                ? prev.name
                                                : buildAutoWholesaleName(prod, prev.unitLabel, prev.minQuantity),
                                        }));
                                    }}
                                    hasSearch
                                />

                                <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                    <NumberInput
                                        label="Isi / Min. Jumlah Beli (pcs) *"
                                        value={form.minQuantity}
                                        onChange={(v) => {
                                            const nextQty = Math.max(1, v || 1);
                                            setForm((prev) => ({
                                                ...prev,
                                                minQuantity: nextQty,
                                                name: nameEditedManually
                                                    ? prev.name
                                                    : buildAutoWholesaleName(selectedProduct, prev.unitLabel, nextQty),
                                            }));
                                        }}
                                        min={2}
                                        isIntegerOnly
                                        isRequired
                                    />
                                    <VStack gap={1}>
                                        <TextInput
                                            label="Label Kemasan (Opsional)"
                                            placeholder="Contoh: 1 Kardus / 1 Lusin"
                                            value={form.unitLabel}
                                            onChange={(v) => {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    unitLabel: v,
                                                    name: nameEditedManually
                                                        ? prev.name
                                                        : buildAutoWholesaleName(selectedProduct, v, prev.minQuantity),
                                                }));
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                            {[
                                                { label: '1 Kardus (24)', unit: '1 Kardus', qty: 24 },
                                                { label: '1 Lusin (12)', unit: '1 Lusin', qty: 12 },
                                                { label: '1 Pak (6)', unit: '1 Pak', qty: 6 },
                                            ].map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            unitLabel: preset.unit,
                                                            minQuantity: preset.qty,
                                                            name: nameEditedManually
                                                                ? prev.name
                                                                : buildAutoWholesaleName(selectedProduct, preset.unit, preset.qty),
                                                        }));
                                                    }}
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '2px 8px',
                                                        borderRadius: 999,
                                                        border: '1px solid #e4e4e7',
                                                        backgroundColor: form.unitLabel === preset.unit && form.minQuantity === preset.qty ? '#18181b' : '#fafafa',
                                                        color: form.unitLabel === preset.unit && form.minQuantity === preset.qty ? '#ffffff' : '#52525b',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </VStack>
                                </Grid>

                                <SegmentedControl
                                    label="Skema Harga Grosir"
                                    value={form.pricingMode}
                                    onChange={(v) => setForm({ ...form, pricingMode: v as any })}
                                    layout="fill"
                                    size="sm"
                                >
                                    <SegmentedControlItem value="BUNDLE_PRICE" label="Harga Paket" />
                                    <SegmentedControlItem value="UNIT_PRICE" label="Harga / Pcs" />
                                    <SegmentedControlItem value="PERCENTAGE" label="Diskon %" />
                                </SegmentedControl>

                                {form.pricingMode === 'PERCENTAGE' ? (
                                    <NumberInput
                                        label={`Persentase Diskon jika beli ≥ ${form.minQuantity} pcs (%) *`}
                                        value={form.value}
                                        onChange={(v) => setForm({ ...form, value: v || 0 })}
                                        min={1}
                                        max={100}
                                        isRequired
                                    />
                                ) : (
                                    <CurrencyInput
                                        label={
                                            form.pricingMode === 'BUNDLE_PRICE'
                                                ? `Harga 1 Paket / ${form.unitLabel.trim() || `${form.minQuantity} pcs`} *`
                                                : `Harga Grosir per Pcs (jika beli ≥ ${form.minQuantity} pcs) *`
                                        }
                                        description={
                                            form.pricingMode === 'BUNDLE_PRICE'
                                                ? 'Berlaku per kelipatan paket. Sisa eceran tetap dihitung harga normal.'
                                                : 'Semua item otomatis berubah jadi harga satuan grosir ini jika Qty mencukupi.'
                                        }
                                        value={form.value}
                                        onChange={(v) => setForm({ ...form, value: v })}
                                        isRequired
                                    />
                                )}

                                {/* Live Simulation Box */}
                                {selectedProduct && (
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            backgroundColor: wholesalePreviewError ? '#fef2f2' : '#fafafa',
                                            border: wholesalePreviewError ? '1px solid #fecaca' : '1px solid #e4e4e7',
                                            fontSize: 12,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4,
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, color: wholesalePreviewError ? '#b91c1c' : '#18181b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {wholesalePreviewError ? <AlertCircle size={14} /> : <Tag size={14} color="#059669" />}
                                            <span>{wholesalePreviewError ? 'Periksa Harga' : 'Simulasi Harga di Kasir'}</span>
                                        </div>
                                        {wholesalePreviewError ? (
                                            <span style={{ color: '#b91c1c' }}>{wholesalePreviewError}</span>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#3f3f46', fontVariantNumeric: 'tabular-nums' }}>
                                                <span>• Beli 1 pcs : <strong>Rp {selectedProductPrice.toLocaleString('id-ID')}</strong></span>
                                                <span>• Beli 2 pcs : <strong>Rp {(selectedProductPrice * 2).toLocaleString('id-ID')}</strong></span>
                                                <span style={{ color: '#059669' }}>
                                                    • Beli {previewQty} pcs ({form.unitLabel.trim() || `${previewQty} pcs`}) :{' '}
                                                    <span style={{ textDecoration: 'line-through', color: '#a1a1aa', marginRight: 4 }}>
                                                        Rp {previewNormalTotal.toLocaleString('id-ID')}
                                                    </span>
                                                    <strong>Rp {previewFinalTotal.toLocaleString('id-ID')}</strong>{' '}
                                                    {previewDiscountForMin > 0 && `(Hemat Rp ${previewDiscountForMin.toLocaleString('id-ID')})`}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#71717a' }}>
                                                    • Beli {previewQty + 1} pcs : Rp {previewExtraTotal.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                    <TextInput
                                        label="Nama Aturan *"
                                        placeholder="Contoh: Air Mineral 1 Kardus"
                                        value={form.name}
                                        onChange={(v) => {
                                            setNameEditedManually(true);
                                            setForm({ ...form, name: v });
                                        }}
                                        isRequired
                                    />
                                    <NumberInput
                                        label="Batas Pemakaian (0 = Tanpa Batas)"
                                        value={form.maxUses}
                                        onChange={(v) => setForm({ ...form, maxUses: v || 0 })}
                                        min={0}
                                        isIntegerOnly
                                    />
                                </Grid>
                            </>
                        ) : (
                            <>
                                <TextInput label="Nama Promo *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} isRequired />
                                <SegmentedControl label="Tipe Diskon" value={form.type} onChange={(v) => setForm({ ...form, type: v })} layout="fill">
                                    <SegmentedControlItem value="PERCENTAGE" label="Persentase (%)" />
                                    <SegmentedControlItem value="FIXED" label="Nominal (Rp)" />
                                </SegmentedControl>
                                <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                    {form.type === 'PERCENTAGE' ? (
                                        <NumberInput label="Nilai Diskon (%)" value={form.value} onChange={(v) => setForm({ ...form, value: v || 0 })} min={1} max={100} isRequired />
                                    ) : (
                                        <CurrencyInput label="Nilai Diskon (Rp)" value={form.value} onChange={(v) => setForm({ ...form, value: v })} isRequired />
                                    )}
                                    <TextInput label="Kode Promo (Opsional)" value={form.code} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} />
                                </Grid>
                                <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                    <CurrencyInput label="Min. Belanja (Rp)" value={form.minPurchase} onChange={(v) => setForm({ ...form, minPurchase: v })} />
                                    <NumberInput label="Batas Pemakaian" value={form.maxUses} onChange={(v) => setForm({ ...form, maxUses: v || 0 })} min={0} isIntegerOnly />
                                </Grid>
                            </>
                        )}

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
