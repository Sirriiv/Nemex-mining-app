// Utility functions for the backend
class Helpers {
    static formatResponse(success, message, data = null) {
        return {
            success,
            message,
            ...(data && { data }),
            timestamp: new Date().toISOString()
        };
    }

    static generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'NMX';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    static calculateMiningReward(user) {
        // Base reward
        let reward = 30;
        
        // Bonus for streak
        if (user.miningDays >= 7) reward += 5;
        if (user.miningDays >= 30) reward += 10;
        
        // Bonus for referrals
        if (user.totalReferrals >= 5) reward += 5;
        if (user.totalReferrals >= 10) reward += 10;
        
        return reward;
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    static formatCurrency(amount, currency = 'NMXp') {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount) + ' ' + currency;
    }

    static getTimeRemaining(targetDate) {
        const now = new Date().getTime();
        const target = new Date(targetDate).getTime();
        const difference = target - now;

        if (difference <= 0) {
            return { expired: true };
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        return {
            expired: false,
            days,
            hours,
            minutes,
            seconds,
            totalSeconds: Math.floor(difference / 1000)
        };
    }

    static logAction(action, userId, details = {}) {
        const logEntry = {
            action,
            userId,
            timestamp: new Date().toISOString(),
            ...details
        };
        
        console.log('📝 Action Log:', logEntry);
        return logEntry;
    }
}

module.exports = Helpers;