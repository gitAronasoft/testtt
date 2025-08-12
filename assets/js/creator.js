/**
 * VideoHub Creator Module
 * Handles creator dashboard functionality, video management, analytics, and earnings
 */

class CreatorManager {
    constructor() {
        this.videos = [];
        this.analytics = {};
        this.earnings = {};
        this.init();
    }

    init() {
        this.loadMockData();
        this.bindEvents();
        this.loadPageSpecificHandlers();
        this.initializeCharts();
    }

    loadMockData() {
        // Mock videos data
        this.videos = [
            {
                id: 1,
                title: 'JavaScript Advanced Concepts',
                description: 'Deep dive into advanced JavaScript concepts including closures, prototypes, and async programming.',
                price: 19.99,
                category: 'technology',
                duration: '45:30',
                uploadDate: '2024-03-10',
                views: 1234,
                likes: 89,
                status: 'published',
                thumbnail: 'https://via.placeholder.com/300x169/007bff/ffffff?text=JS+Advanced',
                earnings: 342.50
            },
            {
                id: 2,
                title: 'React Hooks Tutorial',
                description: 'Complete guide to React Hooks with practical examples and best practices.',
                price: 14.99,
                category: 'technology',
                duration: '32:15',
                uploadDate: '2024-03-08',
                views: 856,
                likes: 67,
                status: 'published',
                thumbnail: 'https://via.placeholder.com/300x169/28a745/ffffff?text=React+Hooks',
                earnings: 234.80
            },
            {
                id: 3,
                title: 'Node.js Best Practices',
                description: 'Learn industry best practices for building scalable Node.js applications.',
                price: 24.99,
                category: 'technology',
                duration: '38:20',
                uploadDate: '2024-03-12',
                views: 567,
                likes: 45,
                status: 'pending',
                thumbnail: 'https://via.placeholder.com/300x169/ffc107/000000?text=Node.js+Best',
                earnings: 0
            }
        ];

        // Mock earnings data
        this.earnings = {
            total: 2340.50,
            thisMonth: 456.75,
            availableForPayout: 1234.25,
            transactions: [
                {
                    id: 1,
                    date: '2024-03-15',
                    video: 'JavaScript Advanced Concepts',
                    buyer: 'john.doe@email.com',
                    amount: 19.99,
                    commission: 2.00,
                    earnings: 17.99
                },
                {
                    id: 2,
                    date: '2024-03-14',
                    video: 'React Hooks Tutorial',
                    buyer: 'jane.smith@email.com',
                    amount: 14.99,
                    commission: 1.50,
                    earnings: 13.49
                }
            ]
        };
    }

