export class Navigation {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.loadNavigation();
        this.setupEventListeners();
    }

    loadNavigation() {
        // Load sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.innerHTML = this.generateSidebar();
        }

        // Load navbar if container exists
        const navbarContainer = document.getElementById('navbar-container');
        if (navbarContainer) {
            navbarContainer.innerHTML = this.generateNavbar();
        }
    }

    generateSidebar() {
        return `
            <div class="logo">
                <h1>NEMEXCOIN</h1>
            </div>
            <ul class="nav-links">
                <li><a href="#" class="active" data-page="dashboard"><i>📊</i> Dashboard</a></li>
                <li><a href="#" data-page="mining"><i>⛏️</i> Mining</a></li>
                <li><a href="#" data-page="wallet"><i>💰</i> Wallet</a></li>
                <li><a href="#" data-page="analytics"><i>📈</i> Analytics</a></li>
                <li><a href="#" data-page="referrals"><i>👥</i> Referrals</a></li>
                <li><a href="#" data-page="settings"><i>⚙️</i> Settings</a></li>
                <li><a href="#" data-page="help"><i>❓</i> Help & Support</a></li>
            </ul>
            <div class="user-profile">
                <div class="user-avatar">ME</div>
                <div class="user-info">
                    <h4>Mining Enthusiast</h4>
                    <p>user@nemexcoin.com</p>
                </div>
            </div>
        `;
    }

    generateNavbar() {
        return `
            <nav class="navbar">
                <div class="nav-brand">
                    <span class="gold-text">NEMEXCOIN</span>
                </div>
                <div class="nav-actions">
                    <button class="nav-btn" id="notifications-btn">
                        <i>🔔</i>
                        <span class="notification-badge">3</span>
                    </button>
                    <button class="nav-btn" id="profile-btn">
                        <i>👤</i>
                    </button>
                </div>
            </nav>
        `;
    }

    setupEventListeners() {
        // Navigation links
        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-links a')) {
                e.preventDefault();
                const link = e.target.closest('a');
                const page = link.dataset.page;
                this.navigateTo(page);
            }
        });

        // Navigation buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('#notifications-btn')) {
                this.showNotifications();
            }
            if (e.target.closest('#profile-btn')) {
                this.showProfileMenu();
            }
        });
    }

    navigateTo(page) {
        // Update active link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Update current page
        this.currentPage = page;
        
        // Dispatch navigation event
        window.dispatchEvent(new CustomEvent('pageChanged', { 
            detail: { page } 
        }));
    }

    showNotifications() {
        // Implementation for notifications modal
        console.log('Show notifications');
    }

    showProfileMenu() {
        // Implementation for profile menu
        console.log('Show profile menu');
    }
}