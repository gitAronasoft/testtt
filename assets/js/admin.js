/**
 * VideoHub Admin Panel Module
 * Handles admin dashboard functionality, user management, video moderation, and analytics
 */

class AdminManager {
    constructor() {
        this.users = [];
        this.videos = [];
        this.analytics = {};
        this.init();
    }

    init() {
        this.loadMockData();
        this.bindEvents();
        this.loadPageSpecificHandlers();
        this.initializeCharts();
    }

    loadMockData() {
        // Mock users data
        this.users = [
            {
                id: 1,
                firstName: 'John',
                lastName: 'Creator',
                email: 'john.creator@email.com',
                type: 'creator',
                status: 'active',
                joinDate: '2024-01-15',
                videosCount: 12,
                earnings: '$2,340'
            },
            {
                id: 2,
                firstName: 'Jane',
                lastName: 'Viewer',
                email: 'jane.viewer@email.com',
                type: 'viewer',
                status: 'active',
                joinDate: '2024-02-08',
                videosCount: 0,
                earnings: '$0'
            },
            {
                id: 3,
                firstName: 'Mike',
                lastName: 'Producer',
                email: 'mike.producer@email.com',
                type: 'creator',
                status: 'active',
                joinDate: '2024-01-22',
                videosCount: 8,
                earnings: '$1,890'
            },
            {
                id: 4,
                firstName: 'Sarah',
                lastName: 'Student',
                email: 'sarah.student@email.com',
                type: 'viewer',
                status: 'inactive',
                joinDate: '2024-03-01',
                videosCount: 0,
                earnings: '$0'
            }
        ];

        // Mock videos data
        this.videos = [
            {
                id: 1,
                title: 'JavaScript Advanced Concepts',
                creator: 'John Creator',
                duration: '45:30',
                uploadDate: '2024-03-10',
                views: 1234,
                price: '$19.99',
                status: 'published',
                category: 'technology',
                thumbnail: 'https://via.placeholder.com/300x169/007bff/ffffff?text=JS+Advanced'
            },
            {
                id: 2,
                title: 'React Hooks Tutorial',
                creator: 'John Creator',
                duration: '32:15',
                uploadDate: '2024-03-08',
                views: 856,
                price: '$14.99',
                status: 'published',
                category: 'technology',
                thumbnail: 'https://via.placeholder.com/300x169/28a745/ffffff?text=React+Hooks'
            },
            {
                id: 3,
                title: 'Business Strategy Fundamentals',
                creator: 'Mike Producer',
                duration: '28:45',
                uploadDate: '2024-03-12',
                views: 234,
                price: '$24.99',
                status: 'pending',
                category: 'business',
                thumbnail: 'https://via.placeholder.com/300x169/ffc107/000000?text=Business+Strategy'
            }
        ];
    }

    bindEvents() {
        // User management events
        const saveUserBtn = document.getElementById('saveUser');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', this.handleSaveUser.bind(this));
        }

        const updateUserBtn = document.getElementById('updateUser');
        if (updateUserBtn) {
            updateUserBtn.addEventListener('click', this.handleUpdateUser.bind(this));
        }

        // Video management events
        const approveVideoBtn = document.getElementById('approveVideo');
        if (approveVideoBtn) {
            approveVideoBtn.addEventListener('click', this.handleApproveVideo.bind(this));
        }

        const rejectVideoBtn = document.getElementById('rejectVideo');
        if (rejectVideoBtn) {
            rejectVideoBtn.addEventListener('click', this.handleRejectVideo.bind(this));
        }

        const flagVideoBtn = document.getElementById('flagVideo');
        if (flagVideoBtn) {
            flagVideoBtn.addEventListener('click', this.handleFlagVideo.bind(this));
        }

