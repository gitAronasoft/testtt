
// Admin panel specific functions
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
    loadAdminData();
    setupAdminEventListeners();
});

function initializeAdminPanel() {
    // Check if user has admin privileges
    const userRole = localStorage.getItem('userRole') || 'viewer';
    if (userRole !== 'admin') {
        showAlert('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    // Load real-time stats
    updateAdminStats();
    setInterval(updateAdminStats, 30000); // Update every 30 seconds
}

function loadAdminData() {
    console.log('Loading admin data...');
    loadUsersList();
    loadContentList();
    loadPaymentData();
    loadSystemLogs();
}

function setupAdminEventListeners() {
    // User search functionality
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', filterUsers);
    }

    // Role and status filters
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (roleFilter) roleFilter.addEventListener('change', filterUsers);
    if (statusFilter) statusFilter.addEventListener('change', filterUsers);

    // Select all checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#usersTableBody input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }

    // Add user form submission
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createNewUser();
        });
    }
}

function updateAdminStats() {
    // Simulate real-time stats updates
    const stats = {
        totalVideos: Math.floor(Math.random() * 200) + 150,
        activeUsers: Math.floor(Math.random() * 50) + 320,
        monthlyRevenue: (Math.random() * 5000 + 10000).toFixed(1),
        systemUptime: (Math.random() * 2 + 97).toFixed(1)
    };

    const quickStats = document.querySelectorAll('.quick-stat .stat-value');
    if (quickStats.length >= 4) {
        quickStats[0].textContent = stats.totalVideos;
        quickStats[1].textContent = stats.activeUsers;
        quickStats[2].textContent = '$' + stats.monthlyRevenue + 'K';
        quickStats[3].textContent = stats.systemUptime + '%';
    }
}

// Tab management for admin sections
function showAdminTab(tabName) {
    // Hide all admin tabs
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show selected admin tab
    const targetTab = document.getElementById('admin-' + tabName);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
    
    // Update tab appearance
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // Load specific data for the tab
    switch(tabName) {
        case 'users':
            loadUsersList();
            break;
        case 'content':
            loadContentList();
            break;
        case 'payments':
            loadPaymentData();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
        case 'logs':
            refreshLogs();
            break;
    }
}

// User Management Functions
function loadUsersList() {
    // Simulate loading users data
    console.log('Loading users list...');
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const name = row.cells[2]?.textContent.toLowerCase() || '';
        const email = row.cells[3]?.textContent.toLowerCase() || '';
        const role = row.querySelector('.role-badge')?.textContent.toLowerCase() || '';
        const status = row.querySelector('.status-badge')?.textContent.toLowerCase() || '';
        
        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
        const matchesRole = !roleFilter || role.includes(roleFilter);
        const matchesStatus = !statusFilter || status.includes(statusFilter);
        
        row.style.display = matchesSearch && matchesRole && matchesStatus ? '' : 'none';
    });
}

function showAddUserModal() {
    showModal('addUserModal');
}

function closeAddUserModal() {
    closeModal('addUserModal');
    document.getElementById('addUserForm').reset();
}

function createNewUser() {
    const formData = {
        name: document.getElementById('newUserName').value,
        email: document.getElementById('newUserEmail').value,
        username: document.getElementById('newUserUsername').value,
        role: document.getElementById('newUserRole').value,
        password: document.getElementById('newUserPassword').value,
        sendWelcome: document.getElementById('sendWelcomeEmail').checked
    };

    if (!formData.name || !formData.email || !formData.username || !formData.password) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    // Simulate user creation
    showAlert('User created successfully!', 'success');
    
    if (formData.sendWelcome) {
        showAlert(`Welcome email sent to ${formData.email}`, 'info');
    }
    
    closeAddUserModal();
    loadUsersList(); // Refresh users list
}

function editUser(userId) {
    showAlert(`Opening user editor for user ID: ${userId}`, 'info');
}

function viewUserDetails(userId) {
    showAlert(`Viewing details for user ID: ${userId}`, 'info');
}

function suspendUser(userId) {
    if (confirm('Are you sure you want to suspend this user?')) {
        showAlert(`User ${userId} suspended successfully`, 'warning');
        loadUsersList(); // Refresh users list
    }
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        showAlert(`User ${userId} deleted successfully`, 'success');
        loadUsersList(); // Refresh users list
    }
}

function exportUsers() {
    showAlert('Exporting users data...', 'info');
    
    setTimeout(() => {
        showAlert('Users data exported successfully!', 'success');
    }, 2000);
}

function bulkUserActions() {
    const selectedUsers = document.querySelectorAll('#usersTableBody input[type="checkbox"]:checked');
    
    if (selectedUsers.length === 0) {
        showAlert('Please select users to perform bulk actions', 'warning');
        return;
    }
    
    showAlert(`Bulk actions menu for ${selectedUsers.length} selected users`, 'info');
}

