const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const InvestmentPlan = require('../models/InvestmentPlan');
const Wallet = require('../models/Wallet');

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }
    
    // For demo purposes, we'll check if email is admin
    if (req.session.user && req.session.user.email === 'admin@binanceplus.com') {
        req.session.user.isAdmin = true;
        return next();
    }
    
    res.redirect('/login');
};

// Admin Dashboard
router.get('/', requireAdmin, async (req, res) => {
    try {
        // Get statistics
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const newUsersToday = await User.countDocuments({
            registrationDate: { 
                $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
            }
        });

        const totalTransactions = await Transaction.countDocuments();
        const pendingTransactions = await Transaction.countDocuments({ status: 'pending' });
        const totalDeposits = await Transaction.aggregate([
            { $match: { type: 'deposit', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawals = await Transaction.aggregate([
            { $match: { type: 'withdrawal', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Recent activities
        const recentUsers = await User.find()
            .sort({ registrationDate: -1 })
            .limit(5)
            .select('firstName lastName email registrationDate');

        const recentTransactions = await Transaction.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'firstName lastName email');

        const stats = {
            totalUsers,
            activeUsers,
            newUsersToday,
            totalTransactions,
            pendingTransactions,
            totalDeposits: totalDeposits[0]?.total || 0,
            totalWithdrawals: totalWithdrawals[0]?.total || 0
        };

        res.render('admin-dashboard', {
            title: 'Admin Dashboard - Binance Plus',
            user: req.session.user,
            stats,
            recentUsers,
            recentTransactions,
            currentSection: 'overview'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load admin dashboard'
        });
    }
});

// Users Management
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status || 'all';

        let query = {};
        
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { referralCode: { $regex: search, $options: 'i' } }
            ];
        }

        if (status !== 'all') {
            query.isActive = status === 'active';
        }

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);
        const skip = (page - 1) * limit;

        const users = await User.find(query)
            .select('-password -verificationCode -resetPasswordToken')
            .sort({ registrationDate: -1 })
            .skip(skip)
            .limit(limit);

        res.render('admin-dashboard', {
            title: 'Users Management - Binance Plus',
            user: req.session.user,
            users,
            pagination: {
                page,
                totalPages,
                totalUsers,
                limit,
                search,
                status
            },
            currentSection: 'users'
        });
    } catch (error) {
        console.error('Users management error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load users'
        });
    }
});

// User Details
router.get('/users/:id', requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -verificationCode -resetPasswordToken');
        
        if (!user) {
            return res.render('error', {
                title: 'Error - Binance Plus',
                error: 'User not found'
            });
        }

        const userTransactions = await Transaction.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(20);

        const referredUsers = await User.find({ referredBy: user.referralCode })
            .select('firstName lastName email registrationDate');

        res.render('admin-dashboard', {
            title: `User Details - ${user.firstName} ${user.lastName}`,
            user: req.session.user,
            userDetails: user,
            userTransactions,
            referredUsers,
            currentSection: 'user-details'
        });
    } catch (error) {
        console.error('User details error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load user details'
        });
    }
});

// Update User Status
router.post('/users/:id/status', requireAdmin, async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: isActive === 'true' },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: `User ${isActive === 'true' ? 'activated' : 'deactivated'} successfully`,
            user
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.json({
            success: false,
            message: 'Failed to update user status'
        });
    }
});

