// Professional Auth Manager - Supabase-First with Proper User ID Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.API_BASE = 'https://nemex-backend.onrender.com';
    }

    async initialize() {
        try {
            console.log('🔄 Initializing professional auth manager...');
            
            // Check for existing session with STRICT validation
            const userId = localStorage.getItem('userId');
            const sessionValid = await this.validateSession(userId);
            
            if (sessionValid) {
                await this.loadUserFromSupabase(userId);
            } else {
                await this.clearInvalidSession();
                await this.initializeDemoUser();
            }

            console.log('✅ Professional auth manager ready');

        } catch (error) {
            console.error('❌ Auth manager initialization failed:', error);
            await this.clearInvalidSession();
            await this.initializeDemoUser();
        }
    }

    async validateSession(userId) {
        if (!userId) return false;
        
        try {
            // Verify user exists in Supabase
            const client = window.SupabaseClient?.getClient();
            if (!client) return false;

            const { data, error } = await client
                .from('users')
                .select('id, last_login')
                .eq('id', userId)
                .single();

            if (error || !data) return false;

            // Check if session is recent (within 30 days)
            const lastLogin = new Date(data.last_login);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return lastLogin > thirtyDaysAgo;

        } catch (error) {
            console.warn('⚠️ Session validation failed:', error);
            return false;
        }
    }

    async signIn(email, password) {
        try {
            console.log('🔐 Professional sign in process...');
            
            // Step 1: Authenticate with your backend
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
                // Step 2: Create/Update user in Supabase with proper ID management
                const supabaseUser = await this.createOrUpdateSupabaseUser(data.user);
                
                // Step 3: Store minimal session data
                localStorage.setItem('userId', supabaseUser.id);
                localStorage.setItem('isLoggedIn', 'true');
                
                // Step 4: Load complete user data from Supabase
                await this.loadUserFromSupabase(supabaseUser.id);
                
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(data.error || 'Login failed');
            }

        } catch (error) {
            console.error('❌ Professional signin error:', error);
            return { success: false, error: error.message };
        }
    }

    async createOrUpdateSupabaseUser(backendUser) {
        const client = window.SupabaseClient.getClient();
        if (!client) throw new Error('Supabase not available');

        // Generate deterministic UUID from backend user ID for sybil detection
        const deterministicUUID = await this.generateDeterministicUUID(backendUser.user_id);
        
        const userData = {
            id: deterministicUUID, // Professional: Deterministic UUID for sybil detection
            backend_id: backendUser.user_id, // Reference to original backend ID
            username: backendUser.name,
            email: backendUser.email,
            referral_code: backendUser.referral_code || `NMX-${this.generateReferralCode()}`,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            ip_address: await this.getClientIP(), // For sybil detection
            user_agent: navigator.userAgent // For sybil detection
        };

        // Upsert user in Supabase (insert or update if exists)
        const { data, error } = await client
            .from('users')
            .upsert([userData], { 
                onConflict: 'email', // Prevent duplicate emails
                ignoreDuplicates: false 
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Supabase user creation failed:', error);
            throw new Error('Failed to create user session');
        }

        // Initialize user balances and countdown timer
        await this.initializeUserFinancials(data.id);
        
        console.log('✅ Supabase user synchronized:', data.id);
        return data;
    }

    async generateDeterministicUUID(backendUserId) {
        // Professional: Create deterministic UUID from backend user ID for sybil detection
        const encoder = new TextEncoder();
        const data = encoder.encode(backendUserId + 'nemex-salt-2024'); // Add salt for security
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Format as UUID v5 (deterministic)
        return `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-5${hashHex.substring(13, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
    }

    generateReferralCode() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    async getClientIP() {
        try {
            // Professional: Get client IP for sybil detection
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('⚠️ Could not get client IP:', error);
            return 'unknown';
        }
    }

    async initializeUserFinancials(userId) {
        const client = window.SupabaseClient.getClient();
        
        // Initialize user balance
        await client.from('user_balances').upsert([{
            user_id: userId,
            available_balance: 0,
            pending_balance: 30, // Starting bonus
            total_earned: 0,
            updated_at: new Date().toISOString()
        }], { onConflict: 'user_id' });

        // Initialize countdown timer
        await client.from('countdown_timers').upsert([{
            user_id: userId,
            target_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            is_claimed: false,
            last_claimed: new Date().toISOString()
        }], { onConflict: 'user_id' });

        console.log('✅ User financials initialized in Supabase');
    }

    async loadUserFromSupabase(userId) {
        try {
            console.log('📡 Loading user data from Supabase...');
            
            const client = window.SupabaseClient.getClient();
            if (!client) throw new Error('Supabase not available');

            const { data: userData, error: userError } = await client
                .from('users')
                .select(`
                    *,
                    user_balances!inner (
                        available_balance,
                        pending_balance,
                        total_earned
                    ),
                    countdown_timers!inner (
                        target_time,
                        is_claimed
                    )
                `)
                .eq('id', userId)
                .single();

            if (userError) throw userError;

            this.currentUser = {
                id: userData.id,
                backend_id: userData.backend_id,
                name: userData.username,
                email: userData.email,
                balance: parseFloat(userData.user_balances.pending_balance),
                availableBalance: parseFloat(userData.user_balances.available_balance),
                totalEarned: parseFloat(userData.user_balances.total_earned),
                referralCode: userData.referral_code,
                joinDate: userData.created_at,
                countdownTarget: new Date(userData.countdown_timers.target_time),
                isClaimed: userData.countdown_timers.is_claimed,
                ipAddress: userData.ip_address,
                lastLogin: userData.last_login,
                isAuthenticated: true
            };
            
            this.isAuthenticated = true;
            
            console.log('✅ Professional user data loaded from Supabase:', {
                id: this.currentUser.id,
                name: this.currentUser.name,
                email: this.currentUser.email,
                balance: this.currentUser.balance
            });

        } catch (error) {
            console.error('❌ Failed to load user from Supabase:', error);
            throw error;
        }
    }

    async signUp(userData) {
        try {
            console.log('👤 Professional registration process...');
            
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
                // Create Supabase user with proper ID management
                const supabaseUser = await this.createOrUpdateSupabaseUser(data.user);
                
                // Store session
                localStorage.setItem('userId', supabaseUser.id);
                localStorage.setItem('isLoggedIn', 'true');
                
                // Load user data
                await this.loadUserFromSupabase(supabaseUser.id);
                
                return { success: true, user: this.currentUser };
            } else {
                throw new Error(data.error || 'Registration failed');
            }

        } catch (error) {
            console.error('❌ Professional signup error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            if (this.currentUser && window.SupabaseClient?.isInitialized) {
                // Update last login timestamp in Supabase
                const client = window.SupabaseClient.getClient();
                await client
                    .from('users')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', this.currentUser.id);
            }

            await this.clearInvalidSession();
            console.log('✅ Professional signout completed');
            return { success: true };
        } catch (error) {
            console.error('❌ Professional signout error:', error);
            return { success: false, error: error.message };
        }
    }

    async clearInvalidSession() {
        localStorage.removeItem('userId');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userBalance');
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    async initializeDemoUser() {
        console.log('👤 Initializing professional demo user...');
        this.currentUser = {
            id: 'demo-user-123',
            name: 'Demo User',
            email: 'demo@nemexcoin.com',
            balance: 30,
            availableBalance: 0,
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

    // Professional: Method to detect potential sybil accounts
    async checkSybilPatterns(userId) {
        try {
            const client = window.SupabaseClient.getClient();
            const { data, error } = await client
                .from('users')
                .select('ip_address, created_at, user_agent')
                .eq('id', userId)
                .single();

            if (error) return { isSuspicious: false };

            // Check for patterns (simplified example)
            const suspiciousPatterns = await this.analyzeUserPatterns(data);
            return suspiciousPatterns;

        } catch (error) {
            console.warn('⚠️ Sybil check failed:', error);
            return { isSuspicious: false };
        }
    }

    async analyzeUserPatterns(userData) {
        // Professional: Implement your sybil detection logic here
        // This is a simplified example - expand based on your needs
        const patterns = {
            isSuspicious: false,
            reasons: []
        };

        // Example checks:
        // - Multiple accounts from same IP in short time
        // - Similar user agents patterns
        // - Rapid account creation
        // etc.

        return patterns;
    }
}

// Create global instance
window.AuthManager = new AuthManager();