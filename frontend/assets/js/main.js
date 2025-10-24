// Shared functionality across all pages
document.addEventListener('DOMContentLoaded', function() {
    // Settings icon functionality
    const settingsIcon = document.querySelector('.settings-icon');
    if (settingsIcon) {
        settingsIcon.addEventListener('click', function() {
            alert('Settings menu would open here');
        });
    }

    // Set active navigation based on current page
    function setActiveNav() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    setActiveNav();

    // Initialize Supabase client
    initializeSupabase();
    
    // Mining Dashboard Specific Functionality
    initializeMiningDashboard();
});

// Initialize Supabase
let supabaseClient;
function initializeSupabase() {
    const supabaseUrl = 'https://bjulifvbfogymoduxnzl.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';

    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized in main.js');
}

// Get current user
async function getCurrentUser() {
    try {
        // Check Telegram session first
        const telegramUserData = localStorage.getItem('nemex_telegram_user');
        if (telegramUserData) {
            return JSON.parse(telegramUserData);
        }

        // Check web session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            // Get user profile from profiles table
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            return profile;
        }

        return null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Load user balance
async function loadUserBalance() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.log('No user logged in');
            return 0;
        }

        console.log('👤 Current user:', user);
        console.log('💰 User balance:', user.balance);

        // Update balance display if element exists
        const balanceElement = document.getElementById('balanceAmount');
        if (balanceElement) {
            balanceElement.textContent = user.balance || 0;
        }

        return user.balance || 0;

    } catch (error) {
        console.error('Error loading user balance:', error);
        return 0;
    }
}

// Mining Dashboard Functions
function initializeMiningDashboard() {
    const claimBtn = document.querySelector('.claim-btn');
    const countdownTimer = document.getElementById('countdownTimer');
    const balanceAmount = document.getElementById('balanceAmount');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const connectionStatus = document.getElementById('connectionStatus');

    // Only run if we're on the mining dashboard
    if (!claimBtn || !countdownTimer) return;

    // NO DEMO USER - Force database connection
    let databaseConnected = false;
    let countdownTime = 10 * 60; // 10 minutes for testing (changed from 12 hours)

    function updateCountdown() {
        if (countdownTime > 0) {
            countdownTime--;

            const hours = Math.floor(countdownTime / 3600);
            const minutes = Math.floor((countdownTime % 3600) / 60);
            const seconds = countdownTime % 60;

            const formattedTime = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            countdownTimer.textContent = formattedTime;

            // Update button state
            if (countdownTime === 0 && databaseConnected) {
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim 30 NMX Now!';
            } else {
                claimBtn.disabled = true;
                if (!databaseConnected) {
                    claimBtn.textContent = 'Database Connecting...';
                } else {
                    claimBtn.textContent = 'Claim 30 NMX Now!';
                }
            }
        }
    }

    // FIXED: Test Supabase Connection with CORRECT table structure
    async function testDatabaseConnection() {
        try {
            console.log('🔄 Testing Supabase connection...');
            connectionStatus.textContent = 'Testing database connection...';

            // Test connection using PROFILES table (not users)
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('count')
                .limit(1);

            if (error) {
                throw new Error('Connection failed: ' + error.message);
            }

            console.log('✅ Supabase connection successful!');
            connectionStatus.textContent = '✅ Database connected successfully!';
            connectionStatus.style.color = 'var(--gold)';
            databaseConnected = true;

            // Load user balance immediately after connection
            await loadUserBalance();

        } catch (error) {
            console.error('❌ Database connection failed:', error);
            connectionStatus.textContent = '❌ Database connection failed: ' + error.message;
            connectionStatus.style.color = '#ff6b6b';
            databaseConnected = false;
        }
    }

    // FIXED: Claim Button Functionality - Uses PROFILES table
    claimBtn.addEventListener('click', async function() {
        if (!databaseConnected) {
            alert('❌ Cannot claim - Database not connected!');
            return;
        }

        const claimButton = this;

        try {
            // Show loading
            claimButton.disabled = true;
            loadingIndicator.style.display = 'block';
            loadingIndicator.textContent = 'Processing claim...';

            console.log('🔄 Processing NMX claim...');

            // Get current user
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('No user logged in');
            }

            console.log('👤 Claiming for user:', user.id);

            // Calculate new balance
            const currentBalance = user.balance || 0;
            const claimAmount = 30;
            const newBalance = currentBalance + claimAmount;

            // FIXED: Update balance in PROFILES table
            const { data: updateData, error: updateError } = await supabaseClient
                .from('profiles')
                .update({ 
                    balance: newBalance,
                    last_claim: new Date().toISOString()
                })
                .eq('id', user.id)
                .select();

            if (updateError) {
                throw new Error('Failed to update balance: ' + updateError.message);
            }

            console.log('✅ Balance updated successfully:', updateData);

            // FIXED: Save claim history (if claim_history table exists)
            try {
                const { error: historyError } = await supabaseClient
                    .from('claim_history')
                    .insert([
                        { 
                            user_id: user.id, 
                            amount: claimAmount, 
                            claimed_at: new Date().toISOString() 
                        }
                    ]);

                if (historyError) {
                    console.warn('⚠️ Claim history warning:', historyError);
                } else {
                    console.log('✅ Claim history saved!');
                }
            } catch (historyError) {
                console.warn('⚠️ Claim history table might not exist:', historyError);
            }

            // Update UI
            balanceAmount.textContent = newBalance;

            // Reset countdown
            countdownTime = 10 * 60; // 10 minutes for next claim

            loadingIndicator.textContent = '✅ Claim successful! +30 NMX';
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
            }, 2000);

            alert('🎉 SUCCESS! Claimed 30 NMX!\n\nNew balance: ' + newBalance + ' NMX');

        } catch (error) {
            console.error('❌ Claim failed:', error);
            loadingIndicator.textContent = '❌ Claim failed';
            loadingIndicator.style.color = '#ff6b6b';
            alert('Claim failed: ' + error.message);
        } finally {
            claimButton.disabled = countdownTime > 0 || !databaseConnected;
        }
    });

    // Start the countdown timer
    setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    // Test database connection immediately
    testDatabaseConnection();
}