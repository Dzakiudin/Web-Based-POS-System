import { useState, useEffect } from 'react';
import api from '../lib/axios';
import { Search, Trash2, ShoppingCart, Minus, Plus, CreditCard, User, Package, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Product {
    id: number;
    name: string;
    price: string;
    stock: number;
    image: string | null;
}

interface Customer {
    id: number;
    name: string;
}

interface CartItem extends Product {
    quantity: number;
}

const Transactions = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products');
            setProducts(response.data);
        } catch (error) {
            console.error('Error fetching products', error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
        } catch (error) {
            console.error('Error fetching customers', error);
        }
    };

    const addToCart = (product: Product) => {
        const existingItem = cart.find((item) => item.id === product.id);
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                setCart(
                    cart.map((item) =>
                        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                    )
                );
            } else {
                alert('Insufficient stock!');
            }
        } else {
            if (product.stock > 0) {
                setCart([...cart, { ...product, quantity: 1 }]);
            } else {
                alert('Product out of stock!');
            }
        }
    };

    const removeFromCart = (id: number) => {
        setCart(cart.filter((item) => item.id !== id));
    };

    const updateQuantity = (id: number, quantity: number) => {
        if (quantity < 1) return;
        const product = products.find((p) => p.id === id);
        if (product && quantity > product.stock) {
            alert('Insufficient stock!');
            return;
        }
        setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)));
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + parseFloat(item.price) * item.quantity, 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);

        try {
            // FIX: Ensure customerId is a number or null, not an empty string
            const saleData = {
                customerId: selectedCustomerId ? Number(selectedCustomerId) : null,
                totalPrice: calculateTotal(),
                details: cart.map((item) => ({
                    productId: item.id,
                    quantity: item.quantity,
                    subtotal: parseFloat(item.price) * item.quantity,
                })),
            };

            const response = await api.post('/sales', saleData);

            generateReceipt(response.data);

            setCart([]);
            setSelectedCustomerId('');
            fetchProducts(); // Refresh stock
            alert('Transaction complete! Receipt downloaded.');
        } catch (error) {
            console.error('Error creating sale', error);
            alert('Transaction failed. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    const generateReceipt = (sale: any) => {
        const doc = new jsPDF();

        // Premium Receipt Header
        doc.setFontSize(22);
        doc.setTextColor(40, 44, 52);
        doc.text('POS PRO MAX', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Premium Store Management System', 105, 28, { align: 'center' });

        doc.setDrawColor(200);
        doc.line(20, 35, 190, 35);

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`Transaction ID : ${sale.id}`, 20, 45);
        doc.text(`Date           : ${new Date().toLocaleString()}`, 20, 52);

        if (selectedCustomerId) {
            const customer = customers.find(c => c.id === Number(selectedCustomerId));
            doc.text(`Customer       : ${customer?.name || 'Guest'}`, 20, 59);
        }

        const tableData = cart.map(item => [
            item.name,
            item.quantity,
            `Rp ${parseFloat(item.price).toLocaleString()}`,
            `Rp ${(parseFloat(item.price) * item.quantity).toLocaleString()}`
        ]);

        // FIX: Use autoTable as a function call
        autoTable(doc, {
            head: [['Product Description', 'Qty', 'Unit Price', 'Subtotal']],
            body: tableData,
            startY: 70,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL AMOUNT: Rp ${calculateTotal().toLocaleString()}`, 190, finalY, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        doc.text('Thank you for your business!', 105, finalY + 25, { align: 'center' });

        doc.save(`POS-Receipt-${sale.id}.pdf`);
    };

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Products Section */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="mb-6 relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-indigo-400 group-focus-within:text-indigo-300 transition-colors">
                        <Search className="h-5 w-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search items by name..."
                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] pl-14 pr-6 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all backdrop-blur-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                            <div className="p-6 bg-white/5 rounded-full">
                                <Package className="w-12 h-12 text-slate-500" />
                            </div>
                            <p className="text-slate-400 font-medium">No products found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
                            {filteredProducts.map((product, idx) => (
                                <div
                                    key={product.id}
                                    className="glass-card group relative p-4 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex flex-col shadow-2xl overflow-hidden"
                                    onClick={() => addToCart(product)}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    {/* Decoration */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-indigo-600/10 transition-all"></div>

                                    <div className="relative aspect-square w-full mb-4 overflow-hidden rounded-[2rem]">
                                        {product.image ? (
                                            <img
                                                src={`http://localhost:5000${product.image}`}
                                                alt={product.name}
                                                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-white/5 flex items-center justify-center text-slate-600">
                                                <Package className="w-10 h-10" />
                                            </div>
                                        )}
                                        {product.stock <= 5 && (
                                            <div className="absolute top-3 right-3 px-3 py-1 bg-amber-500/20 backdrop-blur-md border border-amber-500/20 rounded-full text-[10px] font-black text-amber-400 uppercase tracking-wider">
                                                Low Stock: {product.stock}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors line-clamp-1">
                                            {product.name}
                                        </h3>
                                        <div className="flex justify-between items-end pt-1">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price</span>
                                                <span className="text-xl font-black text-white">Rp {parseFloat(product.price).toLocaleString()}</span>
                                            </div>
                                            <div className="p-2 bg-indigo-600/20 rounded-xl group-hover:bg-indigo-600 transition-all duration-300">
                                                <Plus className="w-4 h-4 text-indigo-400 group-hover:text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Section */}
            <div className="w-[400px] flex flex-col h-full animate-in slide-in-from-right-8 duration-700 delay-200">
                <div className="glass-card flex-1 flex flex-col rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden relative">
                    {/* Glow background */}
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>

                    {/* Order Header */}
                    <div className="p-8 border-b border-white/10 relative z-10 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/20">
                                <ShoppingCart className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Current Order</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Transaction Queue</p>
                            </div>
                        </div>
                        {cart.length > 0 && (
                            <button
                                onClick={() => setCart([])}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
                                title="Clear all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Customer Selection */}
                    <div className="p-6 border-b border-white/5 relative z-10">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                                <User className="h-4 w-4" />
                            </div>
                            <select
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:bg-white/[0.08] transition-all"
                            >
                                <option value="" className="bg-slate-900">Walk-in Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500">
                                <Plus className="h-3 w-3 rotate-45" />
                            </div>
                        </div>
                    </div>

                    {/* Cart Items Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                                <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-slate-600 border border-white/5">
                                    <ShoppingCart className="w-8 h-8 opacity-20" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg">Empty Basket</p>
                                    <p className="text-slate-500 text-sm max-w-[200px] mx-auto">Select products from the grid to start a new transaction.</p>
                                </div>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.id} className="flex items-center space-x-4 animate-in fade-in slide-in-from-right-4">
                                    <div className="relative h-16 w-16 min-w-[64px] rounded-2xl bg-white/10 border border-white/10 overflow-hidden shadow-lg">
                                        {item.image ? (
                                            <img src={`http://localhost:5000${item.image}`} className="h-full w-full object-cover" alt="" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-slate-600">
                                                <Package size={20} />
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-indigo-600 text-[8px] font-black text-white rounded-bl-lg">
                                            LV {item.quantity}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-white text-sm line-clamp-1">{item.name}</h4>
                                        <p className="text-xs text-indigo-400 font-black tracking-tight">
                                            Rp {parseFloat(item.price).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="flex items-center bg-white/5 rounded-xl border border-white/5 p-1">
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-75"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="w-8 text-center text-xs font-black text-white">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-75"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer / Total Area */}
                    <div className="p-8 bg-white/5 border-t border-white/10 relative z-10 backdrop-blur-xl">
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span className="text-white">Rp {calculateTotal().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                <span>Tax (0%)</span>
                                <span className="text-white">Rp 0</span>
                            </div>
                            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Total Balance</span>
                                    <span className="text-3xl font-black text-white tracking-tighter tabular-nums inline-flex items-center">
                                        Rp {calculateTotal().toLocaleString()}
                                    </span>
                                </div>
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                    <CreditCard className="w-6 h-6 text-indigo-400" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={loading || cart.length === 0}
                            className={`group relative w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden ${loading || cart.length === 0
                                    ? 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                {loading ? (
                                    <span className="flex items-center">
                                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3"></span>
                                        SECURE PROCESSING...
                                    </span>
                                ) : (
                                    <>
                                        COMPLETE TRANSACTION
                                        <CreditCard className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                            {!loading && cart.length > 0 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Transactions;