        // Filter events
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', this.handleApplyFilters.bind(this));
        }

        // Profile form events
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
        }

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', this.handlePasswordChange.bind(this));
        }

        // System settings
        const systemSettingsForm = document.getElementById('systemSettingsForm');
        if (systemSettingsForm) {
            systemSettingsForm.addEventListener('submit', this.handleSystemSettings.bind(this));
        }

        // Backup
        const startBackupBtn = document.getElementById('startBackup');
        if (startBackupBtn) {
            startBackupBtn.addEventListener('click', this.handleStartBackup.bind(this));
        }
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'users.html':
                this.loadUsersPage();
                break;
            case 'videos.html':
                this.loadVideosPage();
                break;
            case 'analytics.html':
                this.loadAnalyticsPage();
                break;
            case 'dashboard.html':
                this.loadDashboardPage();
                break;
        }
    }

    loadUsersPage() {
        this.renderUsersTable();
    }

    loadVideosPage() {
        this.renderVideosGrid();
    }

    loadDashboardPage() {
        this.updateDashboardStats();
    }

    loadAnalyticsPage() {
        this.loadAnalyticsCharts();
    }

    renderUsersTable() {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${this.getUserTypeBadgeColor(user.type)}">${user.type}</span></td>
                <td><span class="badge bg-${this.getStatusBadgeColor(user.status)}">${user.status}</span></td>
                <td>${user.joinDate}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="adminManager.editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="adminManager.deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="adminManager.viewUserDetails(${user.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderVideosGrid() {
        const grid = document.getElementById('videosGrid');
        if (!grid) return;

        grid.innerHTML = '';
        
        this.videos.forEach(video => {
            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6 mb-4';
            col.innerHTML = `
                <div class="card video-card h-100">
                    <div class="video-thumbnail">
                        <img src="${video.thumbnail}" class="card-img-top" alt="${video.title}">
                        <div class="video-duration">${video.duration}</div>
                        <div class="video-price">${video.price}</div>
                        <div class="video-overlay">
                            <i class="fas fa-play fa-2x"></i>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${video.title}</h6>
                        <p class="card-text video-creator">By ${video.creator}</p>
                        <div class="video-stats">
                            <small class="text-muted">
                                <i class="fas fa-eye me-1"></i>${video.views} views
                            </small>
                            <span class="badge bg-${this.getStatusBadgeColor(video.status)}">${video.status}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="adminManager.viewVideoDetails(${video.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="adminManager.approveVideo(${video.id})">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="adminManager.rejectVideo(${video.id})">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    }

    updateDashboardStats() {
        // Update summary cards would happen here if they exist
        console.log('Dashboard stats updated');
    }

    initializeCharts() {
        // Dashboard Charts
        this.initUserRegistrationChart();
        this.initUserTypesChart();
        
        // Analytics Charts
        this.initRevenueChart();
        this.initVideoUploadChart();
        this.initCategoriesChart();
        this.initUserDistributionChart();
    }

    initUserRegistrationChart() {
        const ctx = document.getElementById('userRegistrationChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'New Users',
                    data: [12, 19, 13, 25, 22, 30],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initUserTypesChart() {
        const ctx = document.getElementById('userTypesChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Viewers', 'Creators', 'Admins'],
                datasets: [{
                    data: [70, 25, 5],
                    backgroundColor: ['#007bff', '#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initRevenueChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: [3200, 4100, 3800, 5200, 4800, 5600],
                    backgroundColor: '#28a745',
                    borderColor: '#1e7e34',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    initVideoUploadChart() {
        const ctx = document.getElementById('videoUploadChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Videos Uploaded',
                    data: [8, 12, 15, 10],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initCategoriesChart() {
        const ctx = document.getElementById('categoriesChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Technology', 'Education', 'Business', 'Design'],
                datasets: [{
                    data: [35, 30, 20, 15],
                    backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initUserDistributionChart() {
        const ctx = document.getElementById('userDistributionChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Viewers', 'Creators'],
                datasets: [{
                    data: [78, 22],
                    backgroundColor: ['#17a2b8', '#6f42c1']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    loadAnalyticsCharts() {
        // Load all analytics charts
        this.initRevenueChart();
        this.initVideoUploadChart();
        this.initCategoriesChart();
        this.initUserDistributionChart();
    }

    // User Management Methods
    handleSaveUser() {
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            userType: document.getElementById('userType').value,
            status: document.getElementById('status').value
        };

        if (this.validateUserForm(formData)) {
            // Add new user
            const newUser = {
                id: this.users.length + 1,
                ...formData,
                type: formData.userType,
                joinDate: new Date().toISOString().split('T')[0],
                videosCount: 0,
                earnings: '$0'
            };

            this.users.push(newUser);
            this.renderUsersTable();
            
            // Close modal and show success
            const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
            modal.hide();
            this.showSuccess('User added successfully!');
            
            // Reset form
            document.getElementById('addUserForm').reset();
        }
    }

    handleUpdateUser() {
        const userId = document.getElementById('editUserId').value;
        const formData = {
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            email: document.getElementById('editEmail').value,
            type: document.getElementById('editUserType').value,
            status: document.getElementById('editStatus').value
        };

        if (this.validateUserForm(formData)) {
            // Update user
            const userIndex = this.users.findIndex(u => u.id == userId);
            if (userIndex !== -1) {
                this.users[userIndex] = { ...this.users[userIndex], ...formData };
                this.renderUsersTable();
                
                // Close modal and show success
                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                modal.hide();
                this.showSuccess('User updated successfully!');
            }
        }
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            // Populate edit form
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editFirstName').value = user.firstName;
            document.getElementById('editLastName').value = user.lastName;
            document.getElementById('editEmail').value = user.email;
            document.getElementById('editUserType').value = user.type;
            document.getElementById('editStatus').value = user.status;
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        }
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            this.users = this.users.filter(u => u.id !== userId);
            this.renderUsersTable();
            this.showSuccess('User deleted successfully!');
        }
    }

    viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            alert(`User Details:\nName: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nType: ${user.type}\nStatus: ${user.status}`);
        }
    }

    // Video Management Methods
    viewVideoDetails(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (video) {
            // Populate modal with video details
            document.getElementById('modalVideoTitle').textContent = video.title;
            document.getElementById('modalVideoCreator').textContent = video.creator;
            document.getElementById('modalVideoDuration').textContent = video.duration;
            document.getElementById('modalVideoDate').textContent = video.uploadDate;
            document.getElementById('modalVideoViews').textContent = video.views;
            document.getElementById('modalVideoPrice').textContent = video.price;
            document.getElementById('modalVideoStatus').innerHTML = `<span class="badge bg-${this.getStatusBadgeColor(video.status)}">${video.status}</span>`;
            document.getElementById('modalVideoThumbnail').src = video.thumbnail;
            document.getElementById('modalVideoDescription').textContent = 'This is a sample description for the video content.';
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('videoDetailsModal'));
            modal.show();
        }
    }

    handleApproveVideo() {
        this.showSuccess('Video approved successfully!');
        const modal = bootstrap.Modal.getInstance(document.getElementById('videoDetailsModal'));
        modal.hide();
    }

    handleRejectVideo() {
        this.showSuccess('Video rejected!');
        const modal = bootstrap.Modal.getInstance(document.getElementById('videoDetailsModal'));
        modal.hide();
    }

    handleFlagVideo() {
        this.showWarning('Video flagged for review!');
        const modal = bootstrap.Modal.getInstance(document.getElementById('videoDetailsModal'));
        modal.hide();
    }

    approveVideo(videoId) {
        const videoIndex = this.videos.findIndex(v => v.id === videoId);
        if (videoIndex !== -1) {
            this.videos[videoIndex].status = 'published';
            this.renderVideosGrid();
            this.showSuccess('Video approved and published!');
        }
    }

    rejectVideo(videoId) {
        if (confirm('Are you sure you want to reject this video?')) {
            const videoIndex = this.videos.findIndex(v => v.id === videoId);
            if (videoIndex !== -1) {
                this.videos[videoIndex].status = 'rejected';
                this.renderVideosGrid();
                this.showSuccess('Video rejected!');
            }
        }
    }

    // Settings and Profile Methods
    handleProfileUpdate(e) {
        e.preventDefault();
        this.showSuccess('Profile updated successfully!');
    }

    handlePasswordChange(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword !== confirmPassword) {
            this.showError('Passwords do not match!');
            return;
        }

        if (newPassword.length < 8) {
            this.showError('Password must be at least 8 characters long!');
            return;
        }

        this.showSuccess('Password changed successfully!');
        e.target.reset();
    }

    handleSystemSettings(e) {
        e.preventDefault();
        this.showSuccess('System settings saved successfully!');
    }

    handleStartBackup() {
        const includeVideos = document.getElementById('includeVideos').checked;
        const modal = bootstrap.Modal.getInstance(document.getElementById('backupModal'));
        modal.hide();
        
        this.showSuccess('Backup started! You will be notified when complete.');
    }

    handleApplyFilters() {
        // Apply filters to current view
        this.showInfo('Filters applied!');
    }

    // Utility Methods
    validateUserForm(formData) {
        if (!formData.firstName.trim()) {
            this.showError('First name is required!');
            return false;
        }
        if (!formData.lastName.trim()) {
            this.showError('Last name is required!');
            return false;
        }
        if (!formData.email.trim()) {
            this.showError('Email is required!');
            return false;
        }
        if (!formData.userType) {
            this.showError('User type is required!');
            return false;
        }
        return true;
    }

    getUserTypeBadgeColor(type) {
        const colors = {
            admin: 'danger',
            creator: 'success',
            viewer: 'primary'
        };
        return colors[type] || 'secondary';
    }

    getStatusBadgeColor(status) {
        const colors = {
            active: 'success',
            inactive: 'warning',
            suspended: 'danger',
            published: 'success',
            pending: 'warning',
            rejected: 'danger',
            flagged: 'danger'
        };
        return colors[status] || 'secondary';
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showWarning(message) {
        this.showToast(message, 'warning');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    showToast(message, type = 'info') {
        // Use the common toast functionality
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize admin manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});
