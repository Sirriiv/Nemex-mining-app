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
        const adminEmails = ['salimabusalimabubakar@gmail.com', 'admin@nemexcoin.com'];

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
        const adminEmails = ['salimabusalimabubakar@gmail.com', 'admin@nemexcoin.com'];

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

// NEW ENHANCED ADMIN PANEL FUNCTIONS
async function initializeEnhancedAdminPanel() {
    console.log('🔄 Initializing Enhanced Admin Panel...');

    try {
        // Check admin access first
        const hasAccess = await checkAdminAccess();
        if (!hasAccess) {
            showEnhancedAdminError('Admin access required. Redirecting...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);
            return;
        }

        // Load enhanced admin data
        await loadEnhancedAdminData();

        // Set up enhanced admin event listeners
        setupEnhancedAdminEventListeners();

    } catch (error) {
        console.error('Enhanced admin panel initialization failed:', error);
        showEnhancedAdminError('Failed to initialize admin panel');
    }
}

// Load enhanced admin data with all metrics
async function loadEnhancedAdminData() {
    try {
        showEnhancedAdminLoading();

        // Load all required data in parallel
        const [dashboardStats, recentUsers, pendingPayments, purchaseHistory] = await Promise.all([
            fetchDashboardStats(),
            fetchRecentUsers(),
            fetchPendingPayments(),
            fetchPurchaseHistory()
        ]);

        // Update all sections
        updateDashboardStats(dashboardStats);
        updateRecentUsers(recentUsers);
        updatePendingPayments(pendingPayments);
        updatePurchaseHistory(purchaseHistory);

        // Update real-time indicator
        updateRealtimeIndicator(true);

    } catch (error) {
        console.error('Error loading enhanced admin data:', error);
        showEnhancedAdminError('Failed to load admin data');
        updateRealtimeIndicator(false);
    }
}

// Fetch dashboard statistics
async function fetchDashboardStats() {
    try {
        // Get total users
        const { data: users, error: usersError } = await supabaseClient
            .from('profiles')
            .select('id, balance, created_at, last_active')
            .order('created_at', { ascending: false });

        if (usersError) throw usersError;

        // Get referrals data
        const { data: referrals, error: refError } = await supabaseClient
            .from('referrals')
            .select('referred_user_id');

        // Get purchase history for revenue
        const { data: purchases, error: purchasesError } = await supabaseClient
            .from('user_purchase_history')
            .select('amount, status, created_at');

        // Get pending transactions
        const { data: pending, error: pendingError } = await supabaseClient
            .from('pending_transactions')
            .select('id, status')
            .eq('status', 'pending');

        // Calculate stats
        const totalUsers = users?.length || 0;
        const totalReferrals = referrals?.length || 0;
        const totalRevenue = purchases?.filter(p => p.status === 'completed')?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        const totalPurchases = purchases?.filter(p => p.status === 'completed')?.length || 0;
        const activeUsers = users?.filter(u => u.last_active && new Date(u.last_active) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))?.length || 0;
        const pendingPayments = pending?.length || 0;

        return {
            totalUsers,
            totalReferrals,
            totalRevenue,
            totalPurchases,
            activeUsers,
            pendingPayments
        };

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            totalUsers: 0,
            totalReferrals: 0,
            totalRevenue: 0,
            totalPurchases: 0,
            activeUsers: 0,
            pendingPayments: 0
        };
    }
}

// Fetch recent users
async function fetchRecentUsers() {
    try {
        const { data: users, error } = await supabaseClient
            .from('profiles')
            .select('id, username, email, balance, created_at, telegram_id')
            .order('created_at', { ascending: false })
            .limit(8);

        if (error) throw error;

        // Get referral counts for each user
        const usersWithRefs = await Promise.all(users.map(async (user) => {
            const { data: refs, error: refError } = await supabaseClient
                .from('referrals')
                .select('id')
                .eq('referred_user_id', user.id);

            const { data: purchases, error: purchaseError } = await supabaseClient
                .from('user_purchase_history')
                .select('amount')
                .eq('user_id', user.id)
                .eq('status', 'completed');

            return {
                id: user.id,
                name: user.username || user.email || 'Unknown User',
                email: user.email || 'No email',
                referrals: refs?.length || 0,
                totalSpent: purchases?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
                isVip: (user.balance || 0) > 1000,
                status: 'active'
            };
        }));

        return usersWithRefs;

    } catch (error) {
        console.error('Error fetching recent users:', error);
        return [];
    }
}

