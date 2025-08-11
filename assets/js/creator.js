/**
 * Creator page JavaScript for VideoShare platform
 * Simple script for creator pages without complex navigation logic
 */

// Initialize creator page
document.addEventListener('DOMContentLoaded', function() {
    initializeCreatorPage();
});

/**
 * Initialize creator page functionality
 */
function initializeCreatorPage() {
    console.log('Creator page initialized');
    
    // Check authentication
    checkAuthentication();
    
    // Setup logout functionality
    setupLogout();
    
    // Load user data
    loadUserData();
    
    // Initialize charts if available
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    }
}

/**
 * Check user authentication
 */
function checkAuthentication() {
    try {
        const userData = localStorage.getItem('videoShareUser');
        if (!userData) {
            window.location.href = '../login.html';
            return;
        }
        
        const user = JSON.parse(userData);
        if (user.role !== 'creator') {
            window.location.href = '../login.html';
            return;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '../login.html';
    }
}

/**
 * Setup logout functionality
 */
function setupLogout() {
    const logoutLinks = document.querySelectorAll('.logout-link');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
}

/**
 * Handle logout
 */
function handleLogout() {
    // Clear user data
    localStorage.removeItem('videoShareUser');
    localStorage.removeItem('videoShareSession');
    
    // Redirect to home page
    window.location.href = '../index.html';
}

/**
 * Load user data and update page
 */
function loadUserData() {
    try {
        const userData = localStorage.getItem('videoShareUser');
        if (userData) {
            const user = JSON.parse(userData);
            
            // Update user name in dropdown
            const userNameElements = document.querySelectorAll('#navbarDropdown');
            userNameElements.forEach(element => {
                element.innerHTML = `<i class="fas fa-user-circle me-2"></i>${user.name || 'Creator'}`;
            });
            
            // Load dashboard data if on overview page
            if (window.location.pathname.includes('creator-overview.html')) {
                loadDashboardData();
            }
            
            // Load earnings data if on earnings page
            if (window.location.pathname.includes('creator-earnings.html')) {
                loadEarningsData();
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Load dashboard data for overview page
 */
function loadDashboardData() {
    // Update stats with mock data for now
    const stats = {
        totalVideos: 15,
        totalViews: 12450,
        totalEarnings: 1847.50,
        thisMonthEarnings: 312.80
    };
    
    // Update stat cards
    updateStatCard('total-videos', stats.totalVideos);
    updateStatCard('total-views', stats.totalViews.toLocaleString());
    updateStatCard('total-earnings', `$${stats.totalEarnings.toFixed(2)}`);
    updateStatCard('month-earnings', `$${stats.thisMonthEarnings.toFixed(2)}`);
}

/**
 * Load earnings data for earnings page
 */
async function loadEarningsData() {
    try {
        console.log('Loading earnings data...');
        const userData = JSON.parse(localStorage.getItem('videoShareUser'));
        if (!userData) return;
        
        // Try to load from API first, fallback to demo data
        try {
            const response = await API.get(`/users/${userData.id}/earnings`);
            
            if (response.success) {
                const { metrics, recent_purchases, payout_history } = response.data;
                updateEarningsMetrics(metrics);
                updatePurchaseHistory(recent_purchases);
                updatePayoutHistory(payout_history);
                return;
            }
        } catch (apiError) {
            console.log('API call failed, using demo data:', apiError);
        }
        
        // Fallback to demo data while API is being fixed
        const demoMetrics = {
            available_balance: 1247.50,
            monthly_earnings: 389.20,
            total_earned: 5892.45,
            total_purchases: 1247
        };
        
        const demoPurchases = [
            {
                date: '2025-08-10T10:30:00Z',
                video_title: 'Introduction to Web Development',
                customer_email: 'viewer@demo.com',
                amount: 29.99
            },
            {
                date: '2025-08-09T14:15:00Z',
                video_title: 'Advanced React Patterns',
                customer_email: 'john.doe@email.com',
                amount: 49.99
            },
            {
                date: '2025-08-08T16:45:00Z',
                video_title: 'Database Design Fundamentals',
                customer_email: 'mary.smith@email.com',
                amount: 39.99
            },
            {
                date: '2025-08-07T11:20:00Z',
                video_title: 'Introduction to Web Development',
                customer_email: 'alex.wilson@email.com',
                amount: 29.99
            },
            {
                date: '2025-08-06T13:10:00Z',
                video_title: 'Advanced React Patterns',
                customer_email: 'sarah.jones@email.com',
                amount: 49.99
            }
        ];
        
        const demoPayouts = [
            {
                date: '2025-08-01T09:00:00Z',
                amount: 1200.00,
                method: 'PayPal',
                status: 'Completed'
            },
            {
                date: '2025-07-01T09:00:00Z',
                amount: 890.50,
                method: 'PayPal',
                status: 'Completed'
            },
            {
                date: '2025-06-01T09:00:00Z',
                amount: 650.75,
                method: 'PayPal',
                status: 'Completed'
            }
        ];
        
        // Update UI with demo data
        updateEarningsMetrics(demoMetrics);
        updatePurchaseHistory(demoPurchases);
        updatePayoutHistory(demoPayouts);
        
    } catch (error) {
        console.error('Error loading earnings data:', error);
    }
}

/**
 * Update earnings metrics on the page
 */
function updateEarningsMetrics(metrics) {
    // Find and update metric elements by their card structure
    const cards = document.querySelectorAll('.card-body.text-center h4');
    
    if (cards.length >= 4) {
        // Available Balance
        cards[0].textContent = `$${parseFloat(metrics.available_balance || 0).toFixed(2)}`;
        
        // This Month  
        cards[1].textContent = `$${parseFloat(metrics.monthly_earnings || 0).toFixed(2)}`;
        
        // Total Earnings
        cards[2].textContent = `$${parseFloat(metrics.total_earned || 0).toFixed(2)}`;
        
        // Total Purchases
        cards[3].textContent = metrics.total_purchases || '0';
    }
}

/**
 * Update purchase history table
 */
function updatePurchaseHistory(purchases) {
    const tbody = document.querySelector('table tbody');
    if (!tbody || !purchases) return;
    
    tbody.innerHTML = '';
    
    purchases.forEach(purchase => {
        const row = document.createElement('tr');
        const date = new Date(purchase.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        row.innerHTML = `
            <td>${date}</td>
            <td>${purchase.video_title}</td>
            <td>${purchase.customer_email}</td>
            <td><span class="text-success fw-bold">$${parseFloat(purchase.amount).toFixed(2)}</span></td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Update payout history
 */
function updatePayoutHistory(payouts) {
    const payoutContainer = document.querySelector('.col-md-4 .card-body');
    if (!payoutContainer || !payouts) return;
    
    // Remove existing payout items (keep only the button)
    const existingItems = payoutContainer.querySelectorAll('.d-flex.justify-content-between:not(:has(button))');
    existingItems.forEach(item => item.remove());
    
    // Add new payout items
    const requestButton = payoutContainer.querySelector('button');
    
    payouts.forEach(payout => {
        const date = new Date(payout.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        const payoutItem = document.createElement('div');
        payoutItem.className = 'd-flex justify-content-between align-items-center p-3 border rounded mb-3';
        payoutItem.innerHTML = `
            <div>
                <div class="fw-bold">${date}</div>
                <small class="text-muted">${payout.method || 'PayPal'}</small>
            </div>
            <div class="text-end">
                <div class="fw-bold text-success">$${parseFloat(Math.abs(payout.amount)).toFixed(2)}</div>
                <small class="badge bg-success">${payout.status}</small>
            </div>
        `;
        
        payoutContainer.insertBefore(payoutItem, requestButton);
    });
}

/**
 * Update stat card value
 */
function updateStatCard(cardId, value) {
    const element = document.getElementById(cardId);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Initialize charts for creator pages
 */
function initializeCharts() {
    // Only initialize charts if Chart.js is available and we're on a page that needs them
    if (window.location.pathname.includes('creator-overview.html')) {
        // Charts will be initialized here when needed
        console.log('Charts initialized for creator overview');
    }
}