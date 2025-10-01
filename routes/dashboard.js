const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const InvestmentPlan = require('../models/InvestmentPlan');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
};

// Dashboard Main Page
router.get('/', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const transactions = await Transaction.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('referralUser', 'firstName lastName email');

        const investmentPlans = await InvestmentPlan.find({ isActive: true });

        // Calculate total balance
        const totalBalance = Object.values(user.walletBalance).reduce((sum, balance) => sum + balance, 0);

        // Calculate active investments (mock data - in real app, you'd have an Investment model)
        const activeInvestments = [
            { plan: 'Starter Plan', amount: 300, profit: 75, startDate: new Date('2024-01-15') },
            { plan: 'Advanced Plan', amount: 500, profit: 250, startDate: new Date('2024-01-20') }
        ];

        const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        const totalProfit = activeInvestments.reduce((sum, inv) => sum + inv.profit, 0);

        res.render('dashboard', {
            title: 'Dashboard - Binance Plus',
            user: {
                ...req.session.user,
                walletBalance: user.walletBalance,
                totalEarnings: user.totalEarnings,
                referralEarnings: user.referralEarnings
            },
            dashboardData: {
                totalBalance,
                availableBalance: user.walletBalance.usdt,
                totalEarnings: user.totalEarnings,
                referralEarnings: user.referralEarnings,
                activeInvestments: activeInvestments.length,
                totalInvested,
                totalProfit
            },
            transactions,
            investmentPlans,
            activeInvestments,
            currentSection: 'overview'
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load dashboard'
        });
    }
});

// Wallet Management
router.get('/wallet', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const transactions = await Transaction.find({ userId: user._id })
            .sort({ createdAt: -1 });

        res.render('dashboard', {
            title: 'Wallet - Binance Plus',
            user: {
                ...req.session.user,
                walletBalance: user.walletBalance
            },
            transactions,
            currentSection: 'wallet'
        });
    } catch (error) {
        console.error('Wallet error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load wallet'
        });
    }
});

// Deposit Page
router.get('/deposit', requireAuth, (req, res) => {
    res.render('dashboard', {
        title: 'Deposit - Binance Plus',
        user: req.session.user,
        currentSection: 'deposit',
        currencies: [
            { symbol: 'USDT', name: 'Tether', networks: ['ERC20', 'TRC20', 'BEP20'] },
            { symbol: 'BTC', name: 'Bitcoin', networks: ['BTC'] },
            { symbol: 'ETH', name: 'Ethereum', networks: ['ERC20'] },
            { symbol: 'BNB', name: 'Binance Coin', networks: ['BEP20'] }
        ]
    });
});

