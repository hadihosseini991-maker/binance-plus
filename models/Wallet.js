const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currency: { type: String, required: true },
    network: { type: String, required: true },
    address: { type: String, required: true },
    privateKey: { type: String }, // حتماً در production رمزنگاری شود
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// متد استاتیک برای گرفتن کیف پول فعال بر اساس کاربر، ارز و شبکه
walletSchema.statics.getWallet = async function(userId, currency, network) {
    try {
        return await this.findOne({ userId, currency, network, isActive: true });
    } catch (err) {
        throw err;
    }
};

// متد استاتیک برای ایجاد کیف پول جدید
walletSchema.statics.createWallet = async function(walletData) {
    try {
        return await this.create(walletData);
    } catch (err) {
        throw err;
    }
};

module.exports = mongoose.model('Wallet', walletSchema);
