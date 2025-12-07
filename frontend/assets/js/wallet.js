// Add this method to MiningWalletManager class
async initializeTONLibraries() {
    console.log('🔧 Initializing TON libraries...');
    
    // Check if libraries are already loaded
    const checkLibs = () => {
        return {
            tonweb: typeof window.TonWeb !== 'undefined',
            mnemonic: typeof window.TonWeb?.Mnemonic !== 'undefined',
            utils: typeof window.TonWeb?.utils !== 'undefined'
        };
    };
    
    let libs = checkLibs();
    console.log('📚 Initial library status:', libs);
    
    if (!libs.tonweb) {
        console.error('❌ TonWeb not found in window!');
        
        // Try to load dynamically
        try {
            console.log('🔄 Attempting to load TonWeb dynamically...');
            
            // Method 1: Create TonWeb if doesn't exist
            if (typeof TonWeb === 'function') {
                window.TonWeb = TonWeb;
                console.log('✅ TonWeb constructor found');
            }
            
            // Check again
            libs = checkLibs();
            
            if (!libs.tonweb) {
                throw new Error('TonWeb still not available');
            }
            
        } catch (error) {
            console.error('❌ Failed