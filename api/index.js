// api/index.js
const serverless = require('serverless-http');
const express = require('express');
const path = require('path');
const i18n = require('i18n');
const morgan = require('morgan');
require('dotenv').config();

const connectToDatabase = require('../utils/mongodb'); // فایل utils/mongodb.js که بعداً اضافه می‌کنیم

// route files
const authRoutes = require('../routes/auth');
const dashboardRoutes = require('../routes/dashboard');
const investmentRoutes = require('../routes/investment');
const cryptoRoutes = require('../routes/crypto');
const adminRoutes = require('../routes/admin');

const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// static files (Express will serve from public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// i18n
i18n.configure({
  locales: ['en','fa','ar','tr'],
  directory: path.join(__dirname, '..', 'locales'),
  defaultLocale: 'en',
  cookie: 'lang',
  queryParameter: 'lang',
  autoReload: true,
  syncFiles: true
});
app.use(i18n.init);

// global locals (دقت کن req.session توی سرورلس پایدار نیست مگر استور داشته باشی)
app.use((req, res, next) => {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.currentPath = req.path;
  res.locals.currentLang = req.getLocale ? req.getLocale() : 'en';
  res.locals.appName = "Binance Plus";
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// Connect to DB once (cached)
(async () => {
  try {
    await connectToDatabase(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected (serverless entry)');
  } catch (e) {
    console.error('MongoDB connection error:', e);
  }
})();

// Register routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/investment', investmentRoutes);
app.use('/crypto', cryptoRoutes);
app.use('/admin', adminRoutes);

// Home (render if ejs available)
app.get('/', (req, res) => {
  if (res.render) {
    return res.render('index', { title: 'Binance Plus' });
  }
  res.send('Binance Plus');
});

// error handlers
app.use((req, res) => {
  res.status(404).send('Not Found');
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

module.exports = serverless(app);
