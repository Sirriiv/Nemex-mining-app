// Core Mining Functionality - Enhanced for exact screenshot behavior
class MiningCore {
    constructor() {
        this.balance = 30;
        this.isMining = false;
        this.countdownTime = 24 * 60 * 60; // 24 hours in seconds
        this.countdownInterval = null;
        this.miningRate = 1.25;
        this.totalClaims = 1;
        this.init();
    }
    
    init() {
        console.log('Mining core initialized');
        this.startCountdown();
        this.updateDisplay();
        
        // Listen for home section load
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                this.attachHomeListeners();
            }, 100);
        });
    }
    
    attachHomeListeners() {
        const miningCoin = document.getElementById('miningCoin');
        const claimButton = document.getElementById('claimButton');
        
        if (miningCoin) {
            miningCoin.addEventListener('click', this.startMining.bind(this));
            console.log('Mining coin listener attached');
        }
        
        if (claimButton) {
            claimButton.addEventListener('click', this.claimRewards.bind(this));
            console.log('Claim button listener attached');
        }
    }
    
    startMining() {
        if (this.isMining) return;
        
        console.log('Mining animation started');
        this.isMining = true;
        
        const miningCoin = document.getElementById('miningCoin');
        if (miningCoin) {
            miningCoin.classList.add('mining');
        }
        
        // Simulate mining process - just animation, no balance change
        setTimeout(() => {
            this.completeMining();
        }, 2000);
    }
    
    completeMining() {
        console.log('Mining animation completed');
        this.isMining = false;
        
        const miningCoin = document.getElementById('miningCoin');
        if (miningCoin) {
            miningCoin.classList.remove('mining');
        }
        
        // Show mining complete message
        this.showMiningComplete();
    }
    
    showMiningComplete() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--gold);
            color: var(--dark-bg);
            padding: 15px 25px;
            border-radius: 25px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 5px 20px rgba(212, 175, 55, 0.5);
        `;
        notification.textContent = '+1.25 NMX Mined!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 1500);
    }
    
    startCountdown() {
        // Clear any existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        this.countdownInterval = setInterval(() => {
            if (this.countdownTime > 0) {
                this.countdownTime--;
                this.updateCountdownDisplay();
            } else {
                this.enableClaim();
                clearInterval(this.countdownInterval);
            }
        }, 1000);
    }
    
    updateCountdownDisplay() {
        const timerDisplay = document.getElementById('countdownTimer');
        if (timerDisplay) {
            const hours = Math.floor(this.countdownTime / 3600);
            const minutes = Math.floor((this.countdownTime % 3600) / 60);
            const seconds = this.countdownTime % 60;
            
            timerDisplay.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    enableClaim() {
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.disabled = false;
            claimButton.textContent = 'Claim Your NMX Now!';
            claimButton.style.background = 'linear-gradient(135deg, var(--gold), var(--gold-dark))';
            claimButton.style.color = 'var(--dark-bg)';
        }
    }
    
    claimRewards() {
        if (this.countdownTime > 0) {
            alert('Claim not available yet! Wait for the timer to complete.');
            return;
        }
        
        console.log('Claiming rewards');
        
        // Add mining rewards to balance
        this.balance += this.miningRate * 24; // 24 hours of mining
        this.totalClaims++;
        
        // Reset countdown
        this.countdownTime = 24 * 60 * 60;
        this.startCountdown();
        
        // Disable claim button until next cycle
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.disabled = true;
            claimButton.textContent = 'Claim Your NMX';
        }
        
        // Update display
        this.updateDisplay();
        
        // Show success message
        this.showClaimSuccess();
    }
    
    showClaimSuccess() {
        alert(`Successfully claimed ${this.miningRate * 24} NMX! Total balance: ${this.balance.toFixed(2)} NMX`);
    }
    
    updateDisplay() {
        // Update balance
        const balanceElement = document.getElementById('currentBalance');
        if (balanceElement) {
            balanceElement.textContent = `${this.balance.toFixed(2)} NMX`;
        }
        
        // Update wallet balance if on wallet page
        const walletBalance = document.getElementById('walletBalance');
        if (walletBalance) {
            walletBalance.textContent = `${this.balance.toFixed(2)} NMX`;
        }
        
        // Update stats
        const totalMinedElement = document.getElementById('totalMined');
        if (totalMinedElement) {
            totalMinedElement.textContent = this.balance.toFixed(0);
        }
        
        const miningRateElement = document.getElementById('miningRate');
        if (miningRateElement) {
            miningRateElement.textContent = this.miningRate.toFixed(2);
        }
        
        const totalClaimsElement = document.getElementById('totalClaims');
        if (totalClaimsElement) {
            totalClaimsElement.textContent = this.totalClaims;
        }
    }
}

// Initialize mining core when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.miningCore = new MiningCore();
});