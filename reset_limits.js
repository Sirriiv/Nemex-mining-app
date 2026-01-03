/**
 * Script to reset package purchase limits
 * Run this in browser console on any page that has supabaseClient initialized
 * OR run directly in Supabase SQL Editor
 */

// Browser Console Version (run on your app page)
async function resetPackageLimits() {
    console.log('🔄 Resetting package purchase limits...');
    
    const limitMap = {
        10000: 10,     // 10,000 NMXp: 10 purchases per user
        25000: 8,      // 25,000 NMXp: 8 purchases per user
        50000: 7,      // 50,000 NMXp: 7 purchases per user
        100000: 5,     // 100,000 NMXp: 5 purchases per user
        250000: 4,     // 250,000 NMXp: 4 purchases per user
        500000: 3,     // 500,000 NMXp: 3 purchases per user
        1000000: 2     // 1,000,000 NMXp: 2 purchases per user
    };

    try {
        // Get all active packages
        const { data: packages, error: fetchError } = await supabaseClient
            .from('package_types')
            .select('*')
            .eq('is_active', true);

        if (fetchError) {
            console.error('❌ Error fetching packages:', fetchError);
            return;
        }

        console.log('📦 Found packages:', packages);

        // Update each package
        for (const pkg of packages) {
            const newLimit = limitMap[pkg.package_amount] || pkg.purchase_limit;
            
            const { error: updateError } = await supabaseClient
                .from('package_types')
                .update({ purchase_limit: newLimit })
                .eq('id', pkg.id);

            if (updateError) {
                console.error(`❌ Error updating ${pkg.package_name}:`, updateError);
            } else {
                console.log(`✅ Updated ${pkg.package_name}: purchase_limit = ${newLimit}`);
            }
        }

        console.log('🎉 All package limits reset successfully!');
        
        // Refresh the page to see changes
        console.log('🔄 Refreshing page in 2 seconds...');
        setTimeout(() => location.reload(), 2000);

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Optional: Clear test purchase records for specific user
async function clearUserTestPurchases(userId) {
    console.log(`🗑️ Clearing test purchases for user: ${userId}`);
    
    const { error } = await supabaseClient
        .from('pending_transactions')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'pending'); // Only delete pending transactions

    if (error) {
        console.error('❌ Error clearing purchases:', error);
    } else {
        console.log('✅ Test purchases cleared!');
    }
}

console.log('=== Package Limit Reset Script ===');
console.log('To reset package limits, run: resetPackageLimits()');
console.log('To clear test purchases, run: clearUserTestPurchases("your-user-id")');
console.log('To get your user ID, run: currentUser.id');
