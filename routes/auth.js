const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ---------- REGISTER ----------
router.get('/register', (req, res) => {
    res.render('auth/register', { error: null, formData: {}, referralCode: req.query.ref || '' });
});

router.post('/register', [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('auth/register', { error: errors.array()[0].msg, formData: req.body, referralCode: req.body.referralCode || '' });
    }

    try {
        const { firstName, lastName, email, password, country, city, birthDate, referralCode } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('auth/register', { error: 'Email already exists', formData: req.body, referralCode });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            country,
            city,
            birthDate,
            referredBy: referralCode || null
        });

        // Generate verification code
        const code = Math.floor(100000 + Math.random() * 900000);
        newUser.verificationCode = code;
        newUser.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await newUser.save();

        // Send verification email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify your Binance Plus Email',
            html: `<p>Hello ${firstName},</p>
                   <p>Your verification code is: <b>${code}</b></p>
                   <p>It will expire in 10 minutes.</p>`
        };
        await transporter.sendMail(mailOptions);

        req.session.tempUser = newUser._id;
        res.render('auth/verify-email', { email }); // صفحه تایید ایمیل
    } catch (err) {
        console.error(err);
        res.render('auth/register', { error: 'Server error', formData: req.body, referralCode: req.body.referralCode || '' });
    }
});

// ---------- EMAIL VERIFICATION ----------
router.get('/verify-email', (req, res) => {
    if (!req.session.tempUser) return res.redirect('/register');
    res.render('auth/verify-email', { email: '' });
});

router.post('/verify-email', async (req, res) => {
    try {
        const userId = req.session.tempUser;
        if (!userId) return res.redirect('/register');

        const user = await User.findById(userId);
        if (!user) return res.redirect('/register');

        const { code } = req.body;

        if (user.verificationCode !== Number(code)) {
            return res.render('auth/verify-email', { error: 'Invalid verification code', email: user.email });
        }

        if (new Date() > user.verificationCodeExpires) {
            return res.render('auth/verify-email', { error: 'Verification code expired', email: user.email });
        }

        user.emailVerified = true;
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await user.save();

        req.session.user = user;
        delete req.session.tempUser;

        res.redirect('/dashboard'); // صفحه پس از لاگین
    } catch (err) {
        console.error(err);
        res.render('auth/verify-email', { error: 'Server error', email: '' });
    }
});

// ---------- RESEND VERIFICATION CODE ----------
router.post('/resend-verification', async (req, res) => {
    try {
        const userId = req.session.tempUser;
        if (!userId) return res.json({ success: false });

        const user = await User.findById(userId);
        if (!user) return res.json({ success: false });

        // تولید کد جدید
        const newCode = Math.floor(100000 + Math.random() * 900000);
        user.verificationCode = newCode;
        user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 دقیقه
        await user.save();

        // ارسال ایمیل
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Your new verification code - Binance Plus',
            html: `<p>Hello ${user.firstName},</p>
                   <p>Your new verification code is: <b>${newCode}</b></p>
                   <p>It will expire in 10 minutes.</p>`
        };
        await transporter.sendMail(mailOptions);

        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return res.json({ success: false });
    }
});

// ---------- LOGIN ----------
router.get('/login', (req, res) => {
    res.render('auth/login', { error: null, formData: {} });
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.render('auth/login', { error: 'Invalid credentials', formData: req.body });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.render('auth/login', { error: 'Invalid credentials', formData: req.body });

        if (!user.emailVerified) return res.render('auth/login', { error: 'Email not verified', formData: req.body });

        user.lastLogin = new Date();
        await user.save();

        req.session.user = user;
        res.redirect('/dashboard'); // بعد از لاگین
    } catch (err) {
        console.error(err);
        res.render('auth/login', { error: 'Server error', formData: req.body });
    }
});

// ---------- LOGOUT ----------
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
