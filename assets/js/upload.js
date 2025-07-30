
// Upload page specific functions
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleVideoUpload();
        });
    }

    // Setup drag and drop
    setupDragAndDrop();
});

// Handle video upload
function handleVideoUpload() {
    const fileInput = document.getElementById('videoFile');
    const title = document.querySelector('input[name="title"]').value;
    const description = document.querySelector('textarea[name="description"]').value;
    const tags = document.querySelector('input[name="tags"]').value;
    const price = document.querySelector('input[name="price"]').value;
    const isFree = document.querySelector('input[name="is_free"]').checked;
    const category = document.querySelector('select[name="category"]').value;

    if (!fileInput.files[0]) {
        showAlert('Please select a video file', 'error');
        return;
    }

    if (!title.trim()) {
        showAlert('Please enter a video title', 'error');
        return;
    }

    // Show progress bar
    document.getElementById('uploadProgress').style.display = 'block';
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressText').textContent = `Uploading... ${progress}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                showAlert('Video uploaded successfully!', 'success');
                document.getElementById('uploadProgress').style.display = 'none';
                document.getElementById('uploadForm').reset();
                document.getElementById('uploadText').textContent = '📹 Click here or drag and drop your video file';
                
                // Redirect to dashboard after successful upload
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            }, 500);
        }
    }, 200);
}

// Handle file selection
function handleFileSelect(input) {
    const file = input.files[0];
    if (file) {
        // Check file size (2GB limit)
        const maxSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
        if (file.size > maxSize) {
            showAlert('File size exceeds 2GB limit', 'error');
            input.value = '';
            return;
        }

        // Check file type
        const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo'];
        if (!allowedTypes.includes(file.type)) {
            showAlert('Please select a valid video file (MP4, AVI, MOV)', 'error');
            input.value = '';
            return;
        }

        document.getElementById('uploadText').textContent = `Selected: ${file.name}`;
        
        // Auto-fill title if empty
        const titleInput = document.querySelector('input[name="title"]');
        if (!titleInput.value) {
            const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            titleInput.value = fileName.replace(/[_-]/g, ' '); // Replace underscores and dashes with spaces
        }
    }
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    const uploadArea = document.querySelector('.upload-area');
    
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#5a67d8';
            this.style.background = 'rgba(102, 126, 234, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.style.borderColor = '#667eea';
            this.style.background = 'rgba(102, 126, 234, 0.05)';
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#667eea';
            this.style.background = 'rgba(102, 126, 234, 0.05)';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const fileInput = document.getElementById('videoFile');
                fileInput.files = files;
                handleFileSelect(fileInput);
            }
        });
    }
}

// Preview video before upload
function previewVideo(file) {
    const videoPreview = document.createElement('video');
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.controls = true;
    videoPreview.style.width = '100%';
    videoPreview.style.maxHeight = '300px';
    videoPreview.style.marginTop = '1rem';
    
    // Remove existing preview
    const existingPreview = document.querySelector('.video-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // Add new preview
    videoPreview.className = 'video-preview';
    document.querySelector('.upload-area').appendChild(videoPreview);
}

// Cancel upload
function cancelUpload() {
    if (confirm('Are you sure you want to cancel the upload?')) {
        window.location.href = 'dashboard.html';
    }
}

console.log('Upload functions loaded successfully');
