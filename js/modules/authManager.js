// Authentication Manager - UPDATED FOR YOUR EXISTING BACKEND
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.API_BASE = 'https://nemex-backend.onrender.com';
    }

    async initialize() {
        try {
            console.log('🔄 Initializing auth manager...');
            
            // Check if user is already logged in (your existing system)
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            
            if (isLoggedIn) {
                await this.loadUserFromLocalStorage();
            } else {
                await this.initializeDemoUser();
            }

            console.log('✅ Auth manager ready');

        } catch (error) {
            console.error('❌ Auth manager initialization failed:', error);
            await this.initializeDemoUser();
        }
    }

    async loadUserFromLocalStorage() {
        try {
            this.currentUser = {
                id: localStorage.getItem('userId'),
                name: localStorage.getItem('userName'),
                email: localStorage.getItem('userEmail'),
                balance: parseFloat(localStorage.getItem('userBalance') || '0'),
                isAuthenticated: true
            };
            
            this.isAuthenticated = true;
            
            console.log('✅ User loaded from localStorage:', this.currentUser);
            
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
                // Store user data in localStorage (your existing system)
                localStorage.setItem('userId', data.user.user_id);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userBalance', data.user.balance);
                localStorage.setItem('isLoggedIn', 'true');

                // Load the user
                await this.loadUserFromLocalStorage();
                
                // Initialize user data in Supabase if needed
                await this.initializeSupabaseUserData();
                
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
                    password: userData.password,
                    referral_code: userData.referralCode
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store user data in localStorage
                localStorage.setItem('userId', data.user.user_id);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userBalance', data.user.balance);
                localStorage.setItem('isLoggedIn', 'true');

                // Load the user
                await this.loadUserFromLocalStorage();
                
                // Initialize user data in Supabase
                await this.initializeSupabaseUserData();
                
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
                // Create new user in Supabase
                const newUser = {
                    id: this.currentUser.id,
                    username: this.currentUser.name,
                    email: this.currentUser.email,
                    referral_code: `NMX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                    created_at: new Date().toISOString()
                };

                const { data: createdUser, error: createError } = await client
                    .from('users')
                    .insert([newUser])
                    .select()
                    .single();

                if (createError) throw createError;

                // Create user balance record
                await client.from('user_balances').insert([
                    { 
                        user_id: this.currentUser.id, 
                        pending_balance: 30,
                        available_balance: this.currentUser.balance || 0
                    }
                ]);

                // Create countdown timer
                await client.from('countdown_timers').insert([
                    { user_id: this.currentUser.id }
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
            // Clear localStorage (your existing system)
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userBalance');
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
            name: 'nemex_demo',
            email: 'demo@nemexcoin.com',
            balance: 30,
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
}

// Create global instance
window.AuthManager = new AuthManager();