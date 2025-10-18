// Countdown Manager with Real Persistence
class CountdownManager {
    constructor() {
        this.timerInterval = null;
        this.isRunning = false;
    }

    async initialize() {
        console.log('🔄 Starting countdown manager...');
        
        try {
            await this.initializeCountdown();
            this.startCountdown();
            this.isRunning = true;
        } catch (error) {
            console.error('❌ Countdown initialization failed:', error);
            this.initializeLocalCountdown();
        }
    }

    async initializeCountdown() {
        // For authenticated users, try to get from Supabase
        if (window.AuthManager && window.AuthManager.isAuthenticated && 
            window.SupabaseClient && window.SupabaseClient.isInitialized) {
            await this.initializeSupabaseCountdown();
        } else {
            // For demo users, use localStorage
            this.initializeLocalCountdown();
        }
    }

    async initializeSupabaseCountdown() {
        try {
            const client = window.SupabaseClient.getClient();
            const userId = window.AuthManager.currentUser.id;
            
            const { data: timerData, error } = await client
                .from('countdown_timers')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                // If no timer exists, create one
                if (error.code === 'PGRST116') {
                    await this.createSupabaseCountdown(userId);
                    return;
                }
                throw error;
            }

            // Check if countdown has expired
            const now = new Date();
            const targetTime = new Date(timerData.target_time);
            
            if (now >= targetTime) {
                // Countdown expired, user can claim
                console.log('✅ Countdown expired, ready to claim');
            } else {
                console.log('⏰ Countdown active:', targetTime);
            }

        } catch (error) {
            console.warn('⚠️ Failed to initialize Supabase countdown:', error);
            this.initializeLocalCountdown();
        }
    }

    async createSupabaseCountdown(userId) {
        try {
            const client = window.SupabaseClient.getClient();
            const targetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            const { error } = await client
                .from('countdown_timers')
                .insert([
                    {
                        user_id: userId,
                        target_time: targetTime.toISOString(),
                        is_claimed: false,
                        last_claimed: new Date().toISOString()
                    }
                ]);

            if (error) throw error;
            console.log('✅ Created new countdown timer in Supabase');

        } catch (error) {
            console.error('❌ Failed to create Supabase countdown:', error);
            throw error;
        }
    }

    initializeLocalCountdown() {
        const savedTime = localStorage.getItem('countdownTargetTime');
        if (!savedTime) {
            // Create new countdown
            const targetTime = Date.now() + 24 * 60 * 60 * 1000;
            localStorage.setItem('countdownTargetTime', targetTime.toString());
            console.log('✅ Created new local countdown timer');
        } else {
            console.log('⏰ Local countdown loaded');
        }
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

        this.timerInterval = setInterval(() => {
            this.updateCountdownDisplay();
        }, 1000);
        
        // Initial update
        this.updateCountdownDisplay();
        console.log('✅ Countdown timer started');
    }

    async updateCountdownDisplay() {
        const timerDisplay = document.getElementById('countdownTimer');
        const claimButton = document.getElementById('claimButton');
        
        if (!timerDisplay || !claimButton) return;

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
                claimButton.style.background = 'linear-gradient(135deg, var(--gold), #b8941f)';
            } else {
                // Update timer display
                const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
                const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
                
                timerDisplay.textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                // Keep button disabled
                claimButton.disabled = true;
                claimButton.textContent = '30 NMXp';
                claimButton.style.background = '#333';
            }
        } catch (error) {
            console.error('❌ Countdown update error:', error);
        }
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
        let targetTime;
        
        if (savedTime) {
            targetTime = new Date(parseInt(savedTime));
            // If countdown expired while page was closed, reset it
            if (new Date() >= targetTime) {
                targetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
                localStorage.setItem('countdownTargetTime', targetTime.getTime().toString());
            }
        } else {
            targetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
            localStorage.setItem('countdownTargetTime', targetTime.getTime().toString());
        }

        return {
            targetTime: targetTime,
            isClaimable: new Date() >= targetTime
        };
    }

    async resetTimer() {
        console.log('🔄 Resetting countdown timer...');
        
        if (window.AuthManager && window.AuthManager.isAuthenticated && 
            window.SupabaseClient && window.SupabaseClient.isInitialized) {
            await this.resetSupabaseTimer();
        } else {
            this.resetLocalTimer();
        }
        
        this.updateCountdownDisplay();
    }

    async resetSupabaseTimer() {
        try {
            const client = window.SupabaseClient.getClient();
            const userId = window.AuthManager.currentUser.id;
            const newTargetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            await client
                .from('countdown_timers')
                .update({
                    target_time: newTargetTime.toISOString(),
                    is_claimed: false
                })
                .eq('user_id', userId);
                
            console.log('✅ Supabase countdown reset');
        } catch (error) {
            console.error('❌ Failed to reset Supabase countdown:', error);
        }
    }

    resetLocalTimer() {
        const newTargetTime = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('countdownTargetTime', newTargetTime.toString());
        console.log('✅ Local countdown reset');
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