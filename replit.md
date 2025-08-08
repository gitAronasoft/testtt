# VideoShare Platform

## Overview

VideoShare is a premium video-sharing platform that operates on a pay-per-view model. The platform allows content creators to upload and monetize their videos while viewers can discover and purchase access to premium content. The system features separate dashboards for creators and viewers, with built-in analytics, earnings tracking, and wallet functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- Video discovery and browsing
- Personal library management
- Watch history tracking
- Wallet and payment management

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