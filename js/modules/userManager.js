// User Management with Supabase integration
class UserManager {
    constructor() {
        this.currentUser = null;
        this.userBalance = 30;
        this.useSupabase = false;
    }

    async initialize() {
        console.log('Initializing User Manager...');
        
        // Check if Supabase is available
        this.useSupabase = window.SupabaseClient.isReady();
        console.log('Supabase available:', this.useSupabase);
        
        if (this.useSupabase) {
            await this.initializeWithSupabase();
        } else {
            this.initializeWithLocalStorage();
        }
    }

    async initializeWithSupabase() {
        try {
            // Check authentication state
            const { data: { user }, error } = await window.SupabaseClient.getClient().auth.getUser();
            
            if (error) {
                throw new Error('Auth check failed: ' + error.message);
            }
            
            this.currentUser = user;
            
            if (this.currentUser) {
                await this.loadUserFromSupabase();
            } else {
                console.log('No authenticated user, using localStorage');
                this.initializeWithLocalStorage();
            }
            
        } catch (error) {
            console.warn('Supabase initialization failed, falling back to localStorage:', error);
            this.useSupabase = false;
            this.initializeWithLocalStorage();
        }
    }

    async loadUserFromSupabase() {
        try {
            console.log('Loading user data from Supabase...');
            
            const { data: balanceData, error } = await window.SupabaseClient.getClient()
                .from('user_balances')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // No record found, create one
                    await this.createUserBalanceRecord();
                    return;
                }
                throw error;
            }
            
            if (balanceData) {
                this.userBalance = balanceData.balance;
                this.updateUI();
                console.log('User data loaded from Supabase. Balance:', this.userBalance);
            }
            
        } catch (error) {
            console.error('Error loading user from Supabase:', error);
            this.useSupabase = false;
            this.initializeWithLocalStorage();
        }
    }

    async createUserBalanceRecord() {
        try {
            const { data, error } = await window.SupabaseClient.getClient()
                .from('user_balances')
                .insert({
                    user_id: this.currentUser.id,
                    balance: 30,
                    total_mined: 0
                })
                .select()
                .single();
            
            if (error) throw error;
            
            this.userBalance = data.balance;
            this.updateUI();
            console.log('New user balance record created');
            
        } catch (error) {
            console.error('Error creating user balance record:', error);
            this.useSupabase = false;
        }
    }

    initializeWithLocalStorage() {
        console.log('Initializing with localStorage...');
        const storedBalance = localStorage.getItem('nemexBalance');
        this.userBalance = storedBalance ? parseInt(storedBalance) : 30;
        this.updateUI();
    }

    async updateBalance(amount) {
        this.userBalance = amount;
        
        if (this.useSupabase && this.currentUser) {
            await this.updateBalanceInSupabase(amount);
        } else {
            this.updateBalanceInLocalStorage(amount);
        }
        
        this.updateUI();
    }

    async updateBalanceInSupabase(amount) {
        try {
            const { data, error } = await window.SupabaseClient.getClient()
                .from('user_balances')
                .upsert({
                    user_id: this.currentUser.id,
                    balance: amount,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('Balance updated in Supabase:', data.balance);
            
        } catch (error) {
            console.error('Error updating balance in Supabase:', error);
            this.useSupabase = false;
            this.updateBalanceInLocalStorage(amount);
        }
    }

    updateBalanceInLocalStorage(amount) {
        localStorage.setItem('nemexBalance', amount.toString());
        console.log('Balance updated in localStorage:', amount);
    }

    updateUI() {
        // Update balance display
        const balanceElement = document.querySelector('.balance-amount');
        if (balanceElement) {
            balanceElement.textContent = `${this.userBalance} NMXp`;
        }
        
        // Update wallet balance
        const walletBalance = document.querySelector('.wallet-section .card:first-child div div');
        if (walletBalance) {
            walletBalance.textContent = `${this.userBalance}.00 NMX`;
        }
        
        console.log('UI updated with balance:', this.userBalance);
    }

    getBalance() {
        return this.userBalance;
    }

    isUsingSupabase() {
        return this.useSupabase;
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Create instance
window.UserManager = new UserManager();
