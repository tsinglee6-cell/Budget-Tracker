# 📱 Budget Tracker - iPhone Installation Guide

## 🚀 COMPLETE DEPLOYMENT GUIDE

### What You'll Need:
- ✅ GitHub account
- ✅ Git installed on computer (optional - can use web upload)
- ✅ iPhone with Safari

---

## METHOD 1: Easy Web Upload (No Git Required)

### Step 1: Create GitHub Repository

1. Go to **https://github.com**
2. Sign in to your account
3. Click green **"New"** button (top left)
4. Repository name: **`budget-tracker`**
5. Make it **Public**
6. ✅ Check **"Add a README file"**
7. Click **"Create repository"**

### Step 2: Upload Files

1. Download all 5 files from this project:
   - `index.html`
   - `budget-tracker.jsx`
   - `pwa-manifest.json`
   - `sw.js`
   - `README.md`

2. In your repository, click **"Add file"** → **"Upload files"**

3. **Drag and drop all 5 files** into the upload area

4. Scroll down, click **"Commit changes"**

### Step 3: Enable GitHub Pages

1. Click **"Settings"** tab (in your repository)
2. Click **"Pages"** in left sidebar
3. Under **"Source"**, select **"Deploy from a branch"**
4. Choose **"main"** branch and **"/ (root)"**
5. Click **"Save"**
6. **Wait 2-3 minutes** for deployment

### Step 4: Get Your App URL

Your app is now at:
```
https://YOUR-USERNAME.github.io/budget-tracker/
```

Replace `YOUR-USERNAME` with your GitHub username.

Example: If your username is `johndoe`, URL is:
```
https://johndoe.github.io/budget-tracker/
```

---

## METHOD 2: Using Git (Advanced)

### Step 1: Install Git

**Mac**: Git is pre-installed
**Windows**: Download from https://git-scm.com/

### Step 2: Create & Clone Repository

```bash
# Create repo on GitHub (as in Method 1)
# Then clone it:

git clone https://github.com/YOUR-USERNAME/budget-tracker.git
cd budget-tracker
```

### Step 3: Add Files

Copy all 5 files into the `budget-tracker` folder:
- `index.html`
- `budget-tracker.jsx`
- `pwa-manifest.json`
- `sw.js`
- `README.md`

### Step 4: Commit and Push

```bash
git add .
git commit -m "Add Budget Tracker app"
git push origin main
```

### Step 5: Enable GitHub Pages

(Same as Method 1, Step 3)

---

## 📱 INSTALL ON iPHONE

### Step 1: Open Safari

1. Open **Safari** on your iPhone (MUST be Safari, not Chrome!)
2. Go to: `https://YOUR-USERNAME.github.io/budget-tracker/`
3. Wait for page to fully load

### Step 2: Add to Home Screen

1. Tap the **Share** button (square with arrow ↑)
2. Scroll down
3. Tap **"Add to Home Screen"**
4. You'll see app icon and name "Budget"
5. Tap **"Add"** (top right)

### Step 3: Open Your App!

1. Find **Budget Tracker** icon on home screen
2. Tap to open
3. App opens full-screen (no Safari bars!)
4. Create your first user profile

---

## 🎯 FIRST TIME SETUP

### 1. Create Your Profile

When you first open the app:

```
1. Tap "Create Profile"
2. Enter your name (e.g., "John")
3. Create a PIN (minimum 4 characters)
4. Select currency (GBP, USD, EUR, etc.)
5. Tap "Create Profile"
```

### 2. Enable 2FA (Optional but Recommended)

```
1. After creating profile, you'll be asked about 2FA
2. Tap "Yes" to enable
3. SAVE the secret key shown (important!)
4. Test with the displayed code
5. Tap "Enable 2FA"
```

### 3. Set Your Monthly Income

```
1. Find the "Income" card
2. Enter your monthly income
3. Amount saves automatically
```

### 4. Set Category Budgets

```
1. Scroll to "Budget by Category"
2. Enter budget for each category:
   - Rent/Mortgage
   - Groceries
   - Transport
   - etc.
3. Values save automatically
```

---

## 📚 HOW TO USE

### Add an Expense

```
1. Tap "Add Expense" button
2. Enter amount
3. Select currency
4. Choose category
5. Add description (optional)
6. Upload receipt photo (optional)
7. Tap "Add Expense"
```

### Split an Expense

```
1. When adding expense, scroll down
2. Check users to split with
3. Amounts auto-calculate equally
4. Override amounts if needed
5. Tap "Add Expense"
```

### Add a Bill Reminder

```
1. Tap bell icon (top right)
2. Tap "Add Reminder"
3. Enter title, date, amount
4. Select category
5. Set recurring if needed
6. Tap "Add Reminder"
```

