/**
 * VideoHub Admin Panel Module
 * Handles admin dashboard functionality with API integration
 */

class AdminManager {
    constructor() {
        console.log('AdminManager constructor called');
        
        // Prevent multiple instances
        if (window.adminManagerInstance) {
            console.log('Returning existing AdminManager instance');
            return window.adminManagerInstance;
        }
        
        this.users = [];
        this.videos = [];
        this.stats = {};
        this.usersTable = null;
        this.currentUserId = null;
        this.isInitializingTable = false;
        this.dataLoaded = false;
        this.tableInitialized = false;
        this.handlersLoaded = false;
        
        // Store instance globally
        window.adminManagerInstance = this;
        console.log('New AdminManager instance created');
        
        this.init();
    }

    async init() {
        this.bindEvents();
        
        // Load page-specific data
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'dashboard.html') {
            await this.loadDashboardData();
        } else if (currentPage === 'users.html') {
            // For users page, only initialize table once
            await this.initUsersPage();
        } else if (currentPage === 'transactions.html') {
            await this.initTransactionHistory();
        } else {
            await this.waitForAPIService();
        }
        
        this.loadPageSpecificHandlers();
    }

    async waitForAPIService() {
        let retries = 0;
        const maxRetries = 50;
        
        while (retries < maxRetries && !window.apiService) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.apiService) {
            throw new Error('API service not available');
        }
    }

    bindEvents() {
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.dataLoaded) {
                this.refreshData();
            }
        });
    }

    async loadDashboardData() {
        try {
            await this.waitForAPIService();
            
            // Load dashboard statistics
            const statsResponse = await window.apiService.get('/api/admin/stats');
            if (statsResponse.success) {
                this.updateDashboardStats(statsResponse.data);
            }
            
            this.dataLoaded = true;
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    updateDashboardStats(stats) {
        // Update user stats
        const totalUsersElement = document.getElementById('totalUsers');
        if (totalUsersElement) {
            totalUsersElement.textContent = stats.total_users || '0';
        }

        const activeUsersElement = document.getElementById('activeUsers');
        if (activeUsersElement) {
            activeUsersElement.textContent = stats.active_users || '0';
        }

        // Update video stats
        const totalVideosElement = document.getElementById('totalVideos');
        if (totalVideosElement) {
            totalVideosElement.textContent = stats.total_videos || '0';
        }

        const pendingVideosElement = document.getElementById('pendingVideos');
        if (pendingVideosElement) {
            pendingVideosElement.textContent = stats.pending_videos || '0';
        }

        // Update transaction stats
        const totalTransactionsElement = document.getElementById('totalTransactions');
        if (totalTransactionsElement) {
            totalTransactionsElement.textContent = stats.total_transactions || '0';
        }

        const totalRevenueElement = document.getElementById('totalRevenue');
        if (totalRevenueElement) {
            totalRevenueElement.textContent = stats.total_revenue_formatted || '$0.00';
        }
    }

    async refreshData() {
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'dashboard.html') {
            await this.loadDashboardData();
        } else if (currentPage === 'users.html') {
            await this.loadUsers();
        } else if (currentPage === 'transactions.html') {
            await this.loadTransactions();
        }
    }

    // Users management methods
    async initUsersPage() {
        try {
            await this.waitForAPIService();
            await this.loadUsers();
            this.dataLoaded = true;
        } catch (error) {
            console.error('Error initializing users page:', error);
            this.showNotification('Failed to load users data', 'error');
        }
    }

    async loadUsers() {
        try {
            const response = await window.apiService.get('/api/admin/users');
            if (response.success) {
                this.users = response.data;
                this.updateUsersTable();
            } else {
                throw new Error(response.message || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Failed to load users', 'error');
        }
    }

    updateUsersTable() {
        const tableBody = document.querySelector('#usersTable tbody');
        if (!tableBody) return;

        if (this.users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }

        tableBody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm rounded-circle bg-primary text-white me-2 d-flex align-items-center justify-content-center">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-semibold">${user.name}</div>
                            <small class="text-muted">${user.email}</small>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-${this.getRoleBadgeColor(user.role)}">${user.role}</span></td>
                <td><span class="badge bg-${user.status === 'active' ? 'success' : 'warning'}">${user.status}</span></td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="window.adminManager.viewUserDetails(${user.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary" onclick="window.adminManager.editUser(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.adminManager.deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getRoleBadgeColor(role) {
        switch (role) {
            case 'admin': return 'danger';
            case 'creator': return 'primary';
            case 'viewer': return 'info';
            default: return 'secondary';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }

    // User detail methods
    async viewUserDetails(userId) {
        try {
            const response = await window.apiService.get(`/api/admin/users/${userId}`);
            if (response.success) {
                this.showUserDetailsModal(response.data);
            } else {
                throw new Error(response.message || 'Failed to load user details');
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            this.showNotification('Failed to load user details', 'error');
        }
    }

    showUserDetailsModal(user) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'userDetailsModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">User Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Basic Information</h6>
                                <table class="table table-borderless">
                                    <tr><td><strong>ID:</strong></td><td>${user.id}</td></tr>
                                    <tr><td><strong>Name:</strong></td><td>${user.name}</td></tr>
                                    <tr><td><strong>Email:</strong></td><td>${user.email}</td></tr>
                                    <tr><td><strong>Role:</strong></td><td><span class="badge bg-${this.getRoleBadgeColor(user.role)}">${user.role}</span></td></tr>
                                    <tr><td><strong>Status:</strong></td><td><span class="badge bg-${user.status === 'active' ? 'success' : 'warning'}">${user.status}</span></td></tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6>Account Details</h6>
                                <table class="table table-borderless">
                                    <tr><td><strong>Created:</strong></td><td>${this.formatDate(user.created_at)}</td></tr>
                                    <tr><td><strong>Email Verified:</strong></td><td>${user.email_verified_at ? 'Yes' : 'No'}</td></tr>
                                    <tr><td><strong>Last Login:</strong></td><td>${user.last_login ? this.formatDate(user.last_login) : 'Never'}</td></tr>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    async editUser(userId) {
        this.showNotification('Edit functionality coming soon', 'info');
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await window.apiService.delete(`/api/admin/users/${userId}`);
                if (response.success) {
                    this.showNotification('User deleted successfully', 'success');
                    await this.loadUsers();
                } else {
                    throw new Error(response.message || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showNotification('Failed to delete user', 'error');
            }
        }
    }

    // Transaction management methods
    async initTransactionHistory() {
        console.log('Initializing transaction history page');
        
        try {
            // Load transaction statistics
            await this.loadTransactionStats();
            
            // Load transactions
            await this.loadTransactions();
            
            // Setup transaction filters
            this.setupTransactionFilters();
            
        } catch (error) {
            console.error('Error initializing transaction history:', error);
            this.showNotification('Failed to load transaction data', 'error');
        }
    }

    async loadTransactionStats() {
        try {
            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
            const response = await window.apiService.get(`${apiUrl}/transactions/stats`);
            
            if (response.success) {
                const stats = response.data;
                
                // Update stats cards
                document.getElementById('totalTransactions').textContent = stats.total_transactions.toLocaleString();
                document.getElementById('totalRevenue').textContent = stats.total_revenue_formatted;
                document.getElementById('avgTransaction').textContent = stats.avg_transaction_formatted;
                document.getElementById('successRate').textContent = stats.success_rate + '%';
            }
        } catch (error) {
            console.error('Error loading transaction stats:', error);
        }
    }

    async loadTransactions(page = 1) {
        try {
            const apiUrl = window.videoHubConfig ? window.videoHubConfig.getApiUrl() : '/api';
            const response = await window.apiService.get(`${apiUrl}/transactions?page=${page}&limit=25`);
            
            if (response.success) {
                this.updateTransactionsTable(response.data.transactions);
                this.updateTransactionsPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showNotification('Failed to load transactions', 'error');
        }
    }

    updateTransactionsTable(transactions) {
        const tableBody = document.querySelector('#transactionsTable tbody');
        if (!tableBody) return;

        if (transactions.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No transactions found</td></tr>';
            return;
        }

        tableBody.innerHTML = transactions.map(transaction => `
            <tr>
                <td><code>${transaction.transaction_id}</code></td>
                <td>${transaction.buyer_name}</td>
                <td>${transaction.video_title || 'N/A'}</td>
                <td>${transaction.amount_formatted}</td>
                <td><span class="badge bg-${transaction.status_class}">${transaction.status_display}</span></td>
                <td>${transaction.payment_provider}</td>
                <td>${transaction.transaction_date_formatted}</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm" onclick="window.adminManager.viewTransactionDetails('${transaction.transaction_id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateTransactionsPagination(pagination) {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;

        const { page: currentPage, total, has_more } = pagination;
        const totalPages = Math.ceil(total / 25);

        let paginationHtml = '';
        
        // Previous button
        if (currentPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="window.adminManager.loadTransactions(${currentPage - 1})">Previous</a>
                </li>
            `;
        }
        
        // Page numbers
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="window.adminManager.loadTransactions(${i})">${i}</a>
                </li>
            `;
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="window.adminManager.loadTransactions(${currentPage + 1})">Next</a>
                </li>
            `;
        }
        
        paginationContainer.innerHTML = paginationHtml;
    }

    setupTransactionFilters() {
        // Setup filter event listeners
        console.log('Setting up transaction filters');
    }

    async viewTransactionDetails(transactionId) {
        this.showNotification('Transaction details coming soon', 'info');
    }

    // Utility methods
    loadPageSpecificHandlers() {
        if (this.handlersLoaded) return;
        
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'users.html') {
            this.setupUsersPageHandlers();
        } else if (currentPage === 'videos.html') {
            this.setupVideosPageHandlers();
        }
        
        this.handlersLoaded = true;
    }

    setupUsersPageHandlers() {
        // Add user button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn && !addUserBtn.hasAttribute('data-handler-added')) {
            addUserBtn.addEventListener('click', () => this.showAddUserModal());
            addUserBtn.setAttribute('data-handler-added', 'true');
        }
    }

    setupVideosPageHandlers() {
        // Video-specific handlers
        console.log('Setting up videos page handlers');
    }

    showAddUserModal() {
        this.showNotification('Add user functionality coming soon', 'info');
    }

    showNotification(message, type = 'info') {
        if (window.commonUtils && window.commonUtils.showToast) {
            window.commonUtils.showToast(message, type);
        } else {
            this.showAlert(message, type);
        }
    }

    showAlert(message, type) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const container = document.querySelector('.container-fluid') || document.body;
        container.insertAdjacentHTML('afterbegin', alertHtml);
    }
}

// Initialize AdminManager
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating AdminManager instance');
    if (!window.adminManager) {
        window.adminManager = new AdminManager();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}