// Fetch pending payments
async function fetchPendingPayments() {
    try {
        const { data: payments, error } = await supabaseClient
            .from('pending_transactions')
            .select(`
                id,
                amount,
                package_name,
                status,
                created_at,
                payment_method,
                payment_proof,
                user_id,
                profiles:user_id (username, email)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return payments.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            package_name: payment.package_name,
            status: payment.status,
            created_at: payment.created_at,
            payment_method: payment.payment_method,
            payment_proof: payment.payment_proof,
            user_name: payment.profiles?.username || 'Unknown User',
            user_email: payment.profiles?.email || 'No email'
        }));

    } catch (error) {
        console.error('Error fetching pending payments:', error);
        return [];
    }
}

// Fetch purchase history
async function fetchPurchaseHistory() {
    try {
        const { data: purchases, error } = await supabaseClient
            .from('user_purchase_history')
            .select(`
                id,
                package_name,
                amount,
                status,
                created_at,
                user_id,
                profiles:user_id (username, email)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        return purchases.map(purchase => ({
            id: purchase.id,
            package_name: purchase.package_name,
            amount: purchase.amount,
            status: purchase.status,
            created_at: purchase.created_at,
            user_name: purchase.profiles?.username || 'Unknown User',
            user_email: purchase.profiles?.email || 'No email'
        }));

    } catch (error) {
        console.error('Error fetching purchase history:', error);
        return [];
    }
}

// Update dashboard statistics in the UI
function updateDashboardStats(stats) {
    const elements = {
        'totalUsers': stats.totalUsers?.toLocaleString() || '0',
        'totalReferrals': stats.totalReferrals?.toLocaleString() || '0',
        'totalRevenue': '$' + (stats.totalRevenue?.toLocaleString() || '0'),
        'totalPurchases': stats.totalPurchases?.toLocaleString() || '0',
        'activeUsers': stats.activeUsers?.toLocaleString() || '0',
        'pendingPayments': stats.pendingPayments?.toLocaleString() || '0'
    };

    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = elements[id];
    });
}

