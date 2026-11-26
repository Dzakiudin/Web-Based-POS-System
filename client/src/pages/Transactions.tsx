import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, ShoppingCart, Plus, Minus, Trash2, Tag, CheckCircle2,
    Printer, Package, ArrowRight, Camera, Clock, Gift, Sparkles,
    Copy, QrCode, Check, X, Delete, Banknote, ArrowRightLeft, Settings, ImageIcon
} from 'lucide-react';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Badge } from '@astryxdesign/core/Badge';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Banner } from '@astryxdesign/core/Banner';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import { sound } from '../lib/sound';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useStoreSettings } from '../context/StoreSettingsContext';
import useHardwareScanner from '../hooks/useHardwareScanner';
import { getReceiptDiscountLabel, printThermalReceipt } from '../lib/thermalPrinter';
import PageHeader from '../components/PageHeader';
import SafeImage from '../components/SafeImage';
import {
    calculateOrderPromoAmount,
    calculateWholesaleRuleDiscount,
    evaluateWholesaleForProduct,
    formatWholesaleSummary,
    getBuyXGetYNudge,
    isItemRuleCurrentlyEligible,
    isOrderPromoEligible,
    isOrderRuleCurrentlyEligible,
    selectBestAutoOrderPromo,
    tierRank,
    type DiscountRule,
} from '../lib/wholesale';

const CartQtyInput = ({
    quantity,
    maxStock,
    onCommit,
}: {
    quantity: number;
    maxStock: number;
    onCommit: (nextQty: number) => void;
}) => {
    const [draft, setDraft] = useState(String(quantity));
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) {
            setDraft(String(quantity));
        }
    }, [quantity, focused]);

    return (
        <input
            type="text"
            inputMode="numeric"
            aria-label="Jumlah beli"
            value={draft}
            onFocus={(e) => {
                setFocused(true);
                e.currentTarget.select();
            }}
            onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setDraft(digits);
                if (digits) {
                    const parsed = Number(digits);
                    if (parsed >= 1) {
                        onCommit(Math.min(maxStock, parsed));
                    }
                }
            }}
            onBlur={() => {
                setFocused(false);
                const parsed = Number(draft);
                if (!draft || Number.isNaN(parsed) || parsed < 1) {
                    setDraft(String(quantity));
                } else {
                    const clamped = Math.min(maxStock, Math.max(1, Math.floor(parsed)));
                    setDraft(String(clamped));
                    if (clamped !== quantity) onCommit(clamped);
                }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    (e.currentTarget as HTMLInputElement).blur();
                }
            }}
            style={{
                width: 40,
                height: 28,
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: '#18181b',
                backgroundColor: '#fafafa',
                border: focused ? '1.5px solid #18181b' : '1px solid #e4e4e7',
                borderRadius: 6,
                outline: 'none',
            }}
        />
    );
};

const BarcodeScannerModal = lazy(() =>
    import('../components/BarcodeScannerModal').then((m) => ({ default: m.BarcodeScannerModal }))
);

interface Category { id: number; name: string; color: string; }
interface Product {
    id: number; name: string; price: string; costPrice?: string;
    stock: number; minStock?: number; image: string | null;
    sku?: string | null; barcode?: string | null;
    category?: { id: number; name: string; color: string } | null;
}
interface Customer { id: number; name: string; loyaltyPoints: number; membershipTier: string; }
interface CartItem extends Product {
    quantity: number;
    discount: number;
    appliedRuleName?: string | null;
    appliedUnitLabel?: string | null;
    appliedPricingMode?: string | null;
    appliedFreeUnits?: number;
}

