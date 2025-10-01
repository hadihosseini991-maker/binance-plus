const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        enum: ['deposit', 'withdrawal', 'investment', 'referral_bonus', 'profit'], 
        required: true 
    },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
    network: { type: String },
    walletAddress: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed', 'cancelled'], 
        default: 'pending' 
    },
    transactionHash: { type: String },
    adminNote: { type: String },
    investmentPlan: { type: String },
    referralUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

// متد استاتیک برای ایجاد تراکنش جدید
transactionSchema.statics.createTransaction = async function(data) {
    try {
        return await this.create(data);
    } catch (err) {
        throw err;
    }
};

// متد استاتیک برای گرفتن تراکنش‌های یک کاربر با فیلتر دلخواه
transactionSchema.statics.getUserTransactions = async function(userId, filter = {}) {
    try {
        return await this.find({ userId, ...filter }).sort({ createdAt: -1 });
    } catch (err) {
        throw err;
    }
};

module.exports = mongoose.model('Transaction', transactionSchema);
