import { useState, useEffect, useRef } from 'react';
import api from '../lib/axios';
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

// ── Main Component ─────────────────────────────────────
const Transactions = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | null>(null);

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
        <div className="flex h-screen bg-background-dark overflow-hidden">
            {/* ══════ LEFT: Product Catalog ══════ */}
            <div className="flex-1 flex flex-col border-r border-border-dark overflow-hidden">
                {/* POS Top Header */}
                <div className="flex-none p-4 border-b border-border-dark bg-card-dark flex items-center gap-4">
                    <a href="/dashboard" className="flex items-center justify-center size-10 rounded-lg bg-background-dark border border-border-dark text-text-subtle hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </a>
                    <div className="flex-1 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle">search</span>
                        <input
                            ref={barcodeRef}
                            type="text"
                            placeholder="Cari produk atau scan barcode..."
                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-background-dark border border-border-dark text-white placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { handleBarcodeScan(searchQuery); } }}
                        />
                    </div>
                    {/* Customer Selector */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle text-[18px]">person</span>
                        <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
                            className="pl-10 pr-8 py-3 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer min-w-[160px]">
                            <option value="">Walk-in Customer</option>
                            {customers.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.membershipTier})</option>))}
                        </select>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex-none flex gap-2 p-4 pb-2 overflow-x-auto hide-scrollbar">
                    <button onClick={() => setActiveCategory(null)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${!activeCategory ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-card-dark text-text-subtle border border-border-dark hover:bg-card-hover hover:text-white'}`}>
                        All Items
                    </button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-card-dark text-text-subtle border border-border-dark hover:bg-card-hover hover:text-white'}`}>
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredProducts.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-text-subtle">
                                <span className="material-symbols-outlined text-5xl mb-4">inventory_2</span>
                                <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
                            </div>
                        ) : filteredProducts.map((product) => (
                            <button key={product.id} onClick={() => addToCart(product)}
                                disabled={product.stock <= 0}
                                className={`group relative flex flex-col rounded-xl border overflow-hidden transition-all text-left
                                    ${product.stock <= 0
                                        ? 'bg-card-dark border-border-dark opacity-40 cursor-not-allowed'
                                        : 'bg-card-dark border-border-dark hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'
                                    }`}>
                                {product.image ? (
                                    <img src={`http://localhost:5000${product.image}`} alt={product.name}
                                        className="w-full h-28 object-cover bg-background-dark" />
                                ) : (
                                    <div className="w-full h-28 bg-background-dark flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-text-subtle/40">inventory_2</span>
                                    </div>
                                )}
                                <div className="p-3 flex flex-col gap-1">
                                    <p className="text-white text-sm font-semibold truncate">{product.name}</p>
                                    {product.category && (
                                        <span className="text-xs text-text-subtle">{product.category.name}</span>
                                    )}
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-primary text-sm font-bold">Rp {Number(product.price).toLocaleString('id-ID')}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${product.stock <= product.minStock ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-background-dark text-text-subtle border border-border-dark'}`}>
                                            {product.stock}
                                        </span>
                                    </div>
                                </div>
                                {product.stock <= product.minStock && product.stock > 0 && (
                                    <div className="absolute top-2 right-2 bg-amber-500/90 text-background-dark px-1.5 py-0.5 rounded text-[10px] font-bold">
                                        LOW
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════ RIGHT: Order Sidebar ══════ */}
            <div className="w-[380px] flex-shrink-0 flex flex-col bg-card-dark overflow-hidden">
                {/* Header */}
                <div className="flex-none p-5 border-b border-border-dark">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">shopping_cart</span>
                            Order
                            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">{cart.length}</span>
                        </h2>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-xs text-red-400/70 hover:text-red-400 transition-colors font-medium">Clear All</button>
                        )}
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-text-subtle">
                            <span className="material-symbols-outlined text-4xl mb-3">shopping_cart</span>
                            <p className="text-sm font-medium">Your cart is empty</p>
                            <p className="text-xs mt-1 text-text-subtle/60">Select products to start a transaction</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.id} className="bg-background-dark rounded-xl p-3 border border-border-dark group hover:border-primary/20 transition-all">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                                    <p className="text-text-subtle text-xs">@ Rp {Number(item.price).toLocaleString('id-ID')}</p>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="text-text-subtle hover:text-red-400 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantity(item.id, -1)}
                                        className="size-8 rounded-lg bg-card-dark border border-border-dark flex items-center justify-center hover:bg-card-hover transition-colors">
                                        <span className="material-symbols-outlined text-[18px] text-white">remove</span>
                                    </button>
                                    <span className="text-white text-sm font-bold w-6 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)}
                                        className="size-8 rounded-lg bg-card-dark border border-border-dark flex items-center justify-center hover:bg-card-hover transition-colors">
                                        <span className="material-symbols-outlined text-[18px] text-white">add</span>
                                    </button>
                                </div>
                                <span className="text-primary text-sm font-bold">
                                    Rp {((Number(item.price) - item.discount) * item.quantity).toLocaleString('id-ID')}
                                </span>
                            </div>
                            {/* Item Discount */}
                            <div className="flex items-center gap-2 mt-2">
                                <span className="material-symbols-outlined text-[16px] text-text-subtle">sell</span>
                                <input type="number" placeholder="Diskon/item" min="0" value={item.discount || ''}
                                    onChange={e => setItemDiscount(item.id, Number(e.target.value))}
                                    className="flex-1 bg-card-dark border border-border-dark rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary w-0"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Promo Code */}
                {cart.length > 0 && (
                    <div className="flex-none px-4 pb-2">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-subtle text-[16px]">percent</span>
                                <input type="text" placeholder="Kode promo" value={promoCode}
                                    onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                                    onKeyDown={e => { if (e.key === 'Enter') validatePromo(); }}
                                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-background-dark border border-border-dark text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <button onClick={validatePromo} className="px-4 py-2 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary/20 transition-colors border border-primary/20">
                                Apply
                            </button>
                        </div>
                        {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
                        {promoDiscount && <p className="text-primary text-xs mt-1">✓ {promoDiscount.name} applied</p>}
                    </div>
                )}

                {/* Totals */}
                {cart.length > 0 && (
                    <div className="flex-none p-4 border-t border-border-dark space-y-2 bg-background-dark">
                        <div className="flex justify-between text-sm text-text-subtle">
                            <span>Subtotal</span>
                            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-primary">
                                <span>Discount</span>
                                <span>-Rp {totalDiscount.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-border-dark">
                            <span>Total</span>
                            <span className="text-primary">Rp {grandTotal.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                )}

                {/* Checkout Button */}
                <div className="flex-none p-4 border-t border-border-dark">
                    <button onClick={() => setShowCheckout(true)} disabled={cart.length === 0}
                        className={`w-full py-4 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2
                            ${cart.length === 0
                                ? 'bg-card-hover text-text-subtle/50 cursor-not-allowed'
                                : 'bg-primary text-background-dark hover:bg-green-400 shadow-lg shadow-primary/20 active:scale-[0.98]'
                            }`}>
                        <span className="material-symbols-outlined">credit_card</span>
                        Pay — Rp {grandTotal.toLocaleString('id-ID')}
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
                        fetchProducts();
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
// CHECKOUT MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface CheckoutModalProps {
    cart: CartItem[]; grandTotal: number; totalDiscount: number; subtotal: number;
    customerId: string; customerName: string;
    onClose: () => void; onSuccess: (sale: any) => void;
}

const PAYMENT_METHODS = [
    { key: 'CASH' as const, label: 'Tunai', icon: 'payments', color: 'text-primary' },
    { key: 'QRIS' as const, label: 'QRIS', icon: 'qr_code_scanner', color: 'text-blue-400' },
    { key: 'CARD' as const, label: 'Kartu', icon: 'credit_card', color: 'text-purple-400' },
    { key: 'EWALLET' as const, label: 'E-Wallet', icon: 'account_balance_wallet', color: 'text-amber-400' },
];

const CheckoutModal = ({ cart, grandTotal, totalDiscount, subtotal, customerId, customerName, onClose, onSuccess }: CheckoutModalProps) => {
    const [selectedMethod, setSelectedMethod] = useState<'CASH' | 'QRIS' | 'CARD' | 'EWALLET'>('CASH');
    const [cashAmount, setCashAmount] = useState('');
    const [reference, setReference] = useState('');
    const [processing, setProcessing] = useState(false);

    const cashChange = selectedMethod === 'CASH' ? Math.max(0, Number(cashAmount) - grandTotal) : 0;
    const canPay = selectedMethod === 'CASH'
        ? Number(cashAmount) >= grandTotal
        : true;

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
            <div className="w-full max-w-lg bg-card-dark rounded-xl border border-border-dark shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-border-dark flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">credit_card</span> Payment
                    </h2>
                    <button onClick={onClose} className="text-text-subtle hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Customer + Items */}
                <div className="px-5 py-3 border-b border-border-dark flex justify-between text-sm">
                    <span className="text-text-subtle">Customer: <span className="text-white font-semibold">{customerName}</span></span>
                    <span className="text-text-subtle">{cart.length} item</span>
                </div>

                {/* Payment Methods */}
                <div className="p-5">
                    <p className="text-text-subtle text-xs uppercase tracking-wider mb-3 font-bold">Payment Method</p>
                    <div className="grid grid-cols-4 gap-2 mb-5">
                        {PAYMENT_METHODS.map(pm => (
                            <button key={pm.key} onClick={() => { setSelectedMethod(pm.key); setCashAmount(''); setReference(''); }}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold
                                    ${selectedMethod === pm.key
                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                        : 'bg-background-dark border-border-dark text-text-subtle hover:bg-card-hover hover:text-white'
                                    }`}>
                                <span className="material-symbols-outlined">{pm.icon}</span>
                                {pm.label}
                            </button>
                        ))}
                    </div>

                    {/* Cash Input */}
                    {selectedMethod === 'CASH' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-text-subtle text-xs mb-1.5 block font-medium">Amount</label>
                                <input type="number" value={cashAmount}
                                    onChange={e => setCashAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-3 rounded-lg bg-background-dark border border-border-dark text-white text-lg font-bold focus:outline-none focus:ring-1 focus:ring-primary text-right"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                {quickCashAmounts.map(amount => (
                                    <button key={amount} onClick={() => setCashAmount(String(amount))}
                                        className="flex-1 py-2 rounded-lg bg-background-dark border border-border-dark text-text-subtle text-xs hover:bg-card-hover hover:text-white transition-colors font-medium">
                                        {amount.toLocaleString('id-ID')}
                                    </button>
                                ))}
                            </div>
                            {Number(cashAmount) >= grandTotal && (
                                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                                    <p className="text-primary/60 text-xs">Change</p>
                                    <p className="text-primary text-xl font-bold">Rp {cashChange.toLocaleString('id-ID')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reference for non-cash */}
                    {selectedMethod !== 'CASH' && (
                        <div>
                            <label className="text-text-subtle text-xs mb-1.5 block font-medium">Reference Number (optional)</label>
                            <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                                placeholder={selectedMethod === 'QRIS' ? 'QRIS Ref No.' : selectedMethod === 'CARD' ? 'Auth Code' : 'Ref ID'}
                                className="w-full px-4 py-2.5 rounded-lg bg-background-dark border border-border-dark text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    )}
                </div>

                {/* Summary + Pay Button */}
                <div className="p-5 border-t border-border-dark bg-background-dark">
                    <div className="flex justify-between text-sm text-text-subtle mb-1">
                        <span>Subtotal</span><span>Rp {subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between text-sm text-primary mb-1">
                            <span>Discount</span><span>-Rp {totalDiscount.toLocaleString('id-ID')}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold text-white mb-4 pt-2 border-t border-border-dark">
                        <span>Total</span>
                        <span className="text-primary">Rp {grandTotal.toLocaleString('id-ID')}</span>
                    </div>
                    <button onClick={handlePay} disabled={!canPay || processing}
                        className={`w-full py-3.5 rounded-xl text-base font-bold transition-all flex items-center justify-center gap-2
                            ${!canPay || processing
                                ? 'bg-card-hover text-text-subtle/50 cursor-not-allowed'
                                : 'bg-primary text-background-dark hover:bg-green-400 active:scale-[0.98] shadow-lg shadow-primary/20'
                            }`}>
                        {processing ? (
                            <div className="w-5 h-5 border-2 border-background-dark/30 border-t-background-dark rounded-full animate-spin" />
                        ) : (
                            <><span className="material-symbols-outlined">check_circle</span> Process Payment</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUCCESS MODAL
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
            d.product.name, d.quantity,
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
            <div className="w-full max-w-sm bg-card-dark rounded-xl border border-border-dark shadow-2xl overflow-hidden text-center p-8"
                onClick={e => e.stopPropagation()}>
                <div className="size-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                </div>
                <h2 className="text-white font-bold text-xl mb-1">Transaction Successful!</h2>
                <p className="text-text-subtle text-sm mb-1">{sale.receiptNumber}</p>
                <p className="text-primary text-2xl font-bold mb-6">Rp {Number(sale.finalPrice).toLocaleString('id-ID')}</p>

                {sale.payments?.map((p: any, i: number) => (
                    <div key={i} className="bg-background-dark rounded-lg p-3 mb-2 flex justify-between text-sm border border-border-dark">
                        <span className="text-text-subtle">{p.method}</span>
                        <span className="text-white font-semibold">Rp {Number(p.amount).toLocaleString('id-ID')}</span>
                    </div>
                ))}

                {sale.payments?.[0]?.method === 'CASH' && Number(sale.payments[0].change) > 0 && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                        <p className="text-primary/60 text-xs">Change</p>
                        <p className="text-primary text-lg font-bold">Rp {Number(sale.payments[0].change).toLocaleString('id-ID')}</p>
                    </div>
                )}

                <div className="flex gap-2 mt-4">
                    <button onClick={generateReceipt}
                        className="flex-1 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">receipt</span> Download Receipt
                    </button>
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg bg-background-dark border border-border-dark text-text-subtle text-sm font-semibold hover:bg-card-hover hover:text-white transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Transactions;
