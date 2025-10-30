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

    // Admin Panel Check - Only run on admin page
    if (window.location.pathname.includes('admin.html')) {
        initializeAdminPanel();
    }

    // Check and show admin icon if user is admin
    checkAndShowAdminIcon();
});

// Initialize Supabase
let supabaseClient;
function initializeSupabase() {
    const supabaseUrl = 'https://bjulifvbfogymoduxnzl.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqdWxpZnZiZm9neW1vZHV4bnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTk0NDMsImV4cCI6MjA3NTQ5NTQ0M30.MPxDDybfODRnzvrFNZ0TQKkV983tGUFriHYgIpa_LaU';

    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized in main.js');
}

// ADMIN FUNCTIONALITY
const ADMIN_TOKEN = 'your-admin-secret-token-123'; // Change this to a secure token

// Initialize Admin Panel
async function initializeAdminPanel() {
    console.log('🔄 Initializing Admin Panel...');
    
    try {
        // Check admin access first
        const hasAccess = await checkAdminAccess();
        if (!hasAccess) {
            showAdminError('Admin access required. Redirecting...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            return;
        }

        // Load admin data
        await loadAdminData();
        
        // Set up admin event listeners
        setupAdminEventListeners();

    } catch (error) {
        console.error('Admin panel initialization failed:', error);
        showAdminError('Failed to initialize admin panel');
    }
}

// Check if user has admin access
async function checkAdminAccess() {
    try {
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
            return false;
        }

        // Your admin emails - UPDATE THESE WITH YOUR ACTUAL EMAILS
        const adminEmails = ['your-actual-email@gmail.com', 'admin@nemexcoin.com'];
        
        if (adminEmails.includes(user.email)) {
            console.log('✅ Admin access granted for:', user.email);
            return true;
        } else {
            console.log('❌ Admin access denied for:', user.email);
            return false;
        }
    } catch (error) {
        console.error('Error checking admin access:', error);
        return false;
    }
}

// Load admin data from backend
async function loadAdminData() {
    try {
        showAdminLoading();
        
        // First, try to get data from your backend API
        try {
            const response = await fetch('https://nemex-backend.onrender.com/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${ADMIN_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                processAdminData(data);
                return;
            }
        } catch (apiError) {
            console.log('Backend API not available, using direct database access:', apiError);
        }

        // Fallback: Get data directly from Supabase
        await loadAdminDataFromSupabase();

    } catch (error) {
        console.error('Error loading admin data:', error);
        showAdminError('Failed to load admin data');
    }
}

