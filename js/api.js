// API Service
class ApiService {
    constructor() {
            this.API_BASE = 'https://nemex-backend.onrender.com';
                }

                    async getUser(userId) {
                            const response = await fetch(`${this.API_BASE}/api/user/${userId}`);
                                    return response;
                                        }

                                            async createUser(userData) {
                                                    const response = await fetch(`${this.API_BASE}/api/user`, {
                                                                method: 'POST',
                                                                            headers: {'Content-Type': 'application/json'},
                                                                                        body: JSON.stringify(userData)
                                                                                                });
                                                                                                        return response;
                                                                                                            }

                                                                                                                async claimReward(userId) {
                                                                                                                        const response = await fetch(`${this.API_BASE}/api/claim/${userId}`, {
                                                                                                                                    method: 'POST',
                                                                                                                                                headers: {'Content-Type': 'application/json'},
                                                                                                                                                        });
                                                                                                                                                                return response;
                                                                                                                                                                    }

                                                                                                                                                                        async getProfile(userId) {
                                                                                                                                                                                const response = await fetch(`${this.API_BASE}/api/profile/${userId}`);
                                                                                                                                                                                        return response;
                                                                                                                                                                                            }
                                                                                                                                                                                            }