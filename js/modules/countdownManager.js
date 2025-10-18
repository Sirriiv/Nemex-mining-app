// Countdown Manager with Persistence
class CountdownManager {
    constructor() {
        this.timerInterval = null;
        this.isRunning = false;
        this.lastUpdateTime = Date.now();
    }

    async initialize() {
        console.log('🔄 Starting countdown manager...');
        
        try {
            // Load saved countdown state
            await this.loadCountdownState();
            this.startCountdown();
            this.isRunning = true;
        } catch (error) {
            console.error('❌ Countdown initialization failed:', error);
            this.startCountdown(); // Start anyway with default
        }
    }

    async loadCountdownState() {
        // Try to load from Supabase first for authenticated users
        if (window.AuthManager && window.AuthManager.isAuthenticated && 
            window.SupabaseClient && window.SupabaseClient.isInitialized) {
            await this.loadCountdownFromSupabase();
        } else {
            // Fallback to localStorage
            this.loadCountdownFromLocalStorage();
        }
    }

    async loadCountdownFromSupabase() {
        try {
            const client = window.SupabaseClient.getClient();
            const userId = window.AuthManager.currentUser.id;
            
            const { data: timerData, error } = await client
                .from('countdown_timers')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            if (timerData && timerData.target_time) {
                const targetTime = new Date(timerData.target_time);
                const now = new Date();
                
                // If countdown expired while user was away, reset it
                if (now >= targetTime) {
                    await this.resetCountdownInSupabase();
                } else {
                    // Use the saved target time
                    this.lastUpdateTime = targetTime.getTime() - (24 * 60 * 60 * 1000) + 1000;
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to load countdown from Supabase:', error);
            this.loadCountdownFromLocalStorage();
        }
    }

    loadCountdownFromLocalStorage() {
        const savedTime = localStorage.getItem('countdownTargetTime');
        if (savedTime) {
            const targetTime = new Date(parseInt(savedTime));
            const now = new Date();
            
            // If countdown expired, reset it
            if (now >= targetTime) {
                this.resetCountdownInLocalStorage();
            } else {
                this.lastUpdateTime = targetTime.getTime() - (24 * 60 * 60 * 1000) + 1000;
            }
        }
    }

    async resetCountdownInSupabase() {
        try {
            const client = window.SupabaseClient.getClient();
            const userId = window.AuthManager.currentUser.id;
            
            const newTargetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            await client
                .from('countdown_timers')
                .update({
                    target_time: newTargetTime.toISOString(),
                    is_claimed: false,
                    last_claimed: new Date().toISOString()
                })
                .eq('user_id', userId);
                
        } catch (error) {
            console.warn('⚠️ Failed to reset countdown in Supabase:', error);
        }
    }

    resetCountdownInLocalStorage() {
        const newTargetTime = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('countdownTargetTime', newTargetTime.toString());
    }

    startCountdown() {
        const timerDisplay = document.getElementById('countdownTimer');
        const claimButton = document.getElementById('claimButton');
        
        if (!timerDisplay || !claimButton) {
            console.warn('⚠️ Countdown elements not found');
            return;
        }

        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(async () => {
            try {
                const countdownData = await this.getCountdownData();
                const now = new Date();
                const targetTime = new Date(countdownData.targetTime);
                
                const timeRemaining = targetTime - now;
                
                if (timeRemaining <= 0) {
                    // Time's up - can claim
                    timerDisplay.textContent = '00:00:00';
                    claimButton.disabled = false;
                    claimButton.textContent = 'Claim Your NMX Now!';
                    
                    // Update claimable state
                    await this.setClaimable(true);
                } else {
                    // Update timer display
                    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
                    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
                    
                    timerDisplay.textContent = 
                        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    
                    // Keep button disabled
                    claimButton.disabled = true;
                    claimButton.textContent = 'Claim Your NMX';
                }
            } catch (error) {
                console.error('❌ Countdown update error:', error);
            }
        }, 1000);
        
        console.log('✅ Countdown timer started');
    }

    async getCountdownData() {
        // For authenticated users, get from Supabase
        if (window.AuthManager && window.AuthManager.isAuthenticated && 
            window.SupabaseClient && window.SupabaseClient.isInitialized) {
            return await this.getCountdownFromSupabase();
        } else {
            return this.getCountdownFromLocalStorage();
        }
    }

    async getCountdownFromSupabase() {
        try {
            const client = window.SupabaseClient.getClient();
            const userId = window.AuthManager.currentUser.id;
            
            const { data: timerData, error } = await client
                .from('countdown_timers')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                targetTime: new Date(timerData.target_time),
                isClaimable: !timerData.is_claimed && new Date() >= new Date(timerData.target_time)
            };
        } catch (error) {
            console.warn('⚠️ Failed to get countdown from Supabase:', error);
            return this.getCountdownFromLocalStorage();
        }
    }

    getCountdownFromLocalStorage() {
        const savedTime = localStorage.getItem('countdownTargetTime');
        const targetTime = savedTime ? new Date(parseInt(savedTime)) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        if (!savedTime) {
            this.resetCountdownInLocalStorage();
        }

        return {
            targetTime: targetTime,
            isClaimable: new Date() >= targetTime
        };
    }

    async setClaimable(isClaimable) {
        if (window.AuthManager && window.AuthManager.isAuthenticated && 
            window.SupabaseClient && window.SupabaseClient.isInitialized) {
            await this.setClaimableInSupabase(isClaimable);
        } else {
            this.setClaimableInLocalStorage(isClaimable);
        }
    }

    async setClaimableInSupabase(isClaimable) {
        try {
            const client = window.SupabaseClient.getClient();
            const userId = window.AuthManager.currentUser.id;
            
            await client
                .from('countdown_timers')
                .update({ is_claimed: !isClaimable })
                .eq('user_id', userId);
                
        } catch (error) {
            console.warn('⚠️ Failed to update claimable state in Supabase:', error);
        }
    }

    setClaimableInLocalStorage(isClaimable) {
        // For demo users, we handle this via the button state
    }

    async resetTimer() {
        if (window.AuthManager && window.AuthManager.isAuthenticated && 
            window.SupabaseClient && window.SupabaseClient.isInitialized) {
            await this.resetCountdownInSupabase();
        } else {
            this.resetCountdownInLocalStorage();
        }
        
        this.restart();
    }

    stop() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.isRunning = false;
        }
    }

    restart() {
        this.stop();
        this.startCountdown();
    }
}

// Create global instance
window.CountdownManager = new CountdownManager();