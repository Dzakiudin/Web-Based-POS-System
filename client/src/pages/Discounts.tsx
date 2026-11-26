import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Percent, Package, Tag, Sparkles, AlertCircle, Gift, Layers, Crown } from 'lucide-react';
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
    calculateOrderPromoAmount,
    calculateWholesaleRuleDiscount,
    formatWholesaleSummary,
    type DiscountRule,
    type WholesaleCategoryInfo,
    type WholesaleProductInfo,
} from '../lib/wholesale';

type DiscountScope = 'PRODUCT_QTY' | 'CATEGORY' | 'ORDER';
type ItemPricingMode = 'BUNDLE_PRICE' | 'UNIT_PRICE' | 'BUY_X_GET_Y' | 'FIXED_PER_UNIT' | 'PERCENTAGE';

interface ApiErrorLike {
    response?: { data?: { message?: string } };
    message?: string;
}

const getErrorMessage = (err: unknown, fallback: string) => {
    const e = err as ApiErrorLike;
    return e?.response?.data?.message || e?.message || fallback;
};

const PRODUCT_MODE_OPTIONS: Array<{ value: ItemPricingMode; label: string; hint: string }> = [
    { value: 'BUNDLE_PRICE', label: 'Harga Paket / Dus', hint: 'Beli 1 kardus / lusin harga spesial' },
    { value: 'UNIT_PRICE', label: 'Harga Grosir / Pcs', hint: 'Harga satuan turun jika qty cukup' },
    { value: 'BUY_X_GET_Y', label: 'Beli X Gratis Y', hint: 'Contoh: Beli 3 Gratis 1' },
    { value: 'FIXED_PER_UNIT', label: 'Potongan Rp / Pcs', hint: 'Potongan tetap per pcs' },
    { value: 'PERCENTAGE', label: 'Diskon % Qty', hint: 'Persen diskon jika beli min. qty' },
];

const CATEGORY_MODE_OPTIONS: Array<{ value: 'PERCENTAGE' | 'FIXED_PER_UNIT' | 'BUY_X_GET_Y'; label: string }> = [
    { value: 'PERCENTAGE', label: 'Diskon %' },
    { value: 'FIXED_PER_UNIT', label: 'Potongan Rp / Pcs' },
    { value: 'BUY_X_GET_Y', label: 'Beli X Gratis Y' },
];

const TIER_OPTIONS = [
    { value: '', label: 'Semua Pelanggan (Umum & Member)' },
    { value: 'BRONZE', label: 'Minimal Member BRONZE' },
    { value: 'SILVER', label: 'Minimal Member SILVER' },
    { value: 'GOLD', label: 'Minimal Member GOLD' },
    { value: 'PLATINUM', label: 'Khusus Member PLATINUM' },
];

