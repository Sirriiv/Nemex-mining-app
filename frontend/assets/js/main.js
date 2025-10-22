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

    // User session management (for demo - you'll need proper auth)
    let currentUserId = 'demo-user-123'; // Replace with actual user ID from auth

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

    // Load user data from Supabase
    async function loadUserData() {
        try {
            const balance = await getUserBalance(currentUserId);
            if (balanceAmount) {
                balanceAmount.textContent = balance;
            }

            // Load last claim time and set countdown
            // You'll implement this based on your database structure
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Claim Button Functionality
    claimBtn.addEventListener('click', async function() {
        if (canClaim) {
            const claimButton = this;

            try {
                // Show loading
                claimButton.disabled = true;
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'block';
                }

                // Get current balance
                const currentBalance = parseInt(balanceAmount.textContent) || 0;
                const newBalance = currentBalance + 30;

                // Update display immediately
                balanceAmount.textContent = newBalance;

                // Save to Supabase
                const success = await updateUserBalance(currentUserId, newBalance);

                if (success) {
                    // Save claim history
                    await saveClaimHistory(currentUserId, 30);

                    // Reset countdown to 12 hours
                    countdownTime = 12 * 60 * 60;
                    canClaim = false;

                    alert('30 NMX claimed successfully! Next claim available in 12 hours.');
                } else {
                    alert('Error saving to database. Please try again.');
                    // Revert balance display if save failed
                    balanceAmount.textContent = currentBalance;
                }

            } catch (error) {
                console.error('Error claiming NMX:', error);
                alert('Error claiming NMX. Please try again.');
            } finally {
                // Hide loading
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                claimButton.disabled = !canClaim;
            }
        }
    });

    // Start the countdown timer
    setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    // Load user data when page loads
    loadUserData();
}

// Navigation click handlers for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers to navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // For demo purposes - in production this would navigate to the actual page
            const pageName = this.querySelector('.nav-text').textContent;
            if (pageName !== 'MINING') {
                e.preventDefault();
                alert(`This would navigate to ${pageName} page. In a real app, this would load the actual page.`);
            }
        });
    });
});