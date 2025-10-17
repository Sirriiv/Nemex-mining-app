// User Management
class UserManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    async login(email, password) {
        try {
            console.log('🔐 Attempting login for:', email);
            
            // Validate inputs
            if (!CoreUtils.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (!CoreUtils.validatePassword(password)) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Simulate API call - replace with actual API
            const userData = await this.mockLoginAPI(email, password);
            
            // Store user data
            this.currentUser = userData;
            this.isAuthenticated = true;
            
            // Store token
            StorageManager.set('token', userData.token);
            StorageManager.set('user', userData);
            
            console.log('✅ Login successful');
            return { success: true, user: userData };
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            return { success: false, error: error.message };
        }
    }

    async register(userData) {
        try {
            console.log('👤 Attempting registration');
            
            // Validate inputs
            if (!userData.fullName || userData.fullName.length < 2) {
                throw new Error('Please enter your full name');
            }

            if (!CoreUtils.validateEmail(userData.email)) {
                throw new Error('Please enter a valid email address');
            }

            if (!CoreUtils.validatePassword(userData.password)) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Simulate API call - replace with actual API
            const newUser = await this.mockRegisterAPI(userData);
            
            console.log('✅ Registration successful');
            return { success: true, user: newUser };
            
        } catch (error) {
            console.error('❌ Registration failed:', error);
            return { success: false, error: error.message };
        }
    }

    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        StorageManager.clear();
        console.log('🚪 User logged out');
    }

    getCurrentUser() {
        if (!this.currentUser) {
            this.currentUser = StorageManager.get('user');
            this.isAuthenticated = !!this.currentUser;
        }
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.getCurrentUser();
    }

    updateProfile(updates) {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            const updatedUser = { ...currentUser, ...updates };
            this.currentUser = updatedUser;
            StorageManager.set('user', updatedUser);
            
            console.log('✅ Profile updated');
            return { success: true, user: updatedUser };
            
        } catch (error) {
            console.error('❌ Profile update failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Mock API methods - replace with actual API calls
    async mockLoginAPI(email, password) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock response
        return {
            id: CoreUtils.generateId(),
            email: email,
            fullName: 'Mining Enthusiast',
            balance: 0,
            miningDays: 1,
            referralCode: 'NMX' + Date.now().toString().slice(-6),
            joinDate: new Date().toISOString(),
            token: 'mock_jwt_token_' + Date.now()
        };
    }

    async mockRegisterAPI(userData) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock response
        return {
            id: CoreUtils.generateId(),
            email: userData.email,
            fullName: userData.fullName,
            balance: 25, // Welcome bonus
            miningDays: 1,
            referralCode: 'NMX' + Date.now().toString().slice(-6),
            joinDate: new Date().toISOString(),
            token: 'mock_jwt_token_' + Date.now()
        };
    }
}

// Initialize user manager
window.userManager = new UserManager();

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            // Show loading state
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Signing in...';
            submitBtn.disabled = true;
            
            const result = await userManager.login(email, password);
            
            if (result.success) {
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // Show error
                alert('Login failed: ' + result.error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Registration form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                referralCode: document.getElementById('referralCode').value
            };
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            
            // Show loading state
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating account...';
            submitBtn.disabled = true;
            
            const result = await userManager.register(formData);
            
            if (result.success) {
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // Show error
                alert('Registration failed: ' + result.error);
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});