import { ApiService } from '../services/apiService.js';

let countdownInterval;

export function initSection(userId) {
    const claimButton = document.getElementById('claimButton');
    if (claimButton) {
        claimButton.addEventListener('click', () => claimReward(userId));
    }
}

export async function initializeUser() {
    const userId = getStableUserId();
    try {
        showLoading('Initializing your account...');
        const data = await ApiService.getUser(userId);
        updateUI(data);
        hideLoading();
    } catch (error) {
        console.error('Error initializing user:', error);
        
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            await createNewUser(userId);
        } else {
            hideLoading();
            fallbackToLocalStorage();
        }
    }
}

async function createNewUser(userId) {
    try {
        const userData = {
            userId: userId,
            balance: 0,
            remainingTime: 24 * 60 * 60,
            joinDate: new Date().toISOString()
        };
        
        const data = await ApiService.createUser(userData);
        updateUI(data);
    } catch (error) {
        console.error('Error creating user:', error);
        fallbackToLocalStorage();
    }
}

export async function claimReward(userId) {
    const claimButton = document.getElementById('claimButton');
    try {
        claimButton.disabled = true;
        claimButton.textContent = 'Claiming...';
        
        const data = await ApiService.claimReward(userId);
        
        if (data.balance !== undefined) {
            document.getElementById('balanceDisplay').textContent = data.balance;
            startCountdown(24 * 60 * 60);
            claimButton.textContent = '30 NMXp';
            localStorage.setItem('nmxBalance', data.balance);
            alert('✅ ' + data.message);
        } else {
            alert('❌ Error: ' + data.error);
            claimButton.disabled = false;
            claimButton.textContent = 'CLAIM 30 NMXp';
        }
    } catch (error) {
        console.error('Error claiming reward:', error);
        alert('❌ Network error. Please try again.');
        claimButton.disabled = false;
        claimButton.textContent = 'CLAIM 30 NMXp';
    }
}

function updateUI(data) {
    const balanceDisplay = document.getElementById('balanceDisplay');
    const timerDisplay = document.getElementById('timerDisplay');
    const claimButton = document.getElementById('claimButton');
    
    if (balanceDisplay) balanceDisplay.textContent = data.balance;
    
    if (data.remainingTime > 0) {
        startCountdown(data.remainingTime);
        if (claimButton) {
            claimButton.disabled = true;
            claimButton.textContent = '30 NMXp';
        }
    } else {
        if (timerDisplay) timerDisplay.textContent = 'Ready to Claim!';
        if (claimButton) {
            claimButton.disabled = false;
            claimButton.textContent = 'CLAIM 30 NMXp';
        }
    }
    
    localStorage.setItem('nmxBalance', data.balance);
    localStorage.setItem('backupCountdown', data.remainingTime);
    localStorage.setItem('backupLastUpdate', Date.now());
}

function startCountdown(initialTime) {
    let remainingTime = initialTime;
    const timerDisplay = document.getElementById('timerDisplay');
    const claimButton = document.getElementById('claimButton');
    
    clearInterval(countdownInterval);
    
    function update() {
        if (remainingTime > 0) {
            if (timerDisplay) timerDisplay.textContent = `Claim in ${formatTime(remainingTime)}`;
            remainingTime--;
            if (remainingTime % 60 === 0) {
                localStorage.setItem('backupCountdown', remainingTime);
                localStorage.setItem('backupLastUpdate', Date.now());
            }
        } else {
            if (timerDisplay) timerDisplay.textContent = 'Ready to Claim!';
            if (claimButton) {
                claimButton.disabled = false;
                claimButton.textContent = 'CLAIM 30 NMXp';
            }
            clearInterval(countdownInterval);
        }
    }
    
    update();
    countdownInterval = setInterval(update, 1000);
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function fallbackToLocalStorage() {
    const savedBalance = localStorage.getItem('nmxBalance');
    const savedCountdown = localStorage.getItem('backupCountdown');
    const savedLastUpdate = localStorage.getItem('backupLastUpdate');
    
    const balanceDisplay = document.getElementById('balanceDisplay');
    if (balanceDisplay && savedBalance) {
        balanceDisplay.textContent = savedBalance;
    }
    
    if (savedCountdown && savedLastUpdate) {
        const elapsedSeconds = Math.floor((Date.now() - parseInt(savedLastUpdate)) / 1000);
        const remainingTime = Math.max(0, parseInt(savedCountdown) - elapsedSeconds);
        startCountdown(remainingTime);
    } else {
        startCountdown(24 * 60 * 60);
    }
    
    alert('⚠️ Using offline mode. Some features may be limited.');
}

function getStableUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = generateStableUserId();
        localStorage.setItem('userId', userId);
        localStorage.setItem('joinDate', new Date().toISOString());
    }
    return userId;
}

function generateStableUserId() {
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

function showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    const status = loading.querySelector('.loading-status');
    status.textContent = message;
    loading.classList.remove('hidden');
}

function hideLoading() {
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }, 500);
}
