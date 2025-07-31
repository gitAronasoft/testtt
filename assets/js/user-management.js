
// User Management functionality
let users = [];
let filteredUsers = [];
let currentPage = 1;
let usersPerPage = 10;
let selectedUsers = new Set();

document.addEventListener('DOMContentLoaded', function() {
    // Check admin access
    const userRole = localStorage.getItem('userRole') || 'viewer';
    if (userRole !== 'admin') {
        showAlert('Access denied. This page is for admins only.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    initializeUserManagement();
});

function initializeUserManagement() {
    loadUsers();
    updateUserStats();
    setupEventListeners();
}

function setupEventListeners() {
    const searchInput = document.getElementById('userSearchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const subscriptionFilter = document.getElementById('subscriptionFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyUserFilters, 300));
    }
    if (roleFilter) {
        roleFilter.addEventListener('change', applyUserFilters);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', applyUserFilters);
    }
    if (subscriptionFilter) {
        subscriptionFilter.addEventListener('change', applyUserFilters);
    }
}

function loadUsers() {
    // Generate sample users data
    users = [
        {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            role: 'admin',
            status: 'active',
            plan: 'pro',
            joinDate: '2024-01-15',
            lastLogin: '2024-12-30'
        },
        {
            id: 2,
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'editor',
            status: 'active',
            plan: 'premium',
            joinDate: '2024-02-20',
            lastLogin: '2024-12-29'
        },
        {
            id: 3,
            name: 'Bob Wilson',
            email: 'bob@example.com',
            role: 'viewer',
            status: 'active',
            plan: 'free',
            joinDate: '2024-03-10',
            lastLogin: '2024-12-28'
        },
        {
            id: 4,
            name: 'Alice Johnson',
            email: 'alice@example.com',
            role: 'viewer',
            status: 'inactive',
            plan: 'premium',
            joinDate: '2024-04-05',
            lastLogin: '2024-12-15'
        },
        {
            id: 5,
            name: 'Charlie Brown',
            email: 'charlie@example.com',
            role: 'editor',
            status: 'suspended',
            plan: 'free',
            joinDate: '2024-05-12',
            lastLogin: '2024-11-20'
        }
    ];

    filteredUsers = [...users];
    renderUsers();
    updatePagination();
}

function updateUserStats() {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const premiumUsers = users.filter(u => u.plan === 'premium' || u.plan === 'pro').length;
    const newUsers = users.filter(u => {
        const joinDate = new Date(u.joinDate);
        const currentDate = new Date();
        const monthAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
        return joinDate >= monthAgo;
    }).length;

    document.getElementById('totalUsersCount').textContent = totalUsers;
    document.getElementById('activeUsersCount').textContent = activeUsers;
    document.getElementById('premiumUsersCount').textContent = premiumUsers;
    document.getElementById('newUsersCount').textContent = newUsers;
}

