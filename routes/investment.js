const express = require('express');
const router = express.Router();
const User = require('../models/User');
const InvestmentPlan = require('../models/InvestmentPlan');
const Transaction = require('../models/Transaction');

const requireAuth = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
};

// Investment Plans Page
router.get('/', requireAuth, async (req, res) => {
    try {
        const investmentPlans = await InvestmentPlan.find({ isActive: true });
        const user = await User.findById(req.session.user._id);

        // Mock user investments (in real app, you'd have an Investment model)
        const userInvestments = [
            {
                planName: 'Starter Plan',
                amount: 300,
                dailyProfit: 25,
                startDate: new Date('2024-01-15'),
                endDate: new Date('2024-02-14'),
                totalEarned: 225,
                status: 'active'
            },
            {
                planName: 'Advanced Plan', 
                amount: 500,
                dailyProfit: 50,
                startDate: new Date('2024-01-20'),
                endDate: new Date('2024-02-19'),
                totalEarned: 150,
                status: 'active'
            }
        ];

        res.render('investment', {
            title: 'Investment Plans - Binance Plus',
            user: req.session.user,
            investmentPlans,
            userInvestments,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        console.error('Investment plans error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load investment plans'
        });
    }
});

// Invest in a Plan
router.post('/invest', requireAuth, async (req, res) => {
    try {
        const { planId, amount } = req.body;
        const user = await User.findById(req.session.user._id);

        // Get investment plan
        const plan = await InvestmentPlan.findById(planId);
        if (!plan) {
            return res.json({
                success: false,
                message: 'Investment plan not found'
            });
        }

        // Validate amount
        if (parseFloat(amount) < plan.amount) {
            return res.json({
                success: false,
                message: `Minimum investment for this plan is $${plan.amount}`
            });
        }

        // Check balance
        if (user.walletBalance.usdt < parseFloat(amount)) {
            return res.json({
                success: false,
                message: 'Insufficient USDT balance'
            });
        }

        // Create investment transaction
        const investmentTransaction = new Transaction({
            userId: user._id,
            type: 'investment',
            currency: 'USDT',
            amount: parseFloat(amount),
            investmentPlan: plan.name,
            status: 'pending'
        });

        await investmentTransaction.save();

        // In real application, you would create an Investment record here
        // and process the investment logic

        res.json({
            success: true,
            message: 'Investment request submitted successfully',
            transactionId: investmentTransaction._id,
            plan: plan.name,
            amount: parseFloat(amount)
        });
    } catch (error) {
        console.error('Investment error:', error);
        res.json({
            success: false,
            message: 'Failed to process investment'
        });
    }
});

// Investment Details Page
router.get('/:planId', requireAuth, async (req, res) => {
    try {
        const plan = await InvestmentPlan.findById(req.params.planId);
        if (!plan) {
            return res.redirect('/investment');
        }

        const user = await User.findById(req.session.user._id);

        res.render('investment-details', {
            title: `${plan.name} - Binance Plus`,
            user: req.session.user,
            plan,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        console.error('Investment details error:', error);
        res.redirect('/investment');
    }
});

// Calculate Investment Profit
router.post('/calculate-profit', requireAuth, async (req, res) => {
    try {
        const { planId, amount, days = 30 } = req.body;
        
        const plan = await InvestmentPlan.findById(planId);
        if (!plan) {
            return res.json({
                success: false,
                message: 'Plan not found'
            });
        }

        const investmentAmount = parseFloat(amount) || plan.amount;
        const dailyProfit = (investmentAmount * plan.dailyProfit) / 100;
        const totalProfit = dailyProfit * days;
        const totalReturn = investmentAmount + totalProfit;

        res.json({
            success: true,
            data: {
                investmentAmount,
                dailyProfit: parseFloat(dailyProfit.toFixed(2)),
                totalProfit: parseFloat(totalProfit.toFixed(2)),
                totalReturn: parseFloat(totalReturn.toFixed(2)),
                dailyPercentage: plan.dailyProfit,
                duration: days
            }
        });
    } catch (error) {
        console.error('Profit calculation error:', error);
        res.json({
            success: false,
            message: 'Failed to calculate profit'
        });
    }
});

// Get Active Investments
router.get('/api/active-investments', requireAuth, async (req, res) => {
    try {
        // Mock data - in real app, fetch from Investment model
        const activeInvestments = [
            {
                id: 1,
                planName: 'Starter Plan',
                amount: 300,
                dailyProfit: 75,
                startDate: '2024-01-15',
                daysRunning: 15,
                totalEarned: 1125,
                nextPayout: '2024-01-30'
            },
            {
                id: 2,
                planName: 'Advanced Plan',
                amount: 500,
                dailyProfit: 250,
                startDate: '2024-01-20',
                daysRunning: 10,
                totalEarned: 2500,
                nextPayout: '2024-01-30'
            }
        ];

        res.json({
            success: true,
            data: activeInvestments
        });
    } catch (error) {
        console.error('Active investments error:', error);
        res.json({
            success: false,
            message: 'Failed to fetch active investments'
        });
    }
});

// Investment History
router.get('/history', requireAuth, async (req, res) => {
    try {
        const investmentTransactions = await Transaction.find({
            userId: req.session.user._id,
            type: 'investment'
        }).sort({ createdAt: -1 });

        res.render('dashboard', {
            title: 'Investment History - Binance Plus',
            user: req.session.user,
            investments: investmentTransactions,
            currentSection: 'investment-history'
        });
    } catch (error) {
        console.error('Investment history error:', error);
        res.render('error', {
            title: 'Error - Binance Plus',
            error: 'Failed to load investment history'
        });
    }
});

module.exports = router;