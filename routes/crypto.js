const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');

// Middleware for authentication
const requireAuth = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// ----------------------------
// Crypto Trading Page
// ----------------------------
router.get('/', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);

        // Mock top cryptocurrencies data
        const cryptoData = [
            { symbol: 'BTC', name: 'Bitcoin', price: 45123.45, change: 2.34, icon: 'btc.png' },
            { symbol: 'ETH', name: 'Ethereum', price: 2389.67, change: -1.23, icon: 'eth.png' },
            { symbol: 'BNB', name: 'Binance Coin', price: 312.89, change: 0.56, icon: 'bnb.png' },
            { symbol: 'XRP', name: 'Ripple', price: 0.5678, change: 1.89, icon: 'xrp.png' },
            { symbol: 'ADA', name: 'Cardano', price: 0.3456, change: -0.45, icon: 'ada.png' },
        ];

        const tradingPairs = [
            { from: 'USDT', to: 'BTC', rate: 0.000022, fee: 0.1 },
            { from: 'USDT', to: 'ETH', rate: 0.00042, fee: 0.1 },
            { from: 'USDT', to: 'BNB', rate: 0.0032, fee: 0.1 },
            { from: 'BTC', to: 'USDT', rate: 45123.45, fee: 0.1 },
            { from: 'ETH', to: 'USDT', rate: 2389.67, fee: 0.1 }
        ];

        res.render('crypto', {
            title: 'Buy/Sell Crypto - Binance Plus',
            user: req.session.user,
            walletBalance: user.walletBalance,
            cryptoData,
            tradingPairs,
            activeTab: 'buy'
        });
    } catch (err) {
        console.error('Crypto page error:', err);
        res.render('error', { title: 'Error - Binance Plus', error: 'Failed to load trading page' });
    }
});

// ----------------------------
// Buy Crypto
// ----------------------------
router.post('/buy', requireAuth, async (req, res) => {
    try {
        const { currency, amount, network } = req.body;
        const user = await User.findById(req.session.user._id);
        if (!currency || !amount || !network) return res.json({ success: false, message: 'All fields are required' });

        const buyAmount = parseFloat(amount);
        if (buyAmount <= 0) return res.json({ success: false, message: 'Invalid amount' });

        if (user.walletBalance.usdt < buyAmount) return res.json({ success: false, message: 'Insufficient USDT balance' });

        const cryptoPrices = { 'BTC': 45123.45, 'ETH': 2389.67, 'BNB': 312.89, 'XRP': 0.5678, 'ADA': 0.3456 };
        const price = cryptoPrices[currency] || 1;
        const cryptoAmount = buyAmount / price;
        const fee = buyAmount * 0.001; // 0.1% fee

        const walletAddress = await getOrCreateWallet(user._id, currency, network);

        const transaction = new Transaction({
            userId: user._id,
            type: 'buy',
            currency,
            amount: cryptoAmount,
            network,
            walletAddress,
            status: 'pending'
        });
        await transaction.save();

        res.json({
            success: true,
            message: 'Buy order created successfully',
            data: { transactionId: transaction._id, currency, amount: cryptoAmount, price, totalCost: buyAmount, fee, walletAddress, network }
        });
    } catch (err) {
        console.error('Buy crypto error:', err);
        res.json({ success: false, message: 'Failed to process buy order' });
    }
});