// Update User Wallet Balance
router.post('/users/:id/wallet', requireAdmin, async (req, res) => {
    try {
        const { currency, amount, action, note } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        const currentBalance = user.walletBalance[currency.toLowerCase()] || 0;
        let newBalance;

        if (action === 'add') {
            newBalance = currentBalance + parseFloat(amount);
        } else if (action === 'subtract') {
            if (currentBalance < parseFloat(amount)) {
                return res.json({
                    success: false,
                    message: 'Insufficient balance'
                });
            }
            newBalance = currentBalance - parseFloat(amount);
        } else {
            newBalance = parseFloat(amount);
        }

        user.walletBalance[currency.toLowerCase()] = newBalance;

        // Create transaction record
        const transaction = new Transaction({
            userId: user._id,
            type: action === 'add' ? 'admin_deposit' : 'admin_withdrawal',
            currency,
            amount: parseFloat(amount),
            status: 'completed',
            adminNote: note || `Admin ${action} balance`
        });

        await transaction.save();
        await user.save();

        res.json({
            success: true,
            message: `Wallet balance updated successfully`,
            newBalance,
            transactionId: transaction._id
        });
    } catch (error) {
        console.error('Update wallet balance error:', error);
        res.json({
            success: false,
            message: 'Failed to update wallet balance'
        });
    }
});

// Transactions Management
router.get('/transactions', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type || 'all';
        const status = req.query.status || 'all';

        let query = {};
        
        if (type !== 'all') {
            query.type = type;
        }

        if (status !== 'all') {
            query.status = status;
        }

        const totalTransactions = await Transaction.countDocuments(query);
        const totalPages = Math.ceil(totalTransactions / limit);
        const skip = (page - 1) * limit;

        const transactions = await Transaction.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('referralUser', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const transactionStats = {
            total: await Transaction.countDocuments(),
            pending: await Transaction.countDocuments({ status: 'pending' }),
            completed: await Transaction.countDocuments({ status: 'completed' }),
            failed: await Transaction.countDocuments({ status: 'failed' })
        };

        res.render('admin-dashboard', {
            title: 'Transactions Management - Binance Plus',
            user: req.session.user,
            transactions,
            transactionStats,
            pagination: {
                page,
                totalPages,
                totalTransactions,
                limit,
                type,
                status
            },
            currentSection: 'transactions'
        });
    } catch (error) {
        console.error('Transactions management error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load transactions'
        });
    }
});

// Update Transaction Status
router.post('/transactions/:id/status', requireAdmin, async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const transaction = await Transaction.findById(req.params.id)
            .populate('userId');

        if (!transaction) {
            return res.json({
                success: false,
                message: 'Transaction not found'
            });
        }

        const oldStatus = transaction.status;
        transaction.status = status;
        transaction.adminNote = adminNote;

        if (status === 'completed' && oldStatus !== 'completed') {
            transaction.completedAt = new Date();

            // Update user balance for completed deposits
            if (transaction.type === 'deposit') {
                const user = await User.findById(transaction.userId);
                if (user) {
                    user.walletBalance[transaction.currency.toLowerCase()] += transaction.amount;
                    await user.save();
                }
            }
        }

        await transaction.save();

        res.json({
            success: true,
            message: `Transaction ${status} successfully`,
            transaction
        });
    } catch (error) {
        console.error('Update transaction status error:', error);
        res.json({
            success: false,
            message: 'Failed to update transaction status'
        });
    }
});

// Investment Plans Management
router.get('/investment-plans', requireAdmin, async (req, res) => {
    try {
        const investmentPlans = await InvestmentPlan.find().sort({ amount: 1 });

        res.render('admin-dashboard', {
            title: 'Investment Plans - Binance Plus',
            user: req.session.user,
            investmentPlans,
            currentSection: 'investment-plans'
        });
    } catch (error) {
        console.error('Investment plans management error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load investment plans'
        });
    }
});

// Create/Edit Investment Plan
router.post('/investment-plans', requireAdmin, async (req, res) => {
    try {
        const { id, name, amount, dailyProfit, duration, features, isActive } = req.body;

        let plan;
        if (id) {
            // Update existing plan
            plan = await InvestmentPlan.findByIdAndUpdate(
                id,
                {
                    name,
                    amount: parseFloat(amount),
                    dailyProfit: parseFloat(dailyProfit),
                    duration: parseInt(duration),
                    features: features ? features.split(',').map(f => f.trim()) : [],
                    isActive: isActive === 'true'
                },
                { new: true }
            );
        } else {
            // Create new plan
            plan = new InvestmentPlan({
                name,
                amount: parseFloat(amount),
                dailyProfit: parseFloat(dailyProfit),
                duration: parseInt(duration),
                features: features ? features.split(',').map(f => f.trim()) : [],
                isActive: isActive === 'true'
            });
            await plan.save();
        }

        res.json({
            success: true,
            message: `Investment plan ${id ? 'updated' : 'created'} successfully`,
            plan
        });
    } catch (error) {
        console.error('Create/update investment plan error:', error);
        res.json({
            success: false,
            message: 'Failed to save investment plan'
        });
    }
});

