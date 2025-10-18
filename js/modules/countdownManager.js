// Real-time Countdown Manager with Persistence
class CountdownManager {
    constructor() {
        this.countdownDuration = 24 * 60 * 60; // 24 hours in seconds
        this.timer = null;
        this.currentTime = 0;
    }

    initialize() {
        console.log('Initializing Countdown Manager...');
        this.loadCountdownState();
        this.startCountdown();
    }

    loadCountdownState() {
        const storedTime = localStorage.getItem('nemexCountdown');
        
        if (storedTime) {
            const storedData = JSON.parse(storedTime);
            const elapsed = Math.floor((Date.now() - storedData.timestamp) / 1000);
            this.currentTime = Math.max(0, storedData.remaining - elapsed);
            console.log('Loaded countdown from storage. Remaining:', this.currentTime);
        } else {
            this.currentTime = this.countdownDuration;
            console.log('Starting new countdown');
        }
    }

    startCountdown() {
        this.updateDisplay();
        this.updateClaimButton();
        
        this.timer = setInterval(() => {
            if (this.currentTime > 0) {
                this.currentTime--;
                
                // Save state every second
                this.saveCountdownState();
                this.updateDisplay();
                this.updateClaimButton();
            } else {
                this.handleCountdownEnd();
            }
        }, 1000);
    }

    saveCountdownState() {
        const countdownData = {
            remaining: this.currentTime,
            timestamp: Date.now()
        };
        localStorage.setItem('nemexCountdown', JSON.stringify(countdownData));
    }

    updateDisplay() {
        const timerDisplay = document.getElementById('countdownTimer');
        if (timerDisplay) {
            const hours = Math.floor(this.currentTime / 3600);
            const minutes = Math.floor((this.currentTime % 3600) / 60);
            const seconds = this.currentTime % 60;
            
            timerDisplay.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    updateClaimButton() {
        const claimButton = document.getElementById('claimButton');
        if (claimButton) {
            claimButton.disabled = this.currentTime > 0;
            
            if (this.currentTime === 0) {
                claimButton.textContent = 'Claim Your NMX Now!';
                claimButton.style.background = 'linear-gradient(135deg, var(--gold), var(--gold-dark))';
                claimButton.style.color = 'var(--darker-bg)';
            }
        }
    }

    handleCountdownEnd() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        console.log('Countdown ended - ready to claim!');
        this.updateClaimButton();
        localStorage.removeItem('nemexCountdown');
    }

    resetCountdown() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.currentTime = this.countdownDuration;
        localStorage.removeItem('nemexCountdown');
        this.startCountdown();
        console.log('Countdown reset');
    }

    getRemainingTime() {
        return this.currentTime;
    }
}

// Create instance
window.CountdownManager = new CountdownManager();