    bindEvents() {
        // Video upload events
        const uploadVideoBtn = document.getElementById('uploadVideo');
        if (uploadVideoBtn) {
            uploadVideoBtn.addEventListener('click', this.handleVideoUpload.bind(this));
        }

        const updateVideoBtn = document.getElementById('updateVideo');
        if (updateVideoBtn) {
            updateVideoBtn.addEventListener('click', this.handleVideoUpdate.bind(this));
        }

        // Earnings events
        const submitPayoutBtn = document.getElementById('submitPayout');
        if (submitPayoutBtn) {
            submitPayoutBtn.addEventListener('click', this.handlePayoutRequest.bind(this));
        }

        const payoutMethodSelect = document.getElementById('payoutMethod');
        if (payoutMethodSelect) {
            payoutMethodSelect.addEventListener('change', this.handlePayoutMethodChange.bind(this));
        }

        // Profile events
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
        }

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', this.handlePasswordChange.bind(this));
        }

        const contentPreferencesForm = document.getElementById('contentPreferencesForm');
        if (contentPreferencesForm) {
            contentPreferencesForm.addEventListener('submit', this.handleContentPreferences.bind(this));
        }

        const notificationForm = document.getElementById('notificationForm');
        if (notificationForm) {
            notificationForm.addEventListener('submit', this.handleNotificationSettings.bind(this));
        }

        // Filter events
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', this.handleApplyFilters.bind(this));
        }
    }

    loadPageSpecificHandlers() {
        const currentPage = window.location.pathname.split('/').pop();
        
        switch (currentPage) {
            case 'videos.html':
                this.loadVideosPage();
                break;
            case 'analytics.html':
                this.loadAnalyticsPage();
                break;
            case 'earnings.html':
                this.loadEarningsPage();
                break;
            case 'dashboard.html':
                this.loadDashboardPage();
                break;
        }
    }

    loadDashboardPage() {
        this.updateDashboardStats();
    }

    loadVideosPage() {
        this.renderVideosGrid();
    }

    loadAnalyticsPage() {
        this.loadAnalyticsCharts();
        this.loadTopVideosTable();
    }

    loadEarningsPage() {
        this.loadEarningsCharts();
        this.loadTopEarningVideos();
        this.loadRecentTransactions();
    }

    updateDashboardStats() {
        // Update dashboard metrics if elements exist
        const totalVideos = this.videos.length;
        const totalViews = this.videos.reduce((sum, video) => sum + video.views, 0);
        const totalEarnings = this.earnings.total;
        
        console.log('Dashboard updated:', { totalVideos, totalViews, totalEarnings });
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
                        <div class="video-price">$${video.price}</div>
                        <div class="video-overlay">
                            <i class="fas fa-play fa-2x"></i>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${video.title}</h6>
                        <p class="card-text small text-muted">${video.description.substring(0, 100)}...</p>
                        <div class="video-stats">
                            <small class="text-muted">
                                <i class="fas fa-eye me-1"></i>${video.views} views
                                <i class="fas fa-thumbs-up me-1 ms-2"></i>${video.likes} likes
                            </small>
                            <span class="badge bg-${this.getStatusBadgeColor(video.status)}">${video.status}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="creatorManager.editVideo(${video.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="creatorManager.viewAnalytics(${video.id})" title="Analytics">
                                <i class="fas fa-chart-bar"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="creatorManager.viewEarnings(${video.id})" title="Earnings">
                                <i class="fas fa-dollar-sign"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="creatorManager.deleteVideo(${video.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });
    }

    initializeCharts() {
        // Dashboard Charts
        this.initViewsChart();
        this.initRevenueSourcesChart();
        
        // Analytics Charts
        this.initViewsOverTimeChart();
        this.initTrafficSourcesChart();
        this.initDemographicsChart();
        this.initDeviceChart();
        
        // Earnings Charts
        this.initEarningsChart();
        this.initCategoryRevenueChart();
    }

    initViewsChart() {
        const ctx = document.getElementById('viewsChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Views',
                    data: [65, 89, 120, 81, 156, 155, 140],
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

    initRevenueSourcesChart() {
        const ctx = document.getElementById('revenueSourcesChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Direct Sales', 'Referrals', 'Promotions'],
                datasets: [{
                    data: [60, 30, 10],
                    backgroundColor: ['#28a745', '#007bff', '#ffc107']
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

    initViewsOverTimeChart() {
        const ctx = document.getElementById('viewsOverTimeChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Views',
                    data: [450, 620, 890, 750],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
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

    initTrafficSourcesChart() {
        const ctx = document.getElementById('trafficSourcesChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Direct', 'Search', 'Social', 'Referral'],
                datasets: [{
                    data: [40, 25, 20, 15],
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

    initDemographicsChart() {
        const ctx = document.getElementById('demographicsChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['18-24', '25-34', '35-44', '45-54', '55+'],
                datasets: [{
                    label: 'Viewers',
                    data: [23, 35, 25, 12, 5],
                    backgroundColor: '#007bff'
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

    initDeviceChart() {
        const ctx = document.getElementById('deviceChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Desktop', 'Mobile', 'Tablet'],
                datasets: [{
                    data: [55, 35, 10],
                    backgroundColor: ['#007bff', '#28a745', '#ffc107']
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

    initEarningsChart() {
        const ctx = document.getElementById('earningsChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Earnings ($)',
                    data: [320, 410, 380, 520, 480, 560],
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

    initCategoryRevenueChart() {
        const ctx = document.getElementById('categoryRevenueChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Technology', 'Education', 'Business'],
                datasets: [{
                    data: [60, 25, 15],
                    backgroundColor: ['#007bff', '#28a745', '#ffc107']
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

    loadAnalyticsCharts() {
        this.initViewsOverTimeChart();
        this.initTrafficSourcesChart();
        this.initDemographicsChart();
        this.initDeviceChart();
    }

    loadTopVideosTable() {
        const tbody = document.getElementById('topVideosTable');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        const sortedVideos = [...this.videos].sort((a, b) => b.views - a.views);
        
        sortedVideos.forEach(video => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${video.title}</td>
                <td>${video.views.toLocaleString()}</td>
                <td>${video.duration}</td>
                <td>${Math.round(Math.random() * 30 + 60)}%</td>
                <td>${video.likes}</td>
                <td>$${video.earnings.toFixed(2)}</td>
                <td>${video.uploadDate}</td>
            `;
            tbody.appendChild(row);
        });
    }

    loadEarningsCharts() {
        this.initEarningsChart();
        this.initCategoryRevenueChart();
    }

    loadTopEarningVideos() {
        const tbody = document.getElementById('topEarningVideos');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        const sortedVideos = [...this.videos].sort((a, b) => b.earnings - a.earnings);
        
        sortedVideos.forEach(video => {
            const purchases = Math.floor(video.earnings / video.price) || 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${video.title}</td>
                <td>$${video.price.toFixed(2)}</td>
                <td>${purchases}</td>
                <td>$${video.earnings.toFixed(2)}</td>
                <td>${video.uploadDate}</td>
                <td><span class="badge bg-${this.getStatusBadgeColor(video.status)}">${video.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    loadRecentTransactions() {
        const tbody = document.getElementById('recentTransactions');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.earnings.transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.date}</td>
                <td>${transaction.video}</td>
                <td>${transaction.buyer}</td>
                <td>$${transaction.amount.toFixed(2)}</td>
                <td>$${transaction.commission.toFixed(2)}</td>
                <td class="text-success">$${transaction.earnings.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Video Management Methods
    handleVideoUpload() {
        const formData = {
            title: document.getElementById('videoTitle').value,
            description: document.getElementById('videoDescription').value,
            price: parseFloat(document.getElementById('videoPrice').value),
            category: document.getElementById('videoCategory').value
        };

        if (this.validateVideoForm(formData)) {
            // Create new video
            const newVideo = {
                id: this.videos.length + 1,
                ...formData,
                duration: '00:00',
                uploadDate: new Date().toISOString().split('T')[0],
                views: 0,
                likes: 0,
                status: 'pending',
                thumbnail: `https://via.placeholder.com/300x169/6c757d/ffffff?text=${encodeURIComponent(formData.title)}`,
                earnings: 0
            };

            this.videos.push(newVideo);
            this.renderVideosGrid();
            
            // Close modal and show success
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadVideoModal'));
            modal.hide();
            this.showSuccess('Video uploaded successfully! It will be reviewed before publishing.');
            
            // Reset form
            document.getElementById('uploadVideoForm').reset();
        }
    }

    handleVideoUpdate() {
        const videoId = document.getElementById('editVideoId').value;
        const formData = {
            title: document.getElementById('editVideoTitle').value,
            description: document.getElementById('editVideoDescription').value,
            price: parseFloat(document.getElementById('editVideoPrice').value),
            category: document.getElementById('editVideoCategory').value
        };

        if (this.validateVideoForm(formData)) {
            // Update video
            const videoIndex = this.videos.findIndex(v => v.id == videoId);
            if (videoIndex !== -1) {
                this.videos[videoIndex] = { ...this.videos[videoIndex], ...formData };
                this.renderVideosGrid();
                
                // Close modal and show success
                const modal = bootstrap.Modal.getInstance(document.getElementById('editVideoModal'));
                modal.hide();
                this.showSuccess('Video updated successfully!');
            }
        }
    }

    editVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (video) {
            // Populate edit form
            document.getElementById('editVideoId').value = video.id;
            document.getElementById('editVideoTitle').value = video.title;
            document.getElementById('editVideoDescription').value = video.description;
            document.getElementById('editVideoPrice').value = video.price;
            document.getElementById('editVideoCategory').value = video.category;
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editVideoModal'));
            modal.show();
        }
    }

    deleteVideo(videoId) {
        if (confirm('Are you sure you want to delete this video?')) {
            this.videos = this.videos.filter(v => v.id !== videoId);
            this.renderVideosGrid();
            this.showSuccess('Video deleted successfully!');
        }
    }

    viewAnalytics(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (video) {
            alert(`Analytics for "${video.title}":\nViews: ${video.views}\nLikes: ${video.likes}\nStatus: ${video.status}`);
        }
    }

    viewEarnings(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (video) {
            const purchases = Math.floor(video.earnings / video.price) || 0;
            alert(`Earnings for "${video.title}":\nPurchases: ${purchases}\nEarnings: $${video.earnings.toFixed(2)}`);
        }
    }

    // Earnings Methods
    handlePayoutRequest() {
        const amount = parseFloat(document.getElementById('payoutAmount').value);
        const method = document.getElementById('payoutMethod').value;
        const details = document.getElementById('accountDetails').value;

        if (amount < 50) {
            this.showError('Minimum payout amount is $50.00');
            return;
        }

        if (amount > this.earnings.availableForPayout) {
            this.showError('Amount exceeds available balance');
            return;
        }

        if (!method) {
            this.showError('Please select a payout method');
            return;
        }

        if (!details.trim()) {
            this.showError('Please provide account details');
            return;
        }

        // Process payout request
        const modal = bootstrap.Modal.getInstance(document.getElementById('payoutModal'));
        modal.hide();
        this.showSuccess(`Payout request of $${amount.toFixed(2)} submitted successfully!`);
        
        // Reset form
        document.getElementById('payoutForm').reset();
    }

    handlePayoutMethodChange() {
        const method = document.getElementById('payoutMethod').value;
        const detailsDiv = document.getElementById('payoutDetails');
        
        if (method) {
            detailsDiv.style.display = 'block';
            const placeholder = this.getPayoutPlaceholder(method);
            document.getElementById('accountDetails').placeholder = placeholder;
        } else {
            detailsDiv.style.display = 'none';
        }
    }

    getPayoutPlaceholder(method) {
        const placeholders = {
            paypal: 'Enter your PayPal email address',
            bank: 'Enter your bank account details (routing number, account number)',
            crypto: 'Enter your cryptocurrency wallet address'
        };
        return placeholders[method] || 'Enter your account details';
    }

    // Profile and Settings Methods
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

    handleContentPreferences(e) {
        e.preventDefault();
        this.showSuccess('Content preferences saved successfully!');
    }

    handleNotificationSettings(e) {
        e.preventDefault();
        this.showSuccess('Notification settings updated successfully!');
    }

    handleApplyFilters() {
        this.showInfo('Filters applied successfully!');
    }

    // Utility Methods
    validateVideoForm(formData) {
        if (!formData.title.trim()) {
            this.showError('Video title is required!');
            return false;
        }
        if (formData.price < 0) {
            this.showError('Price cannot be negative!');
            return false;
        }
        if (!formData.category) {
            this.showError('Category is required!');
            return false;
        }
        return true;
    }

    getStatusBadgeColor(status) {
        const colors = {
            published: 'success',
            pending: 'warning',
            rejected: 'danger',
            draft: 'secondary'
        };
        return colors[status] || 'secondary';
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
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

// Initialize creator manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.creatorManager = new CreatorManager();
});