// Wallet Addresses Management
router.get('/wallets', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const currency = req.query.currency || 'all';

        let query = {};
        if (currency !== 'all') {
            query.currency = currency;
        }

        const totalWallets = await Wallet.countDocuments(query);
        const totalPages = Math.ceil(totalWallets / limit);
        const skip = (page - 1) * limit;

        const wallets = await Wallet.find(query)
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const walletStats = {
            total: await Wallet.countDocuments(),
            byCurrency: await Wallet.aggregate([
                { $group: { _id: '$currency', count: { $sum: 1 } } }
            ])
        };

        res.render('admin-dashboard', {
            title: 'Wallet Management - Binance Plus',
            user: req.session.user,
            wallets,
            walletStats,
            pagination: {
                page,
                totalPages,
                totalWallets,
                limit,
                currency
            },
            currentSection: 'wallets'
        });
    } catch (error) {
        console.error('Wallets management error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load wallets'
        });
    }
});

// Create Wallet Address
router.post('/wallets', requireAdmin, async (req, res) => {
    try {
        const { userId, currency, network, address } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if wallet already exists
        const existingWallet = await Wallet.findOne({
            userId,
            currency,
            network
        });

        if (existingWallet) {
            return res.json({
                success: false,
                message: 'Wallet already exists for this user and network'
            });
        }

        const wallet = new Wallet({
            userId,
            currency,
            network,
            address
        });

        await wallet.save();

        res.json({
            success: true,
            message: 'Wallet created successfully',
            wallet
        });
    } catch (error) {
        console.error('Create wallet error:', error);
        res.json({
            success: false,
            message: 'Failed to create wallet'
        });
    }
});

// System Settings
router.get('/settings', requireAdmin, (req, res) => {
    res.render('admin-dashboard', {
        title: 'System Settings - Binance Plus',
        user: req.session.user,
        currentSection: 'settings',
        settings: {
            siteName: 'Binance Plus',
            siteUrl: process.env.APP_URL || 'http://localhost:3000',
            supportEmail: 'support@binanceplus.com',
            referralBonus: 20,
            maintenanceMode: false
        }
    });
});

// Update Settings
router.post('/settings', requireAdmin, async (req, res) => {
    try {
        const { siteName, supportEmail, referralBonus, maintenanceMode } = req.body;

        // In real application, you would save these to a Settings model
        console.log('Settings updated:', {
            siteName,
            supportEmail,
            referralBonus,
            maintenanceMode,
            updatedBy: req.session.user.email,
            updatedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.json({
            success: false,
            message: 'Failed to update settings'
        });
    }
});

// Support Tickets (Mock)
router.get('/support-tickets', requireAdmin, (req, res) => {
    // Mock support tickets
    const supportTickets = [
        {
            id: 1,
            user: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            subject: 'Withdrawal Issue',
            message: 'My withdrawal is pending for more than 24 hours.',
            priority: 'high',
            status: 'open',
            createdAt: new Date('2024-01-25')
        },
        {
            id: 2,
            user: { firstName: 'Sarah', lastName: 'Smith', email: 'sarah@example.com' },
            subject: 'Investment Question',
            message: 'How does the daily profit calculation work?',
            priority: 'medium',
            status: 'closed',
            createdAt: new Date('2024-01-24')
        }
    ];

    res.render('admin-dashboard', {
        title: 'Support Tickets - Binance Plus',
        user: req.session.user,
        supportTickets,
        currentSection: 'support-tickets'
    });
});

module.exports = router;