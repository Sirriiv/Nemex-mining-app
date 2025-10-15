// API communication functions
const API = {
    BASE_URL: 'https://nemex-backend.onrender.com',

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // User management
    async getUser(userId) {
        return await this.request(`/api/user/${userId}`);
    },

    async createUser(userData) {
        return await this.request('/api/user', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async claimReward(userId) {
        return await this.request(`/api/claim/${userId}`, {
            method: 'POST'
        });
    },

    async getProfile(userId) {
        return await this.request(`/api/profile/${userId}`);
    },

    // Tasks management
    async getTasks(userId) {
        return await this.request(`/api/tasks/${userId}`);
    },

    async completeTask(userId, taskId) {
        return await this.request(`/api/tasks/${userId}/complete`, {
            method: 'POST',
            body: JSON.stringify({ taskId })
        });
    },

    // Referrals management
    async getReferralStats(userId) {
        return await this.request(`/api/referrals/${userId}`);
    },

    async createReferral(userId) {
        return await this.request(`/api/referrals/${userId}`, {
            method: 'POST'
        });
    },

    // Wallet management
    async getWallet(userId) {
        return await this.request(`/api/wallet/${userId}`);
    },

    async getTransactions(userId) {
        return await this.request(`/api/transactions/${userId}`);
    }
};