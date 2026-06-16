# Troubleshooting

This guide covers common issues for the EMFN WordPress site and Action Pack plugin.

**If your issue is specific to the Action Pack quiz or results pages**, skip to [Action Pack-Specific Issues](#action-pack-specific-issues).

## General WordPress & Browser Issues

### Browser & Cache Issues

**Symptoms:** Changes not appearing, old data showing, form behaving inconsistently, styles look broken

**Solutions:**
- Hard refresh the page: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache completely
- Test in incognito/private window to rule out cached data
- Try a different browser (Chrome, Firefox, Safari) to isolate browser-specific issues
- Disable browser extensions temporarily (ad blockers, privacy tools can interfere)

### Using Browser Developer Tools

If you're seeing unexpected behavior, the browser console often shows what's wrong:

**How to access:**
1. Press `F12` or right-click on page → "Inspect" or "Inspect Element"
2. Click the **Console** tab

**What to look for:**
- **Red text** = JavaScript errors (problems that need fixing)
- **Yellow/orange text** = Warnings (may or may not be issues)
- **Network tab** shows if files are loading (CSS, JS, CSV files)

**When reporting issues:**
- Take a screenshot of any red errors
- Copy the full error text (right-click error → Copy)
- Note which page URL you're on when the error occurs
- Share your browser name and version

### Form Submission Problems

**Symptoms:** Form doesn't submit, redirects to wrong page, shows error message, submit button doesn't work

**Solutions:**
- Open browser console (F12) and check for JavaScript errors in red
- Verify all required fields are filled (marked with red asterisk)
- Check Network tab for failed API calls (look for red entries or 404/500 status codes)
- Confirm form confirmation/redirect URL is correct in WordPress admin (Forms → Settings → Confirmations)
- Test with browser extensions disabled (especially ad blockers)
- Try submitting with a different email domain (some providers block form submissions)

### WordPress Admin Checks

**Symptoms:** Plugin appears inactive, changes not saving, admin panel not accessible

**Solutions:**
- Verify plugin is activated: WordPress Admin → Plugins → ensure "EMFN Action Pack" shows "Deactivate" link
- Check for plugin update notifications (blue circle badge on Plugins menu)
- Confirm your user role has sufficient permissions (must be Editor or Administrator)
- Look for PHP error messages displayed at top of admin pages
- Check for plugin conflicts by temporarily deactivating other plugins one at a time
- Clear WordPress object cache if using caching plugins (WP Rocket, W3 Total Cache, etc.)

### Data File Verification

**Symptoms:** Risk data missing for specific states, categories not matching expected values, CSV-related errors

**Solutions:**
- Verify CSV files exist in plugin folder: `/wp-content/plugins/emfn-action-pack-plugin/assets/data/`
- Check state abbreviations are uppercase (CA, TX, FL not ca, tx, fl)
- Confirm `_tallCategories.csv` timestamp matches latest export from Google Sheets
- Verify WordPress categories exist and exactly match CSV category names (case-sensitive)
- Check that posts are tagged with the correct categories in WordPress admin

### Environment-Specific Issues

**Symptoms:** Works on staging but not production (or vice versa), behavior differs between environments

**Solutions:**
- Compare plugin versions between staging and production (Plugins page shows version number)
- Verify Google Places API key is configured in both environments
- Check if URLs in form redirect settings match the current environment (staging vs. production domain)
- Confirm all CSV files were deployed to production plugin folder
- Compare WordPress version and PHP version between environments
- Check if caching is configured differently between environments

### When to Escalate to Developer

Contact a developer if you see any of these symptoms:

- **White screen of death** (blank page with no content)
- **PHP errors** appearing on page (text like "Fatal error", "Parse error", "Warning")
- **Database connection errors** ("Error establishing database connection")
- **Server 500 errors** (page shows "500 Internal Server Error")
- **Missing plugin files** after fresh deployment (404 errors for CSS/JS files)
- **API quota exceeded** errors (Google Places API, FCC Area API)
- **CORS errors** in browser console that persist across browsers
- **Plugin conflicts** that can't be resolved by deactivation
- **Permission errors** that persist after checking user role

## Action Pack-Specific Issues

### Plugin not loading

**Symptoms:** No custom styles, JS not executing, form looks like default Gravity Forms with the royal blue progress bar, etc.

**Causes:** Page detection failing

**Solutions:**
- Confirm WordPress not in safe mode or plugin not disabled
- Verify page has `.emfn-forms` class on the form element or `.emfn-action-pack` on results blocks
- Make sure our custom Gravity Forms block is in page content
- Confirm page slug matches `action` (for `/start/action/` pages)
- Clear WordPress object cache if using caching plugins
- Check `is_action_pack_page_request()` returns true via debug mode

### No risk data showing for Before or After `modes`

**Symptoms:** Location autocomplete works but no hazards display in form

**Causes:** Geolocation API failures, CSV access issues

**Solutions:**
- Confirm WordPress not in safe mode or plugin not disabled
- Verify Google Places API key is valid and has Places API (New) enabled
- Check browser console for FCC Area API errors (CORS, 404, invalid lat/lon errors -- all should be logged to dev-tools Console)
- Confirm state CSV files exist in `assets/data/{ST}.csv` (uppercase state abbreviation)
- Verify `countyFIPS` resolved correctly from FCC API response and shows up in recent submissions

### Payload not decoding

**Symptoms:** Results page shows no filtered content, empty category list in debug output

**Causes:** CSV category order mismatch, invalid base36 encoding

**Solutions:**
- Confirm WordPress not in safe mode or plugin not disabled
- Enable debug mode (`&emfnDebug=true`) and ensure PHP debug gating conditions are met
- Verify `_tallCategories.csv` is identical on client and server
- Check payload format starts with `ap2.` prefix
- Confirm category order hasn't changed between encoding and decoding
- Manually test base36 decoding with browser console: `parseInt('7', 36)` should return decimal value

### Categories not filtering content

**Symptoms:** Results page shows all posts or no posts instead of filtered content

**Causes:** Category ID resolution failed, block class missing

**Solutions:**
- Confirm WordPress not in safe mode or plugin not disabled
- Verify Newspack Content Loop block is present in page and has `.emfn-action-pack` class
- Check debug output for resolved category IDs (should be array of integers)
- Confirm WordPress categories exist matching decoded category names (exact match required)
- Verify posts are _assigned_ to the resolved categories
- Inspect `filter_action_pack_newspack_block_data()` execution in debug logs