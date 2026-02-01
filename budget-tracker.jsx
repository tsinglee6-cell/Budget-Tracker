import React, { useState, useEffect } from 'react';
import { PlusCircle, User, Users, Camera, X, ChevronDown, DollarSign, TrendingUp, Wallet, Receipt, ArrowLeftRight, Settings, Trash2, Eye, Home, Shield, FileText, Download } from 'lucide-react';

// Currency configurations
const CURRENCIES = {
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro' },
  HKD: { symbol: 'HK$', code: 'HKD', name: 'Hong Kong Dollar' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen' }
};

// Default exchange rates (relative to GBP)
const DEFAULT_EXCHANGE_RATES = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.16,
  HKD: 9.87,
  AUD: 1.93,
  JPY: 193.5
};

const CATEGORIES = [
  'Rent/Mortgage',
  'Debt Payments',
  'Investments',
  'Pension',
  'Savings Goals',
  'Insurance',
  'Utilities',
  'Home Maintenance',
  'Insurance & Healthcare',
  'Transport',
  'Groceries',
  'Dining Out & Entertainment',
  'Subscriptions',
  'Other Discretionary'
];

// Category groups for better organization
const CATEGORY_GROUPS = {
  'Essential Fixed': ['Rent/Mortgage', 'Debt Payments', 'Insurance', 'Utilities'],
  'Savings & Investments': ['Investments', 'Pension', 'Savings Goals'],
  'Variable Essential': ['Home Maintenance', 'Insurance & Healthcare', 'Transport', 'Groceries'],
  'Discretionary': ['Dining Out & Entertainment', 'Subscriptions', 'Other Discretionary']
};

