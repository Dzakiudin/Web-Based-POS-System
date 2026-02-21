import { useState, useEffect, useRef } from 'react';
import api from '../lib/axios';
import { Search, Trash2, ShoppingCart, Minus, Plus, CreditCard, User, Package, X, Tag, Percent, QrCode, Wallet, Banknote, Receipt, CheckCircle2, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Types ──────────────────────────────────────────────
interface Category { id: number; name: string; color: string; }
interface Product {
    id: number; name: string; price: string; costPrice: string;
    stock: number; minStock: number; image: string | null;
    sku: string | null; barcode: string | null;
    category: { id: number; name: string; color: string } | null;
}
interface Customer { id: number; name: string; loyaltyPoints: number; membershipTier: string; }
interface CartItem extends Product { quantity: number; discount: number; }
interface PaymentEntry { method: 'CASH' | 'QRIS' | 'CARD' | 'EWALLET'; amount: number; reference?: string; }

// ── Main Component ─────────────────────────────────────
const Transactions = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoDiscount, setPromoDiscount] = useState<{ type: string; value: number; name: string } | null>(null);
    const [promoError, setPromoError] = useState('');
    const [successSale, setSuccessSale] = useState<any>(null);
    const barcodeRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProducts(); fetchCustomers(); fetchCategories();
    }, []);

    const fetchProducts = async () => { try { const r = await api.get('/products'); setProducts(r.data); } catch (e) { console.error(e); } };
    const fetchCustomers = async () => { try { const r = await api.get('/customers'); setCustomers(r.data); } catch (e) { console.error(e); } };
    const fetchCategories = async () => { try { const r = await api.get('/categories'); setCategories(r.data); } catch (e) { console.error(e); } };

    // ── Cart Operations ────────────────────────────────
    const addToCart = (product: Product) => {
        if (product.stock <= 0) return;
        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev;
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1, discount: 0 }];
        });
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.id !== id) return i;
            const newQty = i.quantity + delta;
            if (newQty <= 0) return i;
            if (newQty > i.stock) return i;
            return { ...i, quantity: newQty };
        }));
    };

    const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.id !== id));
    const clearCart = () => { setCart([]); setPromoCode(''); setPromoDiscount(null); setPromoError(''); };

    const setItemDiscount = (id: number, discount: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, discount: Math.max(0, discount) } : i));
    };

    // ── Barcode Scanner ────────────────────────────────
    const handleBarcodeScan = (code: string) => {
        const product = products.find(p => p.barcode === code || p.sku === code);
        if (product) { addToCart(product); setSearchQuery(''); }
    };

    // ── Promo Code ─────────────────────────────────────
    const validatePromo = async () => {
        if (!promoCode.trim()) return;
        setPromoError('');
        try {
            const r = await api.post('/discounts/validate', { code: promoCode });
            setPromoDiscount({ type: r.data.type, value: Number(r.data.value), name: r.data.name });
        } catch (e: any) {
            setPromoError(e.response?.data?.message || 'Invalid code');
            setPromoDiscount(null);
        }
    };

    // ── Price Calculations ─────────────────────────────
    const subtotal = cart.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0);
    const itemDiscountTotal = cart.reduce((sum, i) => sum + (i.discount * i.quantity), 0);
    const promoAmount = promoDiscount
        ? promoDiscount.type === 'PERCENTAGE'
            ? ((subtotal - itemDiscountTotal) * promoDiscount.value / 100)
            : promoDiscount.value
        : 0;
    const totalDiscount = itemDiscountTotal + promoAmount;
    const grandTotal = Math.max(0, subtotal - totalDiscount);

    // ── Filtered Products ──────────────────────────────
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.barcode && p.barcode.includes(searchQuery));
        const matchesCategory = !activeCategory || p.category?.id === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex gap-4 h-[calc(100vh-6rem)] overflow-hidden">
            {/* ══════ LEFT: Product Grid ══════ */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
                {/* Search + Barcode */}
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            ref={barcodeRef}
                            type="text" placeholder="Cari produk atau scan barcode..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all text-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { handleBarcodeScan(searchQuery); } }}
                        />
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => setActiveCategory(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${!activeCategory ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}>
                        Semua
                    </button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}>
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 content-start pr-1">
                    {filteredProducts.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-white/30">
                            <Package className="w-12 h-12 mb-3" />
                            <p className="text-sm">Tidak ada produk ditemukan</p>
                        </div>
                    ) : filteredProducts.map((product, idx) => (
                        <button key={product.id} onClick={() => addToCart(product)}
                            disabled={product.stock <= 0}
                            className={`group relative p-3 rounded-xl border transition-all duration-200 text-left
                                ${product.stock <= 0
                                    ? 'bg-white/3 border-white/5 opacity-50 cursor-not-allowed'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            style={{ animationDelay: `${idx * 30}ms` }}>
                            {product.image ? (
                                <img src={`http://localhost:5000${product.image}`} alt={product.name}
                                    className="w-full h-20 object-cover rounded-lg mb-2 bg-white/5" />
                            ) : (
                                <div className="w-full h-20 rounded-lg mb-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                    <Package className="w-6 h-6 text-white/30" />
                                </div>
                            )}
                            <p className="text-white/90 text-xs font-medium truncate">{product.name}</p>
                            {product.category && (
                                <span className="text-[10px] text-white/40">{product.category.name}</span>
                            )}
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-indigo-400 text-xs font-bold">Rp {Number(product.price).toLocaleString('id-ID')}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${product.stock <= product.minStock ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/40'}`}>
                                    {product.stock}
                                </span>
                            </div>
                            {product.stock <= product.minStock && product.stock > 0 && (
                                <div className="absolute top-1.5 right-1.5">
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══════ RIGHT: Order Sidebar ══════ */}
            <div className="w-[340px] flex-shrink-0 flex flex-col glass-card rounded-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-white font-bold text-sm flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-indigo-400" />
                            Pesanan <span className="bg-indigo-500/30 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-full">{cart.length}</span>
                        </h2>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors">Hapus Semua</button>
                        )}
                    </div>
                    {/* Customer Select */}
                    <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer">
                            <option value="">Walk-in Customer</option>
                            {customers.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.membershipTier})</option>))}
                        </select>
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/20">
                            <ShoppingCart className="w-10 h-10 mb-2" />
                            <p className="text-xs">Keranjang kosong</p>
                            <p className="text-[10px] mt-1">Pilih produk untuk mulai transaksi</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.id} className="bg-white/5 rounded-xl p-2.5 border border-white/8 group hover:border-white/15 transition-all">
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-white/90 text-xs font-medium truncate">{item.name}</p>
                                    <p className="text-white/40 text-[10px]">@ Rp {Number(item.price).toLocaleString('id-ID')}</p>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="text-red-400/50 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => updateQuantity(item.id, -1)}
                                        className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                        <Minus className="w-3 h-3 text-white/70" />
                                    </button>
                                    <span className="text-white text-xs font-bold w-6 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)}
                                        className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                                        <Plus className="w-3 h-3 text-white/70" />
                                    </button>
                                </div>
                                <span className="text-indigo-400 text-xs font-bold">
                                    Rp {((Number(item.price) - item.discount) * item.quantity).toLocaleString('id-ID')}
                                </span>
                            </div>
                            {/* Item Discount */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <Tag className="w-3 h-3 text-white/30" />
                                <input type="number" placeholder="Diskon/item" min="0" value={item.discount || ''}
                                    onChange={e => setItemDiscount(item.id, Number(e.target.value))}
                                    className="flex-1 bg-white/5 border border-white/8 rounded-md px-2 py-1 text-[10px] text-white/70 focus:outline-none focus:border-indigo-500/30 w-0"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Promo Code */}
                {cart.length > 0 && (
                    <div className="px-3 pb-2">
                        <div className="flex gap-1.5">
                            <div className="flex-1 relative">
                                <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                                <input type="text" placeholder="Kode promo" value={promoCode}
                                    onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                                    onKeyDown={e => { if (e.key === 'Enter') validatePromo(); }}
                                    className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <button onClick={validatePromo} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded-lg hover:bg-indigo-500/30 transition-colors">
                                Apply
                            </button>
                        </div>
                        {promoError && <p className="text-red-400 text-[10px] mt-1">{promoError}</p>}
                        {promoDiscount && <p className="text-emerald-400 text-[10px] mt-1">✓ {promoDiscount.name} applied</p>}
                    </div>
                )}

                {/* Totals */}
                {cart.length > 0 && (
                    <div className="p-3 border-t border-white/10 space-y-1.5 bg-white/3">
                        <div className="flex justify-between text-xs text-white/50">
                            <span>Subtotal</span>
                            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-xs text-emerald-400/70">
                                <span>Diskon</span>
                                <span>-Rp {totalDiscount.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-white/10">
                            <span>Total</span>
                            <span className="text-indigo-400">Rp {grandTotal.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                )}

                {/* Checkout Button */}
                <div className="p-3 border-t border-white/10">
                    <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                            ${cart.length === 0
                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 active:scale-[0.98] shadow-lg shadow-indigo-500/25'
                            }`}>
                        <CreditCard className="w-4 h-4" />
                        Bayar — Rp {grandTotal.toLocaleString('id-ID')}
                    </button>
                </div>
            </div>

            {/* ══════ Checkout Modal ══════ */}
            {showCheckout && (
                <CheckoutModal
                    cart={cart} grandTotal={grandTotal} totalDiscount={totalDiscount}
                    subtotal={subtotal} customerId={selectedCustomerId}
                    customerName={customers.find(c => String(c.id) === selectedCustomerId)?.name || 'Walk-in'}
                    onClose={() => setShowCheckout(false)}
                    onSuccess={(sale: any) => {
                        setSuccessSale(sale);
                        setShowCheckout(false);
                        clearCart();
                        fetchProducts(); // Refresh stock
                    }}
                />
            )}

            {/* ══════ Success Modal ══════ */}
            {successSale && (
                <SuccessModal sale={successSale} onClose={() => setSuccessSale(null)} />
            )}
        </div>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECKOUT MODAL — Multi-Payment
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface CheckoutModalProps {
    cart: CartItem[]; grandTotal: number; totalDiscount: number; subtotal: number;
    customerId: string; customerName: string;
    onClose: () => void; onSuccess: (sale: any) => void;
}

const PAYMENT_METHODS = [
    { key: 'CASH' as const, label: 'Tunai', icon: Banknote, color: 'emerald' },
    { key: 'QRIS' as const, label: 'QRIS', icon: QrCode, color: 'blue' },
    { key: 'CARD' as const, label: 'Kartu', icon: CreditCard, color: 'purple' },
    { key: 'EWALLET' as const, label: 'E-Wallet', icon: Wallet, color: 'amber' },
];

const CheckoutModal = ({ cart, grandTotal, totalDiscount, subtotal, customerId, customerName, onClose, onSuccess }: CheckoutModalProps) => {
    const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'QRIS' | 'CARD' | 'EWALLET'>('CASH');
    const [cashAmount, setCashAmount] = useState('');
    const [reference, setReference] = useState('');
    const [processing, setProcessing] = useState(false);

    const cashChange = selectedMethod === 'CASH' ? Math.max(0, Number(cashAmount) - grandTotal) : 0;
    const canPay = selectedMethod === 'CASH'
        ? Number(cashAmount) >= grandTotal
        : true; // Non-cash assumed full payment

    const quickCashAmounts = [
        grandTotal,
        Math.ceil(grandTotal / 10000) * 10000,
        Math.ceil(grandTotal / 50000) * 50000,
        Math.ceil(grandTotal / 100000) * 100000,
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

    const handlePay = async () => {
        if (!canPay || processing) return;
        setProcessing(true);

        try {
            const paymentAmount = selectedMethod === 'CASH' ? Number(cashAmount) : grandTotal;
            const saleData = {
                customerId: customerId ? Number(customerId) : null,
                discountAmount: totalDiscount,
                details: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    unitPrice: Number(item.price),
                    discountAmount: item.discount * item.quantity,
                    subtotal: (Number(item.price) - item.discount) * item.quantity,
                })),
                payments: [{
                    method: selectedMethod,
                    amount: paymentAmount,
                    change: cashChange,
                    reference: reference || undefined,
                }],
            };

            const response = await api.post('/sales', saleData);
            onSuccess(response.data);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Checkout failed');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-lg bg-[#0a0f1e]/95 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-indigo-400" /> Pembayaran
                        </h2>
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex justify-between mt-2 text-sm">
                        <span className="text-white/50">Pelanggan: <span className="text-white/80">{customerName}</span></span>
                        <span className="text-white/50">{cart.length} item</span>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="p-5">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-3 font-medium">Metode Pembayaran</p>
                    <div className="grid grid-cols-4 gap-2 mb-5">
                        {PAYMENT_METHODS.map(pm => (
                            <button key={pm.key} onClick={() => { setSelectedMethod(pm.key); setCashAmount(''); setReference(''); }}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-medium
                                    ${selectedMethod === pm.key
                                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                                    }`}>
                                <pm.icon className="w-5 h-5" />
                                {pm.label}
                            </button>
                        ))}
                    </div>

                    {/* Cash Input */}
                    {selectedMethod === 'CASH' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-white/40 text-xs mb-1.5 block">Jumlah Bayar</label>
                                <input type="number" value={cashAmount}
                                    onChange={e => setCashAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-lg font-bold focus:outline-none focus:border-indigo-500/50 text-right"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                {quickCashAmounts.map(amount => (
                                    <button key={amount} onClick={() => setCashAmount(String(amount))}
                                        className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-white/10 transition-colors">
                                        {amount.toLocaleString('id-ID')}
                                    </button>
                                ))}
                            </div>
                            {Number(cashAmount) >= grandTotal && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                                    <p className="text-emerald-400/60 text-xs">Kembalian</p>
                                    <p className="text-emerald-400 text-xl font-bold">Rp {cashChange.toLocaleString('id-ID')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reference for non-cash */}
                    {selectedMethod !== 'CASH' && (
                        <div>
                            <label className="text-white/40 text-xs mb-1.5 block">Nomor Referensi (opsional)</label>
                            <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                                placeholder={selectedMethod === 'QRIS' ? 'No. Ref QRIS' : selectedMethod === 'CARD' ? 'Auth Code' : 'Ref ID'}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                    )}
                </div>

                {/* Summary + Pay Button */}
                <div className="p-5 border-t border-white/10 bg-white/3">
                    <div className="flex justify-between text-sm text-white/50 mb-1">
                        <span>Subtotal</span><span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-400/70 mb-1">
                            <span>Diskon</span><span>-Rp {totalDiscount.toLocaleString('id-ID')}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-white mb-4 pt-2 border-t border-white/10">
                        <span>Total</span>
                        <span className="text-indigo-400">Rp {grandTotal.toLocaleString('id-ID')}</span>
                    </div>
                    <button onClick={handlePay} disabled={!canPay || processing}
                        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                            ${!canPay || processing
                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] shadow-lg shadow-emerald-500/25'
                            }`}>
                        {processing ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><CheckCircle2 className="w-4 h-4" /> Proses Pembayaran</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUCCESS MODAL — Receipt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SuccessModal = ({ sale, onClose }: { sale: any; onClose: () => void }) => {
    const generateReceipt = () => {
        const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
        const w = 80;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('POS Pro Max', w / 2, 10, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Receipt: ${sale.receiptNumber}`, w / 2, 15, { align: 'center' });
        doc.text(new Date(sale.date).toLocaleString('id-ID'), w / 2, 19, { align: 'center' });
        if (sale.customer) {
            doc.text(`Customer: ${sale.customer.name}`, w / 2, 23, { align: 'center' });
        }

        doc.setLineWidth(0.3);
        doc.line(5, 26, w - 5, 26);

        const tableData = sale.details.map((d: any) => [
            d.product.name,
            d.quantity,
            Number(d.unitPrice).toLocaleString('id-ID'),
            Number(d.subtotal).toLocaleString('id-ID'),
        ]);

        autoTable(doc, {
            startY: 28,
            head: [['Item', 'Qty', 'Harga', 'Sub']],
            body: tableData,
            theme: 'plain',
            styles: { fontSize: 6, cellPadding: 1 },
            headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240] },
            margin: { left: 5, right: 5 },
        });

        const finalY = (doc as any).lastAutoTable.finalY + 4;
        doc.setFontSize(7);
        doc.text(`Subtotal:`, 5, finalY);
        doc.text(`Rp ${Number(sale.totalPrice).toLocaleString('id-ID')}`, w - 5, finalY, { align: 'right' });

        if (Number(sale.discountAmount) > 0) {
            doc.text(`Diskon:`, 5, finalY + 4);
            doc.text(`-Rp ${Number(sale.discountAmount).toLocaleString('id-ID')}`, w - 5, finalY + 4, { align: 'right' });
        }

        const totalY = Number(sale.discountAmount) > 0 ? finalY + 8 : finalY + 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`TOTAL:`, 5, totalY);
        doc.text(`Rp ${Number(sale.finalPrice).toLocaleString('id-ID')}`, w - 5, totalY, { align: 'right' });

        // Payment info
        if (sale.payments?.length > 0) {
            const pY = totalY + 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            sale.payments.forEach((p: any, i: number) => {
                doc.text(`${p.method}:`, 5, pY + (i * 4));
                doc.text(`Rp ${Number(p.amount).toLocaleString('id-ID')}`, w - 5, pY + (i * 4), { align: 'right' });
                if (p.method === 'CASH' && Number(p.change) > 0) {
                    doc.text(`Kembalian:`, 5, pY + ((i + 1) * 4));
                    doc.text(`Rp ${Number(p.change).toLocaleString('id-ID')}`, w - 5, pY + ((i + 1) * 4), { align: 'right' });
                }
            });
        }

        doc.setFontSize(6);
        doc.text('Terima kasih atas kunjungan Anda!', w / 2, 180, { align: 'center' });
        doc.text('POS Pro Max v2.0', w / 2, 184, { align: 'center' });

        doc.save(`receipt-${sale.receiptNumber}.pdf`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-sm bg-[#0a0f1e]/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden text-center p-8"
                onClick={e => e.stopPropagation()}>
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-white font-bold text-xl mb-1">Transaksi Berhasil!</h2>
                <p className="text-white/50 text-sm mb-1">{sale.receiptNumber}</p>
                <p className="text-indigo-400 text-2xl font-bold mb-6">Rp {Number(sale.finalPrice).toLocaleString('id-ID')}</p>

                {sale.payments?.map((p: any, i: number) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3 mb-2 flex justify-between text-sm">
                        <span className="text-white/60">{p.method}</span>
                        <span className="text-white/90">Rp {Number(p.amount).toLocaleString('id-ID')}</span>
                    </div>
                ))}

                {sale.payments?.[0]?.method === 'CASH' && Number(sale.payments[0].change) > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
                        <p className="text-emerald-400/60 text-xs">Kembalian</p>
                        <p className="text-emerald-400 text-lg font-bold">Rp {Number(sale.payments[0].change).toLocaleString('id-ID')}</p>
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    <button onClick={generateReceipt}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2">
                        <Receipt className="w-4 h-4" /> Download Struk
                    </button>
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors">
                        Selesai
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Transactions;
