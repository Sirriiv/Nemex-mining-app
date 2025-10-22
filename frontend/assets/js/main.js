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

    // Mining Dashboard Specific Functionality
    initializeMiningDashboard();
});

// Mining Dashboard Functions
function initializeMiningDashboard() {
    const claimBtn = document.querySelector('.claim-btn');
    const countdownTimer = document.getElementById('countdownTimer');
    const balanceAmount = document.getElementById('balanceAmount');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Only run if we're on the mining dashboard
    if (!claimBtn || !countdownTimer) return;

    // REMOVED DEMO USER - Database connection test
    let currentUserId = null; // Will be set after authentication

    // Countdown Timer Functionality
    let countdownTime = 12 * 60 * 60; // 12 hours in seconds
    let canClaim = false;

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
            if (countdownTime === 0) {
                canClaim = true;
                claimBtn.disabled = false;
                claimBtn.textContent = 'Claim 30 NMX Now!';
            } else {
                claimBtn.disabled = true;
                claimBtn.textContent = 'Claim 30 NMX Now!';
            }
        }
    }

    // Load user data from Supabase - TEST CONNECTION
    async function loadUserData() {
        try {
            console.log('Testing Supabase connection...');
            
            // Test if we can connect to Supabase
            const { data, error } = await supabase
                .from('users')
                .select('count')
                .limit(1);

            if (error) {
                console.error('❌ Supabase connection failed:', error);
                alert('Database connection failed. Check console for details.');
                return;
            }

            console.log('✅ Supabase connection successful!');
            
            // For now, show 0 balance since no user is logged in
            if (balanceAmount) {
                balanceAmount.textContent = '0';
            }

        } catch (error) {
            console.error('❌ Error testing database connection:', error);
            alert('Database connection error. Please check your Supabase setup.');
        }
    }

    // Claim Button Functionality - MODIFIED FOR TESTING
    claimBtn.addEventListener('click', async function() {
        if (canClaim) {
            const claimButton = this;

            try {
                // Show loading
                claimButton.disabled = true;
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'block';
                }

                // Test database write operation
                console.log('Testing database write operation...');
                
                // Try to create a test user and update balance
                const testUserId = 'test-user-' + Date.now();
                const testBalance = 30;

                // First, try to insert a new user
                const { error: insertError } = await supabase
                    .from('users')
                    .insert([
                        { 
                            id: testUserId, 
                            balance: testBalance,
                            created_at: new Date().toISOString()
                        }
                    ]);

                if (insertError) {
                    console.error('❌ Database write test failed:', insertError);
                    
                    // If insert fails, try update (in case user already exists)
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ balance: testBalance })
                        .eq('id', testUserId);

                    if (updateError) {
                        throw new Error('Both insert and update failed: ' + updateError.message);
                    }
                }

                console.log('✅ Database write test successful!');
                
                // Update display
                const currentBalance = parseInt(balanceAmount.textContent) || 0;
                const newBalance = currentBalance + 30;
                balanceAmount.textContent = newBalance;

                // Save claim history
                const { error: historyError } = await supabase
                    .from('claim_history')
                    .insert([
                        { 
                            user_id: testUserId, 
                            amount: 30, 
                            claimed_at: new Date().toISOString() 
                        }
                    ]);

                if (historyError) {
                    console.warn('Claim history save warning:', historyError);
                } else {
                    console.log('✅ Claim history saved successfully!');
                }

                // Reset countdown to 12 hours
                countdownTime = 12 * 60 * 60;
                canClaim = false;

                alert('✅ Database test successful! 30 NMX claimed. Check browser console for details.');

            } catch (error) {
                console.error('❌ Error during database test:', error);
                alert('Database test failed: ' + error.message + '\n\nCheck browser console for details.');
            } finally {
                // Hide loading
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                claimButton.disabled = !canClaim;
            }
        } else {
            alert('⏰ Countdown timer must reach 00:00:00 before claiming!');
        }
    });

    // Start the countdown timer
    setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    // Load user data and test connection when page loads
    loadUserData();
}