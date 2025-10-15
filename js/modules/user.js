// User management and API interactions
const User = {
    init() {
        this.initializeUser();
        console.log('User module initialized');
    },

    async initializeUser() {
        try {
            Core.showLoading('Initializing your account...');
            const response = await fetch(`${Core.API_BASE}/api/user/${Core.currentUserId}`);
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
            Core.hideLoading();
        } catch (error) {
            console.error('Error initializing user:', error);
            Core.hideLoading();
            this.fallbackToLocalStorage();
        }
    },

    async createNewUser() {
        try {
            const response = await fetch(`${Core.API_BASE}/api/user`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: Core.currentUserId,
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
    },

    updateUI(data) {
        const balanceDisplay = document.getElementById('balanceDisplay');
        const timerDisplay = document.getElementById('timerDisplay');
        const claimButton = document.getElementById('claimButton');

        if (balanceDisplay) balanceDisplay.textContent = data.balance;
        if (data.remainingTime > 0) {
            this.startCountdown(data.remainingTime);
            if (claimButton) claimButton.disabled = true;
            if (claimButton) claimButton.textContent = '30 NMXp';
        } else {
            if (timerDisplay) timerDisplay.textContent = 'Ready to Claim!';
            if (claimButton) claimButton.disabled = false;
            if (claimButton) claimButton.textContent = 'CLAIM 30 NMXp';
        }
        localStorage.setItem('nmxBalance', data.balance);
        localStorage.setItem('backupCountdown', data.remainingTime);
        localStorage.setItem('backupLastUpdate', Date.now());
    },

    startCountdown(initialTime) {
        let remainingTime = initialTime;
        const timerDisplay = document.getElementById('timerDisplay');
        const claimButton = document.getElementById('claimButton');
        
        clearInterval(Core.countdownInterval);
        
        function update() {
            if (remainingTime > 0 && timerDisplay) {
                timerDisplay.textContent = `Claim in ${Core.formatTime(remainingTime)}`;
                remainingTime--;
                if (remainingTime % 60 === 0) {
                    localStorage.setItem('backupCountdown', remainingTime);
                    localStorage.setItem('backupLastUpdate', Date.now());
                }
            } else if (timerDisplay && claimButton) {
                timerDisplay.textContent = 'Ready to Claim!';
                claimButton.disabled = false;
                claimButton.textContent = 'CLAIM 30 NMXp';
                clearInterval(Core.countdownInterval);
            }
        }
        update();
        Core.countdownInterval = setInterval(update, 1000);
    },

    async claimReward() {
        try {
            const claimButton = document.getElementById('claimButton');
            const balanceDisplay = document.getElementById('balanceDisplay');
            
            claimButton.disabled = true;
            claimButton.textContent = 'Claiming...';
            const response = await fetch(`${Core.API_BASE}/api/claim/${Core.currentUserId}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
            });
            const data = await response.json();
            if (response.ok) {
                if (balanceDisplay) balanceDisplay.textContent = data.balance;
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
            const claimButton = document.getElementById('claimButton');
            if (claimButton) {
                claimButton.disabled = false;
                claimButton.textContent = 'CLAIM 30 NMXp';
            }
        }
    },

    fallbackToLocalStorage() {
        const balanceDisplay = document.getElementById('balanceDisplay');
        const savedBalance = localStorage.getItem('nmxBalance');
        const savedCountdown = localStorage.getItem('backupCountdown');
        const savedLastUpdate = localStorage.getItem('backupLastUpdate');
        
        if (savedBalance && balanceDisplay) balanceDisplay.textContent = savedBalance;
        if (savedCountdown && savedLastUpdate) {
            const elapsedSeconds = Math.floor((Date.now() - parseInt(savedLastUpdate)) / 1000);
            const remainingTime = Math.max(0, parseInt(savedCountdown) - elapsedSeconds);
            this.startCountdown(remainingTime);
        } else {
            this.startCountdown(24 * 60 * 60);
        }
        alert('⚠️ Using offline mode. Some features may be limited.');
    },

    async loadProfileData() {
        try {
            Core.showLoading('Loading profile...');
            const response = await fetch(`${Core.API_BASE}/api/profile/${Core.currentUserId}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load profile');
            
            document.getElementById('profileName').textContent = data.name;
            document.getElementById('profileEmail').textContent = data.email;
            document.getElementById('profileUserId').textContent = data.userId;
            document.getElementById('profileMiningDays').textContent = `${data.miningDays} day${data.miningDays > 1 ? 's' : ''}`;
            document.getElementById('profileTotalEarned').textContent = `${data.totalEarned} NMXp`;
            const memberSinceDate = new Date(data.memberSince);
            document.getElementById('profileMemberSince').textContent = memberSinceDate.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            Core.hideLoading();
        } catch (error) {
            console.error('Error loading profile:', error);
            Core.hideLoading();
            this.fallbackToLocalProfile();
        }
    },

    fallbackToLocalProfile() {
        const userId = localStorage.getItem('userId') || Core.currentUserId;
        const joinDate = localStorage.getItem('joinDate') || new Date().toISOString();
        const totalEarned = localStorage.getItem('totalEarned') || 0;
        const joinDateObj = new Date(joinDate);
        const today = new Date();
        const daysSinceJoin = Math.floor((today - joinDateObj) / (1000 * 60 * 60 * 24));
        const miningDays = daysSinceJoin + 1;
        
        document.getElementById('profileName').textContent = 'Mining Enthusiast';
        document.getElementById('profileEmail').textContent = `user_${userId.substring(0, 8)}@nemexcoin.com`;
        document.getElementById('profileUserId').textContent = userId;
        document.getElementById('profileMiningDays').textContent = `${miningDays} day${miningDays > 1 ? 's' : ''}`;
        document.getElementById('profileTotalEarned').textContent = `${totalEarned} NMXp`;
        document.getElementById('profileMemberSince').textContent = joinDateObj.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        alert('⚠️ Using offline profile data.');
    }
};