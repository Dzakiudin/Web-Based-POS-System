"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const sale_routes_1 = __importDefault(require("./routes/sale.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const discount_routes_1 = __importDefault(require("./routes/discount.routes"));
const cash_routes_1 = __importDefault(require("./routes/cash.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const stock_routes_1 = __importDefault(require("./routes/stock.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const voucher_routes_1 = __importDefault(require("./routes/voucher.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files (product images)
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/products', product_routes_1.default);
app.use('/api/customers', customer_routes_1.default);
app.use('/api/sales', sale_routes_1.default);
app.use('/api/categories', category_routes_1.default);
app.use('/api/discounts', discount_routes_1.default);
app.use('/api/cash-sessions', cash_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/stock-movements', stock_routes_1.default);
app.use('/api/audit-logs', audit_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/vouchers', voucher_routes_1.default);
app.get('/', (req, res) => {
    res.json({
        message: 'POS Pro Max API v2.0',
        version: '2.0.0',
        endpoints: [
            '/api/auth', '/api/products', '/api/customers', '/api/sales',
            '/api/categories', '/api/discounts', '/api/cash-sessions',
            '/api/reports', '/api/stock-movements', '/api/audit-logs', '/api/users',
            '/api/vouchers'
        ]
    });
});
// Start Server
app.listen(PORT, () => {
    console.log(`🚀 POS Pro Max Server running on port ${PORT}`);
});
