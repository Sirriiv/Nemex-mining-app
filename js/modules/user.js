// User Management
let currentUserId = getStableUserId();
let countdownInterval;

function getStableUserId() {
    let userId = localStorage.getItem('userId');
    if (userId) {
        console.log('Found existing user ID:', userId);
        return userId;
    }
    userId = generateStableUserId();
    localStorage.setItem('userId', userId);
    if (!localStorage.getItem('joinDate')) {
        localStorage.setItem('joinDate', new Date().toISOString());
    }
    console.log('Created new stable user ID:', userId);
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

async function initializeUser() {
    try {
        showLoading('Initializing your account...');
        const data = await API.getUser(currentUserId);
        console.log('Existing user loaded:', data);
        updateUI(data);
        hideLoading();
    } catch (error) {
        if (error.message.includes('404')) {
            console.log('User not found in backend, creating new user...');
            await createNewUser();
        } else {
            console.error('Error initializing user:', error);
            hideLoading();
            fallbackToLocalStorage();
        }
    }
}

async function createNewUser() {
    try {
        const data = await API.createUser({
            userId: currentUserId,
            balance: 0,
            remainingTime: 24 * 60 * 60,
            joinDate: new Date().toISOString()
        });
        console.log('New user created:', data);
        updateUI(data);
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

function updateUI(data) {
    const balanceDisplay = document.getElementById('balanceDisplay');
    const timerDisplay = document.getElementById('timerDisplay');
    const claimButton = document.getElementById('claimButton');
    
    balanceDisplay.textContent = data.balance;
    if (data.remainingTime > 0) {
        startCountdown(data.remainingTime);
        claimButton.disabled = true;
        claimButton.textContent = '30 NMXp';
    } else {
        timerDisplay.textContent = 'Ready to Claim!';
        claimButton.disabled = false;
        claimButton.textContent = 'CLAIM 30 NMXp';
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
            timerDisplay.textContent = `Claim in ${formatTime(remainingTime)}`;
            remainingTime--;
            if (remainingTime % 60 === 0) {
                localStorage.setItem('backupCountdown', remainingTime);
                localStorage.setItem('backupLastUpdate', Date.now());
            }
        } else {
            timerDisplay.textContent = 'Ready to Claim!';
            claimButton.disabled = false;
            claimButton.textContent = 'CLAIM 30 NMXp';
            clearInterval(countdownInterval);
        }
    }
    update();
    countdownInterval = setInterval(update, 1000);
}

async function claimReward() {
    const claimButton = document.getElementById('claimButton');
    
    try {
        claimButton.disabled = true;
        claimButton.textContent = 'Claiming...';
        
        const data = await API.claimReward(currentUserId);
        
        if (data.balance !== undefined) {
            document.getElementById('balanceDisplay').textContent = data.balance;
            startCountdown(24 * 60 * 60);
            claimButton.textContent = '30 NMXp';
            localStorage.setItem('nmxBalance', data.balance);
            alert('✅ ' + data.message);
        } else if (data.error && data.error.includes('not found')) {
            console.log('User not found during claim, creating user...');
            await createNewUser();
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
        claimButton.disabled = false;
        claimButton.textContent = 'CLAIM 30 NMXp';
    }
}

function fallbackToLocalStorage() {
    const balanceDisplay = document.getElementById('balanceDisplay');
    const savedBalance = localStorage.getItem('nmxBalance');
    const savedCountdown = localStorage.getItem('backupCountdown');
    const savedLastUpdate = localStorage.getItem('backupLastUpdate');
    
    if (savedBalance) balanceDisplay.textContent = savedBalance;
    if (savedCountdown && savedLastUpdate) {
        const elapsedSeconds = Math.floor((Date.now() - parseInt(savedLastUpdate)) / 1000);
        const remainingTime = Math.max(0, parseInt(savedCountdown) - elapsedSeconds);
        startCountdown(remainingTime);
    } else {
        startCountdown(24 * 60 * 60);
    }
    alert('⚠️ Using offline mode. Some features may be limited.');
}