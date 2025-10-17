// Main Application Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('NEMEXCOIN App Initializing...');
    
    // Initialize app after a short delay to show loading screen
    setTimeout(initializeApp, 2000);
});

function initializeApp() {
    console.log('Initializing NEMEXCOIN Dashboard...');
    
    // Hide loading screen and show app
    const loading = document.getElementById('loading');
    const app = document.getElementById('app');
    
    if (loading && app) {
        loading.classList.add('hidden');
        app.classList.remove('hidden');
        
        // Load the home section by default
        loadSection('home');
        
        // Initialize navigation
        initializeNavigation();
        
        // Initialize mining functionality
        initializeMining();
        
        // Initialize settings modal
        initializeSettings();
        
        console.log('NEMEXCOIN Dashboard initialized successfully!');
    } else {
        console.error('Critical elements not found!');
    }
}

// Section Loading Function
function loadSection(sectionName) {
    console.log('Loading section:', sectionName);
    
    const sectionContainer = document.getElementById('section-container');
    if (!sectionContainer) {
        console.error('Section container not found!');
        return;
    }
    
    // Hide all sections first
    const allSections = document.querySelectorAll('.section');
    allSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Update navigation active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        }
    });
    
    // Load section content
    const sectionFile = `../sections/${sectionName}.html`;
    
    fetch(sectionFile)
        .then(response => {
            if (!response.ok) {
                throw new Error('Section not found: ' + sectionName);
            }
            return response.text();
        })
        .then(html => {
            sectionContainer.innerHTML = html;
            
            // Re-initialize section-specific functionality
            initializeSection(sectionName);
            
            console.log('Section loaded:', sectionName);
        })
        .catch(error => {
            console.error('Error loading section:', error);
            sectionContainer.innerHTML = `
                <div class="card">
                    <div class="text-center">
                        <h3 class="text-gold">Section Not Available</h3>
                        <p>Unable to load ${sectionName} section.</p>
                        <button class="btn" onclick="loadSection('home')">Return Home</button>
                    </div>
                </div>
            `;
        });
}

// Initialize section-specific functionality
function initializeSection(sectionName) {
    switch(sectionName) {
        case 'home':
            initializeHomeSection();
            break;
        case 'tasks':
            initializeTasksSection();
            break;
        case 'buy':
            initializeBuySection();
            break;
        case 'referrals':
            initializeReferralsSection();
            break;
        case 'wallet':
            initializeWalletSection();
            break;
    }
}

// Simple initialization functions (will be expanded in modules)
function initializeNavigation() {
    console.log('Navigation initialized');
}

function initializeMining() {
    console.log('Mining functionality initialized');
}

function initializeSettings() {
    console.log('Settings initialized');
}

// Placeholder functions for section initializations
function initializeHomeSection() {
    console.log('Home section initialized');
    // Mining functionality will be handled in core.js
}

function initializeTasksSection() {
    console.log('Tasks section initialized');
}

function initializeBuySection() {
    console.log('Buy section initialized');
}

function initializeReferralsSection() {
    console.log('Referrals section initialized');
}

function initializeWalletSection() {
    console.log('Wallet section initialized');
}

// Settings modal functions
function toggleDarkMode() {
    console.log('Dark mode toggled');
    alert('Dark mode toggle functionality will be implemented soon!');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('User logged out');
        window.location.href = '../public/login.html';
    }
}

function openSettingsSection(section) {
    console.log('Opening settings section:', section);
    alert('Settings section: ' + section);
}