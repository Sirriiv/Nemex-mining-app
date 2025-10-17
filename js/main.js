// Main Application Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('NEMEXCOIN App Initializing...');

    // Initialize app after a short delay to show loading screen
    setTimeout(initializeApp, 2000);
});

function initializeApp() {
    console.log('Initializing NEMEXCOIN Dashboard...');

    // Hide loading screen and show app
    const loading = document.getElementById('loading');
    const app = document.getElementById('app');

    if (loading && app) {
        loading.classList.add('hidden');
        app.classList.remove('hidden');
        console.log('NEMEXCOIN Dashboard initialized successfully!');
        
        // Initialize mining functionality
        initializeMining();
    } else {
        console.error('Critical elements not found!');
    }
}

function initializeMining() {
    console.log('Mining functionality initialized');
    
    // Start countdown timer
    startCountdown();
    
    // Attach mining coin click event
    const miningCoin = document.getElementById('miningCoin');
    if (miningCoin) {
        miningCoin.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    }
}

function startCountdown() {
    let countdownTime = 24 * 60 * 60; // 24 hours in seconds
    
    const timer = setInterval(() => {
        if (countdownTime > 0) {
            countdownTime--;
            updateTimerDisplay(countdownTime);
        } else {
            clearInterval(timer);
            enableClaimButton();
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    const timerDisplay = document.getElementById('countdownTimer');
    if (timerDisplay) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        timerDisplay.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function enableClaimButton() {
    const claimButton = document.getElementById('claimButton');
    if (claimButton) {
        claimButton.disabled = false;
        claimButton.textContent = 'Claim Your NMX Now!';
    }
}

// Simple section navigation
function loadSection(sectionName) {
    console.log('Loading section:', sectionName);
    alert(`Loading ${sectionName} section - This will be implemented fully soon!`);
}