export const Transactions = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const { settings } = useStoreSettings();
    const isNarrow = useMediaQuery('(max-width: 1024px)');

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [wholesaleRules, setWholesaleRules] = useState<DiscountRule[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER'>('CASH');
    const [cashPaid, setCashPaid] = useState<number>(0);
    const [paymentRef, setPaymentRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasActiveShift, setHasActiveShift] = useState<boolean>(true);

    // Barcode Scanner & Cart Queue State (Persisted in localStorage)
    const [cameraScanOpen, setCameraScanOpen] = useState(false);
    const [heldOrders, setHeldOrders] = useState<Array<{
        id: string;
        time: string;
        customerId: string;
        customerName: string;
        items: CartItem[];
        promoDiscount: any;
        promoCode: string;
        total: number;
    }>>(() => {
        try {
            const saved = localStorage.getItem('pos_held_orders');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [showHeldModal, setShowHeldModal] = useState(false);

    // Sync held orders to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('pos_held_orders', JSON.stringify(heldOrders));
        } catch (e) {
            console.error('Failed to save held orders', e);
        }
    }, [heldOrders]);

    // Enhanced Payment States
    const [selectedTransferBank, setSelectedTransferBank] = useState<string>('');
    const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

    const [promoCode, setPromoCode] = useState('');
    const [orderPromoRules, setOrderPromoRules] = useState<DiscountRule[]>([]);
    const [autoPromoOptedOut, setAutoPromoOptedOut] = useState(false);
    const [promoDiscount, setPromoDiscount] = useState<{
        id?: number;
        type: string;
        value: number;
        maxDiscount?: number | null;
        minPurchase?: number;
        name: string;
        code?: string | null;
        voucherId?: number;
        autoApply?: boolean;
        targetTier?: string | null;
    } | null>(null);
    const [promoError, setPromoError] = useState('');
    const [successSale, setSuccessSale] = useState<any>(null);

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchCategories();
        fetchWholesaleRules();
        api.get('/cash-sessions/active')
            .then((r) => {
                const active = r.data?.id ? r.data : r.data?.session;
                setHasActiveShift(Boolean(active && active.id));
            })
            .catch(() => setHasActiveShift(false));
    }, []);

    useEffect(() => {
        if (!selectedTransferBank && settings.paymentAccounts.length > 0) {
            setSelectedTransferBank(settings.paymentAccounts[0].bank);
        }
    }, [settings.paymentAccounts, selectedTransferBank]);

    // Barcode Scanning logic (Supports Desktop USB/BT scanner + Mobile camera scanner)
    const handleBarcodeScan = (code: string) => {
        const clean = code.trim().toLowerCase();
        const match = products.find(
            (p) =>
                (p.barcode && p.barcode.toLowerCase() === clean) ||
                (p.sku && p.sku.toLowerCase() === clean) ||
                String(p.id) === clean
        );
        if (match) {
            addToCart(match);
            toast.success(`Discan: ${match.name}`);
        } else {
            sound.playWarning();
            toast.error(`Barcode "${code}" tidak ditemukan dalam daftar produk.`);
        }
    };

    // Hardware USB / Bluetooth Scanner listener (always active except when camera modal is open)
    useHardwareScanner({
        enabled: !cameraScanOpen,
        onScan: (code) => {
            handleBarcodeScan(code);
        },
    });

    // Enterprise Cashier Keyboard Shortcuts (F1: Cari, F2: Bayar, F4: Kosongkan, Esc: Tutup)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                const searchEl = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (searchEl) {
                    searchEl.focus();
                    searchEl.select();
                }
            } else if (e.key === 'F2') {
                e.preventDefault();
                if (cart.length > 0 && !showCheckout) {
                    openCheckout();
                }
            } else if (e.key === 'F4') {
                e.preventDefault();
                if (cart.length > 0 && !showCheckout) {
                    clearCart();
                }
            } else if (e.key === 'Escape') {
                if (showCheckout) {
                    e.preventDefault();
                    setShowCheckout(false);
                } else if (mobileCartOpen) {
                    e.preventDefault();
                    setMobileCartOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart.length, showCheckout, mobileCartOpen]);

    const fetchProducts = async () => {
        try {
            const r = await api.get('/products');
            setProducts(Array.isArray(r.data) ? r.data : []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat katalog produk');
        }
    };
    const fetchCustomers = async () => {
        try {
            const r = await api.get('/customers');
            setCustomers(Array.isArray(r.data) ? r.data : []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat daftar pelanggan');
        }
    };
    const fetchCategories = async () => {
        try {
            const r = await api.get('/categories');
            setCategories(Array.isArray(r.data) ? r.data : []);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || 'Gagal memuat kategori produk');
        }
    };

    const getProductWholesaleRules = (
        product: Pick<Product, 'id' | 'category'>,
        rulesList: DiscountRule[] = wholesaleRules
    ) =>
        rulesList
            .filter(
                (r) =>
                    (r.scope === 'PRODUCT_QTY' && r.productId === product.id) ||
                    (r.scope === 'CATEGORY' && Boolean(product.category?.id) && r.categoryId === product.category?.id)
            )
            .sort((a, b) => Number(a.minQuantity || 0) - Number(b.minQuantity || 0));

    const withWholesaleDiscount = (item: CartItem, rulesList: DiscountRule[] = wholesaleRules): CartItem => {
        const rules = getProductWholesaleRules(item, rulesList);
        const evalRes = evaluateWholesaleForProduct(Number(item.price), item.quantity, rules);
        return {
            ...item,
            discount: evalRes.discountAmount,
            appliedRuleName: evalRes.matchedRule?.name || null,
            appliedUnitLabel: evalRes.matchedRule?.unitLabel || null,
            appliedPricingMode: evalRes.matchedRule?.pricingMode || null,
            appliedFreeUnits: evalRes.freeUnits,
        };
    };

    const fetchWholesaleRules = async () => {
        try {
            const r = await api.get('/discounts');
            const list = Array.isArray(r.data) ? r.data : [];
            const eligibleItemRules = list.filter(isItemRuleCurrentlyEligible);
            const eligibleOrderRules = list.filter(isOrderRuleCurrentlyEligible);
            setWholesaleRules(eligibleItemRules);
            setOrderPromoRules(eligibleOrderRules);
            setCart((prev) => prev.map((it) => withWholesaleDiscount(it, eligibleItemRules)));
        } catch {
            // Non-blocking if user doesn't have wholesale rules
        }
    };

    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            sound.playWarning();
            toast.warning('Stok produk habis');
            return;
        }
        sound.playBeep();
        setCart((prev) => {
            const existing = prev.find((i) => i.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) {
                    toast.warning('Jumlah melebihi stok tersedia');
                    return prev;
                }
                return prev.map((i) =>
                    i.id === product.id ? withWholesaleDiscount({ ...i, quantity: i.quantity + 1 }) : i
                );
            }
            return [...prev, withWholesaleDiscount({ ...product, quantity: 1, discount: 0 })];
        });
    };

    const updateQuantity = (id: number, delta: number) => {
        if (delta > 0) sound.playBeep();
        else sound.playWarning();

        setCart((prev) =>
            prev
                .map((i) => {
                    if (i.id !== id) return i;
                    const newQty = i.quantity + delta;
                    if (newQty > i.stock) return i;
                    return withWholesaleDiscount({ ...i, quantity: newQty });
                })
                .filter((i) => i.quantity > 0)
        );
    };

    const setExactQuantity = (id: number, targetQty: number) => {
        const clamped = Math.max(1, Math.floor(targetQty));
        sound.playBeep();
        setCart((prev) =>
            prev.map((i) => {
                if (i.id !== id) return i;
                if (clamped > i.stock) {
                    toast.warning(`Jumlah melebihi stok tersedia (stok: ${i.stock})`);
                    return withWholesaleDiscount({ ...i, quantity: i.stock });
                }
                return withWholesaleDiscount({ ...i, quantity: clamped });
            })
        );
    };

    const removeFromCart = (id: number) => {
        sound.playWarning();
        setCart((prev) => prev.filter((i) => i.id !== id));
    };

    const clearCart = () => {
        sound.playWarning();
        setCart([]);
        setPromoCode('');
        setPromoDiscount(null);
        setAutoPromoOptedOut(false);
        setPromoError('');
        setSelectedCustomerId('');
    };

    // Hold & Resume Queue Functions (Tahan & Muat Pesanan)
    const holdCurrentOrder = () => {
        if (cart.length === 0) return;
        const cust = customers.find((c) => String(c.id) === selectedCustomerId);
        const newHeld = {
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            customerId: selectedCustomerId,
            customerName: cust ? cust.name : 'Pelanggan Umum',
            items: [...cart],
            promoDiscount,
            promoCode,
            total: grandTotal,
        };
        setHeldOrders((prev) => [newHeld, ...prev]);
        clearCart();
        toast.info(`Pesanan #${newHeld.time} disimpan di antrean`);
    };

    const resumeHeldOrder = (heldId: string) => {
        const target = heldOrders.find((h) => h.id === heldId);
        if (!target) return;
        setCart(target.items.map((it) => withWholesaleDiscount(it)));
        setSelectedCustomerId(target.customerId);
        setPromoDiscount(target.promoDiscount);
        setAutoPromoOptedOut(false);
        setPromoCode(target.promoCode);
        setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));
        setShowHeldModal(false);
        toast.success('Pesanan dimuat kembali ke keranjang');
        sound.playSuccess();
    };

    const deleteHeldOrder = (heldId: string) => {
        setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));
        toast.info('Antrean pesanan dihapus');
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedAccount(text);
        toast.success(`${label} berhasil disalin`);
        setTimeout(() => setCopiedAccount(null), 2000);
    };

    const validatePromo = async (overrideCode?: string) => {
        const targetCode = (overrideCode ?? promoCode).trim();
        if (!targetCode) return;
        setPromoError('');
        try {
            const currentNetSubtotal = cart.reduce(
                (sum, i) => sum + Math.max(0, Number(i.price) * i.quantity - Number(i.discount || 0)),
                0
            );
            const r = await api.post('/discounts/validate', {
                code: targetCode,
                subtotal: currentNetSubtotal,
                customerId: selectedCustomerId ? Number(selectedCustomerId) : null,
            });
            const discountData = r.data.discount || r.data;
            setPromoCode(discountData.code || targetCode);
            setAutoPromoOptedOut(false);
            setPromoDiscount({
                id: discountData.id,
                type: discountData.type,
                value: Number(discountData.value),
                maxDiscount: discountData.maxDiscount ? Number(discountData.maxDiscount) : null,
                minPurchase: discountData.minPurchase ? Number(discountData.minPurchase) : 0,
                name: discountData.name,
                code: discountData.code || targetCode,
                voucherId: discountData.voucherId,
                autoApply: false,
                targetTier: discountData.targetTier || null,
            });
            toast.success(`Promo "${discountData.name}" berhasil diterapkan!`);
        } catch (e: any) {
            const msg = e.response?.data?.message || 'Kode promo tidak valid';
            setPromoError(msg);
            toast.error(msg);
            setPromoDiscount(null);
        }
    };

    const cancelPromo = () => {
        sound.playWarning();
        if (activePromo?.autoApply) {
            setAutoPromoOptedOut(true);
        }
        setPromoDiscount(null);
        setPromoCode('');
        setPromoError('');
        toast.info('Penggunaan voucher/promo dibatalkan');
    };

    const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const itemDiscountTotal = cart.reduce((sum, i) => sum + Number(i.discount || 0), 0);
    const subtotalAfterItemDiscount = Math.max(0, subtotal - itemDiscountTotal);
    const selectedCustomer = customers.find((c) => String(c.id) === selectedCustomerId) || null;
    const bestAutoPromo = selectBestAutoOrderPromo(
        orderPromoRules,
        subtotalAfterItemDiscount,
        selectedCustomer?.membershipTier
    );
    const manualPromoStillValid =
        !promoDiscount ||
        ((!promoDiscount.minPurchase || subtotalAfterItemDiscount >= promoDiscount.minPurchase) &&
            (!promoDiscount.targetTier || tierRank(selectedCustomer?.membershipTier) >= tierRank(promoDiscount.targetTier)));
    const activePromo =
        promoDiscount && manualPromoStillValid
            ? promoDiscount
            : !autoPromoOptedOut && bestAutoPromo
            ? {
                  id: bestAutoPromo.rule.id,
                  type: bestAutoPromo.rule.type,
                  value: Number(bestAutoPromo.rule.value),
                  maxDiscount: bestAutoPromo.rule.maxDiscount ? Number(bestAutoPromo.rule.maxDiscount) : null,
                  minPurchase: bestAutoPromo.rule.minPurchase ? Number(bestAutoPromo.rule.minPurchase) : 0,
                  name: bestAutoPromo.rule.name,
                  code: null as string | null,
                  voucherId: undefined,
                  autoApply: true,
                  targetTier: bestAutoPromo.rule.targetTier || null,
              }
            : null;
    const eligibleCodedPromos = orderPromoRules.filter(
        (r) =>
            !r.autoApply &&
            Boolean(r.code) &&
            isOrderPromoEligible(r, subtotalAfterItemDiscount, selectedCustomer?.membershipTier)
    );
    const promoAmount = activePromo
        ? calculateOrderPromoAmount(
              subtotalAfterItemDiscount,
              activePromo.type,
              activePromo.value,
              activePromo.maxDiscount
          )
        : 0;
    const totalDiscount = itemDiscountTotal + promoAmount;
    const afterDiscount = Math.max(0, subtotal - totalDiscount);
    const taxAmount = settings.taxRate > 0 ? Math.round((afterDiscount * settings.taxRate) / 100) : 0;
    const serviceChargeAmount =
        settings.serviceChargeRate > 0 ? Math.round((afterDiscount * settings.serviceChargeRate) / 100) : 0;
    const grandTotal = afterDiscount + taxAmount + serviceChargeAmount;
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const change = paymentMethod === 'CASH' ? Math.max(0, cashPaid - grandTotal) : 0;

    const openCheckout = () => {
        if (settings.requireOpenShift && !hasActiveShift) {
            sound.playWarning();
            toast.warning('Shift kasir wajib dibuka terlebih dahulu! Silakan buka shift di menu Arus Kas.');
            return;
        }
        setCashPaid(grandTotal);
        setPaymentMethod('CASH');
        setPaymentRef('');
        setMobileCartOpen(false);
        setShowCheckout(true);
    };

    const handleNumpadInput = (val: string) => {
        if (val === 'CLEAR') {
            setCashPaid(0);
            return;
        }
        if (val === 'BACKSPACE') {
            setCashPaid((prev) => Math.floor(prev / 10));
            return;
        }
        if (val === '0') {
            setCashPaid((prev) => (prev === 0 ? 0 : Math.min(999999999999, prev * 10)));
            return;
        }
        if (val === '00') {
            setCashPaid((prev) => (prev === 0 ? 0 : Math.min(999999999999, prev * 100)));
            return;
        }
        if (val === '000') {
            setCashPaid((prev) => (prev === 0 ? 0 : Math.min(999999999999, prev * 1000)));
            return;
        }
        setCashPaid((prev) => {
            const next = Number(`${prev === 0 ? '' : prev}${val}`);
            return Math.min(999999999999, next);
        });
    };

    const handleCompletePayment = async () => {
        if (paymentMethod === 'CASH' && cashPaid < grandTotal) {
            toast.error('Nominal pembayaran tunai kurang dari total');
            return;
        }
        setIsProcessing(true);
        try {
            const mappedMethod = paymentMethod === 'TRANSFER' ? 'EWALLET' : paymentMethod;
            let finalReference = paymentRef.trim();
            if (paymentMethod === 'QRIS') {
                finalReference = finalReference ? `QRIS · ${finalReference}` : `QRIS · TRX-${Date.now().toString().slice(-6)}`;
            } else if (paymentMethod === 'TRANSFER') {
                const bankLabel = selectedTransferBank || settings.paymentAccounts[0]?.bank || 'Bank';
                finalReference = `Transfer ${bankLabel}${finalReference ? ` · ${finalReference}` : ''}`;
            }

            const payload = {
                totalPrice: subtotalAfterItemDiscount,
                discountAmount: promoAmount,
                finalPrice: grandTotal,
                customerId: selectedCustomerId ? Number(selectedCustomerId) : null,
                voucherCode: activePromo?.code || null,
                voucherId: activePromo?.voucherId || null,
                discountId: !activePromo?.voucherId ? activePromo?.id || null : null,
                items: cart.map((i) => {
                    const unitPrice = Number(i.price);
                    const itemDiscount = Number(i.discount || 0);
                    const itemSubtotal = (unitPrice * i.quantity) - itemDiscount;
                    return {
                        productId: i.id,
                        quantity: i.quantity,
                        unitPrice: unitPrice,
                        price: unitPrice,
                        discountAmount: itemDiscount,
                        discount: itemDiscount,
                        subtotal: itemSubtotal,
                    };
                }),
                payments: [
                    {
                        method: mappedMethod,
                        amount: paymentMethod === 'CASH' ? cashPaid : grandTotal,
                        change: paymentMethod === 'CASH' ? change : 0,
                        reference: finalReference || null,
                    },
                ],
            };
            const r = await api.post('/sales', payload);
            sound.playSuccess();
            setSuccessSale({
                ...r.data,
                items: cart.map((i) => ({
                    ...i,
                    subtotal: Number(i.price) * i.quantity - Number(i.discount || 0),
                })),
                paid: paymentMethod === 'CASH' ? cashPaid : grandTotal,
                change,
                method: paymentMethod,
                reference: finalReference,
            });
            setShowCheckout(false);
            clearCart();
            fetchProducts();
            fetchWholesaleRules();
            toast.success('Transaksi berhasil!');
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Gagal memproses transaksi');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.barcode && p.barcode.includes(searchQuery));
        const matchesCategory = activeCategory === 'all' || String(p.category?.id) === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const cartContent = (
        <div className="pos-cart-panel">
            {/* Cart Header & Customer Selector */}
            <div className="pos-cart-header">
                <HStack justify="between" align="center" style={{ width: '100%', minWidth: 0, gap: 8 }}>
                    <HStack gap={1.5} align="center" style={{ flexShrink: 0 }}>
                        <ShoppingCart size={18} />
                        <Heading level={4} weight="semibold">Keranjang</Heading>
                        <Badge variant="neutral" label={totalItems} />
                    </HStack>
                    <HStack gap={1.5} align="center" style={{ flexShrink: 0 }}>
                        {heldOrders.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowHeldModal(true)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '4px 8px',
                                    borderRadius: 8,
                                    border: '1px solid #fde047',
                                    backgroundColor: '#fefce8',
                                    color: '#854d0e',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                                title="Buka daftar antrean pesanan yang ditahan"
                            >
                                <Clock size={13} />
                                <span>Antrean ({heldOrders.length})</span>
                            </button>
                        )}
                        {cart.length > 0 && (
                            <>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    label="Tahan"
                                    icon={<Clock size={13} />}
                                    tooltip="Tahan transaksi pelanggan ini sementara agar bisa melayani pelanggan berikutnya"
                                    onClick={holdCurrentOrder}
                                />
                                <IconButton
                                    variant="ghost"
                                    size="sm"
                                    icon={<Trash2 size={14} color="#71717a" />}
                                    tooltip="Kosongkan Keranjang (F4)"
                                    label="Kosongkan Keranjang"
                                    onClick={clearCart}
                                />
                            </>
                        )}
                    </HStack>
                </HStack>

                <Selector
                    label="Pelanggan"
                    isLabelHidden
                    placeholder="Pelanggan Umum"
                    options={[
                        { value: '', label: 'Pelanggan Umum' },
                        ...customers.map((c) => ({ value: String(c.id), label: `${c.name} (${c.membershipTier})` })),
                    ]}
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    hasSearch
                    size="sm"
                />
            </div>

            {/* Scrollable Cart Items List */}
            <div className="pos-cart-items-scroll">
                <VStack gap={2}>
                    {cart.length > 0 ? (
                        cart.map((item) => {
                            const unitPrice = Number(item.price);
                            const lineGross = unitPrice * item.quantity;
                            const lineDiscount = Number(item.discount || 0);
                            const lineNet = Math.max(0, lineGross - lineDiscount);
                            const prodRules = getProductWholesaleRules(item);
                            const buyXGetYNudge = getBuyXGetYNudge(item.quantity, prodRules);
                            const badgeTitle =
                                item.appliedPricingMode === 'BUY_X_GET_Y' && (item.appliedFreeUnits || 0) > 0
                                    ? `Gratis ${item.appliedFreeUnits} pcs`
                                    : item.appliedUnitLabel?.trim() || item.appliedRuleName || 'Grosir';

                            return (
                                <div key={item.id} className="pos-cart-item-card">
                                    <VStack gap={1.5}>
                                        <HStack justify="between" align="start" gap={2}>
                                            <VStack gap={0.5} style={{ flex: 1, minWidth: 0 }}>
                                                <Text size="sm" weight="semibold" maxLines={1}>{item.name}</Text>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Text size="xsm" color="secondary" hasTabularNumbers>
                                                        Rp {unitPrice.toLocaleString('id-ID')} / pcs
                                                    </Text>
                                                    {lineDiscount > 0 && (
                                                        <span
                                                            style={{
                                                                fontSize: 10.5,
                                                                fontWeight: 700,
                                                                padding: '1px 6px',
                                                                borderRadius: 999,
                                                                backgroundColor: '#dcfce7',
                                                                color: '#15803d',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: '100%',
                                                                display: 'inline-block',
                                                            }}
                                                        >
                                                            {badgeTitle} · Hemat Rp {lineDiscount.toLocaleString('id-ID')}
                                                        </span>
                                                    )}
                                                </div>
                                            </VStack>
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                label="Hapus item"
                                                icon={<Trash2 size={14} color="#a1a1aa" />}
                                                onClick={() => removeFromCart(item.id)}
                                            />
                                        </HStack>
                                        <HStack justify="between" align="center">
                                            <HStack gap={1.5} align="center">
                                                <IconButton variant="secondary" size="sm" label="Kurangi" icon={<Minus size={13} />} onClick={() => updateQuantity(item.id, -1)} />
                                                <CartQtyInput
                                                    quantity={item.quantity}
                                                    maxStock={item.stock}
                                                    onCommit={(nextQty) => setExactQuantity(item.id, nextQty)}
                                                />
                                                <IconButton variant="secondary" size="sm" label="Tambah" icon={<Plus size={13} />} onClick={() => updateQuantity(item.id, 1)} />
                                            </HStack>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                {lineDiscount > 0 && (
                                                    <span style={{ fontSize: 11, color: '#a1a1aa', textDecoration: 'line-through', fontVariantNumeric: 'tabular-nums' }}>
                                                        Rp {lineGross.toLocaleString('id-ID')}
                                                    </span>
                                                )}
                                                <Text size="sm" weight="bold" hasTabularNumbers style={{ color: lineDiscount > 0 ? '#059669' : '#18181b' }}>
                                                    Rp {lineNet.toLocaleString('id-ID')}
                                                </Text>
                                            </div>
                                        </HStack>
                                        {(buyXGetYNudge || prodRules.some((r) => r.pricingMode === 'BUY_X_GET_Y' || Number(r.minQuantity || 0) > 1)) && (
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                                                {buyXGetYNudge && (
                                                    <button
                                                        type="button"
                                                        disabled={item.quantity + buyXGetYNudge.addQty > item.stock}
                                                        onClick={() => setExactQuantity(item.id, item.quantity + buyXGetYNudge.addQty)}
                                                        title={
                                                            item.quantity + buyXGetYNudge.addQty > item.stock
                                                                ? `Stok hanya ${item.stock} pcs (butuh ${item.quantity + buyXGetYNudge.addQty})`
                                                                : undefined
                                                        }
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '3px 9px',
                                                            borderRadius: 6,
                                                            border: '1px solid #86efac',
                                                            backgroundColor: '#16a34a',
                                                            color: '#ffffff',
                                                            cursor: item.quantity + buyXGetYNudge.addQty <= item.stock ? 'pointer' : 'not-allowed',
                                                            opacity: item.quantity + buyXGetYNudge.addQty <= item.stock ? 1 : 0.5,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Gift size={11} />
                                                        <span>
                                                            +{buyXGetYNudge.addQty} Gratis! (Beli {buyXGetYNudge.rule.minQuantity} Gratis {buyXGetYNudge.freeQty})
                                                        </span>
                                                    </button>
                                                )}
                                                {prodRules
                                                    .filter((rule) => rule.pricingMode === 'BUY_X_GET_Y' || Number(rule.minQuantity || 0) > 1)
                                                    .map((rule) => {
                                                        const minQty = Math.max(1, Number(rule.minQuantity || 1));
                                                        if (rule.pricingMode === 'BUY_X_GET_Y') {
                                                            const bonusQty = Math.max(1, Number(rule.bonusQuantity || 1));
                                                            const groupSize = minQty + bonusQty;
                                                            const remainder = item.quantity % groupSize;
                                                            if (remainder >= minQty && buyXGetYNudge?.rule.id === rule.id) {
                                                                return null;
                                                            }
                                                            const targetQty = item.quantity < groupSize ? groupSize : item.quantity + groupSize;
                                                            const canReach = targetQty <= item.stock;
                                                            return (
                                                                <button
                                                                    key={rule.id}
                                                                    type="button"
                                                                    disabled={!canReach}
                                                                    onClick={() => setExactQuantity(item.id, targetQty)}
                                                                    style={{
                                                                        fontSize: 11,
                                                                        fontWeight: 650,
                                                                        padding: '3px 8px',
                                                                        borderRadius: 6,
                                                                        border: '1px solid #bbf7d0',
                                                                        backgroundColor: '#f0fdf4',
                                                                        color: canReach ? '#15803d' : '#a1a1aa',
                                                                        cursor: canReach ? 'pointer' : 'not-allowed',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: 4,
                                                                    }}
                                                                >
                                                                    <Gift size={11} />
                                                                    <span>
                                                                        {item.quantity < groupSize
                                                                            ? `Ambil Beli ${minQty} Gratis ${bonusQty} (${groupSize} pcs)`
                                                                            : `+1 Paket Beli ${minQty} Gratis ${bonusQty}`}
                                                                    </span>
                                                                </button>
                                                            );
                                                        }

                                                        const customLabel = rule.unitLabel?.trim() || '';
                                                        const isApplyMode = item.quantity < minQty;
                                                        const targetQty = isApplyMode ? minQty : item.quantity + minQty;
                                                        const canReach = targetQty <= item.stock;
                                                        const pkgDisc = calculateWholesaleRuleDiscount(unitPrice, minQty, rule);
                                                        const pkgPrice = Math.max(0, unitPrice * minQty - pkgDisc);
                                                        const addBtnLabel = !customLabel
                                                            ? `+${minQty} pcs`
                                                            : /^\d/.test(customLabel)
                                                            ? `+${customLabel} (+${minQty} pcs)`
                                                            : `+1 ${customLabel} (+${minQty} pcs)`;
                                                        const applyBtnLabel = !customLabel
                                                            ? `Jadikan ${minQty} pcs · Rp ${pkgPrice.toLocaleString('id-ID')}`
                                                            : `Jadikan ${customLabel} (${minQty} pcs) · Rp ${pkgPrice.toLocaleString('id-ID')}`;
                                                        return (
                                                            <button
                                                                key={rule.id}
                                                                type="button"
                                                                disabled={!canReach}
                                                                onClick={() => setExactQuantity(item.id, targetQty)}
                                                                style={{
                                                                    fontSize: 11,
                                                                    fontWeight: 650,
                                                                    padding: '3px 8px',
                                                                    borderRadius: 6,
                                                                    border: isApplyMode ? '1px solid #bbf7d0' : '1px solid #e4e4e7',
                                                                    backgroundColor: isApplyMode ? '#f0fdf4' : '#fafafa',
                                                                    color: !canReach ? '#a1a1aa' : isApplyMode ? '#15803d' : '#3f3f46',
                                                                    cursor: canReach ? 'pointer' : 'not-allowed',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                }}
                                                                title={!canReach ? `Stok sisa ${item.stock}, tidak cukup ${targetQty}` : undefined}
                                                            >
                                                                <Package size={11} />
                                                                <span>{isApplyMode ? applyBtnLabel : addBtnLabel}</span>
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </VStack>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '36px 0' }}>
                            <EmptyState title="Keranjang kosong" description="Ketuk produk untuk menambahkan ke pesanan." isCompact />
                        </div>
                    )}
                </VStack>
            </div>

            {/* Docked Cart Summary & Checkout Footer */}
            <div className="pos-cart-footer">
                {/* Promo / Voucher */}
                {activePromo ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <div
                                style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    backgroundColor: '#dcfce7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                {activePromo.autoApply ? <Sparkles size={14} color="#16a34a" /> : <Tag size={14} color="#16a34a" />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', lineHeight: 1.2 }}>
                                    {activePromo.code || (activePromo.autoApply ? 'Promo Otomatis' : 'Diskon Struk')}
                                </div>
                                <div style={{ fontSize: '11px', color: '#15803d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {activePromo.name} ({activePromo.type === 'PERCENTAGE' ? `${activePromo.value}%` : `Rp ${Number(activePromo.value).toLocaleString('id-ID')}`}
                                    {activePromo.maxDiscount ? `, maks Rp ${Number(activePromo.maxDiscount).toLocaleString('id-ID')}` : ''})
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={cancelPromo}
                            title="Batalkan penggunaan voucher/promo"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginLeft: '8px',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                            }}
                        >
                            <X size={13} />
                            <span>Batalkan</span>
                        </button>
                    </div>
                ) : (
                    <>
                        <HStack gap={2} align="end">
                            <TextInput
                                label="Kode promo"
                                isLabelHidden
                                placeholder="Kode promo / voucher..."
                                value={promoCode}
                                onChange={(v) => {
                                    setPromoCode(v.toUpperCase());
                                    if (promoError) setPromoError('');
                                }}
                                size="sm"
                                startIcon={<Tag size={14} />}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        validatePromo();
                                    }
                                }}
                            />
                            <Button variant="secondary" size="sm" label="Pakai" onClick={() => validatePromo()} />
                        </HStack>
                        {(eligibleCodedPromos.length > 0 || (autoPromoOptedOut && bestAutoPromo)) && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                {autoPromoOptedOut && bestAutoPromo && (
                                    <button
                                        type="button"
                                        onClick={() => setAutoPromoOptedOut(false)}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 650,
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            border: '1px solid #bbf7d0',
                                            backgroundColor: '#f0fdf4',
                                            color: '#15803d',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        + Aktifkan {bestAutoPromo.rule.name}
                                    </button>
                                )}
                                {eligibleCodedPromos.map((cp) => (
                                    <button
                                        key={cp.id}
                                        type="button"
                                        onClick={() => validatePromo(cp.code || '')}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 650,
                                            padding: '2px 8px',
                                            borderRadius: 999,
                                            border: '1px solid #bfdbfe',
                                            backgroundColor: '#eff6ff',
                                            color: '#1d4ed8',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {cp.code} · {cp.type === 'PERCENTAGE' ? `${cp.value}%` : `Rp ${Number(cp.value).toLocaleString('id-ID')}`}
                                    </button>
                                ))}
                            </div>
                        )}
                        {promoError && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>
                                <X size={12} />
                                <span>{promoError}</span>
                            </div>
                        )}
                    </>
                )}

                {promoDiscount && !manualPromoStillValid && cart.length > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '6px 10px',
                            borderRadius: 8,
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a',
                            color: '#92400e',
                            fontSize: 11,
                        }}
                    >
                        <span>
                            Promo <strong>{promoDiscount.code || promoDiscount.name}</strong> nonaktif sementara (
                            {promoDiscount.minPurchase && subtotalAfterItemDiscount < promoDiscount.minPurchase
                                ? `min. belanja Rp ${Number(promoDiscount.minPurchase).toLocaleString('id-ID')}`
                                : `khusus Member ${promoDiscount.targetTier}+`}
                            ).
                        </span>
                        <button
                            type="button"
                            onClick={cancelPromo}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#b45309',
                                fontWeight: 700,
                                fontSize: 11,
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            Lepas
                        </button>
                    </div>
                )}

                {/* Totals */}
                <VStack gap={1.5} style={{ paddingTop: 2 }}>
                    <HStack justify="between">
                        <Text size="sm" color="secondary">Subtotal</Text>
                        <span className="pos-table-num-cell" style={{ fontSize: 13.5, fontWeight: 500 }}>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </HStack>
                    {itemDiscountTotal > 0 && (
                        <HStack justify="between">
                            <Text size="sm" color="secondary">Diskon Produk</Text>
                            <span className="pos-table-num-cell" style={{ color: '#059669', fontSize: 13.5, fontWeight: 600 }}>- Rp {itemDiscountTotal.toLocaleString('id-ID')}</span>
                        </HStack>
                    )}
                    {promoAmount > 0 && (
                        <HStack justify="between">
                            <Text size="sm" color="secondary">Diskon Promo</Text>
                            <span className="pos-table-num-cell" style={{ color: '#059669', fontSize: 13.5, fontWeight: 600 }}>- Rp {promoAmount.toLocaleString('id-ID')}</span>
                        </HStack>
                    )}
                    {taxAmount > 0 && (
                        <HStack justify="between">
                            <Text size="sm" color="secondary">PPN ({settings.taxRate}%)</Text>
                            <span className="pos-table-num-cell" style={{ fontSize: 13.5, fontWeight: 500 }}>Rp {taxAmount.toLocaleString('id-ID')}</span>
                        </HStack>
                    )}
                    {serviceChargeAmount > 0 && (
                        <HStack justify="between">
                            <Text size="sm" color="secondary">Biaya Layanan ({settings.serviceChargeRate}%)</Text>
                            <span className="pos-table-num-cell" style={{ fontSize: 13.5, fontWeight: 500 }}>Rp {serviceChargeAmount.toLocaleString('id-ID')}</span>
                        </HStack>
                    )}
                    <div style={{ borderTop: '1px dashed #e4e4e7', margin: '4px 0' }} />
                    <HStack justify="between" align="center">
                        <Heading level={4} weight="bold">Total Tagihan</Heading>
                        <Heading level={3} weight="bold" style={{ color: '#059669' }}>Rp {grandTotal.toLocaleString('id-ID')}</Heading>
                    </HStack>
                </VStack>

                <Button
                    variant="primary"
                    size="lg"
                    label={isNarrow ? `Bayar · Rp ${grandTotal.toLocaleString('id-ID')}` : `Bayar (F2) · Rp ${grandTotal.toLocaleString('id-ID')}`}
                    isDisabled={cart.length === 0}
                    width="100%"
                    onClick={openCheckout}
                />
            </div>
        </div>
    );

    return (
        <>
            <Layout
                height="fill"
                content={
                    <LayoutContent padding={isNarrow ? 3 : 4} isScrollable>
                        <VStack gap={3} style={{ paddingBottom: isNarrow ? 100 : 0 }}>
                            <PageHeader
                                title="Kasir & Transaksi POS"
                                subtitle="Katalog produk, pemindaian barcode, dan pemrosesan pesanan kasir"
                                actions={
                                    !isNarrow ? (
                                        <HStack gap={2} align="center">
                                            {heldOrders.length > 0 && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    icon={<Clock size={14} />}
                                                    label={`Antrean (${heldOrders.length})`}
                                                    onClick={() => setShowHeldModal(true)}
                                                />
                                            )}
                                            <div
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '5px 10px',
                                                    borderRadius: 8,
                                                    backgroundColor: '#f4f4f5',
                                                    border: '1px solid #e4e4e7',
                                                    fontSize: 12,
                                                    color: '#52525b',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                                                <span>Scanner USB Siap</span>
                                            </div>
                                        </HStack>
                                    ) : undefined
                                }
                            />

                            {/* Search Bar & Camera Barcode Scanner Trigger */}
                            <VStack gap={2}>
                                <HStack gap={2} align="center" width="100%">
                                    <div style={{ flex: 1, minWidth: 0, maxWidth: isNarrow ? '100%' : 380 }}>
                                        <TextInput
                                            label="Cari produk atau scan barcode"
                                            isLabelHidden
                                            type="search"
                                            placeholder="Cari nama, SKU, barcode (F1)..."
                                            value={searchQuery}
                                            onChange={(v) => setSearchQuery(v)}
                                            onEnter={() => {
                                                const clean = searchQuery.trim().toLowerCase();
                                                const match = products.find(
                                                    (p) =>
                                                        (p.barcode && p.barcode.toLowerCase() === clean) ||
                                                        (p.sku && p.sku.toLowerCase() === clean) ||
                                                        p.name.toLowerCase().includes(clean)
                                                );
                                                if (match) {
                                                    addToCart(match);
                                                    setSearchQuery('');
                                                }
                                            }}
                                            startIcon={<Search size={16} />}
                                            hasClear
                                            width="100%"
                                        />
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        icon={<Camera size={16} />}
                                        label={isNarrow ? 'Scan' : 'Scan Kamera'}
                                        onClick={() => setCameraScanOpen(true)}
                                    />
                                    {!isNarrow && (
                                        <div
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '6px 12px',
                                                borderRadius: 8,
                                                backgroundColor: '#f4f4f5',
                                                border: '1px solid #e4e4e7',
                                                fontSize: 12,
                                                color: '#52525b',
                                                fontWeight: 500,
                                            }}
                                        >
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                                            <span>Scanner Barcode USB Siap</span>
                                        </div>
                                    )}
                                </HStack>

                                {/* Horizontal Scrollable Category Track with Count Badges */}
                                <div className="pos-category-scroll">
                                    <button
                                        type="button"
                                        onClick={() => setActiveCategory('all')}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: 999,
                                            fontSize: 13,
                                            fontWeight: activeCategory === 'all' ? 650 : 500,
                                            backgroundColor: activeCategory === 'all' ? '#18181b' : '#ffffff',
                                            color: activeCategory === 'all' ? '#ffffff' : '#3f3f46',
                                            border: activeCategory === 'all' ? '1px solid #18181b' : '1px solid #e4e4e7',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            flexShrink: 0,
                                            transition: 'all 140ms ease',
                                        }}
                                    >
                                        <span>Semua</span>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '1px 6px',
                                                borderRadius: 999,
                                                backgroundColor: activeCategory === 'all' ? 'rgba(255,255,255,0.22)' : '#f4f4f5',
                                                color: activeCategory === 'all' ? '#ffffff' : '#71717a',
                                            }}
                                        >
                                            {products.length}
                                        </span>
                                    </button>
                                    {categories.map((cat) => {
                                        const count = products.filter((p) => p.category?.id === cat.id).length;
                                        const isActive = activeCategory === String(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setActiveCategory(String(cat.id))}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: 999,
                                                    fontSize: 13,
                                                    fontWeight: isActive ? 650 : 500,
                                                    backgroundColor: isActive ? '#18181b' : '#ffffff',
                                                    color: isActive ? '#ffffff' : '#3f3f46',
                                                    border: isActive ? '1px solid #18181b' : '1px solid #e4e4e7',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    flexShrink: 0,
                                                    transition: 'all 140ms ease',
                                                }}
                                            >
                                                <span>{cat.name}</span>
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        padding: '1px 6px',
                                                        borderRadius: 999,
                                                        backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : '#f4f4f5',
                                                        color: isActive ? '#ffffff' : '#71717a',
                                                    }}
                                                >
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </VStack>

                            {/* Product Grid */}
                            {filteredProducts.length > 0 ? (
                                <Grid columns={{ minWidth: isNarrow ? 145 : 180, max: 5 }} gap={isNarrow ? 2 : 3}>
                                    {filteredProducts.map((p) => {
                                        const inCart = cart.find((c) => c.id === p.id);
                                        const isOut = p.stock <= 0;
                                        const prodRules = getProductWholesaleRules(p);
                                        const firstRuleSummary = prodRules.length > 0 ? formatWholesaleSummary(prodRules[0], Number(p.price)) : null;
                                        const cardBadgeText =
                                            prodRules[0]?.pricingMode === 'BUY_X_GET_Y'
                                                ? `Beli ${prodRules[0].minQuantity} Gratis ${prodRules[0].bonusQuantity}`
                                                : prodRules[0]?.scope === 'CATEGORY'
                                                ? 'Promo'
                                                : 'Grosir';
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => !isOut && addToCart(p)}
                                                style={{
                                                    borderRadius: 12,
                                                    backgroundColor: '#ffffff',
                                                    border: inCart ? '1.5px solid #18181b' : '1px solid #e4e4e7',
                                                    padding: 10,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                    cursor: isOut ? 'not-allowed' : 'pointer',
                                                    opacity: isOut ? 0.65 : 1,
                                                    boxShadow: inCart ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
                                                    transition: 'all 140ms cubic-bezier(0.16, 1, 0.3, 1)',
                                                    position: 'relative',
                                                    userSelect: 'none',
                                                }}
                                                className="pos-interactive-card"
                                            >
                                                <div
                                                    style={{
                                                        width: '100%',
                                                        aspectRatio: '4 / 3',
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        backgroundColor: '#f4f4f5',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {p.image ? (
                                                        <SafeImage
                                                            src={p.image}
                                                            alt={p.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            fallback={<Package size={26} color="#a1a1aa" />}
                                                        />
                                                    ) : (
                                                        <Package size={26} color="#a1a1aa" />
                                                    )}

                                                    {prodRules.length > 0 && !isOut && (
                                                        <div style={{ position: 'absolute', bottom: 5, left: 5 }}>
                                                            <span
                                                                style={{
                                                                    fontSize: 10,
                                                                    fontWeight: 700,
                                                                    padding: '2px 6px',
                                                                    borderRadius: 6,
                                                                    backgroundColor: 'rgba(22, 163, 74, 0.92)',
                                                                    color: '#ffffff',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 3,
                                                                }}
                                                            >
                                                                <Tag size={9} />
                                                                {cardBadgeText}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Stock status overlay */}
                                                    {isOut ? (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                backgroundColor: 'rgba(255,255,255,0.75)',
                                                                backdropFilter: 'blur(2px)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                            }}
                                                        >
                                                            <Badge variant="error" label="Habis" />
                                                        </div>
                                                    ) : (
                                                        <div style={{ position: 'absolute', top: 5, right: 5 }}>
                                                            <span
                                                                style={{
                                                                    fontSize: 10,
                                                                    fontWeight: 650,
                                                                    padding: '2px 6px',
                                                                    borderRadius: 6,
                                                                    backgroundColor: p.stock <= 5 ? '#fef2f2' : 'rgba(255, 255, 255, 0.94)',
                                                                    color: p.stock <= 5 ? '#dc2626' : '#52525b',
                                                                    border: p.stock <= 5 ? '1px solid #fecaca' : '1px solid rgba(0,0,0,0.06)',
                                                                    backdropFilter: 'blur(4px)',
                                                                }}
                                                            >
                                                                {p.stock <= 5 ? `Sisa ${p.stock}` : `Stok ${p.stock}`}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <VStack gap={1} style={{ flex: 1, justifyContent: 'space-between' }}>
                                                    <div>
                                                        <Text size="sm" weight="semibold" maxLines={2} style={{ lineHeight: 1.3 }}>
                                                            {p.name}
                                                        </Text>
                                                        {firstRuleSummary && (
                                                            <div style={{ fontSize: 10.5, color: '#15803d', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {firstRuleSummary.packageLabel}: {firstRuleSummary.priceDisplay}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <HStack justify="between" align="center" gap={1} style={{ marginTop: 'auto', paddingTop: 2, minWidth: 0 }}>
                                                        <span
                                                            style={{
                                                                color: '#09090b',
                                                                fontSize: isNarrow && inCart ? 12 : 13.5,
                                                                fontWeight: 700,
                                                                fontVariantNumeric: 'tabular-nums',
                                                                whiteSpace: 'nowrap',
                                                                letterSpacing: '-0.02em',
                                                            }}
                                                        >
                                                            Rp {Number(p.price).toLocaleString('id-ID')}
                                                        </span>

                                                        {inCart ? (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: isNarrow ? 2 : 3,
                                                                    backgroundColor: '#f4f4f5',
                                                                    borderRadius: 8,
                                                                    padding: isNarrow ? '2px 3px' : '2px 4px',
                                                                    border: '1px solid #e4e4e7',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="pos-quick-stepper-btn"
                                                                    onClick={() => updateQuantity(p.id, -1)}
                                                                    style={{ width: isNarrow ? 19 : 22, height: isNarrow ? 19 : 22, borderRadius: 5 }}
                                                                >
                                                                    <Minus size={10} />
                                                                </button>
                                                                <span
                                                                    style={{
                                                                        fontSize: isNarrow ? 11.5 : 12,
                                                                        fontWeight: 700,
                                                                        minWidth: isNarrow ? 14 : 16,
                                                                        textAlign: 'center',
                                                                        fontVariantNumeric: 'tabular-nums',
                                                                    }}
                                                                >
                                                                    {inCart.quantity}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    className="pos-quick-stepper-btn"
                                                                    onClick={() => updateQuantity(p.id, 1)}
                                                                    style={{ width: isNarrow ? 19 : 22, height: isNarrow ? 19 : 22, borderRadius: 5 }}
                                                                >
                                                                    <Plus size={10} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: 26,
                                                                    height: 26,
                                                                    borderRadius: 8,
                                                                    backgroundColor: '#f4f4f5',
                                                                    border: '1px solid #e4e4e7',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: '#18181b',
                                                                }}
                                                            >
                                                                <Plus size={14} />
                                                            </div>
                                                        )}
                                                    </HStack>
                                                </VStack>
                                            </div>
                                        );
                                    })}
                                </Grid>
                            ) : (
                                <EmptyState icon={<Package size={28} />} title="Produk tidak ditemukan" isCompact />
                            )}
                        </VStack>
                    </LayoutContent>
                }
                end={
                    isNarrow ? undefined : (
                        <LayoutPanel width={380} hasDivider padding={0} isScrollable={false}>
                            {cartContent}
                        </LayoutPanel>
                    )
                }
            />

            {/* Mobile Floating Cart Capsule */}
            {isNarrow && cart.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 'calc(76px + env(safe-area-inset-bottom, 8px))',
                        left: 12,
                        right: 12,
                        zIndex: 40,
                    }}
                >
                    <div
                        className="pos-floating-cart-pill"
                        onClick={() => setMobileCartOpen(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            gap: 12,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                                style={{
                                    position: 'relative',
                                    width: 38,
                                    height: 38,
                                    borderRadius: 12,
                                    backgroundColor: 'rgba(255, 255, 255, 0.14)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                }}
                            >
                                <ShoppingCart size={19} />
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -4,
                                        minWidth: 18,
                                        height: 18,
                                        borderRadius: 9,
                                        backgroundColor: '#22c55e',
                                        color: '#ffffff',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    {totalItems}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', fontWeight: 500, letterSpacing: 0.3 }}>
                                        TOTAL PESANAN
                                    </span>
                                    {totalDiscount > 0 && (
                                        <span
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '1px 6px',
                                                borderRadius: 999,
                                                backgroundColor: 'rgba(34, 197, 94, 0.22)',
                                                color: '#86efac',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            Hemat Rp {totalDiscount.toLocaleString('id-ID')}
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: 16, fontWeight: 750, color: '#ffffff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                                    Rp {grandTotal.toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 9999,
                                backgroundColor: '#ffffff',
                                color: '#09090b',
                                fontSize: 13,
                                fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            }}
                        >
                            <span>Bayar</span>
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Cart BottomSheet */}
            <BottomSheet
                isOpen={mobileCartOpen}
                onOpenChange={setMobileCartOpen}
                label="Keranjang Belanja"
                height="tall"
                padding={0}
            >
                {cartContent}
            </BottomSheet>

            {/* Checkout Modal */}
            <Modal isOpen={showCheckout} onClose={() => setShowCheckout(false)} title="Pembayaran" width={520}>
                <VStack gap={4}>
                    {/* Rincian Tagihan & Potongan Harga / Diskon */}
                    <div className="pos-checkout-breakdown">
                        <div className="pos-checkout-row">
                            <span>Subtotal Belanja ({totalItems} item)</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#334155' }}>
                                Rp {subtotal.toLocaleString('id-ID')}
                            </span>
                        </div>

                        {itemDiscountTotal > 0 && (
                            <div className="pos-checkout-row" style={{ color: '#059669', fontWeight: 600 }}>
                                <span>Diskon Produk</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
                                    - Rp {itemDiscountTotal.toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}

                        {promoAmount > 0 && (
                            <div className="pos-checkout-row" style={{ color: '#059669', fontWeight: 600 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Tag size={12} />
                                    <span>{activePromo?.code ? `Voucher Promo (${activePromo.code})` : activePromo?.name || 'Diskon Promo'}</span>
                                </span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
                                    - Rp {promoAmount.toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}

                        {taxAmount > 0 && (
                            <div className="pos-checkout-row">
                                <span>PPN ({settings.taxRate}%)</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
                                    Rp {taxAmount.toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}
                        {serviceChargeAmount > 0 && (
                            <div className="pos-checkout-row">
                                <span>Biaya Layanan ({settings.serviceChargeRate}%)</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
                                    Rp {serviceChargeAmount.toLocaleString('id-ID')}
                                </span>
                            </div>
                        )}

                        <div className="pos-checkout-divider" />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Total Tagihan</span>
                            <span style={{ fontSize: 18, fontWeight: 750, fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', color: '#059669' }}>
                                Rp {grandTotal.toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    <VStack gap={1.5}>
                        <Text size="sm" weight="medium">Metode Pembayaran</Text>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {[
                                { id: 'CASH', label: 'Tunai', icon: Banknote },
                                { id: 'QRIS', label: 'QRIS', icon: QrCode },
                                { id: 'TRANSFER', label: 'Transfer', icon: ArrowRightLeft },
                            ].map((m) => {
                                const Icon = m.icon;
                                const isSel = paymentMethod === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setPaymentMethod(m.id as 'CASH' | 'QRIS' | 'TRANSFER')}
                                        className={`pos-pay-tab-btn ${isSel ? 'pos-pay-tab-btn-active' : ''}`}
                                    >
                                        <Icon size={14} />
                                        <span>{m.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </VStack>

                    {/* 1. TUNAI / CASH */}
                    {paymentMethod === 'CASH' && (
                        <VStack gap={3}>
                            {/* Display Input Uang Diterima berformat Currency */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#64748b' }}>
                                    <span style={{ fontWeight: 600, color: '#334155' }}>Uang Diterima</span>
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Ketik nominal atau tekan tombol kalkulator</span>
                                </div>
                                
                                <div className="pos-numpad-display-box">
                                    <span style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', userSelect: 'none', marginRight: 8 }}>Rp</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className="pos-numpad-input"
                                        placeholder="0"
                                        value={cashPaid === 0 ? '' : cashPaid.toLocaleString('id-ID')}
                                        onChange={(e) => {
                                             const raw = e.target.value.replace(/\D/g, '');
                                             setCashPaid(raw ? Math.min(999999999999, Number(raw)) : 0);
                                        }}
                                    />
                                    {cashPaid > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setCashPaid(0)}
                                            style={{ color: '#94a3b8', background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            title="Reset ke 0"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Tombol Pecahan Cepat (Quick Cash Chips) */}
                            <div className="pos-cash-chips-row">
                                <button
                                    type="button"
                                    onClick={() => setCashPaid(grandTotal)}
                                    className={`pos-cash-chip ${cashPaid === grandTotal ? 'pos-cash-chip-active' : ''}`}
                                >
                                    Uang Pas (Rp {grandTotal.toLocaleString('id-ID')})
                                </button>
                                {[
                                    { label: '50k', amount: 50000 },
                                    { label: '100k', amount: 100000 },
                                    { label: '200k', amount: 200000 },
                                ].map(({ label, amount }) => (
                                    <button
                                        key={amount}
                                        type="button"
                                        onClick={() => setCashPaid(amount)}
                                        className={`pos-cash-chip ${cashPaid === amount ? 'pos-cash-chip-active' : ''}`}
                                    >
                                        {label} (Rp {amount.toLocaleString('id-ID')})
                                    </button>
                                ))}
                                {grandTotal > 200000 && (
                                    <button
                                        type="button"
                                        onClick={() => setCashPaid(Math.ceil(grandTotal / 50000) * 50000)}
                                        className={`pos-cash-chip ${cashPaid === Math.ceil(grandTotal / 50000) * 50000 ? 'pos-cash-chip-active' : ''}`}
                                    >
                                        Bulat Rp {(Math.ceil(grandTotal / 50000) * 50000).toLocaleString('id-ID')}
                                    </button>
                                )}
                            </div>

                            {/* Kalkulator Numpad Virtual */}
                            <div className="pos-numpad-grid">
                                {/* Baris 1 */}
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('1')}
                                    className="pos-numpad-btn"
                                >
                                    1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('2')}
                                    className="pos-numpad-btn"
                                >
                                    2
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('3')}
                                    className="pos-numpad-btn"
                                >
                                    3
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('CLEAR')}
                                    className="pos-numpad-btn pos-numpad-btn-danger"
                                >
                                    C (Reset)
                                </button>

                                {/* Baris 2 */}
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('4')}
                                    className="pos-numpad-btn"
                                >
                                    4
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('5')}
                                    className="pos-numpad-btn"
                                >
                                    5
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('6')}
                                    className="pos-numpad-btn"
                                >
                                    6
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('BACKSPACE')}
                                    className="pos-numpad-btn"
                                    title="Hapus Digit Terakhir"
                                >
                                    <Delete size={18} />
                                </button>

                                {/* Baris 3 */}
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('7')}
                                    className="pos-numpad-btn"
                                >
                                    7
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('8')}
                                    className="pos-numpad-btn"
                                >
                                    8
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('9')}
                                    className="pos-numpad-btn"
                                >
                                    9
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashPaid((prev) => prev + 50000)}
                                    className="pos-numpad-btn pos-numpad-btn-accent"
                                    title="Tambah 50.000"
                                >
                                    +50rb
                                </button>

                                {/* Baris 4 */}
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('0')}
                                    className="pos-numpad-btn"
                                >
                                    0
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('00')}
                                    className="pos-numpad-btn"
                                >
                                    00
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleNumpadInput('000')}
                                    className="pos-numpad-btn"
                                >
                                    000
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCashPaid((prev) => prev + 100000)}
                                    className="pos-numpad-btn pos-numpad-btn-accent"
                                    title="Tambah 100.000"
                                >
                                    +100rb
                                </button>
                            </div>

                            {/* Status Kembalian / Kekurangan Realtime */}
                            <div className={`pos-change-banner ${
                                cashPaid >= grandTotal ? 'pos-change-banner-success' : 'pos-change-banner-warning'
                            }`}>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: cashPaid >= grandTotal ? '#065f46' : '#92400e' }}>
                                        {cashPaid >= grandTotal ? 'Kembalian Pelanggan' : 'Uang Masih Kurang'}
                                    </div>
                                    <div style={{ fontSize: 11, color: cashPaid >= grandTotal ? '#047857' : '#b45309' }}>
                                        {cashPaid >= grandTotal ? 'Uang kembalian yang harus diserahkan' : 'Nominal pembayaran belum mencukupi'}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: 18,
                                    fontWeight: 750,
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontVariantNumeric: 'tabular-nums',
                                    color: cashPaid >= grandTotal ? '#059669' : '#e11d48'
                                }}>
                                    Rp {Math.abs(cashPaid - grandTotal).toLocaleString('id-ID')}
                                </div>
                            </div>
                        </VStack>
                    )}

                    {/* 2. QRIS (Foto QRIS Resmi Toko) */}
                    {paymentMethod === 'QRIS' && (
                        <VStack gap={3} width="100%">
                            <div
                                style={{
                                    width: '100%',
                                    backgroundColor: '#ffffff',
                                    border: '1.5px solid #e4e4e7',
                                    borderRadius: 14,
                                    padding: 16,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 12,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        width: '100%',
                                        borderBottom: '1px solid #f4f4f5',
                                        paddingBottom: 8,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <QrCode size={18} color="#dc2626" />
                                        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.04em', color: '#18181b' }}>
                                            QRIS PEMBAYARAN
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                                        Rp {grandTotal.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                {settings.qrisImageUrl ? (
                                    <>
                                        <div
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                padding: 8,
                                                backgroundColor: '#fafafa',
                                                borderRadius: 12,
                                                border: '1px solid #f4f4f5',
                                            }}
                                        >
                                            <SafeImage
                                                src={settings.qrisImageUrl}
                                                alt={`QRIS ${settings.storeName}`}
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: 280,
                                                    objectFit: 'contain',
                                                    borderRadius: 8,
                                                }}
                                            />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#18181b' }}>
                                                {settings.storeName}
                                            </div>
                                            <div style={{ fontSize: 11.5, color: '#71717a', marginTop: 2 }}>
                                                Minta pelanggan scan QRIS di atas lalu pastikan dana masuk sebelum menyelesaikan transaksi.
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <VStack gap={2} align="center" style={{ padding: '20px 8px', textAlign: 'center' }}>
                                        <div
                                            style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 12,
                                                backgroundColor: '#f4f4f5',
                                                color: '#71717a',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <ImageIcon size={22} />
                                        </div>
                                        <Text size="sm" weight="semibold">Foto QRIS Toko Belum Diunggah</Text>
                                        <Text size="xsm" color="secondary">
                                            Unggah foto QRIS resmi toko Anda di halaman Pengaturan Aplikasi agar muncul di sini.
                                        </Text>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={<Settings size={14} />}
                                            label="Buka Pengaturan QRIS"
                                            onClick={() => {
                                                setShowCheckout(false);
                                                navigate('/settings');
                                            }}
                                        />
                                    </VStack>
                                )}
                            </div>

                            <TextInput
                                label="Catatan / Referensi QRIS (Opsional)"
                                placeholder="Contoh: GoPay a.n. Andi / 4 digit ref"
                                value={paymentRef}
                                onChange={(v) => setPaymentRef(v)}
                            />
                        </VStack>
                    )}

                    {/* 3. TRANSFER / E-WALLET */}
                    {paymentMethod === 'TRANSFER' && (
                        <VStack gap={3}>
                            <VStack gap={1.5}>
                                <Text size="xsm" color="secondary">Rekening & Akun Tujuan Toko</Text>
                                {settings.paymentAccounts.length > 0 ? (
                                    settings.paymentAccounts.map((acc, idx) => {
                                        const isSelectedAcc = (selectedTransferBank || settings.paymentAccounts[0]?.bank) === acc.bank;
                                        return (
                                            <div
                                                key={`${acc.bank}-${idx}`}
                                                onClick={() => setSelectedTransferBank(acc.bank)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 12px',
                                                    backgroundColor: isSelectedAcc ? '#fafafa' : '#ffffff',
                                                    borderRadius: 10,
                                                    border: isSelectedAcc ? '1.5px solid #18181b' : '1px solid #e4e4e7',
                                                    cursor: 'pointer',
                                                    transition: 'all 120ms ease',
                                                }}
                                            >
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#18181b' }}>{acc.bank}</div>
                                                    <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
                                                        {acc.accountNumber}{' '}
                                                        {acc.accountName && (
                                                            <span style={{ fontSize: 11, color: '#71717a', fontFamily: 'inherit' }}>
                                                                ({acc.accountName})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(acc.accountNumber, acc.bank);
                                                    }}
                                                    style={{
                                                        padding: '5px 9px',
                                                        borderRadius: 6,
                                                        border: '1px solid #d4d4d8',
                                                        backgroundColor: '#ffffff',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {copiedAccount === acc.accountNumber ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                                                    <span>{copiedAccount === acc.accountNumber ? 'Disalin' : 'Salin'}</span>
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div
                                        style={{
                                            padding: '14px 12px',
                                            borderRadius: 10,
                                            border: '1px dashed #e4e4e7',
                                            textAlign: 'center',
                                            backgroundColor: '#fafafa',
                                        }}
                                    >
                                        <Text size="xsm" color="secondary">
                                            Belum ada rekening tujuan diatur. Tambahkan di menu Pengaturan Aplikasi.
                                        </Text>
                                    </div>
                                )}
                            </VStack>

                            <TextInput
                                label="Nomor Referensi / Catatan Transfer (Opsional)"
                                placeholder="Contoh: Transfer BCA a.n. Budi / Ref: 98124"
                                value={paymentRef}
                                onChange={(v) => setPaymentRef(v)}
                            />
                        </VStack>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, paddingBottom: 4 }}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowCheckout(false)} />
                        <Button
                            variant="primary"
                            label="Selesaikan Transaksi"
                            isLoading={isProcessing}
                            onClick={handleCompletePayment}
                        />
                    </div>
                </VStack>
            </Modal>

            {/* Antrean / Held Orders Modal */}
            <Modal isOpen={showHeldModal} onClose={() => setShowHeldModal(false)} title="Antrean Pesanan Ditahan (Hold Orders)" width={480}>
                <VStack gap={3}>
                    <div
                        style={{
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: 10,
                            padding: '10px 14px',
                            fontSize: 12,
                            color: '#166534',
                            lineHeight: 1.45,
                        }}
                    >
                        <strong>Fungsi Tahan Pesanan:</strong> Digunakan saat pelanggan menambah belanjaan atau dompet tertinggal, agar kasir dapat melayani pelanggan di belakangnya tanpa membatalkan transaksi ini. Pesanan disimpan di memori kasir (localStorage) dan bisa dimuat kembali ke keranjang kapan saja.
                    </div>

                    {heldOrders.length > 0 ? (
                        heldOrders.map((h) => (
                            <Card key={h.id} padding={3} elevation="none">
                                <HStack justify="between" align="center">
                                    <VStack gap={0.5}>
                                        <HStack gap={1.5} align="center">
                                            <Clock size={14} color="#71717a" />
                                            <Text size="sm" weight="bold">Jam {h.time}</Text>
                                            <Badge variant="neutral" label={`${h.items.length} item`} />
                                        </HStack>
                                        <Text size="xsm" color="secondary">Pelanggan: {h.customerName}</Text>
                                        <Text size="sm" weight="semibold" hasTabularNumbers>
                                            Rp {h.total.toLocaleString('id-ID')}
                                        </Text>
                                    </VStack>
                                    <HStack gap={1}>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            label="Muat"
                                            onClick={() => resumeHeldOrder(h.id)}
                                        />
                                        <IconButton
                                            variant="ghost"
                                            size="sm"
                                            label="Hapus antrean"
                                            icon={<Trash2 size={14} />}
                                            onClick={() => deleteHeldOrder(h.id)}
                                        />
                                    </HStack>
                                </HStack>
                            </Card>
                        ))
                    ) : (
                        <EmptyState title="Tidak ada antrean pesanan" description="Gunakan tombol Tahan di keranjang untuk menyimpan pesanan sementara." isCompact />
                    )}
                    <HStack justify="end">
                        <Button variant="secondary" label="Tutup" onClick={() => setShowHeldModal(false)} />
                    </HStack>
                </VStack>
            </Modal>

            {/* Mobile / Camera Barcode Scanner Modal (Lazy-loaded on demand) */}
            {cameraScanOpen && (
                <Suspense fallback={null}>
                    <BarcodeScannerModal
                        isOpen={cameraScanOpen}
                        onClose={() => setCameraScanOpen(false)}
                        onScan={handleBarcodeScan}
                        allowContinuous={true}
                        title="Scan Barcode Produk"
                        subtitle="Arahkan kamera ke barcode kemasan untuk langsung memasukkan ke keranjang"
                    />
                </Suspense>
            )}

            {/* Success Receipt Modal */}
            <Modal isOpen={!!successSale} onClose={() => setSuccessSale(null)} title="Transaksi Berhasil" width={440}>
                {successSale && (
                    <VStack gap={4}>
                        <Banner
                            status="success"
                            title={`Struk ${successSale.receiptNumber || ''}`}
                            description={`Total: Rp ${Number(successSale.finalPrice || 0).toLocaleString('id-ID')} · Kembalian: Rp ${Number(successSale.change || 0).toLocaleString('id-ID')}`}
                            icon={<CheckCircle2 size={18} />}
                            container="section"
                        />
                        <div className="pos-success-modal-actions">
                            <div className="pos-btn-transaksi-baru">
                                <Button
                                    variant="primary"
                                    label="Transaksi Baru"
                                    onClick={() => setSuccessSale(null)}
                                    width="100%"
                                />
                            </div>
                            <div className="pos-btn-cetak-struk">
                                <Button
                                    variant="secondary"
                                    label="Cetak Struk Thermal"
                                    icon={<Printer size={16} />}
                                    onClick={() => printThermalReceipt(successSale)}
                                    width="100%"
                                />
                            </div>
                        </div>
                    </VStack>
                )}
            </Modal>

            {/* Native Printable Thermal Receipt (58mm / 80mm Standard) */}
            {successSale && (
                <div id="pos-printable-receipt" className="pos-receipt-print-only">
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 'bold', fontSize: 13 }}>{settings.storeName}</div>
                        {settings.address && <div>{settings.address}</div>}
                        {settings.phone && <div>Telp: {settings.phone}</div>}
                        <div>================================</div>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                        <div>No. Struk : {successSale.receiptNumber || '-'}</div>
                        <div>Waktu     : {successSale.date ? new Date(successSale.date).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}</div>
                        <div>Kasir     : Kasir Utama</div>
                        <div>Metode    : {successSale.method || 'TUNAI'}</div>
                        {successSale.reference && <div>Ref       : {successSale.reference}</div>}
                        <div>--------------------------------</div>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                        {(successSale.items || []).map((it: any, idx: number) => {
                            const itemDisc = Number(it.discount ?? it.discountAmount ?? 0);
                            const lineNet = Number(it.subtotal ?? (Number(it.price) * it.quantity - itemDisc));
                            return (
                                <div key={idx} style={{ marginBottom: 3 }}>
                                    <div>{it.name}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{it.quantity} x {Number(it.price).toLocaleString('id-ID')}</span>
                                        <span>Rp {lineNet.toLocaleString('id-ID')}</span>
                                    </div>
                                    {itemDisc > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{getReceiptDiscountLabel(it.appliedPricingMode || it.pricingMode)}:</span>
                                            <span>-Rp {itemDisc.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div>--------------------------------</div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        {(() => {
                            const itemsDiscSum = (successSale.items || []).reduce((s: number, it: any) => s + Number(it.discount ?? it.discountAmount ?? 0), 0);
                            const grossNormal = Number(successSale.totalPrice || successSale.finalPrice || 0) + itemsDiscSum;
                            return (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Subtotal:</span>
                                        <span>Rp {grossNormal.toLocaleString('id-ID')}</span>
                                    </div>
                                    {itemsDiscSum > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Diskon Produk:</span>
                                            <span>-Rp {itemsDiscSum.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                        {Number(successSale.discountAmount || 0) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Diskon:</span>
                                <span>-Rp {Number(successSale.discountAmount).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 12 }}>
                            <span>TOTAL:</span>
                            <span>Rp {Number(successSale.finalPrice || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>BAYAR:</span>
                            <span>Rp {Number(successSale.paid || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>KEMBALI:</span>
                            <span>Rp {Number(successSale.change || 0).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 10 }}>
                        <div>================================</div>
                        <div>Terima kasih atas kunjungan Anda!</div>
                        <div>Barang yang dibeli tidak dapat ditukar</div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Transactions;
