// User Data Manager - UPDATED FOR YOUR BACKEND
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

            // Try to get data from Supabase first
            let supabaseData = null;
            if (window.SupabaseClient && window.SupabaseClient.isInitialized) {
                supabaseData = await this.loadFromSupabase(auth.currentUser.id);
            }

            // If Supabase data exists, use it
            if (supabaseData) {
                this.userData = supabaseData;
                console.log('✅ User data loaded from Supabase');
            } else {
                // Fallback to localStorage data
                this.userData = {
                    id: auth.currentUser.id,
                    username: auth.currentUser.name,
                    email: auth.currentUser.email,
                    balance: auth.currentUser.balance,
                    availableBalance: auth.currentUser.balance,
                    referralCode: `NMX-${auth.currentUser.id.slice(-6).toUpperCase()}`,
                    countdownTarget: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    isClaimed: false
                };
                console.log('✅ User data loaded from localStorage');
            }

        } catch (error) {
            console.error('❌ Failed to load real user data:', error);
            throw error;
        }
    }

    async loadFromSupabase(userId) {
        try {
            const client = window.SupabaseClient.getClient();
            
            // Get user balance
            const { data: balanceData, error: balanceError } = await client
                .from('user_balances')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (balanceError) throw balanceError;

            // Get countdown timer
            const { data: timerData, error: timerError } = await client
                .from('countdown_timers')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (timerError) throw timerError;

            // Get user profile
            const { data: userProfile, error: profileError } = await client
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            return {
                id: userId,
                username: userProfile.username,
                email: userProfile.email,
                balance: parseFloat(balanceData.pending_balance),
                availableBalance: parseFloat(balanceData.available_balance),
                referralCode: userProfile.referral_code,
                countdownTarget: new Date(timerData.target_time),
                isClaimed: timerData.is_claimed
            };

        } catch (error) {
            console.warn('⚠️ Failed to load from Supabase:', error);
            return null;
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
            isClaimed: false
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