const INITIAL_FORM = {
    name: '',
    scope: 'PRODUCT_QTY' as DiscountScope,
    type: 'FIXED',
    pricingMode: 'BUNDLE_PRICE' as ItemPricingMode,
    productId: '',
    categoryId: '',
    minQuantity: 24,
    bonusQuantity: 1,
    unitLabel: '1 Kardus',
    value: 0,
    maxDiscount: 0,
    autoApply: false,
    targetTier: '',
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
    const [categories, setCategories] = useState<WholesaleCategoryInfo[]>([]);
    const [scopeFilter, setScopeFilter] = useState<string>('ALL');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [nameEditedManually, setNameEditedManually] = useState(false);
    const [form, setForm] = useState(INITIAL_FORM);

    const fetchDiscounts = useCallback(async () => {
        try {
            const r = await api.get('/discounts');
            setDiscounts(Array.isArray(r.data) ? r.data : []);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Gagal memuat aturan diskon'));
        }
    }, [toast]);

    const fetchProductsAndCategories = useCallback(async () => {
        try {
            const [prodRes, catRes] = await Promise.all([api.get('/products'), api.get('/categories')]);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
            setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        } catch {
            // Non-blocking fallback
        }
    }, []);

    useEffect(() => {
        const loadTimer = setTimeout(() => {
            void fetchDiscounts();
            void fetchProductsAndCategories();
        }, 0);
        return () => clearTimeout(loadTimer);
    }, [fetchDiscounts, fetchProductsAndCategories]);

    const selectedProduct = products.find((p) => String(p.id) === form.productId) || null;
    const selectedCategory = categories.find((c) => String(c.id) === form.categoryId) || null;
    const selectedProductPrice = selectedProduct ? Number(selectedProduct.price) : 0;

    const buildAutoRuleName = (
        scope: DiscountScope,
        mode: ItemPricingMode,
        prod: WholesaleProductInfo | null,
        cat: WholesaleCategoryInfo | null,
        unitLabel: string,
        minQty: number,
        bonusQty: number,
        val: number
    ) => {
        if (scope === 'PRODUCT_QTY' && prod) {
            if (mode === 'BUY_X_GET_Y') {
                return `${prod.name} Beli ${minQty} Gratis ${bonusQty}`;
            }
            const unitPart = unitLabel.trim() || `Min. ${minQty} pcs`;
            return `Grosir ${prod.name} (${unitPart})`;
        }
        if (scope === 'CATEGORY' && cat) {
            if (mode === 'BUY_X_GET_Y') {
                return `Kategori ${cat.name} Beli ${minQty} Gratis ${bonusQty}`;
            }
            if (mode === 'FIXED_PER_UNIT') {
                return `Kategori ${cat.name} Potongan Rp ${val.toLocaleString('id-ID')}/pcs`;
            }
            return `Diskon Kategori ${cat.name} ${val || ''}%`.trim();
        }
        return '';
    };

    const validateRuleInput = (): string | null => {
        if (form.scope === 'PRODUCT_QTY') {
            if (!form.productId || !selectedProduct) return 'Pilih produk target terlebih dahulu.';
            if (form.pricingMode === 'BUY_X_GET_Y') {
                if (form.minQuantity < 1) return 'Jumlah beli (X) minimal 1 pcs.';
                if (form.bonusQuantity < 1) return 'Jumlah bonus gratis (Y) minimal 1 pcs.';
                return null;
            }
            if (form.pricingMode === 'BUNDLE_PRICE' || form.pricingMode === 'UNIT_PRICE') {
                if (form.minQuantity < 2) return 'Minimal jumlah beli grosir minimal 2 pcs.';
            } else if (form.minQuantity < 1) {
                return 'Minimal jumlah beli minimal 1 pcs.';
            }
            if (form.value <= 0) return 'Nilai harga / diskon harus lebih dari 0.';

            if (form.pricingMode === 'BUNDLE_PRICE') {
                const normalBundle = selectedProductPrice * form.minQuantity;
                if (form.value >= normalBundle) {
                    return `Harga paket ${form.minQuantity} pcs harus lebih murah dari harga normal (Rp ${normalBundle.toLocaleString('id-ID')}).`;
                }
            } else if (form.pricingMode === 'UNIT_PRICE') {
                if (form.value >= selectedProductPrice) {
                    return `Harga satuan grosir harus lebih murah dari harga normal (Rp ${selectedProductPrice.toLocaleString('id-ID')}/pcs).`;
                }
            } else if (form.pricingMode === 'FIXED_PER_UNIT') {
                if (form.value >= selectedProductPrice) {
                    return `Potongan per pcs harus lebih kecil dari harga normal (Rp ${selectedProductPrice.toLocaleString('id-ID')}/pcs).`;
                }
            } else if (form.pricingMode === 'PERCENTAGE') {
                if (form.value > 100) return 'Persentase diskon maksimal 100%.';
            }
            return null;
        }

        if (form.scope === 'CATEGORY') {
            if (!form.categoryId || !selectedCategory) return 'Pilih kategori target terlebih dahulu.';
            if (form.minQuantity < 1) return 'Minimal jumlah beli minimal 1 pcs.';
            if (form.pricingMode === 'BUY_X_GET_Y') {
                if (form.bonusQuantity < 1) return 'Jumlah bonus gratis (Y) minimal 1 pcs.';
                return null;
            }
            if (form.value <= 0) return 'Nilai diskon kategori harus lebih dari 0.';
            if (form.pricingMode === 'PERCENTAGE' && form.value > 100) {
                return 'Persentase diskon maksimal 100%.';
            }
            return null;
        }

        // ORDER scope
        if (form.value <= 0) return 'Nilai diskon promo harus lebih dari 0.';
        if (form.type === 'PERCENTAGE' && form.value > 100) return 'Persentase diskon maksimal 100%.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErr = validateRuleInput();
        if (validationErr) {
            toast.error(validationErr);
            return;
        }

        const effectiveName =
            form.name.trim() ||
            buildAutoRuleName(
                form.scope,
                form.pricingMode,
                selectedProduct,
                selectedCategory,
                form.unitLabel,
                form.minQuantity,
                form.bonusQuantity,
                form.value
            );

        if (!effectiveName) {
            toast.error('Nama aturan diskon wajib diisi');
            return;
        }

        const endIso = form.endDate ? `${form.endDate}T23:59:59` : null;

        let payload: Record<string, unknown>;
        if (form.scope === 'PRODUCT_QTY') {
            payload = {
                name: effectiveName,
                scope: 'PRODUCT_QTY',
                productId: Number(form.productId),
                categoryId: null,
                minQuantity: Number(form.minQuantity),
                bonusQuantity: form.pricingMode === 'BUY_X_GET_Y' ? Number(form.bonusQuantity) : 0,
                pricingMode: form.pricingMode,
                unitLabel: form.unitLabel.trim() || null,
                type: form.pricingMode === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
                value: form.pricingMode === 'BUY_X_GET_Y' ? 0 : Number(form.value),
                isActive: form.isActive,
                maxUses: form.maxUses ? Number(form.maxUses) : null,
                code: null,
                minPurchase: 0,
                endDate: endIso,
            };
        } else if (form.scope === 'CATEGORY') {
            payload = {
                name: effectiveName,
                scope: 'CATEGORY',
                productId: null,
                categoryId: Number(form.categoryId),
                minQuantity: Number(form.minQuantity),
                bonusQuantity: form.pricingMode === 'BUY_X_GET_Y' ? Number(form.bonusQuantity) : 0,
                pricingMode: form.pricingMode,
                unitLabel: form.unitLabel.trim() || null,
                type: form.pricingMode === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
                value: form.pricingMode === 'BUY_X_GET_Y' ? 0 : Number(form.value),
                isActive: form.isActive,
                maxUses: form.maxUses ? Number(form.maxUses) : null,
                code: null,
                minPurchase: 0,
                endDate: endIso,
            };
        } else {
            payload = {
                name: effectiveName,
                scope: 'ORDER',
                type: form.type,
                value: Number(form.value),
                maxDiscount: form.type === 'PERCENTAGE' && form.maxDiscount > 0 ? Number(form.maxDiscount) : null,
                autoApply: Boolean(form.autoApply),
                targetTier: form.targetTier || null,
                isActive: form.isActive,
                code: form.autoApply ? null : form.code.trim() || null,
                minPurchase: form.minPurchase ? Number(form.minPurchase) : 0,
                maxUses: form.maxUses ? Number(form.maxUses) : null,
                endDate: endIso,
            };
        }

        try {
            if (editId) {
                await api.put(`/discounts/${editId}`, payload);
                toast.success('Aturan diskon diperbarui');
            } else {
                await api.post('/discounts', payload);
                toast.success('Aturan diskon berhasil ditambahkan');
            }
            setShowModal(false);
            resetForm();
            fetchDiscounts();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Gagal menyimpan aturan diskon'));
        }
    };

    const handleEdit = (d: DiscountRule) => {
        setEditId(d.id);
        setNameEditedManually(true);
        const scope: DiscountScope =
            d.scope === 'PRODUCT_QTY' || d.scope === 'CATEGORY' ? d.scope : 'ORDER';
        const validModes: ItemPricingMode[] = ['BUNDLE_PRICE', 'UNIT_PRICE', 'BUY_X_GET_Y', 'FIXED_PER_UNIT', 'PERCENTAGE'];
        const mode: ItemPricingMode = validModes.includes(d.pricingMode as ItemPricingMode)
            ? (d.pricingMode as ItemPricingMode)
            : scope === 'CATEGORY'
            ? d.type === 'PERCENTAGE'
                ? 'PERCENTAGE'
                : 'FIXED_PER_UNIT'
            : 'BUNDLE_PRICE';

        setForm({
            name: d.name,
            scope,
            type: d.type,
            pricingMode: mode,
            productId: d.productId ? String(d.productId) : '',
            categoryId: d.categoryId ? String(d.categoryId) : '',
            minQuantity: d.minQuantity || (mode === 'BUY_X_GET_Y' ? 3 : scope === 'CATEGORY' ? 1 : 24),
            bonusQuantity: d.bonusQuantity || 1,
            unitLabel: d.unitLabel || '',
            value: Number(d.value) || 0,
            maxDiscount: d.maxDiscount ? Number(d.maxDiscount) : 0,
            autoApply: Boolean(d.autoApply),
            targetTier: d.targetTier || '',
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
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Gagal menghapus aturan diskon'));
        }
    };

    const resetForm = (defaultScope: DiscountScope = 'PRODUCT_QTY') => {
        setNameEditedManually(false);
        setEditId(null);
        setForm({
            ...INITIAL_FORM,
            scope: defaultScope,
            type: defaultScope === 'ORDER' ? 'PERCENTAGE' : 'FIXED',
            pricingMode: defaultScope === 'CATEGORY' ? 'PERCENTAGE' : 'BUNDLE_PRICE',
            minQuantity: defaultScope === 'CATEGORY' ? 1 : 24,
            unitLabel: defaultScope === 'PRODUCT_QTY' ? '1 Kardus' : '',
        });
    };

    const wholesaleCount = discounts.filter((d) => d.scope === 'PRODUCT_QTY').length;
    const categoryCount = discounts.filter((d) => d.scope === 'CATEGORY').length;
    const orderCount = discounts.filter((d) => !d.scope || d.scope === 'ORDER').length;

    const filteredDiscounts = discounts.filter((d) => {
        if (scopeFilter === 'PRODUCT_QTY') return d.scope === 'PRODUCT_QTY';
        if (scopeFilter === 'CATEGORY') return d.scope === 'CATEGORY';
        if (scopeFilter === 'ORDER') return !d.scope || d.scope === 'ORDER';
        return true;
    });

    const previewError = form.scope === 'PRODUCT_QTY' ? validateRuleInput() : null;
    const isBuyXGetY = form.pricingMode === 'BUY_X_GET_Y';
    const previewMinQty = Math.max(1, form.minQuantity || 1);
    const previewBonusQty = Math.max(1, form.bonusQuantity || 1);
    const previewBundleQty = isBuyXGetY ? previewMinQty + previewBonusQty : Math.max(1, previewMinQty);

    const previewDiscountForTarget =
        selectedProductPrice > 0
            ? calculateWholesaleRuleDiscount(selectedProductPrice, previewBundleQty, {
                  minQuantity: previewMinQty,
                  bonusQuantity: previewBonusQty,
                  pricingMode: form.pricingMode,
                  value: form.value,
              })
            : 0;
    const previewNormalTotal = selectedProductPrice * previewBundleQty;
    const previewFinalTotal = Math.max(0, previewNormalTotal - previewDiscountForTarget);
    const previewExtraQty = isBuyXGetY ? previewBundleQty * 2 : previewBundleQty + 1;
    const previewExtraDiscount =
        selectedProductPrice > 0
            ? calculateWholesaleRuleDiscount(selectedProductPrice, previewExtraQty, {
                  minQuantity: previewMinQty,
                  bonusQuantity: previewBonusQty,
                  pricingMode: form.pricingMode,
                  value: form.value,
              })
            : 0;
    const previewExtraTotal = Math.max(0, selectedProductPrice * previewExtraQty - previewExtraDiscount);

    return (
        <VStack gap={4} width="100%">
            <PageHeader
                title="Promosi, Harga Grosir & Diskon"
                subtitle="Atur harga kardus, Beli X Gratis Y, diskon kategori, hingga promo member & struk otomatis"
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

            <div style={{ width: isMobile ? '100%' : 580, maxWidth: '100%' }}>
                <SegmentedControl
                    label="Filter jenis diskon"
                    value={scopeFilter}
                    onChange={setScopeFilter}
                    size="sm"
                    layout="fill"
                >
                    <SegmentedControlItem value="ALL" label={`Semua (${discounts.length})`} />
                    <SegmentedControlItem value="PRODUCT_QTY" label={`Produk / Grosir (${wholesaleCount})`} />
                    <SegmentedControlItem value="CATEGORY" label={`Kategori (${categoryCount})`} />
                    <SegmentedControlItem value="ORDER" label={`Promo Struk (${orderCount})`} />
                </SegmentedControl>
            </div>

            {filteredDiscounts.length > 0 ? (
                <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
                    {filteredDiscounts.map((d) => {
                        const isProductRule = d.scope === 'PRODUCT_QTY';
                        const isCategoryRule = d.scope === 'CATEGORY';
                        const isItemRule = isProductRule || isCategoryRule;
                        const usedCount = d.usedCount ?? d.currentUses ?? 0;
                        const prodPrice = d.product ? Number(d.product.price) : undefined;
                        const itemSummary = isItemRule ? formatWholesaleSummary(d, prodPrice) : null;

                        const scopeLabel = isProductRule
                            ? d.pricingMode === 'BUY_X_GET_Y'
                                ? 'Beli X Gratis Y'
                                : 'Harga Grosir'
                            : isCategoryRule
                            ? 'Promo Kategori'
                            : d.autoApply
                            ? 'Promo Otomatis'
                            : 'Promo Struk';

                        const scopeVariant = isProductRule ? 'success' : isCategoryRule ? 'warning' : 'info';

                        return (
                            <Card key={d.id} padding={3} elevation="none" style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
                                <VStack gap={3} style={{ minWidth: 0, width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, width: '100%', minWidth: 0 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <Badge variant={scopeVariant} label={scopeLabel} />
                                                {d.code && <Badge variant="neutral" label={d.code} />}
                                                {d.targetTier && <Badge variant="neutral" label={`Member ${d.targetTier}+`} />}
                                            </div>
                                            <span style={{ fontSize: 14, fontWeight: 650, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                                {d.name}
                                            </span>
                                            {isProductRule && d.product && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#52525b' }}>
                                                    <Package size={13} color="#71717a" />
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {d.product.name} · Eceran Rp {Number(d.product.price).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            )}
                                            {isCategoryRule && d.category && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#52525b' }}>
                                                    <Layers size={13} color="#71717a" />
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        Semua produk kategori {d.category.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, marginLeft: 'auto' }}>
                                            <IconButton variant="ghost" size="sm" label="Edit" icon={<Pencil size={15} />} onClick={() => handleEdit(d)} />
                                            <IconButton variant="ghost" size="sm" label="Hapus" icon={<Trash2 size={15} />} onClick={() => handleDelete(d.id)} />
                                        </div>
                                    </div>

                                    {isItemRule && itemSummary ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                                                <Heading level={4} weight="bold" style={{ color: '#059669' }}>
                                                    {itemSummary.priceDisplay}
                                                </Heading>
                                                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#3f3f46', backgroundColor: '#f4f4f5', padding: '1px 7px', borderRadius: 999 }}>
                                                    {itemSummary.packageLabel}
                                                </span>
                                            </div>
                                            {itemSummary.savingsHint && (
                                                <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 500 }}>
                                                    {itemSummary.savingsHint}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <Heading level={3} weight="bold">
                                                {d.type === 'PERCENTAGE' ? `${Number(d.value)}%` : `Rp ${Number(d.value).toLocaleString('id-ID')}`}
                                            </Heading>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {Number(d.minPurchase || 0) > 0 && (
                                                    <Text size="xsm" color="secondary">
                                                        Min. belanja Rp {Number(d.minPurchase).toLocaleString('id-ID')}
                                                    </Text>
                                                )}
                                                {Number(d.maxDiscount || 0) > 0 && (
                                                    <Text size="xsm" color="secondary">
                                                        · Maks. potongan Rp {Number(d.maxDiscount).toLocaleString('id-ID')}
                                                    </Text>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <Divider />

                                    <HStack justify="between" align="center">
                                        <HStack gap={1} align="center">
                                            <Badge variant={d.isActive ? 'success' : 'neutral'} label={d.isActive ? 'Aktif' : 'Nonaktif'} />
                                            {d.endDate && (
                                                <Text size="xsm" color="secondary">
                                                    s/d {new Date(d.endDate).toLocaleDateString('id-ID')}
                                                </Text>
                                            )}
                                        </HStack>
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
                    title="Belum ada aturan diskon"
                    description="Buat harga grosir / paket kardus, promo Beli X Gratis Y, diskon kategori, atau promo total belanja."
                />
            )}

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editId ? 'Edit Aturan Diskon' : 'Tambah Aturan Diskon'}
                width={580}
            >
                <form onSubmit={handleSubmit}>
                    <VStack gap={4}>
                        <SegmentedControl
                            label="Jenis Aturan Diskon"
                            value={form.scope}
                            onChange={(v) => {
                                const nextScope = v as DiscountScope;
                                setNameEditedManually(false);
                                setForm((prev) => ({
                                    ...prev,
                                    scope: nextScope,
                                    type: nextScope === 'ORDER' ? 'PERCENTAGE' : 'FIXED',
                                    pricingMode:
                                        nextScope === 'CATEGORY'
                                            ? 'PERCENTAGE'
                                            : nextScope === 'PRODUCT_QTY'
                                            ? 'BUNDLE_PRICE'
                                            : prev.pricingMode,
                                    minQuantity: nextScope === 'CATEGORY' ? 1 : nextScope === 'PRODUCT_QTY' ? 24 : prev.minQuantity,
                                    unitLabel: nextScope === 'PRODUCT_QTY' ? '1 Kardus' : '',
                                    value: 0,
                                    name: '',
                                }));
                            }}
                            layout="fill"
                        >
                            <SegmentedControlItem value="PRODUCT_QTY" label="Per Produk / Grosir" />
                            <SegmentedControlItem value="CATEGORY" label="Per Kategori" />
                            <SegmentedControlItem value="ORDER" label="Promo Struk / Member" />
                        </SegmentedControl>

                        {form.scope === 'PRODUCT_QTY' && (
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
                                        <strong>Otomatis di Kasir:</strong> Mendukung harga paket kardus/lusin, harga grosir per pcs, promo <strong>Beli X Gratis Y</strong>, hingga potongan per pcs.
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
                                                : buildAutoRuleName('PRODUCT_QTY', prev.pricingMode, prod, null, prev.unitLabel, prev.minQuantity, prev.bonusQuantity, prev.value),
                                        }));
                                    }}
                                    hasSearch
                                />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <Text size="sm" weight="medium">Skema Diskon Produk</Text>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                                        {PRODUCT_MODE_OPTIONS.map((opt) => {
                                            const active = form.pricingMode === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        const nextMin = opt.value === 'BUY_X_GET_Y' ? 3 : opt.value === 'BUNDLE_PRICE' || opt.value === 'UNIT_PRICE' ? Math.max(2, form.minQuantity) : form.minQuantity;
                                                        const nextLabel = opt.value === 'BUY_X_GET_Y' ? `Beli ${nextMin} Gratis ${form.bonusQuantity}` : form.unitLabel;
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            pricingMode: opt.value,
                                                            minQuantity: nextMin,
                                                            unitLabel: nextLabel,
                                                            name: nameEditedManually
                                                                ? prev.name
                                                                : buildAutoRuleName('PRODUCT_QTY', opt.value, selectedProduct, null, nextLabel, nextMin, prev.bonusQuantity, prev.value),
                                                        }));
                                                    }}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '8px 10px',
                                                        borderRadius: 8,
                                                        border: active ? '1.5px solid #18181b' : '1px solid #e4e4e7',
                                                        backgroundColor: active ? '#18181b' : '#ffffff',
                                                        color: active ? '#ffffff' : '#18181b',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
                                                    <div style={{ fontSize: 10.5, opacity: active ? 0.85 : 0.65, marginTop: 2 }}>{opt.hint}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {form.pricingMode === 'BUY_X_GET_Y' ? (
                                    <>
                                        <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                            <NumberInput
                                                label="Beli Sebanyak (X pcs) *"
                                                value={form.minQuantity}
                                                onChange={(v) => {
                                                    const nextX = Math.max(1, v || 1);
                                                    const autoLbl = `Beli ${nextX} Gratis ${form.bonusQuantity}`;
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        minQuantity: nextX,
                                                        unitLabel: autoLbl,
                                                        name: nameEditedManually
                                                            ? prev.name
                                                            : buildAutoRuleName('PRODUCT_QTY', 'BUY_X_GET_Y', selectedProduct, null, autoLbl, nextX, prev.bonusQuantity, 0),
                                                    }));
                                                }}
                                                min={1}
                                                isIntegerOnly
                                                isRequired
                                            />
                                            <NumberInput
                                                label="Gratis Sebanyak (Y pcs) *"
                                                value={form.bonusQuantity}
                                                onChange={(v) => {
                                                    const nextY = Math.max(1, v || 1);
                                                    const autoLbl = `Beli ${form.minQuantity} Gratis ${nextY}`;
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        bonusQuantity: nextY,
                                                        unitLabel: autoLbl,
                                                        name: nameEditedManually
                                                            ? prev.name
                                                            : buildAutoRuleName('PRODUCT_QTY', 'BUY_X_GET_Y', selectedProduct, null, autoLbl, prev.minQuantity, nextY, 0),
                                                    }));
                                                }}
                                                min={1}
                                                isIntegerOnly
                                                isRequired
                                            />
                                        </Grid>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {[
                                                { label: 'Beli 1 Gratis 1', x: 1, y: 1 },
                                                { label: 'Beli 2 Gratis 1', x: 2, y: 1 },
                                                { label: 'Beli 3 Gratis 1', x: 3, y: 1 },
                                                { label: 'Beli 5 Gratis 1', x: 5, y: 1 },
                                                { label: 'Beli 10 Gratis 1', x: 10, y: 1 },
                                            ].map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            minQuantity: preset.x,
                                                            bonusQuantity: preset.y,
                                                            unitLabel: preset.label,
                                                            name: nameEditedManually
                                                                ? prev.name
                                                                : buildAutoRuleName('PRODUCT_QTY', 'BUY_X_GET_Y', selectedProduct, null, preset.label, preset.x, preset.y, 0),
                                                        }));
                                                    }}
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '3px 9px',
                                                        borderRadius: 999,
                                                        border: '1px solid #e4e4e7',
                                                        backgroundColor: form.minQuantity === preset.x && form.bonusQuantity === preset.y ? '#18181b' : '#fafafa',
                                                        color: form.minQuantity === preset.x && form.bonusQuantity === preset.y ? '#ffffff' : '#52525b',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
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
                                                            : buildAutoRuleName('PRODUCT_QTY', prev.pricingMode, selectedProduct, null, prev.unitLabel, nextQty, prev.bonusQuantity, prev.value),
                                                    }));
                                                }}
                                                min={form.pricingMode === 'BUNDLE_PRICE' || form.pricingMode === 'UNIT_PRICE' ? 2 : 1}
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
                                                                : buildAutoRuleName('PRODUCT_QTY', prev.pricingMode, selectedProduct, null, v, prev.minQuantity, prev.bonusQuantity, prev.value),
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
                                                                        : buildAutoRuleName('PRODUCT_QTY', prev.pricingMode, selectedProduct, null, preset.unit, preset.qty, prev.bonusQuantity, prev.value),
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
                                                        : form.pricingMode === 'UNIT_PRICE'
                                                        ? `Harga Grosir per Pcs (jika beli ≥ ${form.minQuantity} pcs) *`
                                                        : `Potongan Harga per Pcs (jika beli ≥ ${form.minQuantity} pcs) *`
                                                }
                                                description={
                                                    form.pricingMode === 'BUNDLE_PRICE'
                                                        ? 'Berlaku per kelipatan paket. Sisa eceran tetap dihitung harga normal.'
                                                        : form.pricingMode === 'UNIT_PRICE'
                                                        ? 'Semua item otomatis berubah jadi harga satuan grosir ini jika Qty mencukupi.'
                                                        : 'Setiap unit dikurangi nominal potongan tetap ini jika Qty mencukupi.'
                                                }
                                                value={form.value}
                                                onChange={(v) => setForm({ ...form, value: v })}
                                                isRequired
                                            />
                                        )}
                                    </>
                                )}

                                {selectedProduct && (
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            backgroundColor: previewError ? '#fef2f2' : '#fafafa',
                                            border: previewError ? '1px solid #fecaca' : '1px solid #e4e4e7',
                                            fontSize: 12,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4,
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, color: previewError ? '#b91c1c' : '#18181b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {previewError ? <AlertCircle size={14} /> : isBuyXGetY ? <Gift size={14} color="#059669" /> : <Tag size={14} color="#059669" />}
                                            <span>{previewError ? 'Periksa Aturan Diskon' : 'Simulasi Harga di Kasir'}</span>
                                        </div>
                                        {previewError ? (
                                            <span style={{ color: '#b91c1c' }}>{previewError}</span>
                                        ) : isBuyXGetY ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#3f3f46', fontVariantNumeric: 'tabular-nums' }}>
                                                <span>• Beli {previewMinQty} pcs : <strong>Rp {(selectedProductPrice * previewMinQty).toLocaleString('id-ID')}</strong></span>
                                                <span style={{ color: '#059669' }}>
                                                    • Bawa {previewBundleQty} pcs ({previewMinQty} + {previewBonusQty} Gratis) :{' '}
                                                    <span style={{ textDecoration: 'line-through', color: '#a1a1aa', marginRight: 4 }}>
                                                        Rp {previewNormalTotal.toLocaleString('id-ID')}
                                                    </span>
                                                    <strong>Rp {previewFinalTotal.toLocaleString('id-ID')}</strong> (Gratis Rp {previewDiscountForTarget.toLocaleString('id-ID')})
                                                </span>
                                                <span style={{ fontSize: 11, color: '#71717a' }}>
                                                    • Kelipatan {previewExtraQty} pcs : Bayar Rp {previewExtraTotal.toLocaleString('id-ID')} (Gratis {previewBonusQty * 2} pcs)
                                                </span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, color: '#3f3f46', fontVariantNumeric: 'tabular-nums' }}>
                                                <span>• Beli 1 pcs : <strong>Rp {selectedProductPrice.toLocaleString('id-ID')}</strong></span>
                                                {previewBundleQty > 2 && (
                                                    <span>• Beli {previewBundleQty - 1} pcs : <strong>Rp {(selectedProductPrice * (previewBundleQty - 1)).toLocaleString('id-ID')}</strong></span>
                                                )}
                                                <span style={{ color: '#059669' }}>
                                                    • Beli {previewBundleQty} pcs ({form.unitLabel.trim() || `${previewBundleQty} pcs`}) :{' '}
                                                    <span style={{ textDecoration: 'line-through', color: '#a1a1aa', marginRight: 4 }}>
                                                        Rp {previewNormalTotal.toLocaleString('id-ID')}
                                                    </span>
                                                    <strong>Rp {previewFinalTotal.toLocaleString('id-ID')}</strong>{' '}
                                                    {previewDiscountForTarget > 0 && `(Hemat Rp ${previewDiscountForTarget.toLocaleString('id-ID')})`}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#71717a' }}>
                                                    • Beli {previewExtraQty} pcs : Rp {previewExtraTotal.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {form.scope === 'CATEGORY' && (
                            <>
                                <div
                                    style={{
                                        padding: '9px 12px',
                                        borderRadius: 10,
                                        backgroundColor: '#fffbeb',
                                        border: '1px solid #fde68a',
                                        fontSize: 12,
                                        color: '#92400e',
                                        lineHeight: 1.45,
                                        display: 'flex',
                                        gap: 8,
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <Layers size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>
                                        <strong>Promo Sekategori:</strong> Berlaku otomatis untuk semua item produk & varian dalam kategori yang dipilih tanpa perlu kode voucher.
                                    </span>
                                </div>

                                <Selector
                                    label="Kategori Target *"
                                    placeholder="Pilih kategori produk..."
                                    options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                                    value={form.categoryId}
                                    onChange={(val) => {
                                        const cat = categories.find((c) => String(c.id) === val) || null;
                                        setForm((prev) => ({
                                            ...prev,
                                            categoryId: val,
                                            name: nameEditedManually
                                                ? prev.name
                                                : buildAutoRuleName('CATEGORY', prev.pricingMode, null, cat, prev.unitLabel, prev.minQuantity, prev.bonusQuantity, prev.value),
                                        }));
                                    }}
                                    hasSearch
                                />

                                <SegmentedControl
                                    label="Skema Diskon Kategori"
                                    value={form.pricingMode === 'FIXED_PER_UNIT' || form.pricingMode === 'BUY_X_GET_Y' ? form.pricingMode : 'PERCENTAGE'}
                                    onChange={(v) => {
                                        const nextMode = v as ItemPricingMode;
                                        const nextMin = nextMode === 'BUY_X_GET_Y' ? 3 : 1;
                                        setForm((prev) => ({
                                            ...prev,
                                            pricingMode: nextMode,
                                            minQuantity: nextMin,
                                            name: nameEditedManually
                                                ? prev.name
                                                : buildAutoRuleName('CATEGORY', nextMode, null, selectedCategory, prev.unitLabel, nextMin, prev.bonusQuantity, prev.value),
                                        }));
                                    }}
                                    layout="fill"
                                    size="sm"
                                >
                                    {CATEGORY_MODE_OPTIONS.map((opt) => (
                                        <SegmentedControlItem key={opt.value} value={opt.value} label={opt.label} />
                                    ))}
                                </SegmentedControl>

                                {form.pricingMode === 'BUY_X_GET_Y' ? (
                                    <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                        <NumberInput
                                            label="Beli Sebanyak (X pcs) *"
                                            value={form.minQuantity}
                                            onChange={(v) => {
                                                const nextX = Math.max(1, v || 1);
                                                setForm((prev) => ({
                                                    ...prev,
                                                    minQuantity: nextX,
                                                    name: nameEditedManually
                                                        ? prev.name
                                                        : buildAutoRuleName('CATEGORY', 'BUY_X_GET_Y', null, selectedCategory, prev.unitLabel, nextX, prev.bonusQuantity, 0),
                                                }));
                                            }}
                                            min={1}
                                            isIntegerOnly
                                            isRequired
                                        />
                                        <NumberInput
                                            label="Gratis Sebanyak (Y pcs) *"
                                            value={form.bonusQuantity}
                                            onChange={(v) => {
                                                const nextY = Math.max(1, v || 1);
                                                setForm((prev) => ({
                                                    ...prev,
                                                    bonusQuantity: nextY,
                                                    name: nameEditedManually
                                                        ? prev.name
                                                        : buildAutoRuleName('CATEGORY', 'BUY_X_GET_Y', null, selectedCategory, prev.unitLabel, prev.minQuantity, nextY, 0),
                                                }));
                                            }}
                                            min={1}
                                            isIntegerOnly
                                            isRequired
                                        />
                                    </Grid>
                                ) : (
                                    <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                        {form.pricingMode === 'FIXED_PER_UNIT' ? (
                                            <CurrencyInput
                                                label="Potongan per Pcs (Rp) *"
                                                value={form.value}
                                                onChange={(v) => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        value: v,
                                                        name: nameEditedManually
                                                            ? prev.name
                                                            : buildAutoRuleName('CATEGORY', 'FIXED_PER_UNIT', null, selectedCategory, prev.unitLabel, prev.minQuantity, prev.bonusQuantity, v),
                                                    }));
                                                }}
                                                isRequired
                                            />
                                        ) : (
                                            <NumberInput
                                                label="Persentase Diskon (%) *"
                                                value={form.value}
                                                onChange={(v) => {
                                                    const nextVal = v || 0;
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        value: nextVal,
                                                        name: nameEditedManually
                                                            ? prev.name
                                                            : buildAutoRuleName('CATEGORY', 'PERCENTAGE', null, selectedCategory, prev.unitLabel, prev.minQuantity, prev.bonusQuantity, nextVal),
                                                    }));
                                                }}
                                                min={1}
                                                max={100}
                                                isRequired
                                            />
                                        )}
                                        <NumberInput
                                            label="Minimal Qty Item (pcs)"
                                            value={form.minQuantity}
                                            onChange={(v) => setForm({ ...form, minQuantity: Math.max(1, v || 1) })}
                                            min={1}
                                            isIntegerOnly
                                        />
                                    </Grid>
                                )}
                            </>
                        )}

                        {form.scope === 'ORDER' && (
                            <>
                                <SegmentedControl
                                    label="Tipe Diskon Struk"
                                    value={form.type}
                                    onChange={(v) => setForm({ ...form, type: v })}
                                    layout="fill"
                                >
                                    <SegmentedControlItem value="PERCENTAGE" label="Persentase (%)" />
                                    <SegmentedControlItem value="FIXED" label="Nominal (Rp)" />
                                </SegmentedControl>

                                <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                    {form.type === 'PERCENTAGE' ? (
                                        <NumberInput
                                            label="Nilai Diskon (%) *"
                                            value={form.value}
                                            onChange={(v) => setForm({ ...form, value: v || 0 })}
                                            min={1}
                                            max={100}
                                            isRequired
                                        />
                                    ) : (
                                        <CurrencyInput
                                            label="Nilai Diskon (Rp) *"
                                            value={form.value}
                                            onChange={(v) => setForm({ ...form, value: v })}
                                            isRequired
                                        />
                                    )}
                                    {form.type === 'PERCENTAGE' ? (
                                        <CurrencyInput
                                            label="Maks. Potongan (Opsional, 0 = Bebas)"
                                            value={form.maxDiscount}
                                            onChange={(v) => setForm({ ...form, maxDiscount: v })}
                                        />
                                    ) : (
                                        <CurrencyInput
                                            label="Min. Belanja Total (Rp)"
                                            value={form.minPurchase}
                                            onChange={(v) => setForm({ ...form, minPurchase: v })}
                                        />
                                    )}
                                </Grid>

                                <Grid columns={{ minWidth: 160, max: 2 }} gap={3}>
                                    {form.type === 'PERCENTAGE' && (
                                        <CurrencyInput
                                            label="Min. Belanja Total (Rp)"
                                            value={form.minPurchase}
                                            onChange={(v) => setForm({ ...form, minPurchase: v })}
                                        />
                                    )}
                                    <Selector
                                        label="Khusus Tier Member"
                                        options={TIER_OPTIONS}
                                        value={form.targetTier}
                                        onChange={(val) => setForm({ ...form, targetTier: val })}
                                    />
                                </Grid>

                                <div
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        backgroundColor: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                    }}
                                >
                                    <Switch
                                        label="Terapkan Otomatis di Kasir (Tanpa Kode Promo)"
                                        value={form.autoApply}
                                        onChange={(checked) => setForm({ ...form, autoApply: checked, code: checked ? '' : form.code })}
                                    />
                                    {!form.autoApply ? (
                                        <TextInput
                                            label="Kode Promo (Opsional jika untuk Voucher)"
                                            placeholder="Contoh: HEMAT10"
                                            value={form.code}
                                            onChange={(v) => setForm({ ...form, code: v.toUpperCase() })}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#1d4ed8' }}>
                                            <Crown size={13} />
                                            <span>Diskon langsung aktif begitu total belanja & tier member terpenuhi di keranjang kasir.</span>
                                        </div>
                                    )}
                                </div>

                                {form.value > 0 && (
                                    <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: '#fafafa', border: '1px solid #e4e4e7', fontSize: 12, color: '#3f3f46' }}>
                                        Contoh di belanja Rp 100.000: potongan <strong>Rp {calculateOrderPromoAmount(100000, form.type, form.value, form.maxDiscount).toLocaleString('id-ID')}</strong>
                                        {form.targetTier ? ` (khusus Member ${form.targetTier}+)` : ''}.
                                    </div>
                                )}
                            </>
                        )}

                        <Grid columns={{ minWidth: 160, max: 3 }} gap={3}>
                            <TextInput
                                label="Nama Aturan *"
                                placeholder={form.scope === 'ORDER' ? 'Contoh: Diskon Member Gold 10%' : 'Terisi otomatis atau ketik manual'}
                                value={form.name}
                                onChange={(v) => {
                                    setNameEditedManually(true);
                                    setForm({ ...form, name: v });
                                }}
                                isRequired
                            />
                            <NumberInput
                                label="Batas Pakai (0 = Bebas)"
                                value={form.maxUses}
                                onChange={(v) => setForm({ ...form, maxUses: v || 0 })}
                                min={0}
                                isIntegerOnly
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: '#18181b' }}>Berakhir (Opsional)</label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                    style={{
                                        height: 36,
                                        padding: '0 10px',
                                        borderRadius: 8,
                                        border: '1px solid #e4e4e7',
                                        fontSize: 13,
                                        color: '#18181b',
                                        backgroundColor: '#ffffff',
                                    }}
                                />
                            </div>
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
