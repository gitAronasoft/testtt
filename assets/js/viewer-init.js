/**
 * Optimized initialization for Viewer Dashboard pages
 * Only loads APIs specific to each viewer page
 */

// Viewer Dashboard initialization
function initViewerDashboard() {
    console.log('Initializing viewer dashboard...');
    
    // Check authentication first
    const user = getCurrentUser();
    if (!user || user.role !== 'viewer') {
        window.location.href = '../login.html';
        return;
    }

    // Update user name in navigation
    updateUserName(user);

    // Only load videos for browsing - no stats needed
    loadBrowsingVideos();
}

// Viewer Library initialization
function initViewerLibrary() {
    console.log('Initializing viewer library...');
    
    // Check authentication first
    const user = getCurrentUser();
    if (!user || user.role !== 'viewer') {
        window.location.href = '../login.html';
        return;
    }

    // Update user name in navigation
    updateUserName(user);

    // Only load purchased videos
    loadPurchasedVideos();
}

// Viewer Settings initialization
function initViewerSettings() {
    console.log('Initializing viewer settings...');
    
    // Check authentication first
    const user = getCurrentUser();
    if (!user || user.role !== 'viewer') {
        window.location.href = '../login.html';
        return;
    }

    // Update user name in navigation
    updateUserName(user);

    // Load wallet information only for settings
    loadWalletInfo();
}

// Helper function to update user name in navigation
function updateUserName(user) {
    const nameElements = document.querySelectorAll('#navbarDropdown, [data-user-name]');
    nameElements.forEach(el => {
        if (el.textContent.includes('Viewer Name')) {
            el.innerHTML = el.innerHTML.replace('Viewer Name', user.name);
        }
    });
}

// Load videos for browsing (dashboard page only)
async function loadBrowsingVideos() {
    try {
        const videos = await API.getVideos({ limit: 20 });
        
        // Find the correct videos container - specifically the one under "Available Videos" section
        const container = document.querySelector('#videosContainer.video-grid, #videosContainer');
        if (!container) {
            console.error('Videos container not found');
            return;
        }
        
        if (videos && videos.length > 0) {
            container.innerHTML = ''; // Clear existing content
            
            videos.forEach(video => {
                const videoCard = createVideoCard(video);
                container.appendChild(videoCard);
            });
            
            // Update video count
            const countElement = document.getElementById('videoCount');
            if (countElement) {
                countElement.textContent = `${videos.length} videos found`;
            }
        } else {
            container.innerHTML = 
                '<div class="col-12 text-center"><p class="text-muted">No videos available at the moment.</p></div>';
            
            // Update video count
            const countElement = document.getElementById('videoCount');
            if (countElement) {
                countElement.textContent = '0 videos found';
            }
        }
    } catch (error) {
        console.error('Error loading videos:', error);
        const container = document.querySelector('#videosContainer.video-grid, #videosContainer');
        if (container) {
            container.innerHTML = 
                '<div class="col-12 text-center"><p class="text-danger">Error loading videos. Please try again later.</p></div>';
        }
    }
}

// Load purchased videos (library page only)
async function loadPurchasedVideos() {
    try {
        const purchases = await API.getPurchases();
        
        if (purchases && purchases.length > 0) {
            const container = document.getElementById('libraryContainer');
            if (container) {
                container.innerHTML = ''; // Clear existing content
                
                purchases.forEach(purchase => {
                    const videoCard = createLibraryVideoCard(purchase);
                    container.appendChild(videoCard);
                });
            }
        } else {
            const container = document.getElementById('libraryContainer');
            if (container) {
                container.innerHTML = 
                    '<div class="col-12 text-center"><p class="text-muted">You haven\'t purchased any videos yet.</p></div>';
            }
        }
    } catch (error) {
        console.error('Error loading library:', error);
        const container = document.getElementById('libraryContainer');
        if (container) {
            container.innerHTML = 
                '<div class="col-12 text-center"><p class="text-danger">Error loading library. Please try again later.</p></div>';
        }
    }
}

// Load wallet information (settings page only)
async function loadWalletInfo() {
    try {
        const wallet = await API.getWallet();
        
        if (wallet && wallet.success) {
            const balanceElement = document.querySelector('[data-wallet-balance]');
            if (balanceElement) {
                balanceElement.textContent = `$${parseFloat(wallet.data.balance || 0).toFixed(2)}`;
            }
        }
    } catch (error) {
        console.error('Error loading wallet info:', error);
    }
}

// Create video card for browsing
function createVideoCard(video) {
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card-item';
    
    videoCard.innerHTML = `
        <div class="card video-card border-0 shadow-sm h-100" data-video-id="${video.id}">
            <div class="video-thumbnail position-relative">
                <img src="${video.thumbnail_url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400'}" 
                     class="card-img-top" alt="${video.title}">
                <div class="video-price">$${parseFloat(video.price || 0).toFixed(2)}</div>
                <div class="play-overlay">
                    <i class="fas fa-play-circle"></i>
                </div>
            </div>
            <div class="card-body">
                <h6 class="card-title">${video.title}</h6>
                <p class="card-text text-muted small">${video.description || 'No description available'}</p>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <small class="text-muted">
                        <i class="fas fa-user me-1"></i>${video.creator_name || 'Unknown Creator'}
                    </small>
                    <small class="text-muted">${(video.views || 0).toLocaleString()} views</small>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-primary btn-sm flex-fill" onclick="purchaseVideo(${video.id})">
                        <i class="fas fa-shopping-cart me-1"></i>Purchase
                    </button>
                    <button class="btn btn-outline-secondary btn-sm btn-bookmark">
                        <i class="far fa-bookmark"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return videoCard;
}

// Create video card for library
function createLibraryVideoCard(purchase) {
    const video = purchase.video;
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card-item';
    
    videoCard.innerHTML = `
        <div class="card video-card border-0 shadow-sm h-100" data-video-id="${video.id}">
            <div class="video-thumbnail position-relative">
                <img src="${video.thumbnail_url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400'}" 
                     class="card-img-top" alt="${video.title}">
                <div class="play-overlay">
                    <i class="fas fa-play-circle"></i>
                </div>
                <div class="purchased-badge">
                    <i class="fas fa-check-circle"></i> Owned
                </div>
            </div>
            <div class="card-body">
                <h6 class="card-title">${video.title}</h6>
                <p class="card-text text-muted small">${video.description || 'No description available'}</p>
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <small class="text-muted">
                        <i class="fas fa-user me-1"></i>${video.creator_name || 'Unknown Creator'}
                    </small>
                    <small class="text-muted">Purchased: ${new Date(purchase.created_at).toLocaleDateString()}</small>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-success btn-sm flex-fill" onclick="watchVideo(${video.id})">
                        <i class="fas fa-play me-1"></i>Watch Now
                    </button>
                    <button class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return videoCard;
}

// Purchase video function
function purchaseVideo(videoId) {
    // Placeholder for purchase functionality
    alert('Purchase functionality will be implemented soon!');
}

// Watch video function
function watchVideo(videoId) {
    // Placeholder for watch functionality
    alert('Video player will be implemented soon!');
}