const BudgetTracker = () => {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'household'
  const [dashboardView, setDashboardView] = useState('monthly'); // 'monthly' or 'yearly'
  const [viewCurrency, setViewCurrency] = useState('GBP');
  const [exchangeRates, setExchangeRates] = useState(DEFAULT_EXCHANGE_RATES);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Security features
  const [failedAttempts, setFailedAttempts] = useState({});
  const [lockedAccounts, setLockedAccounts] = useState({});
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FAVerify, setShow2FAVerify] = useState(false);
  const [pending2FAUserId, setPending2FAUserId] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [securityLogs, setSecurityLogs] = useState([]);
  const [showSecurityLogs, setShowSecurityLogs] = useState(false);
  
  // New user form
  const [newUserName, setNewUserName] = useState('');
  const [newUserCurrency, setNewUserCurrency] = useState('GBP');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUser2FASecret, setNewUser2FASecret] = useState('');
  
  // Current month selection
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  
  // New expense form
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Groceries',
    currency: 'GBP',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receipt: null,
    splitBetween: [] // Array of {userId, amount} for split expenses
  });

  // New reminder form
  const [newReminder, setNewReminder] = useState({
    title: '',
    date: '',
    amount: '',
    category: 'Bills',
    recurring: false,
    frequency: 'monthly' // 'monthly', 'weekly', 'yearly'
  });

  // Load data from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const usersData = await window.storage.get('budget-users');
        const ratesData = await window.storage.get('exchange-rates');
        const remindersData = await window.storage.get('budget-reminders');
        const tokenData = await window.storage.get('auth-token');
        
        if (usersData) {
          const parsedUsers = JSON.parse(usersData.value);
          setUsers(parsedUsers);
          
          // Try to restore session from stored token
          if (tokenData && parsedUsers.length > 0) {
            const token = tokenData.value;
            const [userId] = token.split('.');
            const isValid = await verifyAuthToken(token, parsedUsers);
            
            if (isValid) {
              const user = parsedUsers.find(u => u.id === userId);
              if (user) {
                setCurrentUserId(userId);
                setViewCurrency(user.currency);
                setAuthToken(token);
                setIsLoggedIn(true);
              }
            } else {
              // Token expired or invalid, clear it
              await window.storage.delete('auth-token');
            }
          }
        }
        
        if (ratesData) {
          setExchangeRates(JSON.parse(ratesData.value));
        }

        if (remindersData) {
          setReminders(JSON.parse(remindersData.value));
        }
      } catch (error) {
        console.log('No existing data found, starting fresh');
      }
    };
    loadData();
  }, []);

  // Save data to storage
  const saveData = async (updatedUsers) => {
    try {
      await window.storage.set('budget-users', JSON.stringify(updatedUsers));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const saveExchangeRates = async (rates) => {
    try {
      await window.storage.set('exchange-rates', JSON.stringify(rates));
    } catch (error) {
      console.error('Failed to save exchange rates:', error);
    }
  };

  const saveReminders = async (updatedReminders) => {
    try {
      await window.storage.set('budget-reminders', JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Failed to save reminders:', error);
    }
  };

  // Currency conversion
  const convertAmount = (amount, fromCurrency, toCurrency) => {
    const amountInUSD = amount / exchangeRates[fromCurrency];
    return amountInUSD * exchangeRates[toCurrency];
  };

  const formatCurrency = (amount, currency) => {
    return `${CURRENCIES[currency].symbol}${amount.toFixed(2)}`;
  };

  // Simple hash function for PIN (in production, use bcrypt or similar on server)
  const hashPin = async (pin) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Enhanced encryption for sensitive data
  const encryptData = async (data, key) => {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(JSON.stringify(data));
      const keyBuffer = encoder.encode(key);
      
      // Generate encryption key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', keyBuffer),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        cryptoKey,
        dataBuffer
      );
      
      return {
        encrypted: Array.from(new Uint8Array(encryptedBuffer)),
        iv: Array.from(iv)
      };
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  };

  // Decrypt sensitive data
  const decryptData = async (encryptedData, key) => {
    try {
      const encoder = new TextEncoder();
      const keyBuffer = encoder.encode(key);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', keyBuffer),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
        cryptoKey,
        new Uint8Array(encryptedData.encrypted)
      );
      
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedBuffer));
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  };

  // Generate 2FA secret
  const generate2FASecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  // Generate 2FA code (TOTP-like)
  const generate2FACode = (secret) => {
    const timeStep = Math.floor(Date.now() / 30000);
    const combined = secret + timeStep;
    const hash = hashPin(combined);
    return hash.substring(0, 6).toUpperCase();
  };

  // Verify 2FA code
  const verify2FACode = async (secret, code) => {
    const currentCode = await generate2FACode(secret);
    const previousCode = await generate2FACode(secret.substring(1) + secret.charAt(0)); // Previous time window
    return code.toUpperCase() === currentCode || code.toUpperCase() === previousCode;
  };

  // Security audit logging
  const logSecurityEvent = async (eventType, userId, details) => {
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      eventType,
      userId,
      details,
      ipAddress: 'client', // In production, get from server
      userAgent: navigator.userAgent
    };
    
    const updatedLogs = [...securityLogs, logEntry];
    setSecurityLogs(updatedLogs);
    
    // Keep only last 1000 logs
    if (updatedLogs.length > 1000) {
      updatedLogs.shift();
    }
    
    try {
      await window.storage.set('security-logs', JSON.stringify(updatedLogs.slice(-100)));
    } catch (error) {
      console.error('Failed to save security logs:', error);
    }
  };

  // Check if account is locked
  const isAccountLocked = (userId) => {
    const lockInfo = lockedAccounts[userId];
    if (!lockInfo) return false;
    
    const lockDuration = 15 * 60 * 1000; // 15 minutes
    const isStillLocked = Date.now() - lockInfo.lockedAt < lockDuration;
    
    if (!isStillLocked) {
      // Unlock account
      const newLocked = { ...lockedAccounts };
      delete newLocked[userId];
      setLockedAccounts(newLocked);
      setFailedAttempts({ ...failedAttempts, [userId]: 0 });
      return false;
    }
    
    return true;
  };

  // Handle failed login attempt
  const handleFailedAttempt = async (userId) => {
    const attempts = (failedAttempts[userId] || 0) + 1;
    setFailedAttempts({ ...failedAttempts, [userId]: attempts });
    
    await logSecurityEvent('FAILED_LOGIN', userId, { attempts });
    
    if (attempts >= 5) {
      setLockedAccounts({ ...lockedAccounts, [userId]: { lockedAt: Date.now() } });
      await logSecurityEvent('ACCOUNT_LOCKED', userId, { reason: 'Too many failed attempts' });
      alert('Account locked for 15 minutes due to too many failed login attempts.');
    }
  };

  // Session timeout management
  const resetSessionTimeout = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    // Auto-logout after 30 minutes of inactivity
    const timeout = setTimeout(() => {
      handleLogout();
      alert('Session expired due to inactivity. Please login again.');
    }, 30 * 60 * 1000); // 30 minutes
    
    setSessionTimeout(timeout);
  };

  // Detect activity and reset timeout
  useEffect(() => {
    if (isLoggedIn) {
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      const resetTimeout = () => resetSessionTimeout();
      
      activityEvents.forEach(event => {
        document.addEventListener(event, resetTimeout);
      });
      
      resetSessionTimeout();
      
      return () => {
        activityEvents.forEach(event => {
          document.removeEventListener(event, resetTimeout);
        });
        if (sessionTimeout) {
          clearTimeout(sessionTimeout);
        }
      };
    }
  }, [isLoggedIn]);

  // Data sanitization
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    // Remove potential XSS vectors
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  };

  // Add new user with hashed PIN and optional 2FA
  const addUser = async () => {
    const sanitizedName = sanitizeInput(newUserName);
    
    if (!sanitizedName.trim() || !newUserPin.trim()) return;
    
    if (newUserPin.length < 4) {
      alert("PIN must be at least 4 characters long");
      return;
    }
    
    // Hash the PIN before storing
    const hashedPin = await hashPin(newUserPin);
    
    const user = {
      id: Date.now().toString(),
      name: sanitizedName,
      pinHash: hashedPin,
      currency: newUserCurrency,
      monthlyIncome: {},
      monthlyBudgets: {},
      expenses: [],
      twoFactorEnabled: false,
      twoFactorSecret: null,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };
    
    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    await saveData(updatedUsers);
    
    await logSecurityEvent('USER_CREATED', user.id, { name: sanitizedName });
    
    if (users.length === 0) {
      // Auto-login for first user
      const token = await generateAuthToken(user.id, hashedPin);
      setCurrentUserId(user.id);
      setViewCurrency(user.currency);
      setAuthToken(token);
      setIsLoggedIn(true);
      await logSecurityEvent('LOGIN_SUCCESS', user.id, { method: 'auto' });
    }
    
    setNewUserName('');
    setNewUserPin('');
    setShowAddUser(false);
    
    // Optionally prompt for 2FA setup
    if (confirm('Would you like to enable Two-Factor Authentication for extra security?')) {
      setPending2FAUserId(user.id);
      setShow2FASetup(true);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (users.length === 1) {
      alert("Cannot delete the last user. You must have at least one user.");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this user? All their data will be lost.")) {
      return;
    }
    
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    await saveData(updatedUsers);
    
    // If deleting current user, log out and switch to first available user
    if (currentUserId === userId) {
      setIsLoggedIn(false);
      setCurrentUserId(null);
      setAuthToken(null);
    }
  };

  // Generate authentication token
  const generateAuthToken = async (userId, pinHash) => {
    const timestamp = Date.now();
    const tokenData = `${userId}:${pinHash}:${timestamp}`;
    const tokenHash = await hashPin(tokenData);
    return `${userId}.${tokenHash}.${timestamp}`;
  };

  // Verify authentication token
  const verifyAuthToken = async (token, usersList = null) => {
    if (!token) return false;
    
    try {
      const [userId, tokenHash, timestamp] = token.split('.');
      const usersToCheck = usersList || users;
      const user = usersToCheck.find(u => u.id === userId);
      
      if (!user) return false;
      
      // Check if token is expired (24 hours)
      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (tokenAge > maxAge) {
        return false;
      }
      
      // Verify token hash
      const expectedTokenData = `${userId}:${user.pinHash}:${timestamp}`;
      const expectedHash = await hashPin(expectedTokenData);
      
      return tokenHash === expectedHash;
    } catch (error) {
      return false;
    }
  };

  // Login function with PIN hashing, 2FA, and rate limiting
  const handleLogin = async (userId, pin) => {
    // Check if account is locked
    if (isAccountLocked(userId)) {
      const lockInfo = lockedAccounts[userId];
      const remainingTime = Math.ceil((15 * 60 * 1000 - (Date.now() - lockInfo.lockedAt)) / 60000);
      alert(`Account is locked. Please try again in ${remainingTime} minutes.`);
      return false;
    }
    
    setIsAuthenticating(true);
    
    try {
      const user = users.find(u => u.id === userId);
      if (!user) {
        await logSecurityEvent('LOGIN_FAILED', userId, { reason: 'User not found' });
        setIsAuthenticating(false);
        return false;
      }
      
      // Hash the entered PIN and compare with stored hash
      const enteredPinHash = await hashPin(pin);
      
      if (enteredPinHash !== user.pinHash) {
        await handleFailedAttempt(userId);
        await logSecurityEvent('LOGIN_FAILED', userId, { reason: 'Invalid PIN' });
        setIsAuthenticating(false);
        return false;
      }
      
      // Reset failed attempts on successful PIN
      setFailedAttempts({ ...failedAttempts, [userId]: 0 });
      
      // Check if 2FA is enabled
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        setPending2FAUserId(userId);
        setShow2FAVerify(true);
        setIsAuthenticating(false);
        return 'PENDING_2FA';
      }
      
      // Complete login
      await completeLogin(user, enteredPinHash);
      return true;
      
    } catch (error) {
      console.error('Login error:', error);
      await logSecurityEvent('LOGIN_ERROR', userId, { error: error.message });
      setIsAuthenticating(false);
      return false;
    }
  };

  // Complete login after 2FA verification
  const completeLogin = async (user, pinHash) => {
    const token = await generateAuthToken(user.id, pinHash);
    setCurrentUserId(user.id);
    setViewCurrency(user.currency);
    setAuthToken(token);
    setIsLoggedIn(true);
    
    // Update last login
    const updatedUsers = users.map(u => 
      u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
    );
    setUsers(updatedUsers);
    await saveData(updatedUsers);
    
    // Store token in sessionStorage for persistence
    try {
      await window.storage.set('auth-token', token);
    } catch (error) {
      console.log('Session storage not available');
    }
    
    await logSecurityEvent('LOGIN_SUCCESS', user.id, { twoFactor: user.twoFactorEnabled });
    
    setIsAuthenticating(false);
  };

  // Verify 2FA and complete login
  const handle2FAVerification = async () => {
    const user = users.find(u => u.id === pending2FAUserId);
    if (!user) return;
    
    const isValid = await verify2FACode(user.twoFactorSecret, twoFactorCode);
    
    if (isValid) {
      setShow2FAVerify(false);
      setTwoFactorCode('');
      await completeLogin(user, user.pinHash);
    } else {
      await handleFailedAttempt(user.id);
      await logSecurityEvent('2FA_FAILED', user.id, {});
      alert('Invalid 2FA code. Please try again.');
      setTwoFactorCode('');
    }
  };

  // Logout function
  const handleLogout = async () => {
    await logSecurityEvent('LOGOUT', currentUserId, {});
    
    setIsLoggedIn(false);
    setCurrentUserId(null);
    setAuthToken(null);
    setViewMode('individual');
    
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    // Clear stored token
    try {
      await window.storage.delete('auth-token');
    } catch (error) {
      console.log('Session storage not available');
    }
  };

  // Switch user (requires re-login)
  const switchUser = (userId) => {
    setIsLoggedIn(false);
    setCurrentUserId(userId);
    setAuthToken(null);
  };

  // Export data to Excel/CSV
  const exportToExcel = async () => {
    setIsExporting(true);
    
    try {
      // Create CSV content for expenses
      let csvContent = "Budget Tracker Export\n";
      csvContent += `Export Date: ${new Date().toLocaleDateString()}\n`;
      csvContent += `Currency: ${viewCurrency}\n\n`;

      // Individual user expenses
      users.forEach(user => {
        csvContent += `\n${user.name} - Expenses (${CURRENCIES[user.currency].code})\n`;
        csvContent += "Date,Category,Amount,Currency,Description,Converted Amount\n";
        
        user.expenses.forEach(exp => {
          const convertedAmount = convertAmount(exp.amount, exp.currency, viewCurrency);
          csvContent += `${exp.date},${exp.category},${exp.amount},${exp.currency},"${exp.description || ''}",${convertedAmount.toFixed(2)}\n`;
        });

        csvContent += "\nMonthly Income\n";
        csvContent += "Month,Amount,Currency\n";
        Object.entries(user.monthlyIncome || {}).forEach(([month, amount]) => {
          csvContent += `${month},${amount},${user.currency}\n`;
        });

        csvContent += "\nMonthly Budgets\n";
        Object.entries(user.monthlyBudgets || {}).forEach(([month, budgets]) => {
          csvContent += `\n${month}\n`;
          csvContent += "Category,Budget\n";
          Object.entries(budgets).forEach(([category, amount]) => {
            csvContent += `${category},${amount}\n`;
          });
        });
      });

      // Household summary
      csvContent += "\n\nHousehold Summary\n";
      csvContent += `Month,Total Income,Total Spending,Savings\n`;
      
      // Get all months that have data
      const allMonths = new Set();
      users.forEach(user => {
        Object.keys(user.monthlyIncome || {}).forEach(month => allMonths.add(month));
        user.expenses.forEach(exp => {
          const month = exp.date.substring(0, 7);
          allMonths.add(month);
        });
      });

      Array.from(allMonths).sort().forEach(month => {
        const income = getHouseholdIncome(month);
        const spending = getHouseholdSpending(month);
        const savings = income - spending;
        csvContent += `${month},${income.toFixed(2)},${spending.toFixed(2)},${savings.toFixed(2)}\n`;
      });

      // Reminders
      if (reminders.length > 0) {
        csvContent += "\n\nBill Reminders\n";
        csvContent += "Title,Date,Amount,Category,Recurring,Frequency\n";
        reminders.forEach(reminder => {
          csvContent += `"${reminder.title}",${reminder.date},${reminder.amount || ''},${reminder.category},${reminder.recurring ? 'Yes' : 'No'},${reminder.frequency || ''}\n`;
        });
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `budget-tracker-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsExporting(false);
      alert('Export successful! Your data has been downloaded as a CSV file.');
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      alert('Failed to export data. Please try again.');
    }
  };

  // Add expense
  const addExpense = async () => {
    if (!newExpense.amount || !currentUserId) return;
    
    const totalAmount = parseFloat(newExpense.amount);
    
    // Check if expense is split
    const isSplit = newExpense.splitBetween && newExpense.splitBetween.length > 0;
    
    if (isSplit) {
      // Add expense to each user based on their split
      const updatedUsers = users.map(user => {
        const userSplit = newExpense.splitBetween.find(s => s.userId === user.id);
        if (userSplit && userSplit.amount > 0) {
          const expense = {
            id: `${Date.now()}-${user.id}`,
            amount: parseFloat(userSplit.amount),
            category: newExpense.category,
            currency: newExpense.currency,
            date: newExpense.date,
            description: newExpense.description + ' (Split)',
            receipt: newExpense.receipt,
            isSplit: true
          };
          return { ...user, expenses: [...user.expenses, expense] };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      await saveData(updatedUsers);
    } else {
      // Regular expense for current user only
      const expense = {
        id: Date.now().toString(),
        amount: totalAmount,
        category: newExpense.category,
        currency: newExpense.currency,
        date: newExpense.date,
        description: newExpense.description,
        receipt: newExpense.receipt,
        isSplit: false
      };
      
      const updatedUsers = users.map(user => {
        if (user.id === currentUserId) {
          return { ...user, expenses: [...user.expenses, expense] };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      await saveData(updatedUsers);
    }
    
    setNewExpense({
      amount: '',
      category: 'Groceries',
      currency: getCurrentUser()?.currency || 'GBP',
      date: new Date().toISOString().split('T')[0],
      description: '',
      receipt: null,
      splitBetween: []
    });
    setShowAddExpense(false);
  };

  // Delete expense
  const deleteExpense = async (expenseId) => {
    const updatedUsers = users.map(user => {
      if (user.id === currentUserId) {
        return { ...user, expenses: user.expenses.filter(e => e.id !== expenseId) };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    await saveData(updatedUsers);
  };

  // Add reminder
  const addReminder = async () => {
    if (!newReminder.title || !newReminder.date) return;
    
    const reminder = {
      id: Date.now().toString(),
      ...newReminder
    };
    
    const updatedReminders = [...reminders, reminder];
    setReminders(updatedReminders);
    await saveReminders(updatedReminders);
    
    setNewReminder({
      title: '',
      date: '',
      amount: '',
      category: 'Bills',
      recurring: false,
      frequency: 'monthly'
    });
    setShowAddReminder(false);
  };

  // Delete reminder
  const deleteReminder = async (reminderId) => {
    const updatedReminders = reminders.filter(r => r.id !== reminderId);
    setReminders(updatedReminders);
    await saveReminders(updatedReminders);
  };

  // Get upcoming reminders (next 7 days)
  const getUpcomingReminders = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return reminders.filter(r => {
      const reminderDate = new Date(r.date);
      return reminderDate >= today && reminderDate <= nextWeek;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Get income for current month
  const getMonthlyIncome = (user, month = currentMonth) => {
    return user.monthlyIncome?.[month] || 0;
  };

  // Set income for current month
  const setMonthlyIncome = async (amount) => {
    const updatedUsers = users.map(user => {
      if (user.id === currentUserId) {
        return {
          ...user,
          monthlyIncome: {
            ...user.monthlyIncome,
            [currentMonth]: parseFloat(amount) || 0
          }
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    await saveData(updatedUsers);
  };

  // Get budgets for current month
  const getMonthlyBudgets = (user, month = currentMonth) => {
    return user.monthlyBudgets?.[month] || CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
  };

  // Update user budget
  const updateBudget = async (category, amount) => {
    const updatedUsers = users.map(user => {
      if (user.id === currentUserId) {
        const currentBudgets = getMonthlyBudgets(user);
        return { 
          ...user, 
          monthlyBudgets: {
            ...user.monthlyBudgets,
            [currentMonth]: {
              ...currentBudgets,
              [category]: parseFloat(amount) || 0
            }
          }
        };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    await saveData(updatedUsers);
  };

  // Handle receipt upload
  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewExpense({ ...newExpense, receipt: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentUser = () => users.find(u => u.id === currentUserId);

  // Calculate spending by category for a user (filtered by month)
  const getSpendingByCategory = (user, currency = null, month = currentMonth) => {
    const targetCurrency = currency || viewCurrency;
    const spending = {};
    
    CATEGORIES.forEach(cat => {
      spending[cat] = user.expenses
        .filter(e => e.category === cat && e.date.startsWith(month))
        .reduce((sum, e) => sum + convertAmount(e.amount, e.currency, targetCurrency), 0);
    });
    
    return spending;
  };

  // Calculate total spending for user (filtered by month)
  const getTotalSpending = (user, currency = null, month = currentMonth) => {
    const targetCurrency = currency || viewCurrency;
    return user.expenses
      .filter(e => e.date.startsWith(month))
      .reduce((sum, e) => 
        sum + convertAmount(e.amount, e.currency, targetCurrency), 0
      );
  };

  // Household calculations
  const getHouseholdIncome = (month = currentMonth) => {
    return users.reduce((sum, user) => 
      sum + convertAmount(getMonthlyIncome(user, month), user.currency, viewCurrency), 0
    );
  };

  const getHouseholdSpending = (month = currentMonth) => {
    return users.reduce((sum, user) => sum + getTotalSpending(user, viewCurrency, month), 0);
  };

  const getHouseholdSpendingByCategory = (month = currentMonth) => {
    const spending = {};
    CATEGORIES.forEach(cat => {
      spending[cat] = users.reduce((sum, user) => {
        return sum + getSpendingByCategory(user, viewCurrency, month)[cat];
      }, 0);
    });
    return spending;
  };

  // Yearly calculations
  const getYearlyIncome = (year) => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      total += getHouseholdIncome(monthStr);
    }
    return total;
  };

  const getYearlySpending = (year) => {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      total += getHouseholdSpending(monthStr);
    }
    return total;
  };

  const getMonthlyBreakdown = (year) => {
    const breakdown = [];
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      breakdown.push({
        month: monthStr,
        income: getHouseholdIncome(monthStr),
        spending: getHouseholdSpending(monthStr)
      });
    }
    return breakdown;
  };

  const currentUser = getCurrentUser();

  // Login Screen Component
  const LoginScreen = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (selectedUser && handleLogin(selectedUser.id, pinInput)) {
        setPinInput('');
        setError('');
      } else {
        setError('Incorrect PIN. Please try again.');
        setPinInput('');
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-block bg-indigo-600 p-4 rounded-2xl shadow-lg mb-4">
              <Wallet className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Budget Tracker</h1>
            <p className="text-slate-600">Select your profile to continue</p>
          </div>

          {users.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 shadow-sm p-8 text-center">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Welcome!</h2>
              <p className="text-slate-600 mb-6">Get started by creating your first user profile</p>
              <button
                onClick={() => setShowAddUser(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-lg"
              >
                <PlusCircle className="w-5 h-5 inline mr-2" />
                Create Profile
              </button>
            </div>
          ) : !selectedUser ? (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Select Profile</h2>
              <div className="space-y-3">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 shadow-sm rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                        <User className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-sm text-slate-500">{CURRENCIES[user.currency].code}</div>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddUser(true)}
                className="w-full mt-4 px-4 py-3 bg-white text-indigo-600 border border-dashed border-indigo-600/50 rounded-lg font-medium hover:bg-slate-50 transition-all"
              >
                <PlusCircle className="w-4 h-4 inline mr-2" />
                Add New Profile
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 shadow-sm p-6">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setError('');
                  setPinInput('');
                }}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
                <span className="text-sm">Back</span>
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedUser.name}</h2>
                  <p className="text-sm text-slate-500">Enter your PIN</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter PIN"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-900 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    maxLength="20"
                    autoFocus
                    disabled={isAuthenticating}
                  />
                </div>
                {error && (
                  <div className="text-rose-600 text-sm text-center bg-rose-50 py-2 px-3 rounded-lg">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuthenticating ? 'Authenticating...' : 'Login'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen />
        {showAddUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-sm shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-indigo-600">Create New Profile</h3>
                <button onClick={() => setShowAddUser(false)} className="text-slate-500 hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Name</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">PIN (at least 4 characters)</label>
                  <input
                    type="password"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="Create PIN"
                    minLength="4"
                  />
                  <p className="text-xs text-slate-500 mt-1">Keep this PIN safe - you'll need it to access your budget</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Preferred Currency</label>
                  <select
                    value={newUserCurrency}
                    onChange={(e) => setNewUserCurrency(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {Object.entries(CURRENCIES).map(([code, curr]) => (
                      <option key={code} value={code}>
                        {curr.symbol} {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <p className="text-xs text-slate-500 italic">You can set monthly income after creating your profile</p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2 bg-white text-slate-900 border border-slate-200 shadow-sm rounded-lg font-medium hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addUser}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
                >
                  Create Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 select-none">
      {/* Header - Mobile optimized */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="px-3 py-3 sm:px-6 lg:px-8 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Logo - Compact on mobile */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2 rounded-xl shadow-lg flex-shrink-0">
                <Wallet className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-2xl font-bold text-slate-900 truncate">
                  Budget
                </h1>
              </div>
            </div>
            
            {/* Mobile action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Reminders - Mobile icon only */}
              <button
                onClick={() => setShowReminders(!showReminders)}
                className="relative p-2.5 sm:p-2 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 transition-colors active:scale-95"
              >
                <Receipt className="w-5 h-5 text-slate-600" />
                {getUpcomingReminders().length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {getUpcomingReminders().length}
                  </span>
                )}
              </button>

              {/* Export - Hidden on small mobile */}
              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className="hidden sm:flex px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-lg disabled:opacity-50 active:scale-95 text-sm"
              >
                {isExporting ? '...' : 'Export'}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="px-3 py-2.5 sm:px-4 sm:py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors shadow-lg active:scale-95 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
              {/* Dashboard View Toggle (only in household mode) */}
              {viewMode === 'household' && (
                <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setDashboardView('monthly')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      dashboardView === 'monthly' 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setDashboardView('yearly')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      dashboardView === 'yearly' 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              )}

              {/* Month Selector */}
              <div className="relative">
                <input
                  type="month"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                <button
                  onClick={() => setViewMode('individual')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'individual' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-1" />
                  Individual
                </button>
                <button
                  onClick={() => setViewMode('household')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'household' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1" />
                  Household
                </button>
              </div>

              {/* Currency Selector */}
              <div className="relative">
                <select
                  value={viewCurrency}
                  onChange={(e) => setViewCurrency(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 shadow-sm rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  {Object.entries(CURRENCIES).map(([code, curr]) => (
                    <option key={code} value={code}>
                      {curr.symbol} {code}
                    </option>
                  ))}
                </select>
                <ArrowLeftRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 pointer-events-none" />
              </div>

              {/* Reminders */}
              <button
                onClick={() => setShowReminders(!showReminders)}
                className="relative p-2 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Receipt className="w-5 h-5 text-slate-400" />
                {getUpcomingReminders().length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {getUpcomingReminders().length}
                  </span>
                )}
              </button>

              {/* Settings */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-5 h-5 text-slate-400" />
                </button>
                
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          const user = getCurrentUser();
                          if (user) {
                            setPending2FAUserId(user.id);
                            setNewUser2FASecret(generate2FASecret());
                            setShow2FASetup(true);
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        {getCurrentUser()?.twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          setShowSecurityLogs(true);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        View Security Logs
                      </button>
                      
                      <hr className="my-2 border-slate-200" />
                      
                      <button
                        onClick={exportToExcel}
                        disabled={isExporting}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        {isExporting ? 'Exporting...' : 'Export Data'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors shadow-lg"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>

          {/* User Selector for Individual View */}
          {viewMode === 'individual' && users.length > 0 && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              {users.map(user => (
                <div key={user.id} className="relative group">
                  <button
                    onClick={() => {
                      if (user.id !== currentUserId) {
                        switchUser(user.id);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentUserId === user.id
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-white text-slate-900 border border-slate-200 shadow-sm hover:border-indigo-600/50'
                    }`}
                  >
                    {user.name}
                    <span className="ml-2 text-xs opacity-75">
                      {CURRENCIES[user.currency].symbol}
                    </span>
                  </button>
                  {users.length > 1 && (
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-rose-600"
                      title="Delete user"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setShowAddUser(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-indigo-600 border border-dashed border-indigo-600/50 hover:bg-slate-50 transition-all"
              >
                <PlusCircle className="w-4 h-4 inline mr-1" />
                Add User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {users.length === 0 ? (
          // Empty State
          <div className="text-center py-20">
            <div className="inline-block bg-white/50 p-8 rounded-2xl border border-slate-200 shadow-sm">
              <Wallet className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-700 mb-2">Welcome to Budget Tracker</h2>
              <p className="text-slate-400 mb-6">Add your first user to get started</p>
              <button
                onClick={() => setShowAddUser(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                <PlusCircle className="w-5 h-5 inline mr-2" />
                Add First User
              </button>
            </div>
          </div>
        ) : viewMode === 'individual' && currentUser ? (
          // Individual View
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-200 shadow-sm shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400 font-medium">Monthly Income</span>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  {formatCurrency(convertAmount(getMonthlyIncome(currentUser), currentUser.currency, viewCurrency), viewCurrency)}
                </div>
                {viewCurrency !== currentUser.currency && (
                  <div className="text-xs text-slate-500 mt-1">
                    Original: {formatCurrency(getMonthlyIncome(currentUser), currentUser.currency)}
                  </div>
                )}
                <div className="mt-3">
                  <input
                    type="number"
                    value={getMonthlyIncome(currentUser) || ''}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="Set income"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 shadow-sm rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-200 shadow-sm shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400 font-medium">Total Spent</span>
                  <TrendingUp className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-3xl font-bold text-rose-400">
                  {formatCurrency(getTotalSpending(currentUser), viewCurrency)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-200 shadow-sm shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400 font-medium">Remaining</span>
                  <Wallet className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-3xl font-bold text-indigo-600">
                  {formatCurrency(
                    convertAmount(getMonthlyIncome(currentUser), currentUser.currency, viewCurrency) - getTotalSpending(currentUser),
                    viewCurrency
                  )}
                </div>
              </div>
            </div>

            {/* Budget by Category */}
            <div className="bg-white/50 rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6 text-indigo-600">Budget by Category</h2>
              <div className="space-y-4">
                {CATEGORIES.map(category => {
                  const spent = getSpendingByCategory(currentUser)[category];
                  const monthlyBudgets = getMonthlyBudgets(currentUser);
                  const budget = convertAmount(monthlyBudgets[category] || 0, currentUser.currency, viewCurrency);
                  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                  
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">{category}</span>
                        <div className="flex items-center gap-4">
                          <input
                            type="number"
                            value={monthlyBudgets[category] || ''}
                            onChange={(e) => updateBudget(category, e.target.value)}
                            placeholder="Set budget"
                            className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 shadow-sm rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                          />
                          <span className="text-sm text-slate-400">
                            {formatCurrency(spent, viewCurrency)} / {formatCurrency(budget, viewCurrency)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            percentage > 100 ? 'bg-rose-500' : percentage > 80 ? 'bg-indigo-600' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white/50 rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-indigo-600">Recent Expenses</h2>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
                >
                  <PlusCircle className="w-4 h-4 inline mr-2" />
                  Add Expense
                </button>
              </div>
              
              <div className="space-y-3">
                {currentUser.expenses.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No expenses yet. Add your first expense to start tracking!
                  </div>
                ) : (
                  [...currentUser.expenses].reverse().map(expense => (
                    <div key={expense.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-indigo-600/30 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-indigo-600">
                            {formatCurrency(expense.amount, expense.currency)}
                          </span>
                          {expense.currency !== viewCurrency && (
                            <span className="text-sm text-slate-500">
                              ({formatCurrency(convertAmount(expense.amount, expense.currency, viewCurrency), viewCurrency)})
                            </span>
                          )}
                          <span className="px-2 py-1 bg-white rounded text-xs text-slate-800 border border-slate-200 shadow-sm">
                            {expense.category}
                          </span>
                          {expense.receipt && (
                            <Receipt className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {expense.date} {expense.description && `• ${expense.description}`}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          // Household View
          <div className="space-y-6">
            {dashboardView === 'monthly' ? (
              <>
            {/* Household Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-200 shadow-sm shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400 font-medium">Total Income</span>
                  <Home className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  {formatCurrency(getHouseholdIncome(currentMonth), viewCurrency)}
                </div>
                <div className="text-xs text-slate-500 mt-2">{users.length} household members</div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-200 shadow-sm shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400 font-medium">Total Spent</span>
                  <TrendingUp className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-3xl font-bold text-rose-400">
                  {formatCurrency(getHouseholdSpending(currentMonth), viewCurrency)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-6 rounded-xl border border-slate-200 shadow-sm shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400 font-medium">Remaining</span>
                  <Wallet className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-3xl font-bold text-indigo-600">
                  {formatCurrency(getHouseholdIncome(currentMonth) - getHouseholdSpending(currentMonth), viewCurrency)}
                </div>
              </div>
            </div>

            {/* Spending by Member */}
            <div className="bg-white/50 rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6 text-indigo-600">Spending by Member</h2>
              <div className="space-y-4">
                {users.map(user => {
                  const spending = getTotalSpending(user, viewCurrency, currentMonth);
                  const income = convertAmount(getMonthlyIncome(user, currentMonth), user.currency, viewCurrency);
                  const percentage = income > 0 ? (spending / income) * 100 : 0;
                  
                  return (
                    <div key={user.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{user.name}</span>
                          <span className="text-xs text-slate-500">({CURRENCIES[user.currency].code})</span>
                        </div>
                        <span className="text-sm text-slate-400">
                          {formatCurrency(spending, viewCurrency)} / {formatCurrency(income, viewCurrency)}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-600 to-indigo-700 transition-all"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Household Spending by Category */}
            <div className="bg-white/50 rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6 text-indigo-600">Household Spending by Category</h2>
              <div className="space-y-4">
                {CATEGORIES.map(category => {
                  const totalSpent = getHouseholdSpendingByCategory(currentMonth)[category];
                  const totalBudget = users.reduce((sum, user) => {
                    const monthlyBudgets = getMonthlyBudgets(user, currentMonth);
                    return sum + convertAmount(monthlyBudgets[category] || 0, user.currency, viewCurrency);
                  }, 0);
                  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
                  
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">{category}</span>
                        <span className="text-sm text-slate-400">
                          {formatCurrency(totalSpent, viewCurrency)}
                          {totalBudget > 0 && ` / ${formatCurrency(totalBudget, viewCurrency)}`}
                        </span>
                      </div>
                      {totalBudget > 0 && (
                        <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              percentage > 100 ? 'bg-rose-500' : percentage > 80 ? 'bg-indigo-600' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      )}
                      
                      {/* Show breakdown by user */}
                      <div className="ml-4 space-y-1">
                        {users.map(user => {
                          const userSpent = getSpendingByCategory(user, viewCurrency, currentMonth)[category];
                          if (userSpent === 0) return null;
                          return (
                            <div key={user.id} className="text-xs text-slate-500 flex justify-between">
                              <span>{user.name}:</span>
                              <span>{formatCurrency(userSpent, viewCurrency)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>
            ) : (
              // Yearly Dashboard
              <>
                <div className="bg-white/50 rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold mb-6 text-indigo-600">
                    Yearly Overview - {currentMonth.split('-')[0]}
                  </h2>
                  
                  {/* Yearly Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Total Annual Income</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {formatCurrency(getYearlyIncome(currentMonth.split('-')[0]), viewCurrency)}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Total Annual Spending</div>
                      <div className="text-2xl font-bold text-rose-400">
                        {formatCurrency(getYearlySpending(currentMonth.split('-')[0]), viewCurrency)}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Annual Savings</div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {formatCurrency(
                          getYearlyIncome(currentMonth.split('-')[0]) - getYearlySpending(currentMonth.split('-')[0]),
                          viewCurrency
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Monthly Breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-400 mb-3">Monthly Breakdown</h3>
                    {getMonthlyBreakdown(currentMonth.split('-')[0]).map((month, idx) => {
                      const savings = month.income - month.spending;
                      const savingsPercentage = month.income > 0 ? (savings / month.income) * 100 : 0;
                      
                      return (
                        <div key={idx} className="bg-slate-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-800">
                              {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex gap-4 text-sm">
                              <span className="text-emerald-400">{formatCurrency(month.income, viewCurrency)}</span>
                              <span className="text-rose-400">-{formatCurrency(month.spending, viewCurrency)}</span>
                              <span className={savings >= 0 ? 'text-indigo-600' : 'text-rose-400'}>
                                {formatCurrency(savings, viewCurrency)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-white rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                savingsPercentage < 0 ? 'bg-rose-500' : savingsPercentage < 10 ? 'bg-indigo-600' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(Math.abs(savingsPercentage), 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-600">Add New User</h3>
              <button onClick={() => setShowAddUser(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">PIN (at least 4 characters)</label>
                <input
                  type="password"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Create PIN"
                  minLength="4"
                />
                <p className="text-xs text-slate-500 mt-1">This user will need this PIN to access their budget</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Preferred Currency</label>
                <select
                  value={newUserCurrency}
                  onChange={(e) => setNewUserCurrency(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {Object.entries(CURRENCIES).map(([code, curr]) => (
                    <option key={code} value={code}>
                      {curr.symbol} {curr.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <p className="text-xs text-slate-500 italic">You can set monthly income after adding the user</p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-800 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addUser}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-600">Add Expense</h3>
              <button onClick={() => setShowAddExpense(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Amount</label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Currency</label>
                  <select
                    value={newExpense.currency}
                    onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {Object.entries(CURRENCIES).map(([code, curr]) => (
                      <option key={code} value={code}>
                        {curr.symbol} {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Add a note"
                />
              </div>

              {/* Split Expense */}
              {users.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Split Between Users (Optional)</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-50 rounded-lg p-3">
                    {users.map(user => {
                      const split = newExpense.splitBetween.find(s => s.userId === user.id);
                      const totalAmount = parseFloat(newExpense.amount) || 0;
                      const selectedCount = newExpense.splitBetween.length;
                      const equalSplit = selectedCount > 0 ? (totalAmount / selectedCount).toFixed(2) : '0.00';
                      
                      return (
                        <div key={user.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!split}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Add user with equal split
                                const updatedSplits = [...newExpense.splitBetween, { userId: user.id, amount: '', isManual: false }];
                                const count = updatedSplits.length;
                                const autoAmount = totalAmount > 0 ? (totalAmount / count).toFixed(2) : '';
                                
                                setNewExpense({
                                  ...newExpense,
                                  splitBetween: updatedSplits.map(s => ({
                                    ...s,
                                    amount: s.isManual ? s.amount : autoAmount
                                  }))
                                });
                              } else {
                                // Remove user and recalculate
                                const updatedSplits = newExpense.splitBetween.filter(s => s.userId !== user.id);
                                const count = updatedSplits.length;
                                const autoAmount = count > 0 && totalAmount > 0 ? (totalAmount / count).toFixed(2) : '';
                                
                                setNewExpense({
                                  ...newExpense,
                                  splitBetween: updatedSplits.map(s => ({
                                    ...s,
                                    amount: s.isManual ? s.amount : autoAmount
                                  }))
                                });
                              }
                            }}
                            className="w-4 h-4 accent-indigo-500"
                          />
                          <span className="text-sm text-slate-800 flex-1">{user.name}</span>
                          {split && (
                            <input
                              type="number"
                              value={split.amount || ''}
                              onChange={(e) => {
                                setNewExpense({
                                  ...newExpense,
                                  splitBetween: newExpense.splitBetween.map(s =>
                                    s.userId === user.id ? { ...s, amount: e.target.value, isManual: true } : s
                                  )
                                });
                              }}
                              onBlur={(e) => {
                                // If cleared, revert to auto-split
                                if (!e.target.value) {
                                  const count = newExpense.splitBetween.length;
                                  const autoAmount = totalAmount > 0 ? (totalAmount / count).toFixed(2) : '';
                                  setNewExpense({
                                    ...newExpense,
                                    splitBetween: newExpense.splitBetween.map(s =>
                                      s.userId === user.id ? { ...s, amount: autoAmount, isManual: false } : s
                                    )
                                  });
                                }
                              }}
                              className="w-24 px-2 py-1 bg-white border border-slate-200 shadow-sm rounded text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500"
                              placeholder={split.isManual ? "Manual" : "Auto"}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {newExpense.splitBetween.length > 0 && (
                    <div className="text-xs text-slate-500 mt-2 flex justify-between">
                      <span>Equal split: {CURRENCIES[newExpense.currency].symbol}{((parseFloat(newExpense.amount) || 0) / newExpense.splitBetween.length).toFixed(2)} each</span>
                      <span>Total: {CURRENCIES[newExpense.currency].symbol}
                      {newExpense.splitBetween.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Receipt (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-400 hover:border-indigo-600/50 transition-colors flex items-center justify-center gap-2">
                      <Camera className="w-4 h-4" />
                      {newExpense.receipt ? 'Receipt Added' : 'Add Receipt'}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>
                  {newExpense.receipt && (
                    <button
                      onClick={() => setNewExpense({ ...newExpense, receipt: null })}
                      className="p-2 text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {newExpense.receipt && (
                  <img src={newExpense.receipt} alt="Receipt" className="mt-2 rounded-lg max-h-32 object-cover" />
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddExpense(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-800 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addExpense}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-600">Exchange Rates</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-400">Rates relative to 1 GBP</p>
              {Object.entries(CURRENCIES).map(([code, curr]) => (
                <div key={code} className="flex items-center justify-between">
                  <span className="text-sm text-slate-800">{curr.symbol} {code}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRates[code]}
                    onChange={(e) => {
                      const newRates = { ...exchangeRates, [code]: parseFloat(e.target.value) || 0 };
                      setExchangeRates(newRates);
                      saveExchangeRates(newRates);
                    }}
                    className="w-24 px-3 py-1 bg-slate-50 border border-slate-200 shadow-sm rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              ))}
            </div>
            
            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Reminders Panel */}
      {showReminders && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full border border-slate-200 shadow-sm shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-600">Bill Reminders</h3>
              <button onClick={() => setShowReminders(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upcoming Reminders */}
            {getUpcomingReminders().length > 0 && (
              <div className="mb-6 p-4 bg-indigo-600/10 border border-indigo-600/30 rounded-lg">
                <h4 className="text-sm font-bold text-indigo-600 mb-3">Upcoming (Next 7 Days)</h4>
                <div className="space-y-2">
                  {getUpcomingReminders().map(reminder => (
                    <div key={reminder.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-slate-700 font-medium">{reminder.title}</span>
                        <span className="text-slate-500 ml-2">{reminder.date}</span>
                      </div>
                      {reminder.amount && (
                        <span className="text-indigo-600">${reminder.amount}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* All Reminders */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-400">All Reminders</h4>
              <button
                onClick={() => setShowAddReminder(true)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4 inline mr-1" />
                Add
              </button>
            </div>

            <div className="space-y-2">
              {reminders.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No reminders yet. Add one to get started!
                </div>
              ) : (
                reminders.map(reminder => (
                  <div key={reminder.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex-1">
                      <div className="font-medium text-slate-700">{reminder.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {reminder.date} • {reminder.category}
                        {reminder.recurring && ` • ${reminder.frequency}`}
                      </div>
                    </div>
                    {reminder.amount && (
                      <div className="text-indigo-600 font-medium mr-3">
                        ${reminder.amount}
                      </div>
                    )}
                    <button
                      onClick={() => deleteReminder(reminder.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddReminder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-600">Add Reminder</h3>
              <button onClick={() => setShowAddReminder(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Title</label>
                <input
                  type="text"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="e.g., Rent payment"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newReminder.date}
                    onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Amount (Optional)</label>
                  <input
                    type="number"
                    value={newReminder.amount}
                    onChange={(e) => setNewReminder({ ...newReminder, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                <select
                  value={newReminder.category}
                  onChange={(e) => setNewReminder({ ...newReminder, category: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newReminder.recurring}
                  onChange={(e) => setNewReminder({ ...newReminder, recurring: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm text-slate-400">Recurring reminder</label>
              </div>

              {newReminder.recurring && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Frequency</label>
                  <select
                    value={newReminder.frequency}
                    onChange={(e) => setNewReminder({ ...newReminder, frequency: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddReminder(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-800 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addReminder}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Add Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-600">Enable Two-Factor Authentication</h3>
              <button onClick={() => setShow2FASetup(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Enhanced Security:</strong> 2FA adds an extra layer of protection by requiring a time-based code in addition to your PIN.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your 2FA Secret Key</label>
                <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm break-all">
                  {newUser2FASecret || generate2FASecret()}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Save this key securely. You'll need it to generate authentication codes.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Current Code (for testing)</label>
                <div className="bg-indigo-50 text-indigo-900 p-3 rounded-lg text-center text-2xl font-bold tracking-wider">
                  {newUser2FASecret && generate2FACode(newUser2FASecret)}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Code refreshes every 30 seconds
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShow2FASetup(false)}
                className="flex-1 px-4 py-2 bg-white text-slate-900 border border-slate-200 shadow-sm rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const secret = newUser2FASecret || generate2FASecret();
                  const updatedUsers = users.map(u => 
                    u.id === pending2FAUserId 
                      ? { ...u, twoFactorEnabled: true, twoFactorSecret: secret }
                      : u
                  );
                  setUsers(updatedUsers);
                  await saveData(updatedUsers);
                  await logSecurityEvent('2FA_ENABLED', pending2FAUserId, {});
                  setShow2FASetup(false);
                  setNewUser2FASecret('');
                  alert('Two-Factor Authentication enabled successfully!');
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Verification Modal */}
      {show2FAVerify && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-600">Two-Factor Authentication</h3>
              <button onClick={() => {
                setShow2FAVerify(false);
                setTwoFactorCode('');
                setIsAuthenticating(false);
              }} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-indigo-800">
                  Enter the 6-digit code from your authenticator to continue.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Authentication Code</label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^A-Z0-9]/gi, '').substring(0, 6))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 shadow-sm rounded-lg text-slate-900 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="000000"
                  maxLength="6"
                  autoFocus
                />
              </div>
            </div>
            
            <button
              onClick={handle2FAVerification}
              disabled={twoFactorCode.length !== 6}
              className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify Code
            </button>
          </div>
        </div>
      )}

      {/* Security Logs Modal */}
      {showSecurityLogs && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full border border-slate-200 shadow-sm shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-indigo-600">Security Activity Log</h3>
              <button onClick={() => setShowSecurityLogs(false)} className="text-slate-500 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              {securityLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No security events logged yet
                </div>
              ) : (
                [...securityLogs].reverse().map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        log.eventType.includes('FAILED') || log.eventType.includes('LOCKED') 
                          ? 'bg-rose-100 text-rose-700'
                          : log.eventType.includes('SUCCESS') || log.eventType.includes('ENABLED')
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {log.eventType}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">
                      User ID: {log.userId}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetTracker;