// Update recent users in the UI
function updateRecentUsers(users) {
    const grid = document.getElementById('recentUsersGrid');
    if (!grid) return;

    if (!users || users.length === 0) {
        grid.innerHTML = `
            <div class="no-data-message">
                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                </svg>
                <h3>No Users Found</h3>
                <p>No recent user registrations to display.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="user-card-header">
                <div class="user-avatar">${user.name?.charAt(0) || 'U'}</div>
                <div class="user-info">
                    <div class="user-name">
                        ${user.name || 'Unknown User'}
                        ${user.isVip ? '<span class="vip-badge">VIP</span>' : ''}
                    </div>
                    <div class="user-email">${user.email || 'No email'}</div>
                </div>
            </div>
            <div class="user-stats">
                <div class="user-stat">
                    <div class="user-stat-value">${user.referrals || 0}</div>
                    <div class="user-stat-label">Referrals</div>
                </div>
                <div class="user-stat">
                    <div class="user-stat-value">$${user.totalSpent || 0}</div>
                    <div class="user-stat-label">Spent</div>
                </div>
            </div>
            <div class="user-card-footer">
                <div class="status-badge status-${user.status || 'active'}">${user.status || 'Active'}</div>
                <div class="action-buttons">
                    <button class="action-btn view-btn" onclick="viewUserDetails('${user.id}')">View</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Update pending payments in the UI
function updatePendingPayments(payments) {
    const tableBody = document.getElementById('pendingPaymentsTable');
    if (!tableBody) return;

    if (!payments || payments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--muted);">
                    No pending payments found.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = payments.map(payment => `
        <tr>
            <td>
                <div class="user-name">${payment.user_name || 'Unknown User'}</div>
                <div class="user-email">${payment.user_email || 'No email'}</div>
            </td>
            <td>$${payment.amount || 0}</td>
            <td>${payment.package_name || 'Standard Package'}</td>
            <td>${new Date(payment.created_at).toLocaleDateString()}</td>
            <td><span class="status-badge status-pending">Pending</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn approve-btn" onclick="approvePayment('${payment.id}')">Approve</button>
                    <button class="action-btn reject-btn" onclick="rejectPayment('${payment.id}')">Reject</button>
                    <button class="action-btn view-btn" onclick="viewPaymentDetails('${payment.id}')">View</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update purchase history in the UI
function updatePurchaseHistory(purchases) {
    const tableBody = document.getElementById('purchaseHistoryTable');
    if (!tableBody) return;

    if (!purchases || purchases.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--muted);">
                    No purchase history found.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = purchases.map(purchase => `
        <tr>
            <td>${purchase.user_name || 'Unknown User'}</td>
            <td>${purchase.package_name || 'Standard Package'}</td>
            <td>$${purchase.amount || 0}</td>
            <td>${new Date(purchase.created_at).toLocaleDateString()}</td>
            <td><span class="status-badge status-${purchase.status || 'completed'}">${purchase.status || 'Completed'}</span></td>
        </tr>
    `).join('');
}

// Update real-time indicator
function updateRealtimeIndicator(connected) {
    const indicator = document.getElementById('realtimeIndicator');
    if (!indicator) return;

    if (connected) {
        indicator.className = 'realtime-indicator connected';
        indicator.innerHTML = '<div class="realtime-dot"></div><span>CONNECTED</span>';
    } else {
        indicator.className = 'realtime-indicator error';
        indicator.innerHTML = '<div class="realtime-dot"></div><span>CONNECTION ERROR</span>';
    }
}

// Show enhanced admin loading state
function showEnhancedAdminLoading() {
    const elements = ['recentUsersGrid', 'pendingPaymentsTable', 'purchaseHistoryTable'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading data...</p>
                </div>
            `;
        }
    });
}

// Show enhanced admin error
function showEnhancedAdminError(message) {
    const elements = ['recentUsersGrid', 'pendingPaymentsTable', 'purchaseHistoryTable'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = `
                <div class="no-data-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    });
}

// Set up enhanced admin event listeners
function setupEnhancedAdminEventListeners() {
    // Refresh button
    const refreshBtn = document.querySelector('.admin-btn[onclick="refreshData()"]');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadEnhancedAdminData);
    }

    // Maintenance mode toggle
    const maintenanceBtn = document.getElementById('maintenanceToggle');
    if (maintenanceBtn) {
        maintenanceBtn.addEventListener('click', toggleMaintenanceMode);
    }

    // Export button
    const exportBtn = document.querySelector('.admin-btn[onclick="exportData()"]');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAdminData);
    }
}

// Maintenance mode toggle
async function toggleMaintenanceMode() {
    try {
        const btn = document.getElementById('maintenanceToggle');
        const text = document.getElementById('maintenanceText');
        const maintenanceMode = btn.classList.contains('active');

        if (!maintenanceMode) {
            // Enable maintenance
            btn.classList.add('active');
            text.textContent = 'Disable Maintenance';
            // Here you would typically update a setting in your database
            console.log('Maintenance mode enabled');
        } else {
            // Disable maintenance
            btn.classList.remove('active');
            text.textContent = 'Enable Maintenance';
            console.log('Maintenance mode disabled');
        }
    } catch (error) {
        console.error('Error toggling maintenance mode:', error);
    }
}

