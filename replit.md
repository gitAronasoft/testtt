# VideoShare Platform

## Overview

VideoShare is a premium video-sharing platform that operates on a pay-per-view model. The platform allows content creators to upload and monetize their videos while viewers can discover and purchase access to premium content. The system features separate dashboards for creators and viewers, with built-in analytics, earnings tracking, and wallet functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Complete App Flow - August 8, 2025)

✓ **Migration Status**: Successfully migrated from Replit Agent to Replit environment
✓ **Runtime Environment**: Installed Python 3.11 for static server functionality  
✓ **Navigation System**: Fixed authentication redirects to proper directory structure
✓ **Asset Management**: Added SVG favicon and proper linking across all HTML files
✓ **Static Server**: Configured and running on port 5000 with proper file serving
✓ **Client Security**: Maintained proper client/server separation with CDN dependencies
✓ **Dashboard Navigation**: Fixed menu links with proper data-section attributes
✓ **JavaScript Functions**: Added missing handleRating and handleBookmark functions
✓ **Logout System**: Updated logout functionality to work from dashboard subdirectories
✓ **Code Structure**: Created centralized config.js for better maintainability
✓ **Dashboard Sections**: Added all missing content sections for proper navigation
✓ **Developer Experience**: Added comprehensive README.md and clear code organization
✓ **Configuration Management**: Centralized all constants, routes, and settings
✓ **Complete Page Coverage**: All individual creator and viewer pages now exist and work
✓ **Consistent Logout**: All pages use logout-link class with proper authentication clearing
✓ **Missing Pages Created**: Added comprehensive viewer-settings.html page
✓ **Universal Config**: All pages now include config.js for consistent functionality
✓ **Favicon Links**: Added favicon references to all individual pages
✓ **Seamless Navigation**: Dashboard sections now properly redirect to individual pages
✓ **Authentication Flow**: Fixed all localStorage usage to use CONFIG constants
✓ **Viewer Simplification**: Streamlined viewer dashboard to focus on core use case (August 8, 2025)
✓ **Removed Complexity**: Eliminated unnecessary pages and sections (categories, trending, history, subscriptions)
✓ **Core Focus**: Simplified to Browse Videos, My Library, Wallet, and Settings only
✓ **User Experience**: Clean, focused interface for video discovery and payment workflow
✓ **Creator Dashboard Fix**: Removed placeholder sections and fixed navigation to individual pages (August 8, 2025)
✓ **Complete Content**: All creator pages (Settings, Earnings, Analytics) now have full functionality instead of placeholders
✓ **Viewer Navigation Fix**: Changed viewer dashboard navigation from hash-based sections to proper page redirects (August 8, 2025)
✓ **Clean Structure**: Viewer dashboard now only shows Browse Videos section, other features accessed via individual pages
✓ **Simplified Experience**: Removed duplicate sections and hash navigation for better user flow

## System Architecture

### Frontend Architecture
The application uses a **multi-page HTML architecture** with shared JavaScript modules for common functionality. Each major user flow (authentication, creator dashboard, viewer dashboard) has dedicated HTML pages with corresponding JavaScript files for specialized functionality.

**Key Design Decisions:**
- **Bootstrap 5 Framework**: Chosen for responsive design and rapid UI development
- **Vanilla JavaScript**: Used instead of heavy frameworks for better performance and simplicity
- **Modular JavaScript Structure**: Separate files for authentication (`auth.js`), dashboard functionality (`dashboard.js`), and global features (`main.js`)
- **CDN-Based Dependencies**: External libraries (Bootstrap, Font Awesome, Chart.js) loaded via CDN for faster initial development

### Authentication System
The platform implements a **client-side authentication simulation** for development purposes, with demo accounts for testing different user roles.

**Authentication Features:**
- Role-based access (Creator vs Viewer)
- Form validation with Bootstrap styling
- Password recovery functionality
- Session management simulation
- Remember me functionality

### Dashboard Architecture
The system provides **dual dashboard experiences** based on user roles:

**Creator Dashboard:**
- Video upload and management interface
- Analytics charts using Chart.js
- Earnings tracking and monetization metrics
- Content performance analytics

**Viewer Dashboard:**
- Video discovery and browsing (Browse Videos section)
- Personal library management (My Library section)
- Wallet and payment management (Wallet section)  
- Account settings and preferences (Settings section)

### Data Management
Currently implements **client-side data simulation** for development, designed to be easily replaceable with backend API calls.

**Data Structures:**
- User profiles with role-based permissions
- Video metadata and content management
- Transaction and earnings tracking
- View analytics and engagement metrics

### User Experience Design
The platform prioritizes **responsive design** and **intuitive navigation** across all device types.

**UI/UX Decisions:**
- Consistent navigation pattern across all pages
- Card-based layouts for content organization
- Interactive charts for data visualization
- Form validation with immediate feedback
- Mobile-first responsive design approach

## External Dependencies

### Frontend Libraries
- **Bootstrap 5.3.0**: UI framework for responsive design and components
- **Font Awesome 6.0.0**: Icon library for consistent iconography
- **Chart.js**: JavaScript charting library for analytics visualization

### Development Tools
- **CDN Delivery**: All external libraries loaded via CDN for rapid prototyping
- **Vanilla JavaScript**: No additional build tools or transpilation required

### Future Backend Integration Points
The frontend is structured to easily integrate with:
- RESTful API endpoints for user authentication
- File upload services for video content
- Payment processing systems for monetization
- Database systems for data persistence
- Video streaming and transcoding services

### Browser Compatibility
- Modern browsers with ES6+ support
- Mobile browsers for responsive functionality
- Progressive enhancement for older browser fallbacks