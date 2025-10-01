const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const i18n = require('i18n');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ======== Middleware ========
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======== Public folder ========
app.use(express.static(path.join(__dirname, 'public')));

// ======== Helmet با CSP امن ========
// اگر واقعا نیاز به eval دارید، 'unsafe-eval' را اضافه کنید
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-eval' فقط در صورت نیاز
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"] // اجازه fetch به همان سرور
    }
  })
);

app.use(morgan('dev'));

// ======== Session Configuration ========
app.use(session({
    secret: process.env.SESSION_SECRET || 'mysecret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// ======== EJS Setup ========
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, 'views'),
    path.join(__dirname, 'views/partials')
]);

// ======== i18n Configuration ========
i18n.configure({
    locales: ['en', 'fa', 'ar', 'tr'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: 'en',
    cookie: 'lang',
    queryParameter: 'lang',
    autoReload: true,
    syncFiles: true
});
app.use(i18n.init);

// ======== Global Variables Middleware ========
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.currentPath = req.path;
    res.locals.currentLang = req.getLocale();
    res.locals.appName = "Binance Plus";
    res.locals.currentYear = new Date().getFullYear();
    next();
});

// ======== Database Connection ========
const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binanceplus';
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

// ======== Import Routes ========
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const investmentRoutes = require('./routes/investment');
const cryptoRoutes = require('./routes/crypto');
const adminRoutes = require('./routes/admin');

// ======== Use Routes ========
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/investment', investmentRoutes);
app.use('/crypto', cryptoRoutes);
app.use('/admin', adminRoutes);

// ======== API Endpoint for Crypto Prices ========
app.get('/api/crypto-prices', (req, res) => {
    const cryptoData = [
        { symbol: 'BTC', price: 45123.45, change: 2.34 },
        { symbol: 'ETH', price: 2389.67, change: -1.23 },
        { symbol: 'BNB', price: 312.89, change: 0.56 },
        { symbol: 'XRP', price: 0.5678, change: 1.89 },
        { symbol: 'ADA', price: 0.3456, change: -0.45 },
        { symbol: 'DOGE', price: 0.0789, change: 5.67 },
        { symbol: 'DOT', price: 6.789, change: -2.34 },
        { symbol: 'LTC', price: 78.90, change: 1.23 },
        { symbol: 'LINK', price: 15.67, change: 3.45 },
        { symbol: 'BCH', price: 245.67, change: -1.23 }
    ];
    res.json(cryptoData);
});

// ======== Home Route ========
app.get('/', async (req, res, next) => {
    try {
        const cryptoData = [
            { symbol: 'BTC', name: 'Bitcoin', price: 45123.45, change: 2.34, icon: 'btc.png' },
            { symbol: 'ETH', name: 'Ethereum', price: 2389.67, change: -1.23, icon: 'eth.png' },
            { symbol: 'BNB', name: 'Binance Coin', price: 312.89, change: 0.56, icon: 'bnb.png' },
            { symbol: 'XRP', name: 'Ripple', price: 0.5678, change: 1.89, icon: 'xrp.png' },
            { symbol: 'ADA', name: 'Cardano', price: 0.3456, change: -0.45, icon: 'ada.png' },
            { symbol: 'DOGE', name: 'Dogecoin', price: 0.0789, change: 5.67, icon: 'doge.png' },
            { symbol: 'DOT', name: 'Polkadot', price: 6.789, change: -2.34, icon: 'dot.png' },
            { symbol: 'LTC', name: 'Litecoin', price: 78.90, change: 1.23, icon: 'ltc.png' }
        ];

        const topTraders = [
            { name: 'Alex C.', profit: '+$2,450' },
            { name: 'Maria K.', profit: '+$1,890' },
            { name: 'John D.', profit: '+$3,210' },
            { name: 'Sarah M.', profit: '+$1,560' },
            { name: 'Mike R.', profit: '+$2,780' }
        ];

        res.render('index', {
            user: req.session.user,
            cryptoData,
            topTraders,
            title: 'Binance Plus - Professional Crypto Investment'
        });
    } catch (error) {
        console.error('Home route error:', error);
        next(error);
    }
});

// ======== Language and Logout ========
app.get('/change-language/:lang', (req, res) => {
    const { lang } = req.params;
    const allowedLangs = ['en', 'fa', 'ar', 'tr'];
    if (allowedLangs.includes(lang)) {
        res.cookie('lang', lang, { maxAge: 900000, httpOnly: true });
        req.setLocale(lang);
    }
    res.redirect('back');
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Logout error:', err);
        res.redirect('/');
    });
});

// ======== 404 Handler ========
app.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found', user: req.session.user });
});

// ======== Error Handler ========
app.use((err, req, res, next) => {
    console.error('Application Error:', err.stack || err);
    res.status(500).send(`
        <h1>Internal Server Error</h1>
        <pre>${err.stack || err}</pre>
    `);
});

// ======== Start Server ========
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        console.log("✅ Database connected successfully");
    } catch (err) {
        console.error("⚠️ Database connection failed, but server will still start...");
    }

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Access via: http://localhost:${PORT}`);
    });
};

startServer();

module.exports = app;
