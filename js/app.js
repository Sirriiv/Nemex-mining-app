// Main Application Logic
class NemexApp {
    constructor() {
        this.API_BASE = 'https://nemex-backend.onrender.com';
        this.countdownInterval = null;
        this.currentUserId = null;
        this.isLoading = false;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Initialize user ID
            this.currentUserId = this.getStableUserId();
            
            // Initialize UI components
            this.initializeNavigation();
            this.initializeModals();
            this.initializeSecurity();
            
            // Load user data
            await this.initializeUser();
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.fallbackToLocalStorage();
        }
    }

    getStableUserId() {
        let userId = localStorage.getItem('userId');
        if (userId) {
            console.log('Found existing user ID:', userId);
            return userId;
        }
        
        userId = this.generateStableUserId();
        localStorage.setItem('userId', userId);
        
        if (!localStorage.getItem('joinDate')) {
            localStorage.setItem('joinDate', new Date().toISOString());
        }
        
        console.log('Created new stable user ID:', userId);
        return userId;
    }

    generateStableUserId() {
        const components = [
            navigator.userAgent, navigator.language,
            navigator.hardwareConcurrency || 'unknown',
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset()
        ];
        
        let hash = 0;
        const str = components.join('|');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return 'user_' + Math.abs(hash).toString(36) + '_' + Date.now();
    }

    async initializeUser() {
        try {
            this.showLoading('Initializing your account...');
            
            const response = await fetch(`${this.API_BASE}/api/user/${this.currentUserId}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Existing user loaded:', data);
                this.updateUI(data);
            } else if (response.status === 404) {
                console.log('User not found in backend, creating new user...');
                await this.createNewUser();
            } else {
                throw new Error('Failed to load user data');
            }
            
            this.hideLoading();
        } catch (error) {
            console.error('Error initializing user:', error);
            this.hideLoading();
            this.fallbackToLocalStorage();
        }
    }

    async createNewUser() {
        try {
            const response = await fetch(`${this.API_BASE}/api/user`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: this.currentUserId,
                    balance: 0,
                    remainingTime: 24 * 60 * 60,
                    joinDate: new Date().toISOString()
                })
            });
            
            if (!response.ok) throw new Error('Failed to create user');
            
            const data = await response.json();
            console.log('New user created:', data);
            this.updateUI(data);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    updateUI(data) {
        document.getElementById('balanceDisplay').textContent = data.balance;
        
        if (data.remainingTime > 0) {
            this.startCountdown(data.remainingTime);
            document.getElementById('claimButton').disabled = true;
            document.getElementById('claimButton').textContent = '30 NMXp';
        } else {
            document.getElementById('timerDisplay').textContent = 'Ready to Claim!';
            document.getElementById('claimButton').disabled = false;
            document.getElementById('claimButton').textContent = 'CLAIM 30 NMXp';
        }
        
        // Update local storage as backup
        localStorage.setItem('nmxBalance', data.balance);
        localStorage.setItem('backupCountdown', data.remainingTime);
        localStorage.setItem('backupLastUpdate', Date.now());
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    startCountdown(initialTime) {
        let remainingTime = initialTime;
        
        clearInterval(this.countdownInterval);
        
        const update = () => {
            if (remainingTime > 0) {
                document.getElementById('timerDisplay').textContent = `Claim in ${this.formatTime(remainingTime)}`;
                remainingTime--;
                
                if (remainingTime % 60 === 0) {
                    localStorage.setItem('backupCountdown', remainingTime);
                    localStorage.setItem('backupLastUpdate', Date.now());
                }
            } else {
                document.getElementById('timerDisplay').textContent = 'Ready to Claim!';
                document.getElementById('claimButton').disabled = false;
                document.getElementById('claimButton').textContent = 'CLAIM 30 NMXp';
                clearInterval(this.countdownInterval);
            }
        };
        
        update();
        this.countdownInterval = setInterval(update, 1000);
    }

    async claimReward() {
        try {
            const claimButton = document.getElementById('claimButton');
            claimButton.disabled = true;
            claimButton.textContent = 'Claiming...';
            
            const response = await fetch(`${this.API_BASE}/api/claim/${this.currentUserId}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
            });
            
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('balanceDisplay').textContent = data.balance;
                this.startCountdown(24 * 60 * 60);
                claimButton.textContent = '30 NMXp';
                
                localStorage.setItem('nmxBalance', data.balance);
                alert('✅ ' + data.message);
            } else if (response.status === 404) {
                console.log('User not found during claim, creating user...');
                await this.createNewUser();
                alert('⚠️ Account initialized. Please try claiming again.');
                claimButton.disabled = false;
                claimButton.textContent = 'CLAIM 30 NMXp';
            } else {
                alert('❌ Error: ' + data.error);
                claimButton.disabled = false;
                claimButton.textContent = 'CLAIM 30 NMXp';
            }
        } catch (error) {
            console.error('Error claiming reward:', error);
            alert('❌ Network error. Please try again.');
            document.getElementById('claimButton').disabled = false;
            document.getElementById('claimButton').textContent = 'CLAIM 30 NMXp';
        }
    }

    fallbackToLocalStorage() {
        const savedBalance = localStorage.getItem('nmxBalance');
        const savedCountdown = localStorage.getItem('backupCountdown');
        const savedLastUpdate = localStorage.getItem('backupLastUpdate');
        
        if (savedBalance) {
            document.getElementById('balanceDisplay').textContent = savedBalance;
        }
        
        if (savedCountdown && savedLastUpdate) {
            const elapsedSeconds = Math.floor((Date.now() - parseInt(savedLastUpdate)) / 1000);
            const remainingTime = Math.max(0, parseInt(savedCountdown) - elapsedSeconds);
            this.startCountdown(remainingTime);
        } else {
            this.startCountdown(24 * 60 * 60);
        }
        
        alert('⚠️ Using offline mode. Some features may be limited.');
    }

    showLoading(message = 'Loading...') {
        const loading = document.getElementById('loading');
        const status = loading.querySelector('.loading-status');
        status.textContent = message;
        loading.classList.remove('hidden');
    }

    hideLoading() {
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 500);
    }

    setupEventListeners() {
        // Claim button
        document.getElementById('claimButton').addEventListener('click', () => {
            this.claimReward();
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nemexApp = new NemexApp();
});