// ----------------------------
// Sell Crypto
// ----------------------------
router.post('/sell', requireAuth, async (req, res) => {
    try {
        const { currency, amount, network } = req.body;
        const user = await User.findById(req.session.user._id);
        if (!currency || !amount || !network) return res.json({ success: false, message: 'All fields are required' });

        const sellAmount = parseFloat(amount);
        if (sellAmount <= 0) return res.json({ success: false, message: 'Invalid amount' });

        const cryptoBalance = user.walletBalance[currency.toLowerCase()] || 0;
        if (cryptoBalance < sellAmount) return res.json({ success: false, message: `Insufficient ${currency} balance` });

        const cryptoPrices = { 'BTC': 45123.45, 'ETH': 2389.67, 'BNB': 312.89, 'XRP': 0.5678, 'ADA': 0.3456 };
        const price = cryptoPrices[currency] || 1;
        const usdtAmount = sellAmount * price;
        const fee = usdtAmount * 0.001;
        const finalAmount = usdtAmount - fee;

        const transaction = new Transaction({
            userId: user._id,
            type: 'sell',
            currency,
            amount: sellAmount,
            network,
            usdtValue: finalAmount,
            status: 'pending'
        });
        await transaction.save();

        res.json({
            success: true,
            message: 'Sell order created successfully',
            data: { transactionId: transaction._id, currency, amount: sellAmount, price, totalValue: usdtAmount, fee, finalAmount, network }
        });
    } catch (err) {
        console.error('Sell crypto error:', err);
        res.json({ success: false, message: 'Failed to process sell order' });
    }
});

// ----------------------------
// Get Wallet Address
// ----------------------------
router.get('/wallet-address/:currency/:network', requireAuth, async (req, res) => {
    try {
        const { currency, network } = req.params;
        const wallet = await getOrCreateWallet(req.session.user._id, currency, network);
        res.json({ success: true, data: { address: wallet.address, currency, network } });
    } catch (err) {
        console.error('Get wallet address error:', err);
        res.json({ success: false, message: 'Failed to get wallet address' });
    }
});

// ----------------------------
// Get Exchange Rate
// ----------------------------
router.get('/rate/:from/:to', requireAuth, async (req, res) => {
    try {
        const { from, to } = req.params;
        const rates = { 'USDT_BTC': 0.000022, 'USDT_ETH': 0.00042, 'USDT_BNB': 0.0032, 'BTC_USDT': 45123.45, 'ETH_USDT': 2389.67, 'BNB_USDT': 312.89 };
        const rateKey = `${from}_${to}`;
        const rate = rates[rateKey] || 1;
        res.json({ success: true, data: { from, to, rate, timestamp: new Date() } });
    } catch (err) {
        console.error('Exchange rate error:', err);
        res.json({ success: false, message: 'Failed to get exchange rate' });
    }
});

// ----------------------------
// Trading History
// ----------------------------
router.get('/history', requireAuth, async (req, res) => {
    try {
        const tradingTransactions = await Transaction.find({ userId: req.session.user._id, type: { $in: ['buy','sell'] } }).sort({ createdAt: -1 });
        res.render('dashboard', { title: 'Trading History - Binance Plus', user: req.session.user, transactions: tradingTransactions, currentSection: 'trading-history' });
    } catch (err) {
        console.error('Trading history error:', err);
        res.render('error', { title: 'Error - Binance Plus', error: 'Failed to load trading history' });
    }
});

// ----------------------------
// Mock API for crypto prices
// ----------------------------
router.get('/api/crypto-prices', (req, res) => {
    const cryptoPrices = [
        { symbol: 'BTC', price: 45123.45, change: 2.34 },
        { symbol: 'ETH', price: 2389.67, change: -1.23 },
        { symbol: 'BNB', price: 312.89, change: 0.56 },
        { symbol: 'XRP', price: 0.5678, change: 1.89 },
        { symbol: 'ADA', price: 0.3456, change: -0.45 }
    ];
    res.json(cryptoPrices);
});

// ----------------------------
// Helper functions
// ----------------------------
async function getOrCreateWallet(userId, currency, network) {
    let wallet = await Wallet.findOne({ userId, currency, network, isActive: true });
    if (!wallet) {
        const address = generateWalletAddress(currency, network);
        wallet = new Wallet({ userId, currency, network, address });
        await wallet.save();
    }
    return wallet;
}

function generateWalletAddress(currency, network) {
    const prefixes = { 'BTC':'1A','ETH':'0x','USDT_ERC20':'0x','USDT_TRC20':'TY','USDT_BEP20':'0x','BNB':'bnb' };
    const prefix = prefixes[`${currency}_${network}`] || prefixes[currency] || '0x';
    const randomPart = Math.random().toString(36).substr(2, 10).toUpperCase();
    return prefix + randomPart + 'BinancePlus';
}

module.exports = router;
