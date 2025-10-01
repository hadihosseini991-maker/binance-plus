const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    birthDate: { type: Date, required: true },
    email: { type: String, required: true, unique: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    password: { type: String, required: true },
    referralCode: { type: String, unique: true },
    referredBy: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    verificationCode: String,
    verificationCodeExpires: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    walletBalance: {
        usdt: { type: Number, default: 0 },
        btc: { type: Number, default: 0 },
        eth: { type: Number, default: 0 },
        bnb: { type: Number, default: 0 },
    },
    totalEarnings: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    registrationDate: { type: Date, default: Date.now }
});

// Index on email
userSchema.index({ email: 1 }, { unique: true });

// Generate referral code
userSchema.pre('save', function(next) {
    if (!this.referralCode) {
        this.referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    next();
});

// Password hashing
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Password compare
userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