// Content Management Functions
function loadContentList() {
    console.log('Loading content list...');
}

function editContent(contentId) {
    showAlert(`Opening content editor for content ID: ${contentId}`, 'info');
}

function viewAnalytics(contentId) {
    showAlert(`Viewing analytics for content ID: ${contentId}`, 'info');
}

function flagContent(contentId) {
    if (confirm('Are you sure you want to flag this content?')) {
        showAlert(`Content ${contentId} flagged for review`, 'warning');
    }
}

function moderateContent() {
    showAlert('Opening content moderation panel...', 'info');
}

function bulkContentActions() {
    showAlert('Bulk content actions panel opened', 'info');
}

function exportContent() {
    showAlert('Exporting content reports...', 'info');
}

// Payment Management Functions
function loadPaymentData() {
    console.log('Loading payment data...');
}

function viewTransaction(transactionId) {
    showAlert(`Viewing transaction details for ID: ${transactionId}`, 'info');
}

function refundTransaction(transactionId) {
    if (confirm('Are you sure you want to process a refund for this transaction?')) {
        showAlert(`Refund processed for transaction ${transactionId}`, 'success');
    }
}

function processRefund() {
    showAlert('Opening refund processing panel...', 'info');
}

function exportPayments() {
    showAlert('Exporting payment data...', 'info');
}

function flagTransaction() {
    showAlert('Transaction flagging panel opened', 'warning');
}

// Analytics Functions
function loadAnalyticsData() {
    console.log('Loading analytics data...');
}

// Role and Permission Management
function editPermissions(role) {
    showAlert(`Opening permission editor for ${role} role`, 'info');
}

function viewRoleUsers(role) {
    showAlert(`Viewing users with ${role} role`, 'info');
}

function createRole() {
    showAlert('Opening new role creation panel...', 'info');
}

function cloneRole() {
    showAlert('Opening role cloning panel...', 'info');
}

// Settings Functions
function showSettingsTab(tabName) {
    // Hide all settings tabs
    document.querySelectorAll('.settings-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show selected settings tab
    document.getElementById(tabName + '-settings').classList.remove('hidden');
    
    // Update tab appearance
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
}

// System Functions
function performMaintenance() {
    if (confirm('Are you sure you want to perform system maintenance? This may affect users currently online.')) {
        showAlert('System maintenance started...', 'warning');
        
        setTimeout(() => {
            showAlert('System maintenance completed successfully!', 'success');
        }, 3000);
    }
}

function backupDatabase() {
    showAlert('Database backup started...', 'info');
    
    setTimeout(() => {
        showAlert('Database backup completed successfully!', 'success');
    }, 2000);
}

function createBackup() {
    showAlert('Creating database backup...', 'info');
    
    setTimeout(() => {
        showAlert('Backup created successfully!', 'success');
    }, 2000);
}

function scheduleBackup() {
    showAlert('Opening backup scheduling panel...', 'info');
}

function restoreBackup() {
    if (confirm('Are you sure you want to restore from backup? This will overwrite current data.')) {
        showAlert('Backup restoration started...', 'warning');
    }
}

function runSecurityScan() {
    showAlert('Security scan initiated...', 'info');
    
    setTimeout(() => {
        showAlert('Security scan completed - No threats detected', 'success');
    }, 3000);
}

function updateSecurity() {
    showAlert('Updating security rules...', 'info');
}

function enableFirewall() {
    showAlert('Opening firewall configuration...', 'info');
}

// Log Management
function refreshLogs() {
    showAlert('Refreshing system logs...', 'info');
    console.log('Refreshing logs...');
}

function exportLogs() {
    const logsContainer = document.querySelector('.logs-container');
    if (logsContainer) {
        const logsText = Array.from(logsContainer.children).map(entry => entry.textContent).join('\n');
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showAlert('System logs exported successfully', 'success');
    }
}

function clearLogs() {
    if (confirm('Are you sure you want to clear all system logs?')) {
        const logsContainer = document.querySelector('.logs-container');
        if (logsContainer) {
            logsContainer.innerHTML = `
                <div class="log-entry log-info">
                    <span class="log-time">[${new Date().toISOString().slice(0, 19).replace('T', ' ')}]</span>
                    <span class="log-level">INFO</span>
                    <span class="log-message">System logs cleared by admin</span>
                </div>
            `;
        }
        showAlert('System logs cleared successfully', 'success');
    }
}

// Communication Functions
function sendNotification() {
    const message = prompt('Enter notification message:');
    if (message && message.trim()) {
        showAlert(`Notification sent to all users: "${message}"`, 'success');
    }
}

function testEmailConfiguration() {
    showAlert('Testing email configuration...', 'info');
    
    setTimeout(() => {
        showAlert('Test email sent successfully!', 'success');
    }, 1500);
}

console.log('Enhanced admin functions loaded successfully');