// Process Deposit
router.post('/deposit', requireAuth, async (req, res) => {
    try {
        const { currency, amount, network } = req.body;
        const user = await User.findById(req.session.user._id);

        // Generate unique transaction ID
        const transactionId = `DEP${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

        // Create pending transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'deposit',
            currency,
            amount: parseFloat(amount),
            network,
            status: 'pending',
            transactionHash: transactionId
        });

        await transaction.save();

        // In real application, you would generate wallet address here
        const walletAddress = generateWalletAddress(currency, network);

        res.json({
            success: true,
            message: 'Deposit request created successfully',
            data: {
                transactionId,
                walletAddress,
                currency,
                network,
                amount
            }
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.json({
            success: false,
            message: 'Failed to process deposit request'
        });
    }
});

// Withdraw Page
router.get('/withdraw', requireAuth, (req, res) => {
    const user = req.session.user;
    res.render('dashboard', {
        title: 'Withdraw - Binance Plus',
        user,
        currentSection: 'withdraw',
        currencies: [
            { symbol: 'USDT', name: 'Tether', networks: ['ERC20', 'TRC20', 'BEP20'] },
            { symbol: 'BTC', name: 'Bitcoin', networks: ['BTC'] },
            { symbol: 'ETH', name: 'Ethereum', networks: ['ERC20'] }
        ]
    });
});

// Process Withdrawal
router.post('/withdraw', requireAuth, async (req, res) => {
    try {
        const { currency, amount, network, walletAddress } = req.body;
        const user = await User.findById(req.session.user._id);

        // Validation
        if (!walletAddress) {
            return res.json({
                success: false,
                message: 'Wallet address is required'
            });
        }

        if (parseFloat(amount) <= 0) {
            return res.json({
                success: false,
                message: 'Invalid amount'
            });
        }

        // Check balance
        if (user.walletBalance[currency.toLowerCase()] < parseFloat(amount)) {
            return res.json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Check minimum withdrawal
        const minWithdrawal = getMinWithdrawal(currency);
        if (parseFloat(amount) < minWithdrawal) {
            return res.json({
                success: false,
                message: `Minimum withdrawal for ${currency} is ${minWithdrawal}`
            });
        }

        // Create withdrawal transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'withdrawal',
            currency,
            amount: parseFloat(amount),
            network,
            walletAddress,
            status: 'pending'
        });

        await transaction.save();

        // Deduct from balance (will be confirmed by admin)
        user.walletBalance[currency.toLowerCase()] -= parseFloat(amount);
        await user.save();

        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            transactionId: transaction._id
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.json({
            success: false,
            message: 'Failed to process withdrawal request'
        });
    }
});

// Referral System
router.get('/referral', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const referredUsers = await User.find({ referredBy: user.referralCode })
            .select('firstName lastName email registrationDate')
            .sort({ registrationDate: -1 });

        const referralStats = {
            totalReferrals: referredUsers.length,
            totalEarnings: user.referralEarnings,
            activeReferrals: referredUsers.length // In real app, you might have different logic
        };

        const referralLink = `${process.env.APP_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`;

        res.render('dashboard', {
            title: 'Referral Program - Binance Plus',
            user: req.session.user,
            referralData: {
                link: referralLink,
                code: user.referralCode,
                stats: referralStats,
                users: referredUsers
            },
            currentSection: 'referral'
        });
    } catch (error) {
        console.error('Referral error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load referral data'
        });
    }
});

// Profile Page
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id)
            .select('-password -verificationCode -resetPasswordToken');

        res.render('dashboard', {
            title: 'Profile - Binance Plus',
            user: {
                ...req.session.user,
                ...user.toObject()
            },
            currentSection: 'profile'
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load profile'
        });
    }
});

// Update Profile
router.post('/profile', requireAuth, async (req, res) => {
    try {
        const { firstName, lastName, country, city } = req.body;
        const user = await User.findById(req.session.user._id);

        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.country = country || user.country;
        user.city = city || user.city;

        await user.save();

        // Update session
        req.session.user.firstName = user.firstName;
        req.session.user.lastName = user.lastName;

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Support Page
router.get('/support', requireAuth, (req, res) => {
    res.render('dashboard', {
        title: 'Support - Binance Plus',
        user: req.session.user,
        currentSection: 'support'
    });
});

// Submit Support Ticket
router.post('/support', requireAuth, async (req, res) => {
    try {
        const { subject, message, priority } = req.body;

        // In real application, you would save this to a SupportTicket model
        console.log('Support ticket received:', {
            userId: req.session.user._id,
            subject,
            message,
            priority,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Support ticket submitted successfully. We will respond within 24 hours.'
        });
    } catch (error) {
        console.error('Support ticket error:', error);
        res.json({
            success: false,
            message: 'Failed to submit support ticket'
        });
    }
});

// Helper functions
function generateWalletAddress(currency, network) {
    // In real application, you would generate actual wallet addresses
    const prefixes = {
        'USDT': 'TY',
        'BTC': '1A',
        'ETH': '0x',
        'BNB': 'bnb'
    };

    const prefix = prefixes[currency] || '0x';
    const randomPart = Math.random().toString(36).substr(2, 10).toUpperCase();
    return prefix + randomPart + 'BinancePlusWallet';
}

function getMinWithdrawal(currency) {
    const minAmounts = {
        'USDT': 10,
        'BTC': 0.001,
        'ETH': 0.01,
        'BNB': 0.1
    };
    return minAmounts[currency] || 10;
}

module.exports = router;