function renderUsers() {
    const tbody = document.getElementById('userTableBody');
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToShow = filteredUsers.slice(startIndex, endIndex);

    tbody.innerHTML = usersToShow.map(user => `
        <tr>
            <td>
                <input type="checkbox" value="${user.id}" onchange="toggleUserSelection(${user.id})" 
                       ${selectedUsers.has(user.id) ? 'checked' : ''}>
            </td>
            <td>
                <div class="user-info">
                    <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                    <div>
                        <strong>${user.name}</strong>
                        <small>Last login: ${formatDate(user.lastLogin)}</small>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${getRoleIcon(user.role)} ${user.role}</span></td>
            <td><span class="status-badge ${user.status}">${user.status}</span></td>
            <td><span class="plan-badge ${user.plan}">${getPlanIcon(user.plan)} ${user.plan}</span></td>
            <td>${formatDate(user.joinDate)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-link" onclick="editUserModal(${user.id})" title="Edit">✏️</button>
                    <button class="btn-link" onclick="viewUserDetails(${user.id})" title="View">👁️</button>
                    <button class="btn-link" onclick="confirmDeleteUser(${user.id})" title="Delete">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Update showing count
    const totalFiltered = filteredUsers.length;
    const showing = Math.min(endIndex, totalFiltered);
    document.getElementById('showingCount').textContent = `${startIndex + 1}-${showing}`;
    document.getElementById('totalCount').textContent = totalFiltered;
}

function applyUserFilters() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const subscriptionFilter = document.getElementById('subscriptionFilter').value;

    filteredUsers = users.filter(user => {
        const matchesSearch = !searchTerm || 
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm);
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus = !statusFilter || user.status === statusFilter;
        const matchesSubscription = !subscriptionFilter || user.plan === subscriptionFilter;

        return matchesSearch && matchesRole && matchesStatus && matchesSubscription;
    });

    currentPage = 1;
    renderUsers();
    updatePagination();
}

function clearUserFilters() {
    document.getElementById('userSearchInput').value = '';
    document.getElementById('roleFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('subscriptionFilter').value = '';
    
    filteredUsers = [...users];
    currentPage = 1;
    renderUsers();
    updatePagination();
    
    showNotification('All filters cleared', 'info');
}

function clearUserSearch() {
    document.getElementById('userSearchInput').value = '';
    applyUserFilters();
}

function addNewUser() {
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const role = document.getElementById('newUserRole').value;
    const plan = document.getElementById('newUserPlan').value;
    const sendWelcome = document.getElementById('sendWelcomeEmail').checked;

    if (!name || !email || !role) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showAlert('A user with this email already exists', 'error');
        return;
    }

    const newUser = {
        id: users.length + 1,
        name: name,
        email: email,
        role: role,
        status: 'active',
        plan: plan,
        joinDate: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);
    filteredUsers = [...users];

    // Clear form
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserRole').value = '';
    document.getElementById('newUserPlan').value = 'free';
    document.getElementById('sendWelcomeEmail').checked = false;

    closeModal('addUserModal');
    updateUserStats();
    renderUsers();
    updatePagination();

    showNotification(`User ${name} added successfully${sendWelcome ? ' and welcome email sent' : ''}`, 'success');
}

function editUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editUserStatus').value = user.status;
    document.getElementById('editUserPlan').value = user.plan;

    showModal('editUserModal');
}

function updateUser() {
    const userId = parseInt(document.getElementById('editUserId').value);
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const role = document.getElementById('editUserRole').value;
    const status = document.getElementById('editUserStatus').value;
    const plan = document.getElementById('editUserPlan').value;

    if (!name || !email || !role || !status) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        showAlert('User not found', 'error');
        return;
    }

    // Check if email already exists for another user
    if (users.some(u => u.id !== userId && u.email.toLowerCase() === email.toLowerCase())) {
        showAlert('A user with this email already exists', 'error');
        return;
    }

    users[userIndex] = {
        ...users[userIndex],
        name: name,
        email: email,
        role: role,
        status: status,
        plan: plan
    };

    filteredUsers = [...users];
    closeModal('editUserModal');
    updateUserStats();
    renderUsers();

    showNotification(`User ${name} updated successfully`, 'success');
}

function confirmDeleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
        deleteUserById(userId);
    }
}

function deleteUser() {
    const userId = parseInt(document.getElementById('editUserId').value);
    const user = users.find(u => u.id === userId);
    
    if (confirm(`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`)) {
        deleteUserById(userId);
        closeModal('editUserModal');
    }
}

function deleteUserById(userId) {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const userName = users[userIndex].name;
    users.splice(userIndex, 1);
    filteredUsers = [...users];
    selectedUsers.delete(userId);

    updateUserStats();
    renderUsers();
    updatePagination();

    showNotification(`User ${userName} deleted successfully`, 'success');
}

function toggleUserSelection(userId) {
    if (selectedUsers.has(userId)) {
        selectedUsers.delete(userId);
    } else {
        selectedUsers.add(userId);
    }
    
    updateSelectAllCheckbox();
}

function toggleSelectAll() {
    const checkbox = document.getElementById('selectAllCheckbox');
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const currentPageUsers = filteredUsers.slice(startIndex, endIndex);

    if (checkbox.checked) {
        currentPageUsers.forEach(user => selectedUsers.add(user.id));
    } else {
        currentPageUsers.forEach(user => selectedUsers.delete(user.id));
    }

    renderUsers();
}

function updateSelectAllCheckbox() {
    const checkbox = document.getElementById('selectAllCheckbox');
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const currentPageUsers = filteredUsers.slice(startIndex, endIndex);
    
    const allSelected = currentPageUsers.every(user => selectedUsers.has(user.id));
    const someSelected = currentPageUsers.some(user => selectedUsers.has(user.id));
    
    checkbox.checked = allSelected;
    checkbox.indeterminate = someSelected && !allSelected;
}

function bulkDeleteUsers() {
    if (selectedUsers.size === 0) {
        showAlert('Please select users to delete', 'warning');
        return;
    }

    if (confirm(`Are you sure you want to delete ${selectedUsers.size} selected user(s)? This action cannot be undone.`)) {
        const deletedCount = selectedUsers.size;
        selectedUsers.forEach(userId => {
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                users.splice(userIndex, 1);
            }
        });

        selectedUsers.clear();
        filteredUsers = [...users];
        updateUserStats();
        renderUsers();
        updatePagination();

        showNotification(`${deletedCount} user(s) deleted successfully`, 'success');
    }
}

function exportUsers() {
    const dataStr = JSON.stringify(filteredUsers, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showNotification('User data exported successfully', 'success');
}

function refreshUsers() {
    showNotification('Refreshing user data...', 'info');
    setTimeout(() => {
        loadUsers();
        updateUserStats();
        showNotification('User data refreshed', 'success');
    }, 1000);
}

function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageNumbers = document.getElementById('pageNumbers');

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    // Generate page numbers
    let pageNumbersHTML = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbersHTML += `
            <button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" 
                    onclick="goToPage(${i})">${i}</button>
        `;
    }

    pageNumbers.innerHTML = pageNumbersHTML;
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderUsers();
        updatePagination();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderUsers();
        updatePagination();
    }
}

function goToPage(page) {
    currentPage = page;
    renderUsers();
    updatePagination();
}

// Utility functions
function getRoleIcon(role) {
    const icons = {
        'admin': '🛡️',
        'editor': '✏️',
        'viewer': '👁️'
    };
    return icons[role] || '👤';
}

function getPlanIcon(plan) {
    const icons = {
        'free': '🆓',
        'premium': '💎',
        'pro': '⭐'
    };
    return icons[plan] || '📦';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function viewUserDetails(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    showNotification(`Viewing details for ${user.name}`, 'info');
    // Here you could open a detailed view modal
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Use existing notification system
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

function showAlert(message, type) {
    alert(message);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

function updateNavUser() {
    const userName = localStorage.getItem('userName') || 'Admin';
    document.getElementById('navUserName').textContent = userName;
    document.getElementById('navUserAvatar').textContent = userName.charAt(0).toUpperCase();
}

// Initialize nav user info when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateNavUser();
});

console.log('User Management system loaded');
