// User Data Manager - UPDATED TO USE DATABASE DATA
class UserDataManager {
    constructor() {
        this.userData = null;
        this.isInitialized = false;
        this.API_BASE = 'https://nemex-backend.onrender.com';
    }

    async initialize() {
        try {
            console.log('🔄 Initializing user data manager...');

            // Wait for auth manager to be ready
            if (window.AuthManager && window.AuthManager.currentUser) {
                if (window.AuthManager.isAuthenticated) {
                    await this.loadRealUserData();
                } else {
                    await this.loadDemoData();
                }
            } else {
                await this.loadDemoData();
            }

            this.isInitialized = true;
            console.log('✅ User data manager ready');

        } catch (error) {
            console.error('❌ User data manager failed:', error);
            await this.loadDemoData();
        }
    }

    async loadRealUserData() {
        try {
            const auth = window.AuthManager;

            if (!auth.isAuthenticated) {
                throw new Error('User not authenticated');
            }

            console.log('👤 Loading real user data from database...');

            // Use data from AuthManager (which now comes from database)
            this.userData = {
                id: auth.currentUser.id,
                username: auth.currentUser.name,
                email: auth.currentUser.email,
                balance: auth.currentUser.balance || 30,
                availableBalance: auth.currentUser.balance || 0,
                referralCode: auth.currentUser.referralCode || `NMX-${auth.currentUser.id.slice(-6).toUpperCase()}`,
                countdownTarget: new Date(Date.now() + 24 * 60 * 60 * 1000), // Will be overridden by countdown manager
                isClaimed: false,
                joinDate: auth.currentUser.joinDate || new Date().toISOString()
            };

            console.log('✅ Real user data loaded from database:', {
                username: this.userData.username,
                email: this.userData.email,
                balance: this.userData.balance,
                joinDate: this.userData.joinDate
            });

        } catch (error) {
            console.error('❌ Failed to load real user data from database:', error);
            throw error;
        }
    }

    async loadDemoData() {
        // Demo user data
        this.userData = {
            id: 'demo-user-123',
            username: 'nemex_demo',
            email: 'demo@nemexcoin.com',
            balance: 30,
            availableBalance: 0,
            referralCode: 'NMX-DEMO-1234',
            countdownTarget: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isClaimed: false,
            joinDate: new Date().toISOString()
        };
        console.log('✅ Demo user data loaded');
    }

    async getBalance() {
        if (!this.isInitialized) return 30;
        return this.userData?.balance || 30;
    }

    async getCountdownData() {
        if (!this.isInitialized) {
            return {
                targetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                isClaimable: false
            };
        }

        const now = new Date();
        const isClaimable = now > this.userData.countdownTarget && !this.userData.isClaimed;

        return {
            targetTime: this.userData.countdownTarget,
            isClaimable: isClaimable
        };
    }

    async claimReward() {
        try {
            console.log('🎯 Claiming reward...');

            const auth = window.AuthManager;

            if (auth.isAuthenticated) {
                // Real user - update in Supabase and backend
                const result = await this.claimRewardForRealUser();
                return result;
            } else {
                // Demo user
                return await this.claimDemoReward();
            }

        } catch (error) {
            console.error('❌ Claim reward failed:', error);
            return { success: false, error: error.message };
        }
    }

    async claimRewardForRealUser() {
        const client = window.SupabaseClient.getClient();
        const userId = window.AuthManager.currentUser.id;

        try {
            // Update in Supabase
            const { data: balanceData, error: balanceError } = await client
                .from('user_balances')
                .select('pending_balance, available_balance')
                .eq('user_id', userId)
                .single();

            if (balanceError) throw balanceError;

            const newAvailableBalance = parseFloat(balanceData.available_balance) + parseFloat(balanceData.pending_balance);
            const claimedAmount = parseFloat(balanceData.pending_balance);

            // Update balances in Supabase
            const { error: updateError } = await client
                .from('user_balances')
                .update({
                    available_balance: newAvailableBalance,
                    pending_balance: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (updateError) throw updateError;

            // Reset countdown timer in Supabase
            const { error: timerError } = await client
                .from('countdown_timers')
                .update({
                    target_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    is_claimed: true,
                    last_claimed: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (timerError) throw timerError;

            // Record transaction in Supabase
            await client.from('transactions').insert([{
                user_id: userId,
                type: 'claim',
                amount: claimedAmount,
                description: 'Daily reward claim'
            }]);

            // Update backend balance
            await this.updateBackendBalance(newAvailableBalance);

            // Update local data
            this.userData.availableBalance = newAvailableBalance;
            this.userData.balance = 0;
            this.userData.countdownTarget = new Date(Date.now() + 24 * 60 * 60 * 1000);
            this.userData.isClaimed = true;

            // Update localStorage
            localStorage.setItem('userBalance', newAvailableBalance.toString());

            return { 
                success: true, 
                newBalance: newAvailableBalance,
                claimedAmount: claimedAmount
            };

        } catch (error) {
            console.error('❌ Supabase claim failed:', error);
            // Fallback to simple balance update
            return await this.updateBackendBalanceSimple();
        }
    }

    async updateBackendBalance(newBalance) {
        try {
            // Update your backend balance if you have an endpoint for this
            const response = await fetch(`${this.API_BASE}/api/update-balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: window.AuthManager.currentUser.id,
                    balance: newBalance
                })
            });

            if (!response.ok) {
                console.warn('⚠️ Backend balance update failed');
            }
        } catch (error) {
            console.warn('⚠️ Backend balance update error:', error);
        }
    }

    async updateBackendBalanceSimple() {
        // Simple fallback - just update localStorage
        const newBalance = (parseFloat(localStorage.getItem('userBalance') || '0') + 30);
        localStorage.setItem('userBalance', newBalance.toString());

        this.userData.availableBalance = newBalance;
        this.userData.balance = 0;
        this.userData.countdownTarget = new Date(Date.now() + 24 * 60 * 60 * 1000);
        this.userData.isClaimed = true;

        return { 
            success: true, 
            newBalance: newBalance,
            claimedAmount: 30 
        };
    }

    async claimDemoReward() {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update local demo data
        this.userData.availableBalance += this.userData.balance;
        this.userData.balance = 0;
        this.userData.countdownTarget = new Date(Date.now() + 24 * 60 * 60 * 1000);
        this.userData.isClaimed = true;

        return { 
            success: true, 
            newBalance: this.userData.availableBalance,
            claimedAmount: 30 
        };
    }

    getUserData() {
        return this.userData;
    }
}

// Create global instance
window.UserDataManager = new UserDataManager();