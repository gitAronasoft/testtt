# VideoShare Platform

## Overview
VideoShare is a premium video-sharing platform operating on a pay-per-view model. It enables content creators to upload and monetize videos, while viewers can purchase access to premium content. The platform features separate, streamlined dashboards for creators and viewers, including analytics, earnings tracking, and wallet functionality. The business vision is to provide a clean, focused interface for video discovery, consumption, and monetization, emphasizing user experience and efficient workflows.

## Recent Changes
**API Optimization Completed (August 11, 2025):**
- Optimized API calls to eliminate unnecessary requests
- Implemented page-specific initialization scripts for targeted data loading
- Creator Videos page now only calls videos API for specific creator
- Creator Earnings page only calls stats API for earnings data
- Viewer Library page only calls videos API for purchased content
- Removed redundant platform stats calls from individual pages
- Added cache-busting parameters to prevent browser caching issues
- All pages now load only the specific data they need for display

**Migration Completed (August 11, 2025):**
- Successfully migrated from Replit Agent to Replit environment
- Installed PHP 8.2 and Python 3.11 for backend and frontend servers
- Created backend API structure with authentication endpoints
- Added configuration files (config.js, api.js) for proper API communication
- Fixed JavaScript dependencies and authentication system
- Set up dual workflows: Static Server (port 5000) and PHP API Server (port 8000)
- All authentication functions working with demo credentials

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application utilizes a multi-page HTML architecture, with shared JavaScript modules for common functionality. Key decisions include using Bootstrap 5 for responsive design, Vanilla JavaScript for performance and simplicity, and a modular JavaScript structure (`auth.js`, `dashboard.js`, `main.js`). All external libraries are loaded via CDN.

### Authentication System
The platform features a secure authentication system with JWT authentication and role-based access (Creator vs Viewer). It includes password hashing, input validation, and proper error handling.

### Dashboard Architecture
The system provides dual dashboard experiences tailored to user roles:
- **Creator Dashboard:** Focuses on core metrics like total videos, video purchases, earnings, and recent activity, with comprehensive earnings and settings pages.
- **Viewer Dashboard:** Streamlined to focus on essential functionality: browsing videos, managing "My Library," wallet management, and account settings.

### Data Management
The system is built with a clean, normalized database schema supporting users, videos, purchases, wallets, ratings, and administrative functions. It uses a MySQL database for production environments and can be configured with SQLite for local development.

### User Experience Design
Prioritizes responsive design and intuitive navigation across all devices. UI/UX decisions include consistent navigation, card-based layouts, interactive charts, immediate form validation feedback, and a mobile-first approach with comprehensive responsive design. Modern UI enhancements like gradients, animations, glass morphism effects, and improved styling are implemented across all pages.

### Technical Implementation
The frontend is built with HTML, CSS, and Vanilla JavaScript. The backend is implemented in PHP with RESTful API endpoints, connecting to a MySQL database using `mysqli`. The system employs a clear separation between client and server, focusing on efficient data exchange and secure API interactions.

## External Dependencies

### Frontend Libraries
- **Bootstrap 5.3.0**: UI framework for responsive design and components.
- **Font Awesome 6.0.0**: Icon library for consistent iconography.
- **Chart.js**: JavaScript charting library for analytics visualization.

### Backend Components
- **PHP**: Server-side scripting language for backend logic and API.
- **MySQL**: Production database for data persistence.

### Development Tools
- **CDN Delivery**: All external libraries loaded via CDN.

### Integrations
- **Payment Processing Systems**: Designed for future integration.
- **Video Streaming and Transcoding Services**: Planned for future integration.