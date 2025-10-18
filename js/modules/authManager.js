// Authentication Manager - UPDATED TO USE DATABASE DATA
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.API_BASE = 'https://nemex-backend.onrender.com';
    }

    async initialize() {
        try {
            console.log('🔄 Initializing auth manager...');
            
            // Check if user is already logged in
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const userId = localStorage.getItem('userId');
            
            if (isLoggedIn && userId) {
                await this.loadUserFromDatabase(userId);
            } else {
                await this.initializeDemoUser();
            }

            console.log('✅ Auth manager ready');

        } catch (error) {
            console.error('❌ Auth manager initialization failed:', error);
            await this.initializeDemoUser();
        }
    }

    async loadUserFromDatabase(userId) {
        try {
            console.log('📡 Fetching user data from database...');
            
            // Fetch user data from your backend API
            const response = await fetch(`${this.API_BASE}/api/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const userData = await response.json();
                
                if (userData.success) {
                    this.currentUser = {
                        id: userData.user.user_id,
                        name: userData.user.name,
                        email: userData.user.email,
                        balance: parseFloat(userData.user.balance || '0'),
                        joinDate: userData.user.created_at || new Date().toISOString(),
                        referralCode: userData.user.referral_code,
                        isAuthenticated: true
                    };
                    
                    this.isAuthenticated = true;
                    
                    console.log('✅ User loaded from database:', {
                        id: this.currentUser.id,
                        name: this.currentUser.name,
                        email: this.currentUser.email,
                        balance: this.currentUser.balance
                    });

                    // Initialize Supabase user data if needed
                    await this.initializeSupabaseUserData();
                    
                } else {
                    throw new Error('Failed to load user data from database');
                }
            } else {
                throw new Error('Network response was not ok');
            }
            
        } catch (error) {
            console.error('❌ Failed to load user from database:', error);
            // Fallback to localStorage data
            await this.loadUserFromLocalStorage();
        }
    }

    async loadUserFromLocalStorage() {
        try {
            const userId = localStorage.getItem('userId');
            const userName = localStorage.getItem('userName');
            const userEmail = localStorage.getItem('userEmail');
            const userBalance = localStorage.getItem('userBalance');
            
            if (!userId || !userEmail) {
                throw new Error('No user data found');
            }

            this.currentUser = {
                id: userId,
                name: userName || 'User',
                email: userEmail,
                balance: parseFloat(userBalance || '0'),
                joinDate: localStorage.getItem('userJoinDate') || new Date().toISOString(),
                referralCode: localStorage.getItem('userReferralCode'),
                isAuthenticated: true
            };
            
            this.isAuthenticated = true;
            
            console.log('✅ User loaded from localStorage (fallback):', {
                id: this.currentUser.id,
                name: this.currentUser.name,
                email: this.currentUser.email
            });
            
        } catch (error) {
            console.error('❌ Failed to load user from localStorage:', error);
            throw error;
        }
    }

    async signIn(email, password) {
        try {
            console.log('🔐 Attempting sign in...');
            
            const response = await fetch(`${this.API_BASE}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store basic user data in localStorage
                localStorage.setItem('userId', data.user.user_id);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userBalance', data.user.balance);
                localStorage.setItem('userJoinDate', data.user.created_at || new Date().toISOString());
                localStorage.setItem('isLoggedIn', 'true');

                // Load the complete user data from database
                await this.loadUserFromDatabase(data.user.user_id);
                
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(data.error || 'Login failed');
            }

        } catch (error) {
            console.error('❌ Signin error:', error);
            return { success: false, error: error.message };
        }
    }

    async signUp(userData) {
        try {
            console.log('👤 Attempting registration...');
            
            const response = await fetch(`${this.API_BASE}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: userData.fullName,
                    email: userData.email,
                    password: userData.password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store user data in localStorage
                localStorage.setItem('userId', data.user.user_id);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userBalance', data.user.balance);
                localStorage.setItem('userJoinDate', data.user.created_at || new Date().toISOString());
                localStorage.setItem('isLoggedIn', 'true');

                // Load the complete user data
                await this.loadUserFromDatabase(data.user.user_id);
                
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(data.error || 'Registration failed');
            }

        } catch (error) {
            console.error('❌ Signup error:', error);
            return { success: false, error: error.message };
        }
    }

    async initializeSupabaseUserData() {
        try {
            if (!window.SupabaseClient || !window.SupabaseClient.isInitialized) {
                console.log('⚠️ Supabase not available for user data initialization');
                return;
            }

            const client = window.SupabaseClient.getClient();
            
            // Check if user already exists in Supabase
            const { data: existingUser, error: fetchError } = await client
                .from('users')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // Not "no rows" error
                throw fetchError;
            }

            if (!existingUser) {
                // Create new user in Supabase for additional data storage
                const newUser = {
                    id: this.currentUser.id,
                    username: this.currentUser.name,
                    email: this.currentUser.email,
                    referral_code: this.currentUser.referralCode || `NMX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                    created_at: new Date().toISOString()
                };

                const { data: createdUser, error: createError } = await client
                    .from('users')
                    .insert([newUser])
                    .select()
                    .single();

                if (createError) throw createError;

                // Create user balance record in Supabase
                await client.from('user_balances').insert([
                    { 
                        user_id: this.currentUser.id, 
                        pending_balance: 30,
                        available_balance: this.currentUser.balance || 0
                    }
                ]);

                // Create countdown timer in Supabase
                await client.from('countdown_timers').insert([
                    { 
                        user_id: this.currentUser.id,
                        target_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                    }
                ]);

                console.log('✅ User data initialized in Supabase');
            } else {
                console.log('✅ User already exists in Supabase');
            }

        } catch (error) {
            console.warn('⚠️ Supabase user data initialization failed:', error);
            // Don't throw - we can work without Supabase
        }
    }

    async signOut() {
        try {
            // Clear localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userBalance');
            localStorage.removeItem('userJoinDate');
            localStorage.removeItem('userReferralCode');
            localStorage.removeItem('isLoggedIn');
            
            this.currentUser = null;
            this.isAuthenticated = false;
            
            console.log('✅ User signed out');
            return { success: true };
        } catch (error) {
            console.error('❌ Signout error:', error);
            return { success: false, error: error.message };
        }
    }

    async initializeDemoUser() {
        console.log('👤 Initializing demo user...');
        this.currentUser = {
            id: 'demo-user-123',
            name: 'Demo User',
            email: 'demo@nemexcoin.com',
            balance: 30,
            joinDate: new Date().toISOString(),
            referralCode: 'NMX-DEMO-1234',
            isAuthenticated: false
        };
        this.isAuthenticated = false;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // Method to refresh user data from database
    async refreshUserData() {
        if (this.isAuthenticated && this.currentUser) {
            console.log('🔄 Refreshing user data from database...');
            await this.loadUserFromDatabase(this.currentUser.id);
        }
    }
}

// Create global instance
window.AuthManager = new AuthManager();