
class Modal {
    constructor(id, options = {}) {
        this.id = id;
        this.options = {
            title: options.title || 'Modal',
            size: options.size || 'max-w-lg',
            backdrop: options.backdrop !== false,
            keyboard: options.keyboard !== false,
            showFooter: options.showFooter !== false,
            ...options
        };
        this.instance = null;
        this.isOpen = false;
    }

    create() {
        // Remove existing modal if it exists
        const existing = document.getElementById(this.id);
        if (existing) existing.remove();

        const modalHTML = `
            <div class="fixed inset-0 z-50 ${this.id}" id="${this.id}" style="display: none;">
                <!-- Backdrop -->
                <div class="fixed inset-0 bg-background/80 backdrop-blur-sm" id="${this.id}_backdrop"></div>
                
                <!-- Modal -->
                <div class="fixed left-1/2 top-1/2 z-50 w-full ${this.options.size} -translate-x-1/2 -translate-y-1/2 duration-200" 
                     id="${this.id}_container">
                    <div class="card shadow-lg border animate-fade-in">
                        <div class="card-header border-b">
                            <div class="flex items-center justify-between">
                                <h3 class="card-title" id="${this.id}Title">${this.options.title}</h3>
                                <button class="btn btn-ghost btn-sm" id="${this.id}_close">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-content" id="${this.id}Body">
                            <!-- Content will be inserted here -->
                        </div>
                        ${this.options.showFooter ? `
                        <div class="card-footer border-t" id="${this.id}Footer">
                            <div class="flex justify-end gap-2">
                                <button class="btn btn-outline" data-modal-close>Cancel</button>
                                <button class="btn btn-default" id="${this.id}_confirm">Confirm</button>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachEventListeners();
        return this;
    }

    attachEventListeners() {
        const modal = document.getElementById(this.id);
        const backdrop = document.getElementById(`${this.id}_backdrop`);
        const closeBtn = document.getElementById(`${this.id}_close`);
        const closeBtns = modal.querySelectorAll('[data-modal-close]');

        // Close on backdrop click
        if (this.options.backdrop) {
            backdrop.onclick = () => this.hide();
        }

        // Close on close button click
        closeBtn.onclick = () => this.hide();
        
        // Close on cancel buttons
        closeBtns.forEach(btn => {
            btn.onclick = () => this.hide();
        });

        // Close on escape key
        if (this.options.keyboard) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.hide();
                }
            });
        }
    }

    setTitle(title) {
        const titleElement = document.getElementById(`${this.id}Title`);
        if (titleElement) titleElement.textContent = title;
        return this;
    }

    setBody(content) {
        const bodyElement = document.getElementById(`${this.id}Body`);
        if (bodyElement) {
            if (typeof content === 'string') {
                bodyElement.innerHTML = content;
            } else {
                bodyElement.innerHTML = '';
                bodyElement.appendChild(content);
            }
        }
        return this;
    }

    setFooter(content) {
        const footerElement = document.getElementById(`${this.id}Footer`);
        if (footerElement) {
            if (typeof content === 'string') {
                footerElement.innerHTML = content;
            } else {
                footerElement.innerHTML = '';
                footerElement.appendChild(content);
            }
        }
        return this;
    }

    show() {
        const modalElement = document.getElementById(this.id);
        if (modalElement) {
            modalElement.style.display = 'block';
            this.isOpen = true;
            document.body.style.overflow = 'hidden';
            
            // Trigger animation
            requestAnimationFrame(() => {
                modalElement.classList.add('animate-fade-in');
            });
        }
        return this;
    }

    hide() {
        const modalElement = document.getElementById(this.id);
        if (modalElement) {
            modalElement.style.display = 'none';
            this.isOpen = false;
            document.body.style.overflow = '';
        }
        return this;
    }

    onShow(callback) {
        // Store callback for when modal is shown
        this._onShowCallback = callback;
        return this;
    }

    onHide(callback) {
        // Store callback for when modal is hidden
        this._onHideCallback = callback;
        return this;
    }

    onConfirm(callback) {
        const confirmBtn = document.getElementById(`${this.id}_confirm`);
        if (confirmBtn) {
            confirmBtn.onclick = callback;
        }
        return this;
    }

    destroy() {
        const modalElement = document.getElementById(this.id);
        if (modalElement) {
            modalElement.remove();
        }
        this.isOpen = false;
        document.body.style.overflow = '';
    }
}

