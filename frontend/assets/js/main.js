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

    // Test Supabase Connection
    async function testDatabaseConnection() {
        try {
            console.log('🔄 Testing Supabase connection...');
            connectionStatus.textContent = 'Testing database connection...';
            
            // Test basic connection
            const { data, error } = await supabase
                .from('users')
                .select('count')
                .limit(1);

            if (error) {
                throw new Error('Connection failed: ' + error.message);
            }

            console.log('✅ Supabase connection successful!');
            connectionStatus.textContent = '✅ Database connected successfully!';
            connectionStatus.style.color = 'var(--gold)';
            databaseConnected = true;

            // Test if tables exist by trying to read
            const { error: usersError } = await supabase
                .from('users')
                .select('id')
                .limit(1);

            if (usersError && usersError.code === '42P01') {
                console.warn('⚠️ Users table does not exist yet');
                connectionStatus.textContent = '⚠️ Database connected but tables not created';
            } else {
                console.log('✅ Users table exists!');
            }

        } catch (error) {
            console.error('❌ Database connection failed:', error);
            connectionStatus.textContent = '❌ Database connection failed: ' + error.message;
            connectionStatus.style.color = '#ff6b6b';
            databaseConnected = false;
        }
    }

    // Claim Button Functionality - FORCE DATABASE TEST
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
            loadingIndicator.textContent = 'Testing database write...';

            console.log('🔄 Testing database write operation...');

            // Generate unique test user
            const testUserId = 'test-' + Date.now();
            const testBalance = 30;

            // Test INSERT operation
            const { data: insertData, error: insertError } = await supabase
                .from('users')
                .insert([
                    { 
                        id: testUserId, 
                        balance: testBalance,
                        email: 'test@nemexcoin.com',
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (insertError) {
                console.error('❌ Insert failed:', insertError);
                
                // Try UPDATE instead (if user exists)
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ balance: testBalance })
                    .eq('id', testUserId);

                if (updateError) {
                    throw new Error('Both insert and update failed: ' + updateError.message);
                }
                console.log('✅ Update successful (user already exists)');
            } else {
                console.log('✅ Insert successful:', insertData);
            }

            // Test claim history
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
                console.warn('⚠️ Claim history warning:', historyError);
            } else {
                console.log('✅ Claim history saved!');
            }

            // Update UI
            const currentBalance = parseInt(balanceAmount.textContent) || 0;
            const newBalance = currentBalance + 30;
            balanceAmount.textContent = newBalance;

            // Reset countdown
            countdownTime = 10 * 60; // 10 minutes for next test

            loadingIndicator.textContent = '✅ Database test successful!';
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
            }, 2000);

            alert('🎉 SUCCESS! Database is working perfectly!\n\nCheck browser console (F12) for details.');

        } catch (error) {
            console.error('❌ Database test failed:', error);
            loadingIndicator.textContent = '❌ Database test failed';
            loadingIndicator.style.color = '#ff6b6b';
            alert('Database test failed: ' + error.message + '\n\nCheck browser console for details.');
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