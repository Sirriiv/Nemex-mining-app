// Navigation Module
class Navigation {
    constructor() {
        this.currentSection = 'home';
        this.init();
    }
    
    init() {
        this.attachNavListeners();
        console.log('Navigation module initialized');
    }
    
    attachNavListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                if (section) {
                    this.navigateTo(section);
                }
            });
        });
        
        // Settings button listener
        const settingsButton = document.getElementById('settingsButton');
        if (settingsButton) {
            settingsButton.addEventListener('click', this.toggleSettingsModal.bind(this));
        }
        
        // Modal overlay listener
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', this.closeSettingsModal.bind(this));
        }
    }
    
    navigateTo(section) {
        console.log('Navigating to:', section);
        this.currentSection = section;
        loadSection(section);
    }
    
    toggleSettingsModal() {
        const modal = document.getElementById('settingsModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            const isHidden = modal.classList.contains('hidden');
            
            if (isHidden) {
                modal.classList.remove('hidden');
                overlay.classList.remove('hidden');
            } else {
                this.closeSettingsModal();
            }
        }
    }
    
    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        const overlay = document.getElementById('modalOverlay');
        
        if (modal && overlay) {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.navigation = new Navigation();
});