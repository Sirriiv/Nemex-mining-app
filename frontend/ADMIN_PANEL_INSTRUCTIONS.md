# Modern NMX Admin Panel Integration Instructions

## Current Issue
The NMX admin panel in dashboard.html is using an old interface. We need to replace it with the modern design from nmx-admin.html.

## Solution Options

### Option 1: Use the Standalone Admin Panel (RECOMMENDED)
Instead of embedding in dashboard, open the standalone modern admin panel:

1. **Update Settings Link**: In dashboard.html, change the onclick handler:
```html
<!-- Find this line (around line 1252): -->
<div class="settings-item" id="nmxDistributionAdminSettings" style="display: none;" onclick="openNmxAdmin()">

<!-- Replace with: -->
<a href="nmx-admin.html" class="settings-item" id="nmxDistributionAdminSettings" style="display: none;">
```

2. **Or update the header icon** (around line 1166):
```html
<!-- Find: -->
<svg class="transaction-admin-icon" ... id="nmxDistributionAdminButton" style="display: none;" ... onclick="...">

<!-- Add onclick: -->
<svg class="transaction-admin-icon" ... onclick="window.location.href='nmx-admin.html'">
```

### Option 2: Embed the Modern Panel (More Complex)
Replace the entire `loadAdminPanelContent()` function in dashboard.html:

1. Find this function (starts around line 1520)
2. Replace its content with the HTML from `modern-admin-embed.html`
3. Add the CSS styles from modern-admin-embed.html to the `<style>` section
4. Add the JavaScript functions at the end of the script section

## Quick Test

To test the standalone admin panel:
1. Open: `http://your-domain.com/nmx-admin.html`
2. Login as admin
3. You should see the modern 3-tab interface

## Files Modified
- ✅ `/frontend/nmx-admin.html` - Complete modern admin panel (standalone)
- ✅ `/frontend/modern-admin-embed.html` - Embeddable version (reference)
- ⏳ `/frontend/dashboard.html` - Needs link update to use nmx-admin.html

## Next Steps
1. Update dashboard.html to link to nmx-admin.html instead of opening modal
2. Test admin access from dashboard settings
3. Verify conversions table queries work with your Supabase setup
4. Test approve/reject functionality

## Database Connection
The modern panel uses:
```javascript
window.supabase.from('conversions').select('*').eq('status', 'pending')
```

Make sure:
- Supabase client is initialized in nmx-admin.html
- conversions table exists with proper RLS policies
- Admin user has admin_level > 0 in profiles table
