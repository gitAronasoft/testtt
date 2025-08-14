# VideoHub - Video Management Platform

## Overview
VideoHub is a comprehensive video management platform designed for creators, viewers, and administrators. It enables video content monetization, user management, and analytics tracking through a multi-role architecture. The project's vision is a simple web application for demo purposes, without overly complex analytics or payout features, focusing on a streamlined user experience.

## User Preferences
Preferred communication style: Simple, everyday language.
Project focus: Simple web app for demo purposes without complex analytics or payout features.
Design preference: Improved and streamlined layout structure.
Viewer interface: Simplified dashboard with metrics and all videos section. Removed browse videos page and menu items for cleaner navigation.
Purchases page: Removed metrics and recent purchases sections, keeping only all purchased videos section.
Data loading: Migrated from JSON files to PHP/MySQL backend with user's existing database.
Settings pages: Removed "Viewing Activity" section from viewer profile page and "Your Stats" section from creator profile page for cleaner interface.
UI/UX improvements: Enhanced all user panels with modern Bootstrap styling, consistent navigation, improved card designs, and sleek auth forms.
Modal design: Completed comprehensive modal redesign with simple, sleek Bootstrap styling across all user roles. Standardized modal structure with clean headers, proper theme colors (admin: primary/warning, creator: success, viewer: primary), streamlined form elements, and consistent button layouts. Improved content alignment and removed complex styling in favor of modern, accessible design. All modals now feature: clean 8px border radius, minimal shadows, consistent spacing, and role-appropriate color schemes (August 14, 2025).
Video upload flow: Videos must upload directly to YouTube channel, then sync with database for metrics and embedded display with YouTube ID. UI should not show connection button but maintain seamless YouTube integration (August 13, 2025).
Authentication improvements: Enhanced user experience by implementing silent background authentication verification. Removed visible "verifying" process on panel pages and added automatic logout functionality when verification fails during periodic checks or page visibility changes. Authentication now works seamlessly without interrupting user workflow (August 14, 2025).
Migration to Replit: Successfully migrated from Replit Agent to Replit environment. Fixed YouTube upload token handling by simplifying token refresh logic, corrected database sync field mapping (uploader_id vs user_id), and aligned video creation fields with actual database schema by removing non-existent duration and file_size columns. Fixed viewer panel video players to use proper YouTube ID from database instead of extracting from thumbnails, and standardized embedded YouTube player implementation across dashboard and purchases pages. Resolved YouTube ID synchronization issue where youtube_id field wasn't being saved to database during video uploads by adding youtube_id field handling to videos API POST endpoint and simplified dashboard video player to use same direct watchVideo() approach as purchases page. Completed forgot password functionality by implementing backend endpoints for password reset token creation/verification, enhanced EmailService with password reset email templates, updated frontend to use real API calls instead of simulations, and fixed JavaScript syntax errors. Migration tracking completed with all checklist items marked as done (August 13, 2025).

## System Architecture

### Frontend Architecture
- **Pure HTML/CSS/JavaScript**: Client-side implementation using vanilla JavaScript modules.
- **Bootstrap 5**: CSS framework for responsive design and UI components.
- **Font Awesome**: Icon library for consistent iconography.
- **Chart.js**: Data visualization library for analytics dashboards.
- **Modular JavaScript**: Organized into separate modules (e.g., auth.js, admin.js, creator.js, viewer.js, payment.js, common.js).

### Multi-Role User Interface
- **Role-based Access Control**: Distinct interfaces for admin (dark theme), creator (green theme), and viewer (primary blue theme) with tailored functionality and consistent sidebar navigation.
- **Landing Page**: Marketing-focused homepage with user registration/login.
- **Unified Branding**: Consistent VideoHub branding across all user panels.

### Technical Implementations
- **Backend**: PHP 8.1.33 with REST API endpoints.
- **Database**: MariaDB 10.11.10.
- **Authentication**: Full database authentication with JWT tokens, including registration, login, and session management.
- **Email Verification**: SMTP email verification system.
- **Dynamic Metrics System**: Real-time statistics fetched from `/api/metrics` endpoints.
- **YouTube Integration**: Comprehensive YouTube video upload system with OAuth2 and real-time synchronization of video metadata from VideoHub to YouTube.
- **Payment Processing**: Functional pay-to-watch system with purchase modals, multiple payment methods, and access control.
- **Codebase Optimization**: Page-specific API loading, removal of static placeholder content, and elimination of redundant API calls.
- **Profile System**: Standardized user profile functionality across all panels using `SimpleProfileManager`.
- **Loading Spinners**: Consistent Bootstrap loading spinners for all dashboard metrics.
- **Enhanced Modal System**: Modern, sleek Bootstrap modals with gradient headers, improved spacing, icon integration, input groups with clean borders, shadow effects, and consistent theming across admin (primary/warning/danger), creator (success/warning), and viewer (success/primary) panels.

## External Dependencies

### Frontend Libraries
- **Bootstrap 5.3.0**: UI framework and responsive grid system.
- **Font Awesome 6.0.0**: Icon font library.
- **Chart.js**: For data visualization.

### Content Delivery
- **Bootstrap CDN**: For CSS and JavaScript.
- **Font Awesome CDN**: For icon fonts.

### Core Integrations
- **PHP/MySQL Backend**: Primary data persistence and API layer.
- **YouTube Data API v3**: For video uploads and synchronization.
- **SMTP**: For email verification functionality.