// Load admin data directly from Supabase
async function loadAdminDataFromSupabase() {
    try {
        // Get all users from profiles table
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select(`
                id,
                email,
                username,
                balance,
                created_at,
                telegram_id,
                referral_slots,
                used_slots,
                total_earned_from_refs
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get referral data to determine who has referrals
        const { data: referrals, error: refError } = await supabaseClient
            .from('referrals')
            .select('referred_user_id');

        if (refError) {
            console.warn('Could not load referrals:', refError);
        }

        const usersWithReferrals = new Set();
        if (referrals) {
            referrals.forEach(ref => {
                usersWithReferrals.add(ref.referred_user_id);
            });
        }

        // Process the data
        const processedUsers = users.map(user => ({
            id: user.id,
            name: user.username || user.email || 'Unknown User',
            email: user.email || 'No email',
            balance: parseFloat(user.balance) || 0,
            joinedDate: user.created_at,
            hasReferral: usersWithReferrals.has(user.id),
            telegramId: user.telegram_id,
            referralSlots: user.referral_slots || 0,
            usedSlots: user.used_slots || 0,
            totalEarnedFromRefs: user.total_earned_from_refs || 0
        }));

        // Calculate statistics
        const stats = {
            totalUsers: processedUsers.length,
            withReferrals: processedUsers.filter(u => u.hasReferral).length,
            withoutReferrals: processedUsers.filter(u => !u.hasReferral).length,
            totalNMX: processedUsers.reduce((sum, user) => sum + user.balance, 0),
            totalReferralEarnings: processedUsers.reduce((sum, user) => sum + (user.totalEarnedFromRefs || 0), 0)
        };

        processAdminData({ users: processedUsers, stats: stats });

    } catch (error) {
        throw new Error('Database error: ' + error.message);
    }
}

// Process and display admin data
function processAdminData(data) {
    // Store data globally for filtering/sorting
    window.adminUsers = data.users;
    window.adminStats = data.stats;

    // Update statistics cards
    updateAdminStatistics(data.stats);
    
    // Render users table
    renderAdminUsersTable();
    
    // Update UI to show connected state
    document.querySelector('.demo-notice').textContent = '✅ CONNECTED - Live Data from Database';
    document.querySelector('.demo-notice').style.background = 'rgba(0, 200, 81, 0.1)';
    document.querySelector('.demo-notice').style.borderColor = 'var(--success)';
    document.querySelector('.demo-notice').style.color = 'var(--success)';
}

// Update admin statistics cards
function updateAdminStatistics(stats) {
    const elements = {
        totalUsers: document.getElementById('totalUsers'),
        usersWithReferrals: document.getElementById('usersWithReferrals'),
        usersWithoutReferrals: document.getElementById('usersWithoutReferrals'),
        totalNMXMined: document.getElementById('totalNMXMined')
    };

    if (elements.totalUsers) elements.totalUsers.textContent = stats.totalUsers.toLocaleString();
    if (elements.usersWithReferrals) elements.usersWithReferrals.textContent = stats.withReferrals.toLocaleString();
    if (elements.usersWithoutReferrals) elements.usersWithoutReferrals.textContent = stats.withoutReferrals.toLocaleString();
    if (elements.totalNMXMined) elements.totalNMXMined.textContent = Math.round(stats.totalNMX).toLocaleString();
}

// Render admin users table
function renderAdminUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    let filteredUsers = [...window.adminUsers];
    const currentTab = window.adminCurrentTab || 'allUsers';
    const currentFilter = window.adminCurrentFilter || '';

    // Apply tab filter
    if (currentTab === 'withReferrals') {
        filteredUsers = filteredUsers.filter(user => user.hasReferral);
    } else if (currentTab === 'withoutReferrals') {
        filteredUsers = filteredUsers.filter(user => !user.hasReferral);
    }

    // Apply search filter
    if (currentFilter) {
        const searchTerm = currentFilter.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.id.toLowerCase().includes(searchTerm)
        );
    }

    // Apply sorting
    applyAdminSorting(filteredUsers);

    // Render table rows
    if (filteredUsers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--muted);">
                    No users found matching your criteria.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <div class="user-avatar">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="user-name">${user.name}</div>
                        <div class="user-email">ID: ${user.id.substring(0, 8)}...</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <div class="balance-amount">${Math.round(user.balance)} NMX</div>
            </td>
            <td>
                <span class="referral-status ${user.hasReferral ? 'status-referred' : 'status-not-referred'}">
                    ${user.hasReferral ? 'Referred' : 'Not Referred'}
                </span>
            </td>
            <td>${new Date(user.joinedDate).toLocaleDateString()}</td>
            <td>
                <button class="admin-btn" onclick="viewAdminUserDetails('${user.id}')" style="padding: 6px 12px; font-size: 12px;">
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

// Apply sorting to admin users
function applyAdminSorting(users) {
    const sortValue = document.getElementById('sortSelect')?.value || 'newest';
    
    switch (sortValue) {
        case 'newest':
            users.sort((a, b) => new Date(b.joinedDate) - new Date(a.joinedDate));
            break;
        case 'oldest':
            users.sort((a, b) => new Date(a.joinedDate) - new Date(b.joinedDate));
            break;
        case 'balance-high':
            users.sort((a, b) => b.balance - a.balance);
            break;
        case 'balance-low':
            users.sort((a, b) => a.balance - b.balance);
            break;
    }
}

// Set up admin event listeners
function setupAdminEventListeners() {
    // Refresh button
    const refreshBtn = document.querySelector('.admin-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAdminData);
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            window.adminCurrentFilter = this.value;
            renderAdminUsersTable();
        });
    }

    // Sort functionality
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', renderAdminUsersTable);
    }

    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active tab
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            window.adminCurrentTab = this.getAttribute('data-tab') || 'allUsers';
            renderAdminUsersTable();
        });
    });
}

// View admin user details
async function viewAdminUserDetails(userId) {
    try {
        const { data: user, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Show user details modal
        alert(`User Details:\n\nID: ${user.id}\nName: ${user.username || 'N/A'}\nEmail: ${user.email || 'N/A'}\nBalance: ${user.balance} NMX\nJoined: ${new Date(user.created_at).toLocaleDateString()}`);

    } catch (error) {
        console.error('Error loading user details:', error);
        alert('Failed to load user details');
    }
}

// Show admin loading state
function showAdminLoading() {
    const tableBody = document.getElementById('usersTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading">
                    <div class="loading-spinner"></div>
                    Loading users data from database...
                </td>
            </tr>
        `;
    }
}

// Show admin error
function showAdminError(message) {
    const tableBody = document.getElementById('usersTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--danger);">
                    ${message}
                </td>
            </tr>
        `;
    }
}

// Check and show admin icon if user is admin
async function checkAndShowAdminIcon() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        // Your admin emails - UPDATE THESE
        const adminEmails = ['your-actual-email@gmail.com', 'admin@nemexcoin.com'];
        
        if (adminEmails.includes(user.email)) {
            const adminIcon = document.getElementById('adminButton');
            if (adminIcon) {
                adminIcon.style.display = 'block';
                adminIcon.addEventListener('click', function() {
                    window.location.href = 'admin.html';
                });
            }
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// EXISTING FUNCTIONS (keep all your existing code below)

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