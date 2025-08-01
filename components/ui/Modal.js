
class Modal {
    constructor(id, options = {}) {
        this.id = id;
        this.options = {
            title: options.title || 'Modal',
            size: options.size || 'modal-lg',
            backdrop: options.backdrop !== false,
            keyboard: options.keyboard !== false,
            ...options
        };
        this.instance = null;
    }

    create() {
        // Remove existing modal if it exists
        const existing = document.getElementById(this.id);
        if (existing) existing.remove();

        const modalHTML = `
            <div class="modal fade" id="${this.id}" tabindex="-1" aria-labelledby="${this.id}Title" aria-hidden="true">
                <div class="modal-dialog ${this.options.size}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${this.id}Title">${this.options.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="${this.id}Body">
                            <!-- Content will be inserted here -->
                        </div>
                        ${this.options.showFooter !== false ? `
                        <div class="modal-footer" id="${this.id}Footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return this;
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
            this.instance = new bootstrap.Modal(modalElement, {
                backdrop: this.options.backdrop,
                keyboard: this.options.keyboard
            });
            this.instance.show();
        }
        return this;
    }

    hide() {
        if (this.instance) {
            this.instance.hide();
        }
        return this;
    }

    onShow(callback) {
        const modalElement = document.getElementById(this.id);
        if (modalElement) {
            modalElement.addEventListener('shown.bs.modal', callback);
        }
        return this;
    }

    onHide(callback) {
        const modalElement = document.getElementById(this.id);
        if (modalElement) {
            modalElement.addEventListener('hidden.bs.modal', callback);
        }
        return this;
    }

    destroy() {
        if (this.instance) {
            this.instance.dispose();
        }
        const modalElement = document.getElementById(this.id);
        if (modalElement) {
            modalElement.remove();
        }
    }
}

// Video Player Modal
class VideoPlayerModal extends Modal {
    constructor() {
        super('videoPlayerModal', {
            title: 'Video Player',
            size: 'modal-xl',
            showFooter: false
        });
    }

    playVideo(video) {
        this.create();
        this.setTitle(video.title);

        let videoContent;
        if (video.youtube_id) {
            videoContent = `
                <div class="ratio ratio-16x9">
                    <iframe src="https://www.youtube.com/embed/${video.youtube_id}?autoplay=1" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                    </iframe>
                </div>
            `;
        } else {
            videoContent = `
                <div class="ratio ratio-16x9">
                    <video controls autoplay class="w-100 h-100">
                        <source src="${video.file_path || '#'}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
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
            size: 'modal-md'
        });
    }

    showPurchase(video, onConfirm) {
        this.create();

        const bodyContent = `
            <div class="text-center">
                <div class="mb-3">
                    <i class="fas fa-shopping-cart text-primary fa-3x"></i>
                </div>
                <h5>${video.title}</h5>
                <p class="text-muted">${video.description?.substring(0, 100)}...</p>
                <div class="alert alert-info">
                    <strong>Price: $<span id="purchasePrice">${video.price.toFixed(2)}</span></strong>
                </div>
                <p class="small text-muted">
                    By purchasing this video, you will have unlimited access to watch it.
                </p>
            </div>
        `;

        const footerContent = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="confirmPurchaseBtn">
                <i class="fas fa-credit-card me-2"></i>Purchase Now
            </button>
        `;

        this.setBody(bodyContent);
        this.setFooter(footerContent);
        this.show();

        // Attach confirm handler
        const confirmBtn = document.getElementById('confirmPurchaseBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
                onConfirm();
            };
        }
    }
}

// Export for global use
window.Modal = Modal;
window.VideoPlayerModal = VideoPlayerModal;
window.PurchaseModal = PurchaseModal;
