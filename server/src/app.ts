import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import customerRoutes from './routes/customer.routes';
import saleRoutes from './routes/sale.routes';
import categoryRoutes from './routes/category.routes';
import discountRoutes from './routes/discount.routes';
import cashRoutes from './routes/cash.routes';
import reportRoutes from './routes/report.routes';
import stockRoutes from './routes/stock.routes';
import auditRoutes from './routes/audit.routes';
import userRoutes from './routes/user.routes';
import voucherRoutes from './routes/voucher.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (product images)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/cash-sessions', cashRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stock-movements', stockRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vouchers', voucherRoutes);

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