### Export Your Data

```
1. Tap Settings icon (gear)
2. Select "Export Data"
3. CSV file downloads
4. Open in Excel or Google Sheets
```

### View Security Logs

```
1. Tap Settings icon (gear)
2. Select "View Security Logs"
3. See all login attempts and events
```

### Add Household Member

```
1. Tap "Add User"
2. Enter their name
3. Create their PIN
4. Select their currency
5. They now have separate budget
```

### Switch Between Users

```
1. In "Personal" view, see user badges
2. Tap another user's badge
3. Enter their PIN to switch
```

---

## 🔧 VERIFICATION CHECKLIST

After deploying, verify everything works:

- [ ] App loads at GitHub Pages URL
- [ ] Can create user profile
- [ ] PIN login works
- [ ] Can add expenses
- [ ] Budgets display correctly
- [ ] Can export data
- [ ] App installs on iPhone
- [ ] App opens full-screen
- [ ] Offline mode works (after first load)
- [ ] App icon shows on home screen

---

## 🐛 TROUBLESHOOTING

### App Won't Load

**Problem**: GitHub Pages URL shows 404
**Solution**: 
- Wait 3-5 minutes after enabling Pages
- Check Settings → Pages shows green checkmark
- Make sure all files uploaded correctly

### Can't Add to Home Screen

**Problem**: No "Add to Home Screen" option
**Solution**:
- Must use Safari (not Chrome)
- Make sure on actual iPhone (not iPad)
- Check URL is HTTPS (GitHub Pages always is)

### App Not Working Offline

**Problem**: Requires internet each time
**Solution**:
- Service worker needs first online load
- After first load, should work offline
- Check browser console for errors

### Login Issues

**Problem**: Can't login or forgot PIN
**Solution**:
- Account locked? Wait 15 minutes
- No PIN recovery - you'll need to clear browser data
- Check security logs for failed attempts

### Data Not Saving

**Problem**: Budgets/expenses disappear
**Solution**:
- Don't use Private/Incognito mode
- Check browser storage enabled
- Try exporting data as backup

---

## 📊 FILE STRUCTURE

Your repository should look like this:

```
budget-tracker/
├── index.html              ← Main HTML file
├── budget-tracker.jsx      ← React app code
├── pwa-manifest.json       ← PWA configuration
├── sw.js                   ← Service worker (offline)
└── README.md               ← This file
```

---

## 🔐 SECURITY FEATURES

Your app includes:

✅ **SHA-256 PIN Hashing** - Passwords never stored in plain text
✅ **Two-Factor Authentication** - Optional extra security
✅ **Account Lockout** - 5 failed attempts = 15min lock
✅ **Auto-Logout** - 30 minutes of inactivity
✅ **Audit Logs** - Complete security event tracking
✅ **Input Sanitization** - Protection against attacks
✅ **Session Tokens** - Secure authentication

---

## 💡 PRO TIPS

1. **Enable 2FA** for better security
2. **Export data regularly** as backup
3. **Check security logs** periodically
4. **Set realistic budgets** - adjust monthly
5. **Use split expenses** for shared costs
6. **Add receipts** for important purchases
7. **Set bill reminders** to never miss payments

---

## 🆘 NEED HELP?

### Quick Fixes:

**App too slow?**
- Clear browser cache
- Delete and reinstall app

**Lost data?**
- Data stored locally on device
- No cloud backup (by design for privacy)
- Export regularly to avoid loss

**Want to update app?**
1. Update files in GitHub repository
2. Wait 2-3 minutes
3. Pull down to refresh app on iPhone
4. Or delete and reinstall

### Common Questions:

**Q: Is my data safe?**
A: Yes! All data stored locally on your device. Nothing sent to servers.

**Q: Can I use on multiple devices?**
A: Each device has separate data. Use export/import to sync.

**Q: What if I forget my PIN?**
A: No recovery option. You'll need to clear browser data and start over.

**Q: How do I backup my data?**
A: Use Export Data feature to download CSV. Import to Excel/Sheets.

**Q: Can I customize categories?**
A: Yes! Edit the `budget-tracker.jsx` file (requires coding).

---

## 🎉 YOU'RE ALL SET!

Your Budget Tracker is now:
- ✅ Deployed on GitHub Pages
- ✅ Installed on your iPhone
- ✅ Ready to track your finances
- ✅ Secured with enterprise-grade features

**Start tracking your budget today! 💰📱**

---

## 📞 Support

For issues:
1. Check troubleshooting section
2. Review security logs in app
3. Create issue on GitHub repository

---

**Version**: 1.0.0  
**Platform**: iOS 12+  
**Technology**: React PWA  
**License**: MIT
