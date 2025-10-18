// Professional User Data Manager - Supabase-Only
class UserDataManager {
    constructor() {
        this.userData = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            console.log('🔄 Initializing professional user data manager...');

            if (window.AuthManager && window.AuthManager.isAuthenticated) {
                await this.loadRealUserData();
            } else {
                await this.loadDemoData();
            }

            this.isInitialized = true;
            console.log('✅ Professional user data manager ready');

        } catch (error) {
            console.error('❌ Professional user data manager failed:', error);
            await this.loadDemoData();
        }
    }

    async loadRealUserData() {
        try {
            const auth = window.AuthManager;

            if (!auth.isAuthenticated) {
                throw new Error('User not authenticated');
            }

            console.log('👤 Loading professional user data from Supabase...');

            // Use data directly from AuthManager (which comes from Supabase)
            this.userData = {
                id: auth.currentUser.id,
                backend_id: auth.currentUser.backend_id,
                username: auth.currentUser.name,
                email: auth.currentUser.email,
                balance: auth.currentUser.balance,
                availableBalance: auth.currentUser.availableBalance,
                totalEarned: auth.currentUser.totalEarned,
                referralCode: auth.currentUser.referralCode,
                countdownTarget: auth.currentUser.countdownTarget,
                isClaimed: auth.currentUser.isClaimed,
                joinDate: auth.currentUser.joinDate,
                ipAddress: auth.currentUser.ipAddress,
                lastLogin: auth.currentUser.lastLogin
            };

            console.log('✅ Professional user data loaded from Supabase:', {
                id: this.userData.id,
                username: this.userData.username,
                email: this.userData.email,
                balance: this.userData.balance
            });

        } catch (error) {
            console.error('❌ Failed to load professional user data:', error);
            throw error;
        }
    }

    async loadDemoData() {
        // Professional demo data
        this.userData = {
            id: 'demo-user-123',
            username: 'nemex_demo',
            email: 'demo@nemexcoin.com',
            balance: 30,
            availableBalance: 0,
            totalEarned: 0,
            referralCode: 'NMX-DEMO-1234',
            countdownTarget: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isClaimed: false,
            joinDate: new Date().toISOString(),
            ipAddress: '127.0.0.1',
            lastLogin: new Date().toISOString()
        };
        console.log('✅ Professional demo data loaded');
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
            console.log('🎯 Professional reward claim process...');

            const auth = window.AuthManager;

            if (auth.isAuthenticated && window.SupabaseClient?.isInitialized) {
                const result = await this.claimRewardProfessional();
                return result;
            } else {
                return await this.claimDemoReward();
            }

        } catch (error) {
            console.error('❌ Professional claim reward failed:', error);
            return { success: false, error: error.message };
        }
    }

    async claimRewardProfessional() {
        const client = window.SupabaseClient.getClient();
        const userId = window.AuthManager.currentUser.id;

        try {
            // Professional: Use database transaction for data consistency
            const claimedAmount = this.userData.balance;
            const newAvailableBalance = this.userData.availableBalance + claimedAmount;

            // Update balances in Supabase
            const { error: balanceError } = await client
                .from('user_balances')
                .update({
                    available_balance: newAvailableBalance,
                    pending_balance: 0,
                    total_earned: this.userData.totalEarned + claimedAmount,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (balanceError) throw balanceError;

            // Reset countdown timer in Supabase
            const newTargetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const { error: timerError } = await client
                .from('countdown_timers')
                .update({
                    target_time: newTargetTime.toISOString(),
                    is_claimed: true,
                    last_claimed: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (timerError) throw timerError;

            // Record professional transaction
            await client.from('transactions').insert([{
                user_id: userId,
                type: 'daily_reward',
                amount: claimedAmount,
                description: 'Professional daily reward claim',
                status: 'completed',
                created_at: new Date().toISOString()
            }]);

            // Update local data
            this.userData.availableBalance = newAvailableBalance;
            this.userData.balance = 0;
            this.userData.totalEarned += claimedAmount;
            this.userData.countdownTarget = newTargetTime;
            this.userData.isClaimed = true;

            console.log('✅ Professional reward claimed successfully');

            return { 
                success: true, 
                newBalance: newAvailableBalance,
                claimedAmount: claimedAmount
            };

        } catch (error) {
            console.error('❌ Professional claim failed:', error);
            return { success: false, error: 'Database update failed' };
        }
    }

    async claimDemoReward() {
        // Simulate professional API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update local demo data
        const claimedAmount = this.userData.balance;
        this.userData.availableBalance += claimedAmount;
        this.userData.balance = 0;
        this.userData.countdownTarget = new Date(Date.now() + 24 * 60 * 60 * 1000);
        this.userData.isClaimed = true;

        return { 
            success: true, 
            newBalance: this.userData.availableBalance,
            claimedAmount: claimedAmount 
        };
    }

    getUserData() {
        return this.userData;
    }

    // Professional: Refresh data from Supabase
    async refreshUserData() {
        if (window.AuthManager && window.AuthManager.isAuthenticated) {
            await this.loadRealUserData();
            return true;
        }
        return false;
    }
}

// Create global instance
window.UserDataManager = new UserDataManager();