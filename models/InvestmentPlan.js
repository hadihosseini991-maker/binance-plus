const mongoose = require('mongoose');

const investmentPlanSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dailyProfit: { type: Number, required: true }, // Percentage
    duration: { type: Number, default: 30 }, // Days
    isActive: { type: Boolean, default: true },
    description: { type: String },
    features: [String]
});

const InvestmentPlan = mongoose.model('InvestmentPlan', investmentPlanSchema);

// Default investment plans
const defaultPlans = [
    {
        name: "Starter Plan",
        amount: 300,
        dailyProfit: 25,
        duration: 30,
        features: ["Daily Payouts", "24/7 Support", "Secure Investment"]
    },
    {
        name: "Advanced Plan",
        amount: 500,
        dailyProfit: 50,
        duration: 30,
        features: ["Higher Returns", "Priority Support", "Bonus Features"]
    },
    {
        name: "Professional Plan",
        amount: 1000,
        dailyProfit: 100,
        duration: 30,
        features: ["Maximum Returns", "VIP Support", "Exclusive Features"]
    },
    {
        name: "Expert Plan", 
        amount: 2000,
        dailyProfit: 250,
        duration: 30,
        features: ["Premium Returns", "Dedicated Manager", "Custom Solutions"]
    },
    {
        name: "Master Plan",
        amount: 3000,
        dailyProfit: 500,
        duration: 30,
        features: ["Elite Returns", "Personal Assistant", "Premium Services"]
    }
];

// Initialize default plans (async)
(async () => {
    try {
        const count = await InvestmentPlan.countDocuments();
        if (count === 0) {
            await InvestmentPlan.insertMany(defaultPlans);
            console.log("Default investment plans created ✅");
        }
    } catch (err) {
        console.error("Error creating default plans:", err);
    }
})();

module.exports = InvestmentPlan;
