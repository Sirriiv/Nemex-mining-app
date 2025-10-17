// Core Mining Functionality
class MiningCore {
    constructor() {
        this.balance = 30;
        this.isMining = false;
        this.countdownTime = 24 * 60 * 60; // 24 hours in seconds
        this.countdownInterval = null;
        this.init();
    }
    
    init() {
        console.log('Mining core initialized');
        this.startCountdown();
        this.attachMiningListeners();
        this.updateDisplay();
    }
    
    attachMiningListeners() {
        // This will be attached when home section loads
        document.addEventListener('sectionLoaded', (e) => {
            if (e.detail.section === 'home') {
                this.attachHomeListeners();
            }
        });
    }
    
    attachHomeListeners() {
        const miningCoin = document.getElementById('miningCoin');
        const claimButton = document.getElementById('claimButton');
        
        if (miningCoin) {
            miningCoin.addEventListener('click', this.startMining.bind(this));
        }
        
        if (claimButton) {
            claimButton.addEventListener('click', this.claimRewards.bind(this));
        }
        
        console.log('Mining listeners attached');
    }
    
    startMining() {
        if (this.isMining) return;
        
        console.log('Mining started');
        this.isMining = true;
        
        const miningCoin = document.getElementById('miningCoin');
        if (miningCoin) {
            miningCoin.classList.add('mining');
        }
        
        // Simulate mining process
        setTimeout(() => {
            this.completeMining();
        }, 3000);
    }
    
    completeMining() {
        console.log('Mining completed');
        this.isMining = false;
        
        const miningCoin = document.getElementById('miningCoin');
        if (miningCoin) {
            miningCoin.classList.remove('mining');
        }
        
        // Add mining reward
        this.addToBalance(1.25);
    }
    
    startCountdown() {
        this.countdownInterval = setInterval(() => {
            if (this.countdownTime > 0) {
                this.countdownTime--;
                this.updateCountdownDisplay();
            } else {
                this.enableClaim();
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
        }
    }
    
    claimRewards() {
        console.log('Claiming rewards');
        
        // Reset countdown
        this.countdownTime = 24 * 60 * 60;
        this.updateCountdownDisplay();
        
        // Disable claim button until next cycle
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.disabled = true;
            claimButton.textContent = 'Claim Your NMX';
        }
        
        // Show success message
        alert('Successfully claimed your NMX rewards!');
    }
    
    addToBalance(amount) {
        this.balance += amount;
        this.updateDisplay();
    }
    
    updateDisplay() {
        const balanceElement = document.getElementById('currentBalance');
        if (balanceElement) {
            balanceElement.textContent = `${this.balance.toFixed(2)} NMX`;
        }
        
        const totalMinedElement = document.getElementById('totalMined');
        if (totalMinedElement) {
            totalMinedElement.textContent = this.balance.toFixed(0);
        }
    }
}

// Initialize mining core
document.addEventListener('DOMContentLoaded', function() {
    window.miningCore = new MiningCore();
});