// Navigation Module - UPDATED VERSION
const Navigation = {
    init() {
        console.log('🚀 Navigation module loading...');
        
        // Get all navigation items
        const navItems = document.querySelectorAll('.nav-item');
        
        if (navItems.length === 0) {
            console.error('❌ No navigation items found');
            return;
        }
        
        console.log(`✅ Found ${navItems.length} navigation items`);
        
        // Remove any existing click events to prevent duplicates
        navItems.forEach(item => {
            item.replaceWith(item.cloneNode(true));
        });
        
        // Re-get the items after clone
        const freshNavItems = document.querySelectorAll('.nav-item');
        
        // Add click event to each nav item
        freshNavItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default behavior
                const targetSection = this.getAttribute('data-section');
                console.log(`📱 Navigation: Switching to ${targetSection}`);
                Navigation.switchSection(targetSection, this);
            });
        });
        
        console.log('✅ Navigation module initialized successfully!');
    },
    
    switchSection(sectionName, clickedElement) {
        try {
            console.log(`🔄 Switching to section: ${sectionName}`);
            
            // Remove active class from all sections
            const allSections = document.querySelectorAll('.section');
            allSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Remove active class from all nav items
            const allNavItems = document.querySelectorAll('.nav-item');
            allNavItems.forEach(nav => {
                nav.classList.remove('active');
            });
            
            // Add active class to target section
            const targetSection = document.getElementById(sectionName);
            if (targetSection) {
                targetSection.classList.add('active');
                clickedElement.classList.add('active');
                console.log(`✅ Successfully switched to ${sectionName} section`);
            } else {
                console.error(`❌ Section "${sectionName}" not found`);
                // Fallback: Show home section
                document.getElementById('home').classList.add('active');
                document.querySelector('[data-section="home"]').classList.add('active');
            }
        } catch (error) {
            console.error('❌ Error switching section:', error);
        }
    }
};

// Make it available globally
window.Navigation = Navigation;