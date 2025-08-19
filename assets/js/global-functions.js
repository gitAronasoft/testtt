/**
 * Global Functions for VideoHub
 * Contains global utility functions accessible from all pages
 */

// Global function to navigate to user details page
function viewUserDetailsPage(userId) {
    if (userId) {
        window.location.href = `user-detail.html?id=${userId}`;
    } else {
        console.error('User ID is required to view user details');
    }
}

// Global function to watch video in modal
function watchVideo(youtubeId, title = '') {
    if (!youtubeId) {
        console.error('YouTube ID is required to watch video');
        return;
    }
    
    // Create or show modal for video viewing
    let modal = document.getElementById('videoModal');
    if (!modal) {
        // Create modal if it doesn't exist
        modal = document.createElement('div');
        modal.id = 'videoModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="ratio ratio-16x9">
                            <iframe id="videoFrame" src="" frameborder="0" allowfullscreen></iframe>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Update video source
    const iframe = modal.querySelector('#videoFrame');
    iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;
    
    // Update title
    const modalTitle = modal.querySelector('.modal-title');
    modalTitle.textContent = title || 'Video Player';
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Clear iframe when modal is hidden
    modal.addEventListener('hidden.bs.modal', function() {
        iframe.src = '';
    });
}

// Global function to export users
function exportUsers() {
    if (window.adminManager && typeof window.adminManager.exportUsers === 'function') {
        window.adminManager.exportUsers();
    } else {
        console.warn('Export function not available');
    }
}

// Global function to show confirmation modal
function showGlobalConfirmModal(message, onConfirm, title = 'Confirm Action') {
    let modal = document.getElementById('globalConfirmModal');
    if (!modal) {
        // Create modal if it doesn't exist
        modal = document.createElement('div');
        modal.id = 'globalConfirmModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p id="globalConfirmMessage">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="globalConfirmBtn">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Update message and title
    modal.querySelector('#globalConfirmMessage').textContent = message;
    modal.querySelector('.modal-title').textContent = title;
    
    // Set up confirm button
    const confirmBtn = modal.querySelector('#globalConfirmBtn');
    confirmBtn.onclick = function() {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        bootstrapModal.hide();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    };
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}