// Video Player Modal
class VideoPlayerModal extends Modal {
    constructor() {
        super('videoPlayerModal', {
            title: 'Video Player',
            size: 'max-w-4xl',
            showFooter: false
        });
    }

    playVideo(video) {
        this.create();
        this.setTitle(video.title);

        let videoContent;
        if (video.youtube_id) {
            videoContent = `
                <div class="relative w-full" style="aspect-ratio: 16/9;">
                    <iframe src="https://www.youtube.com/embed/${video.youtube_id}?autoplay=1" 
                            class="absolute inset-0 w-full h-full rounded"
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                    </iframe>
                </div>
                <div class="mt-4">
                    <p class="text-sm text-muted-foreground line-clamp-3">${video.description || 'No description available'}</p>
                    <div class="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                        <span>By ${video.uploader}</span>
                        <span>${video.views?.toLocaleString() || 0} views</span>
                    </div>
                </div>
            `;
        } else {
            videoContent = `
                <div class="relative w-full" style="aspect-ratio: 16/9;">
                    <video controls autoplay class="w-full h-full rounded">
                        <source src="${video.file_path || '#'}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
                <div class="mt-4">
                    <p class="text-sm text-muted-foreground line-clamp-3">${video.description || 'No description available'}</p>
                    <div class="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                        <span>By ${video.uploader}</span>
                        <span>${video.views?.toLocaleString() || 0} views</span>
                    </div>
                </div>
            `;
        }

        this.setBody(videoContent);
        this.show();

        // Clean up on hide
        this.onHide(() => {
            setTimeout(() => this.destroy(), 200);
        });
    }
}

// Purchase Confirmation Modal
class PurchaseModal extends Modal {
    constructor() {
        super('purchaseModal', {
            title: 'Confirm Purchase',
            size: 'max-w-md',
            showFooter: true
        });
    }

    showPurchase(video, onConfirm) {
        this.create();

        const bodyContent = `
            <div class="text-center">
                <div class="mb-4">
                    <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <i class="fas fa-shopping-cart text-primary text-2xl"></i>
                    </div>
                </div>
                <h4 class="font-semibold mb-2">${video.title}</h4>
                <p class="text-sm text-muted-foreground mb-4 line-clamp-2">${video.description?.substring(0, 100) || 'No description'}...</p>
                <div class="alert alert-default mb-4">
                    <div class="text-center">
                        <span class="text-lg font-bold">$${video.price?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
                <p class="text-xs text-muted-foreground">
                    By purchasing this video, you will have unlimited access to watch it.
                </p>
            </div>
        `;

        const footerContent = `
            <div class="flex justify-end gap-2 w-full">
                <button class="btn btn-outline" data-modal-close>Cancel</button>
                <button class="btn btn-default" id="confirmPurchaseBtn">
                    <i class="fas fa-credit-card mr-2"></i>
                    Purchase Now
                </button>
            </div>
        `;

        this.setBody(bodyContent);
        this.setFooter(footerContent);
        this.show();

        // Attach confirm handler
        const confirmBtn = document.getElementById('confirmPurchaseBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<div class="loading-spinner mr-2"></div>Processing...';
                onConfirm();
            };
        }
    }
}

// Export for global use
window.Modal = Modal;
window.VideoPlayerModal = VideoPlayerModal;
window.PurchaseModal = PurchaseModal;
