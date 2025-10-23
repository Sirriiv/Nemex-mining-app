// js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.1/+esm'

// Supabase configuration
const supabaseUrl = '
const supabaseAnonKey = 'your-anon-key'; // Replace with your actual anon key

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
class SupabaseAuth {
    constructor() {
        this.user = null;
        this.session = null;
    }

    // Initialize auth state
    async init() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return;
        }

        this.session = session;
        if (session) {
            this.user = session.user;
            await this.loadUserProfile();
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            this.session = session;
            this.user = session?.user || null;

            if (event === 'SIGNED_IN') {
                await this.loadUserProfile();
                window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.user }));
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                localStorage.removeItem('nemex_user');
                localStorage.removeItem('nemex_token');
                window.dispatchEvent(new CustomEvent('userLoggedOut'));
            }
        });
    }

    // Email signup
    async signUpWithEmail(email, password, userData) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: userData.full_name,
                        username: userData.username
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // Create profile in profiles table
                await this.createUserProfile(data.user, {
                    ...userData,
                    created_via: 'email'
                });
            }

            return { data, error: null };
        } catch (error) {
            console.error('Signup error:', error);
            return { data: null, error };
        }
    }

    // Email login
    async signInWithEmail(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Login error:', error);
            return { data: null, error };
        }
    }

    // Google OAuth login
    async signInWithGoogle() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard.html`
                }
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Google OAuth error:', error);
            return { data: null, error };
        }
    }

    // Telegram user authentication
    async handleTelegramAuth(telegramUser) {
        try {
            console.log('Processing Telegram auth for:', telegramUser.id);

            // Check if user already exists
            const existingUser = await this.getUserByTelegramId(telegramUser.id);
            
            if (existingUser) {
                console.log('Existing Telegram user found:', existingUser);
                await this.updateLastLogin(existingUser.id);
                this.setLocalUserSession(existingUser);
                return existingUser;
            } else {
                console.log('Creating new Telegram user...');
                const newUser = await this.createTelegramUser(telegramUser);
                this.setLocalUserSession(newUser);
                return newUser;
            }
        } catch (error) {
            console.error('Telegram auth error:', error);
            throw error;
        }
    }

    // Create Telegram user profile
    async createTelegramUser(telegramUser) {
        const userData = {
            telegram_id: telegramUser.id,
            username: telegramUser.username || `tg_${telegramUser.id}`,
            full_name: `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim(),
            avatar_url: telegramUser.photo_url,
            created_via: 'telegram',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert([userData])
            .select()
            .single();

        if (error) {
            console.error('Error creating Telegram user:', error);
            throw error;
        }

        console.log('Telegram user created successfully:', data);
        return data;
    }

    // Get user by Telegram ID
    async getUserByTelegramId(telegramId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // User not found
            }
            console.error('Error fetching Telegram user:', error);
            return null;
        }

        return data;
    }

    // Load user profile
    async loadUserProfile() {
        if (!this.user) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (error) throw error;

            if (data) {
                this.user.profile = data;
                localStorage.setItem('nemex_user', JSON.stringify(data));
                return data;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }

        return null;
    }

    // Create user profile
    async createUserProfile(user, profileData) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    email: user.email,
                    full_name: profileData.full_name,
                    username: profileData.username,
                    created_via: profileData.created_via || 'email',
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }

    // Update last login
    async updateLastLogin(userId) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    // Set local user session
    setLocalUserSession(userData) {
        localStorage.setItem('nemex_user', JSON.stringify(userData));
        localStorage.setItem('nemex_token', userData.telegram_id ? `telegram_${userData.telegram_id}` : `email_${userData.id}`);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: userData }));
    }

    // Sign out
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            this.user = null;
            this.session = null;
            localStorage.removeItem('nemex_user');
            localStorage.removeItem('nemex_token');
            
            window.dispatchEvent(new CustomEvent('userLoggedOut'));
            
            return { error: null };
        } catch (error) {
            console.error('Signout error:', error);
            return { error };
        }
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.user !== null;
    }
}

// Wallet functions
class WalletManager {
    constructor() {
        this.supabase = supabase;
    }

    // Get wallet balance
    async getWalletBalance(userId) {
        try {
            const { data, error } = await this.supabase
                .from('wallets')
                .select('balance, currency')
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data || { balance: 0, currency: 'NMX' };
        } catch (error) {
            console.error('Error getting wallet balance:', error);
            return { balance: 0, currency: 'NMX' };
        }
    }

    // Update wallet balance
    async updateWalletBalance(userId, amount, type = 'add') {
        try {
            // Get current balance
            const currentBalance = await this.getWalletBalance(userId);
            let newBalance = currentBalance.balance;

            if (type === 'add') {
                newBalance += amount;
            } else if (type === 'subtract') {
                newBalance -= amount;
            }

            // Update balance
            const { data, error } = await this.supabase
                .from('wallets')
                .upsert({
                    user_id: userId,
                    balance: newBalance,
                    currency: 'NMX',
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Record transaction
            await this.recordTransaction(userId, amount, type);

            return data;
        } catch (error) {
            console.error('Error updating wallet balance:', error);
            throw error;
        }
    }

    // Record transaction
    async recordTransaction(userId, amount, type, description = '') {
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .insert([{
                    user_id: userId,
                    amount: amount,
                    type: type,
                    description: description,
                    status: 'completed',
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error recording transaction:', error);
            throw error;
        }
    }

    // Get transaction history
    async getTransactionHistory(userId, limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting transaction history:', error);
            return [];
        }
    }
}

// Rewards system
class RewardsManager {
    constructor() {
        this.supabase = supabase;
    }

    // Claim daily reward
    async claimDailyReward(userId) {
        try {
            const today = new Date().toDateString();
            
            // Check if already claimed today
            const { data: existingClaim, error: checkError } = await this.supabase
                .from('daily_rewards')
                .select('*')
                .eq('user_id', userId)
                .gte('claimed_at', new Date().toDateString())
                .single();

            if (existingClaim) {
                throw new Error('Daily reward already claimed today');
            }

            // Calculate reward amount (random between 1-10 NMX)
            const rewardAmount = Math.floor(Math.random() * 10) + 1;

            // Record reward claim
            const { data: rewardData, error: rewardError } = await this.supabase
                .from('daily_rewards')
                .insert([{
                    user_id: userId,
                    amount: rewardAmount,
                    claimed_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (rewardError) throw rewardError;

            // Update wallet
            const walletManager = new WalletManager();
            await walletManager.updateWalletBalance(userId, rewardAmount, 'add');

            return { amount: rewardAmount, data: rewardData };
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            throw error;
        }
    }

    // Get today's reward status
    async getTodaysRewardStatus(userId) {
        try {
            const today = new Date().toDateString();
            
            const { data, error } = await this.supabase
                .from('daily_rewards')
                .select('*')
                .eq('user_id', userId)
                .gte('claimed_at', new Date(today).toISOString())
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return {
                claimed: !!data,
                amount: data?.amount || 0,
                claimed_at: data?.claimed_at
            };
        } catch (error) {
            console.error('Error getting reward status:', error);
            return { claimed: false, amount: 0 };
        }
    }
}

// Initialize auth and managers
const supabaseAuth = new SupabaseAuth();
const walletManager = new WalletManager();
const rewardsManager = new RewardsManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await supabaseAuth.init();
});

// Export for use in other files
window.supabase = supabase;
window.supabaseAuth = supabaseAuth;
window.walletManager = walletManager;
window.rewardsManager = rewardsManager;

export { 
    supabase, 
    supabaseAuth, 
    walletManager, 
    rewardsManager 
};