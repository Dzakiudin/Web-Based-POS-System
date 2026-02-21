"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getPeakHours = exports.getTopProducts = exports.getSalesReport = exports.getDailySales = void 0;
const database_1 = __importDefault(require("../utils/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const getDailySales = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
        const sales = await database_1.default.sale.findMany({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
                status: 'COMPLETED',
            },
            include: {
                details: { include: { product: true } },
                payments: true,
                customer: { select: { name: true } },
                user: { select: { name: true } },
            },
            orderBy: { date: 'desc' },
        });
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.finalPrice), 0);
        const totalTransactions = sales.length;
        const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        // Payment method breakdown
        const paymentBreakdown = sales.reduce((acc, sale) => {
            sale.payments.forEach(p => {
                acc[p.method] = (acc[p.method] || 0) + Number(p.amount) - Number(p.change);
            });
            return acc;
        }, {});
        res.json({
            date: startOfDay.toISOString().split('T')[0],
            totalRevenue,
            totalTransactions,
            avgTransactionValue,
            paymentBreakdown,
            sales,
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching daily sales', error);
        res.status(500).json({ message: 'Error fetching daily sales' });
    }
};
exports.getDailySales = getDailySales;
const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }
        else {
            // Default to current month
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        const sales = await database_1.default.sale.findMany({
            where: {
                date: { gte: start, lte: end },
                status: 'COMPLETED',
            },
            include: {
                details: { include: { product: true } },
                payments: true,
            },
            orderBy: { date: 'asc' },
        });
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.finalPrice), 0);
        const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discountAmount), 0);
        const totalCostPrice = sales.reduce((sum, s) => {
            return sum + s.details.reduce((dSum, d) => {
                return dSum + (Number(d.product.costPrice) * d.quantity);
            }, 0);
        }, 0);
        const grossProfit = totalRevenue - totalCostPrice;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        // Group by day for chart data
        const dailyData = {};
        sales.forEach(sale => {
            const day = sale.date.toISOString().split('T')[0];
            if (!dailyData[day]) {
                dailyData[day] = { revenue: 0, transactions: 0, profit: 0 };
            }
            const cost = sale.details.reduce((sum, d) => sum + (Number(d.product.costPrice) * d.quantity), 0);
            dailyData[day].revenue += Number(sale.finalPrice);
            dailyData[day].transactions += 1;
            dailyData[day].profit += Number(sale.finalPrice) - cost;
        });
        const chartData = Object.entries(dailyData).map(([date, data]) => ({
            date,
            ...data,
        }));
        res.json({
            period: { start: start.toISOString(), end: end.toISOString() },
            summary: {
                totalRevenue,
                totalDiscount,
                totalCostPrice,
                grossProfit,
                profitMargin: Math.round(profitMargin * 100) / 100,
                totalTransactions: sales.length,
                avgTransactionValue: sales.length > 0 ? totalRevenue / sales.length : 0,
            },
            chartData,
        });
    }
    catch (error) {
        logger_1.default.error('Error generating sales report', error);
        res.status(500).json({ message: 'Error generating sales report' });
    }
};
exports.getSalesReport = getSalesReport;
const getTopProducts = async (req, res) => {
    try {
        const { limit = '10', days = '30' } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - Number(days));
        const topProducts = await database_1.default.saleDetail.groupBy({
            by: ['productId'],
            _sum: { quantity: true, subtotal: true },
            where: {
                sale: { date: { gte: since }, status: 'COMPLETED' },
            },
            orderBy: { _sum: { quantity: 'desc' } },
            take: Number(limit),
        });
        // Fetch product details
        const productIds = topProducts.map(tp => tp.productId);
        const products = await database_1.default.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, price: true, image: true },
        });
        const result = topProducts.map(tp => {
            const product = products.find(p => p.id === tp.productId);
            return {
                product,
                totalQuantity: tp._sum.quantity,
                totalRevenue: tp._sum.subtotal,
            };
        });
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error fetching top products', error);
        res.status(500).json({ message: 'Error fetching top products' });
    }
};
exports.getTopProducts = getTopProducts;
const getPeakHours = async (req, res) => {
    try {
        const { days = '30' } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - Number(days));
        const sales = await database_1.default.sale.findMany({
            where: { date: { gte: since }, status: 'COMPLETED' },
            select: { date: true, finalPrice: true },
        });
        // Group by hour
        const hourlyData = {};
        for (let i = 0; i < 24; i++) {
            hourlyData[i] = { count: 0, revenue: 0 };
        }
        sales.forEach(sale => {
            const hour = sale.date.getHours();
            hourlyData[hour].count += 1;
            hourlyData[hour].revenue += Number(sale.finalPrice);
        });
        const result = Object.entries(hourlyData).map(([hour, data]) => ({
            hour: Number(hour),
            label: `${String(hour).padStart(2, '0')}:00`,
            ...data,
        }));
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('Error fetching peak hours', error);
        res.status(500).json({ message: 'Error fetching peak hours' });
    }
};
exports.getPeakHours = getPeakHours;
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const [todaySales, totalProducts, totalCustomers, lowStockCount, recentSales] = await Promise.all([
            database_1.default.sale.aggregate({
                where: { date: { gte: today, lte: endOfDay }, status: 'COMPLETED' },
                _sum: { finalPrice: true },
                _count: { id: true },
            }),
            database_1.default.product.count({ where: { isActive: true } }),
            database_1.default.customer.count(),
            database_1.default.product.count({
                where: { isActive: true, stock: { lte: database_1.default.product.fields.minStock } },
            }),
            database_1.default.sale.findMany({
                where: { status: 'COMPLETED' },
                include: {
                    customer: { select: { name: true } },
                    user: { select: { name: true } },
                },
                orderBy: { date: 'desc' },
                take: 5,
            }),
        ]);
        res.json({
            todayRevenue: todaySales._sum.finalPrice || 0,
            todayTransactions: todaySales._count.id,
            totalProducts,
            totalCustomers,
            lowStockCount,
            recentSales,
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching dashboard stats', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};
exports.getDashboardStats = getDashboardStats;