// Export admin data
async function exportAdminData() {
    try {
        // Get all data for export
        const [users, payments, purchases] = await Promise.all([
            supabaseClient.from('profiles').select('*'),
            supabaseClient.from('pending_transactions').select('*'),
            supabaseClient.from('user_purchase_history').select('*')
        ]);

        const exportData = {
            users: users.data || [],
            payments: payments.data || [],
            purchases: purchases.data || [],
            exported_at: new Date().toISOString()
        };

        // Create and download CSV file
        const csv = convertToCSV(exportData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `nemexcoin-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

        alert('Data exported successfully!');

    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data: ' + error.message);
    }
}

// Convert data to CSV
function convertToCSV(data) {
    let csv = 'NemexCoin Data Export\n\n';
    
    // Users section
    csv += 'USERS\n';
    if (data.users.length > 0) {
        const headers = Object.keys(data.users[0]).join(',');
        csv += headers + '\n';
        data.users.forEach(user => {
            const row = Object.values(user).map(value => 
                typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            ).join(',');
            csv += row + '\n';
        });
    }
    
    csv += '\nPENDING PAYMENTS\n';
    if (data.payments.length > 0) {
        const headers = Object.keys(data.payments[0]).join(',');
        csv += headers + '\n';
        data.payments.forEach(payment => {
            const row = Object.values(payment).map(value => 
                typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            ).join(',');
            csv += row + '\n';
        });
    }
    
    csv += '\nPURCHASE HISTORY\n';
    if (data.purchases.length > 0) {
        const headers = Object.keys(data.purchases[0]).join(',');
        csv += headers + '\n';
        data.purchases.forEach(purchase => {
            const row = Object.values(purchase).map(value => 
                typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            ).join(',');
            csv += row + '\n';
        });
    }
    
    return csv;
}

// Payment approval function
async function approvePayment(paymentId) {
    try {
        const { data: payment, error: paymentError } = await supabaseClient
            .from('pending_transactions')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (paymentError) throw paymentError;

        // Update payment status
        const { error: updateError } = await supabaseClient
            .from('pending_transactions')
            .update({ 
                status: 'approved',
                processed_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        if (updateError) throw updateError;

        // Update user balance
        const { error: balanceError } = await supabaseClient
            .from('profiles')
            .update({ 
                balance: supabaseClient.sql`balance + ${payment.amount}`
            })
            .eq('id', payment.user_id);

        if (balanceError) throw balanceError;

        // Record in purchase history
        const { error: historyError } = await supabaseClient
            .from('user_purchase_history')
            .insert({
                user_id: payment.user_id,
                package_name: payment.package_name,
                amount: payment.amount,
                status: 'completed',
                transaction_id: paymentId,
                created_at: new Date().toISOString()
            });

        if (historyError) throw historyError;

        alert('Payment approved successfully!');
        loadEnhancedAdminData(); // Refresh data

    } catch (error) {
        console.error('Error approving payment:', error);
        alert('Error approving payment: ' + error.message);
    }
}

// Payment rejection function
async function rejectPayment(paymentId) {
    try {
        const { error } = await supabaseClient
            .from('pending_transactions')
            .update({ 
                status: 'rejected',
                processed_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        if (error) throw error;

        alert('Payment rejected successfully!');
        loadEnhancedAdminData(); // Refresh data

    } catch (error) {
        console.error('Error rejecting payment:', error);
        alert('Error rejecting payment: ' + error.message);
    }
}

// View user details
async function viewUserDetails(userId) {
    try {
        const { data: user, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Show user details in a modal or alert
        alert(`User Details:\n\nID: ${user.id}\nName: ${user.username || 'N/A'}\nEmail: ${user.email || 'N/A'}\nBalance: ${user.balance} NMX\nJoined: ${new Date(user.created_at).toLocaleDateString()}`);

    } catch (error) {
        console.error('Error loading user details:', error);
        alert('Failed to load user details');
    }
}

// View payment details
async function viewPaymentDetails(paymentId) {
    try {
        const { data: payment, error } = await supabaseClient
            .from('pending_transactions')
            .select(`
                *,
                profiles:user_id (username, email)
            `)
            .eq('id', paymentId)
            .single();

        if (error) throw error;

        // Show payment details
        alert(`Payment Details:\n\nID: ${payment.id}\nUser: ${payment.profiles?.username || 'N/A'}\nAmount: $${payment.amount}\nPackage: ${payment.package_name}\nStatus: ${payment.status}\nCreated: ${new Date(payment.created_at).toLocaleDateString()}`);

    } catch (error) {
        console.error('Error loading payment details:', error);
        alert('Failed to load payment details');
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