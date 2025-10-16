// Navigation Module
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
        
        // Add click event to each nav item
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                const targetSection = this.getAttribute('data-section');
                console.log(`📱 Navigation: Switching to ${targetSection}`);
                Navigation.switchSection(targetSection, this);
            });
        });
        
        console.log('✅ Navigation module initialized successfully!');
    },
    
    switchSection(sectionName, clickedElement) {
        try {
            // Remove active class from all sections
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            
            // Add active class to target section and clicked nav item
            const targetSection = document.getElementById(sectionName);
            if (targetSection) {
                targetSection.classList.add('active');
                clickedElement.classList.add('active');
                console.log(`✅ Switched to ${sectionName} section`);
            } else {
                console.error(`❌ Section ${sectionName} not found`);
            }
        } catch (error) {
            console.error('❌ Error switching section:', error);
        }
    }
};

// Make it available globally
window.Navigation = Navigation;