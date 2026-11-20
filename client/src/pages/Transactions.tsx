import { useState, useEffect } from 'react';
import {
    Search, ShoppingCart, Plus, Minus, Trash2, Tag, CheckCircle2,
    Printer, Package, Volume2, VolumeX, ArrowRight, Camera, Clock,
    Copy, QrCode, Sparkles, Check, X, Delete
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
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Badge } from '@astryxdesign/core/Badge';
import { Divider } from '@astryxdesign/core/Divider';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Banner } from '@astryxdesign/core/Banner';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import api from '../lib/axios';
import { sound } from '../lib/sound';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import useHardwareScanner from '../hooks/useHardwareScanner';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { printThermalReceipt } from '../lib/thermalPrinter';

interface Category { id: number; name: string; color: string; }
interface Product {
    id: number; name: string; price: string; costPrice?: string;
    stock: number; minStock?: number; image: string | null;
    sku?: string | null; barcode?: string | null;
    category?: { id: number; name: string; color: string } | null;
}
interface Customer { id: number; name: string; loyaltyPoints: number; membershipTier: string; }
interface CartItem extends Product { quantity: number; discount: number; }

export const Transactions = () => {
    const toast = useToast();
    const isNarrow = useMediaQuery('(max-width: 1024px)');

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'TRANSFER' | 'CARD'>('CASH');
    const [cashPaid, setCashPaid] = useState<number>(0);
    const [paymentRef, setPaymentRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

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
    const [cardBank, setCardBank] = useState('BCA');
    const [cardNumber, setCardNumber] = useState('');
    const [approvalCode, setApprovalCode] = useState('');
    const [transferBank] = useState('BCA');
    const [qrisTimer, setQrisTimer] = useState(900);
    const [qrisSimulated, setQrisSimulated] = useState(false);
    const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

    const [promoCode, setPromoCode] = useState('');
    const [promoDiscount, setPromoDiscount] = useState<{
        type: string;
        value: number;
        name: string;
        code?: string;
        voucherId?: number;
    } | null>(null);
    const [promoError, setPromoError] = useState('');
    const [successSale, setSuccessSale] = useState<any>(null);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchCategories();
    }, []);

    // 15-Minute Countdown for QRIS Payment
    useEffect(() => {
        if (!showCheckout || paymentMethod !== 'QRIS') return;
        setQrisTimer(900);
        setQrisSimulated(false);
        const interval = setInterval(() => {
            setQrisTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [showCheckout, paymentMethod]);

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

    const fetchProducts = async () => { try { const r = await api.get('/products'); setProducts(Array.isArray(r.data) ? r.data : []); } catch (e) { console.error(e); } };
    const fetchCustomers = async () => { try { const r = await api.get('/customers'); setCustomers(Array.isArray(r.data) ? r.data : []); } catch (e) { console.error(e); } };
    const fetchCategories = async () => { try { const r = await api.get('/categories'); setCategories(Array.isArray(r.data) ? r.data : []); } catch (e) { console.error(e); } };

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
                return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
            }
            return [...prev, { ...product, quantity: 1, discount: 0 }];
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
                    return { ...i, quantity: newQty };
                })
                .filter((i) => i.quantity > 0)
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
        setCart(target.items);
        setSelectedCustomerId(target.customerId);
        setPromoDiscount(target.promoDiscount);
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

    const toggleSound = () => {
        const next = sound.toggle();
        setSoundEnabled(next);
        if (next) sound.playBeep();
    };

    const validatePromo = async () => {
        if (!promoCode.trim()) return;
        setPromoError('');
        try {
            const currentSubtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
            const r = await api.post('/discounts/validate', { code: promoCode.trim(), subtotal: currentSubtotal });
            const discountData = r.data.discount || r.data;
            setPromoDiscount({
                type: discountData.type,
                value: Number(discountData.value),
                name: discountData.name,
                code: discountData.code || promoCode.trim(),
                voucherId: discountData.voucherId,
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
        setPromoDiscount(null);
        setPromoCode('');
        setPromoError('');
        toast.info('Penggunaan voucher/promo dibatalkan');
    };

    const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const itemDiscountTotal = cart.reduce((sum, i) => sum + i.discount * i.quantity, 0);
    const promoAmount = promoDiscount
        ? promoDiscount.type === 'PERCENTAGE'
            ? ((subtotal - itemDiscountTotal) * promoDiscount.value) / 100
            : promoDiscount.value
        : 0;
    const totalDiscount = itemDiscountTotal + promoAmount;
    const grandTotal = Math.max(0, subtotal - totalDiscount);
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const change = paymentMethod === 'CASH' ? Math.max(0, cashPaid - grandTotal) : 0;

    const openCheckout = () => {
        setCashPaid(grandTotal);
        setPaymentMethod('CASH');
        setPaymentRef('');
        setCardNumber('');
        setApprovalCode('');
        setQrisSimulated(false);
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
            if (paymentMethod === 'CARD') {
                finalReference = `EDC ${cardBank}${cardNumber ? ` · Kartu *${cardNumber.slice(-4)}` : ''}${approvalCode ? ` · Auth ${approvalCode}` : ''}`;
            } else if (paymentMethod === 'QRIS') {
                finalReference = `QRIS NMID ID1020039281902${paymentRef ? ` · ${paymentRef}` : ` · TRX-${Date.now().toString().slice(-6)}`}`;
            } else if (paymentMethod === 'TRANSFER') {
                finalReference = `Transfer ${transferBank}${paymentRef ? ` · ${paymentRef}` : ''}`;
            }

            const payload = {
                totalPrice: subtotal,
                discountAmount: totalDiscount,
                finalPrice: grandTotal,
                customerId: selectedCustomerId ? Number(selectedCustomerId) : null,
                voucherCode: promoDiscount?.code || null,
                voucherId: promoDiscount?.voucherId || null,
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
                items: [...cart],
                paid: paymentMethod === 'CASH' ? cashPaid : grandTotal,
                change,
                method: paymentMethod,
                reference: finalReference,
            });
            setShowCheckout(false);
            clearCart();
            fetchProducts();
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
        <VStack gap={3} height="100%">
            <HStack justify="between" align="center">
                <HStack gap={2} align="center">
                    <ShoppingCart size={18} />
                    <Heading level={4} weight="semibold">Keranjang</Heading>
                    <Badge variant="neutral" label={totalItems} />
                    <IconButton
                        variant="ghost"
                        size="sm"
                        label={soundEnabled ? 'Matikan Suara Kasir' : 'Nyalakan Suara Kasir'}
                        tooltip={soundEnabled ? 'Suara Aktif' : 'Suara Mati'}
                        icon={soundEnabled ? <Volume2 size={15} color="#16a34a" /> : <VolumeX size={15} color="#a1a1aa" />}
                        onClick={toggleSound}
                    />
                </HStack>
                <HStack gap={1.5} align="center">
                    {heldOrders.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowHeldModal(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 10px',
                                borderRadius: 8,
                                border: '1px solid #fde047',
                                backgroundColor: '#fefce8',
                                color: '#854d0e',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
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
                                label="Tahan Pesanan"
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

            <Divider />

            <VStack gap={2} style={{ flex: 1, overflowY: 'auto', minHeight: 160 }}>
                {cart.length > 0 ? (
                    cart.map((item) => (
                        <Card key={item.id} padding={3} variant="muted" elevation="none">
                            <VStack gap={1.5}>
                                <HStack justify="between" align="start" gap={2}>
                                    <VStack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                        <Text size="sm" weight="semibold" maxLines={1}>{item.name}</Text>
                                        <Text size="xsm" color="secondary" hasTabularNumbers>
                                            Rp {Number(item.price).toLocaleString('id-ID')}
                                        </Text>
                                    </VStack>
                                    <IconButton
                                        variant="ghost"
                                        size="sm"
                                        label="Hapus item"
                                        icon={<Trash2 size={14} />}
                                        onClick={() => removeFromCart(item.id)}
                                    />
                                </HStack>
                                <HStack justify="between" align="center">
                                    <HStack gap={1.5} align="center">
                                        <IconButton variant="secondary" size="sm" label="Kurangi" icon={<Minus size={13} />} onClick={() => updateQuantity(item.id, -1)} />
                                        <Text size="sm" weight="bold" hasTabularNumbers style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</Text>
                                        <IconButton variant="secondary" size="sm" label="Tambah" icon={<Plus size={13} />} onClick={() => updateQuantity(item.id, 1)} />
                                    </HStack>
                                    <Text size="sm" weight="bold" hasTabularNumbers>
                                        Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                                    </Text>
                                </HStack>
                            </VStack>
                        </Card>
                    ))
                ) : (
                    <EmptyState title="Keranjang kosong" description="Ketuk produk untuk menambahkan ke pesanan." isCompact />
                )}
            </VStack>

            <Divider />

            {/* Promo / Voucher */}
            {promoDiscount ? (
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
                            <Tag size={14} color="#16a34a" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', lineHeight: 1.2 }}>
                                {promoDiscount.code}
                            </div>
                            <div style={{ fontSize: '11px', color: '#15803d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {promoDiscount.name} ({promoDiscount.type === 'PERCENTAGE' ? `${promoDiscount.value}%` : `Rp ${Number(promoDiscount.value).toLocaleString('id-ID')}`})
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
                        <Button variant="secondary" size="sm" label="Pakai" onClick={validatePromo} />
                    </HStack>
                    {promoError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '11px', marginTop: '2px' }}>
                            <X size={12} />
                            <span>{promoError}</span>
                        </div>
                    )}
                </>
            )}

            {/* Totals */}
            <VStack gap={1}>
                <HStack justify="between">
                    <Text size="sm" color="secondary">Subtotal</Text>
                    <Text size="sm" hasTabularNumbers>Rp {subtotal.toLocaleString('id-ID')}</Text>
                </HStack>
                {totalDiscount > 0 && (
                    <HStack justify="between">
                        <Text size="sm" color="secondary">Diskon</Text>
                        <Text size="sm" hasTabularNumbers>- Rp {totalDiscount.toLocaleString('id-ID')}</Text>
                    </HStack>
                )}
                <HStack justify="between">
                    <Heading level={4} weight="bold">Total</Heading>
                    <Heading level={4} weight="bold">Rp {grandTotal.toLocaleString('id-ID')}</Heading>
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
        </VStack>
    );

    return (
        <>
            <Layout
                height="fill"
                content={
                    <LayoutContent padding={isNarrow ? 3 : 4} isScrollable>
                        <VStack gap={3} style={{ paddingBottom: isNarrow ? 100 : 0 }}>
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
                                                        <img
                                                            src={p.image.startsWith('http') ? p.image : `http://localhost:5000${p.image}`}
                                                            alt={p.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <Package size={26} color="#a1a1aa" />
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
                                                    <Text size="sm" weight="semibold" maxLines={2} style={{ lineHeight: 1.3 }}>
                                                        {p.name}
                                                    </Text>

                                                    <HStack justify="between" align="center" gap={1} style={{ marginTop: 'auto', paddingTop: 2 }}>
                                                        <Text size="sm" weight="bold" hasTabularNumbers style={{ color: '#09090b' }}>
                                                            Rp {Number(p.price).toLocaleString('id-ID')}
                                                        </Text>

                                                        {inCart ? (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: 3,
                                                                    backgroundColor: '#f4f4f5',
                                                                    borderRadius: 8,
                                                                    padding: '2px 4px',
                                                                    border: '1px solid #e4e4e7',
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="pos-quick-stepper-btn"
                                                                    onClick={() => updateQuantity(p.id, -1)}
                                                                    style={{ width: 22, height: 22, borderRadius: 6 }}
                                                                >
                                                                    <Minus size={11} />
                                                                </button>
                                                                <span
                                                                    style={{
                                                                        fontSize: 12,
                                                                        fontWeight: 700,
                                                                        minWidth: 16,
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
                                                                    style={{ width: 22, height: 22, borderRadius: 6 }}
                                                                >
                                                                    <Plus size={11} />
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
                        <LayoutPanel width={380} hasDivider padding={4}>
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
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: 0.3 }}>
                                    TOTAL PESANAN
                                </span>
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
                padding={4}
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
                                    <span>Voucher Promo {promoDiscount?.code ? `(${promoDiscount.code})` : ''}</span>
                                </span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
                                    - Rp {promoAmount.toLocaleString('id-ID')}
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
                        <SegmentedControl
                            label="Metode Pembayaran"
                            value={paymentMethod}
                            onChange={(v) => {
                                setPaymentMethod(v as any);
                                setQrisSimulated(false);
                            }}
                            layout="fill"
                        >
                            <SegmentedControlItem value="CASH" label="Tunai" />
                            <SegmentedControlItem value="QRIS" label="QRIS" />
                            <SegmentedControlItem value="CARD" label="Kartu / EDC" />
                            <SegmentedControlItem value="TRANSFER" label="Transfer" />
                        </SegmentedControl>
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
                                {[20000, 50000, 100000, 200000]
                                    .filter((v) => v >= grandTotal || grandTotal - v <= 10000)
                                    .slice(0, 4)
                                    .map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setCashPaid(amt)}
                                            className={`pos-cash-chip ${cashPaid === amt ? 'pos-cash-chip-active' : ''}`}
                                        >
                                            Rp {amt.toLocaleString('id-ID')}
                                        </button>
                                    ))}
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

                    {/* 2. QRIS (QRIS Standard Indonesia) */}
                    {paymentMethod === 'QRIS' && (
                        <VStack gap={3} align="center">
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
                                {/* Header QRIS Indonesia */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid #f4f4f5', paddingBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <QrCode size={20} color="#dc2626" />
                                        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.05em', color: '#18181b' }}>QRIS</span>
                                    </div>
                                    <span style={{ fontSize: 10, color: '#71717a', fontWeight: 600 }}>NMID: ID1020039281902</span>
                                </div>

                                {/* QR Code Graphic Representation */}
                                <div
                                    style={{
                                        position: 'relative',
                                        width: 170,
                                        height: 170,
                                        padding: 8,
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e4e4e7',
                                        borderRadius: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <svg viewBox="0 0 100 100" width="150" height="150">
                                        <rect width="100" height="100" fill="#ffffff" />
                                        {/* Outer corners */}
                                        <rect x="5" y="5" width="28" height="28" fill="#18181b" rx="2" />
                                        <rect x="9" y="9" width="20" height="20" fill="#ffffff" rx="1" />
                                        <rect x="13" y="13" width="12" height="12" fill="#18181b" rx="1" />

                                        <rect x="67" y="5" width="28" height="28" fill="#18181b" rx="2" />
                                        <rect x="71" y="9" width="20" height="20" fill="#ffffff" rx="1" />
                                        <rect x="75" y="13" width="12" height="12" fill="#18181b" rx="1" />

                                        <rect x="5" y="67" width="28" height="28" fill="#18181b" rx="2" />
                                        <rect x="9" y="71" width="20" height="20" fill="#ffffff" rx="1" />
                                        <rect x="13" y="75" width="12" height="12" fill="#18181b" rx="1" />

                                        {/* Dynamic pattern dots */}
                                        <rect x="40" y="8" width="8" height="8" fill="#18181b" />
                                        <rect x="52" y="8" width="6" height="14" fill="#18181b" />
                                        <rect x="42" y="24" width="16" height="8" fill="#18181b" />
                                        <rect x="10" y="42" width="18" height="8" fill="#18181b" />
                                        <rect x="36" y="38" width="10" height="10" fill="#18181b" />
                                        <rect x="54" y="40" width="12" height="12" fill="#18181b" />
                                        <rect x="74" y="42" width="18" height="6" fill="#18181b" />
                                        <rect x="40" y="58" width="14" height="8" fill="#18181b" />
                                        <rect x="62" y="60" width="12" height="14" fill="#18181b" />
                                        <rect x="42" y="76" width="18" height="16" fill="#18181b" />
                                        <rect x="68" y="82" width="14" height="10" fill="#18181b" />
                                        <rect x="86" y="72" width="8" height="20" fill="#18181b" />
                                    </svg>

                                    {qrisSimulated && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                                borderRadius: 12,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            <CheckCircle2 size={36} color="#16a34a" />
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>Pembayaran Diterima</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#18181b' }}>POS STORE INDONESIA</div>
                                    <div style={{ fontSize: 11, color: '#71717a' }}>BCA / Mandiri / GoPay / OVO / Dana / ShopeePay</div>
                                    <div style={{ fontSize: 12, fontWeight: 650, color: '#2563eb', marginTop: 4 }}>
                                        Batas Waktu: {Math.floor(qrisTimer / 60)}:{('0' + (qrisTimer % 60)).slice(-2)}
                                    </div>
                                </div>

                                {!qrisSimulated ? (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={<Sparkles size={14} color="#16a34a" />}
                                        label="Simulasikan Notifikasi Pembayaran Sukses"
                                        onClick={() => {
                                            setQrisSimulated(true);
                                            setPaymentRef(`QRIS-${Date.now().toString().slice(-6)}`);
                                            toast.success('Notifikasi QRIS Berhasil Masuk!');
                                            sound.playSuccess();
                                        }}
                                    />
                                ) : (
                                    <Badge variant="success" label={`Ref: ${paymentRef || 'QRIS-OK'}`} />
                                )}
                            </div>
                        </VStack>
                    )}

                    {/* 3. KARTU / EDC TERMINAL */}
                    {paymentMethod === 'CARD' && (
                        <VStack gap={3}>
                            <VStack gap={1}>
                                <Text size="xsm" color="secondary">Pilih Mesin EDC / Bank</Text>
                                <HStack gap={1.5} wrap="wrap">
                                    {['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB'].map((bank) => (
                                        <button
                                            key={bank}
                                            type="button"
                                            onClick={() => setCardBank(bank)}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: 8,
                                                border: cardBank === bank ? '1.5px solid #18181b' : '1px solid #e4e4e7',
                                                backgroundColor: cardBank === bank ? '#18181b' : '#ffffff',
                                                color: cardBank === bank ? '#ffffff' : '#3f3f46',
                                                fontSize: 12,
                                                fontWeight: 650,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {bank}
                                        </button>
                                    ))}
                                </HStack>
                            </VStack>

                            <Grid columns={{ minWidth: 180, max: 2 }} gap={2}>
                                <TextInput
                                    label="4 Digit Terakhir Kartu"
                                    placeholder="Contoh: 8842"
                                    value={cardNumber}
                                    onChange={(v) => setCardNumber(v.replace(/\D/g, '').slice(0, 4))}
                                />
                                <TextInput
                                    label="Approval / Trace Code"
                                    placeholder="Contoh: 182940"
                                    value={approvalCode}
                                    onChange={(v) => setApprovalCode(v)}
                                />
                            </Grid>
                        </VStack>
                    )}

                    {/* 4. TRANSFER / E-WALLET */}
                    {paymentMethod === 'TRANSFER' && (
                        <VStack gap={3}>
                            <VStack gap={1.5}>
                                <Text size="xsm" color="secondary">Rekening & Akun Tujuan Toko</Text>
                                {[
                                    { bank: 'BCA', no: '8830192831', an: 'POS Store Official' },
                                    { bank: 'Mandiri', no: '137001928312', an: 'POS Store Official' },
                                    { bank: 'GoPay / OVO / Dana', no: '081234567890', an: 'POS Store' },
                                ].map((acc) => (
                                    <div
                                        key={acc.bank}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            backgroundColor: '#f4f4f5',
                                            borderRadius: 8,
                                            border: '1px solid #e4e4e7',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#18181b' }}>{acc.bank}</div>
                                            <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{acc.no} <span style={{ fontSize: 11, color: '#71717a' }}>({acc.an})</span></div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(acc.no, acc.bank)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                border: '1px solid #d4d4d8',
                                                backgroundColor: '#ffffff',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                fontSize: 11,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {copiedAccount === acc.no ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                                            <span>{copiedAccount === acc.no ? 'Disalin' : 'Salin'}</span>
                                        </button>
                                    </div>
                                ))}
                            </VStack>

                            <TextInput
                                label="Nomor Referensi / Catatan Transfer"
                                placeholder="Contoh: Transfer BCA an Budi / Ref: 98124"
                                value={paymentRef}
                                onChange={(v) => setPaymentRef(v)}
                            />
                        </VStack>
                    )}

                    <HStack justify="end" gap={2}>
                        <Button variant="secondary" label="Batal" onClick={() => setShowCheckout(false)} />
                        <Button
                            variant="primary"
                            label="Selesaikan Transaksi"
                            isLoading={isProcessing}
                            onClick={handleCompletePayment}
                        />
                    </HStack>
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

            {/* Mobile / Camera Barcode Scanner Modal */}
            <BarcodeScannerModal
                isOpen={cameraScanOpen}
                onClose={() => setCameraScanOpen(false)}
                onScan={handleBarcodeScan}
                allowContinuous={true}
                title="Scan Barcode Produk"
                subtitle="Arahkan kamera ke barcode kemasan untuk langsung memasukkan ke keranjang"
            />

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
                        <HStack justify="end" gap={2} wrap="wrap">
                            <Button
                                variant="secondary"
                                label="Cetak Struk Thermal"
                                icon={<Printer size={16} />}
                                onClick={() => printThermalReceipt(successSale)}
                            />
                            <Button
                                variant="primary"
                                label="Transaksi Baru"
                                onClick={() => setSuccessSale(null)}
                            />
                        </HStack>
                    </VStack>
                )}
            </Modal>

            {/* Native Printable Thermal Receipt (58mm / 80mm Standard) */}
            {successSale && (
                <div id="pos-printable-receipt" className="pos-receipt-print-only">
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 'bold', fontSize: 13 }}>POS SYSTEM STORE</div>
                        <div>Jl. Jendral Sudirman Kav. 52, Jakarta</div>
                        <div>Telp: (021) 5299-1000</div>
                        <div>================================</div>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                        <div>No. Struk : {successSale.receiptNumber || '-'}</div>
                        <div>Waktu     : {new Date().toLocaleString('id-ID')}</div>
                        <div>Kasir     : Kasir Utama</div>
                        <div>Metode    : {successSale.method || 'TUNAI'}</div>
                        {successSale.reference && <div>Ref       : {successSale.reference}</div>}
                        <div>--------------------------------</div>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                        {(successSale.items || []).map((it: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: 3 }}>
                                <div>{it.name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{it.quantity} x {Number(it.price).toLocaleString('id-ID')}</span>
                                    <span>Rp {(Number(it.price) * it.quantity).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        ))}
                        <div>--------------------------------</div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Subtotal:</span>
                            <span>Rp {Number(successSale.totalPrice || successSale.finalPrice || 0).toLocaleString('id-ID')}</span>
                        </div>
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
