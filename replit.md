# VideoHub - Video Management Platform

## Overview

VideoHub is a comprehensive video management platform that enables video content monetization, user management, and analytics tracking. The system provides distinct interfaces for three user roles: administrators (platform management), creators (content upload and monetization), and viewers (content consumption and purchases). The platform features a role-based authentication system, payment processing, video streaming capabilities, and comprehensive analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Multi-Page Application (MPA)**: Traditional HTML pages with JavaScript modules for enhanced interactivity
- **Role-Based UI Structure**: Separate interface directories for admin, creator, and viewer roles
- **Modular JavaScript Architecture**: Component-based JS modules (AuthManager, APIService, NotificationManager, etc.)
- **Bootstrap 5 Framework**: Responsive design with custom CSS theming and modal system
- **Configuration-Based Deployment**: Flexible base path configuration for root domain or subfolder deployment

### Authentication & Authorization
- **Session-Based Authentication**: JWT tokens stored in localStorage/sessionStorage
- **Role-Based Access Control (RBAC)**: Three distinct user roles with protected routes
- **Multi-Step Registration**: Email verification followed by password setup
- **Password Recovery Flow**: Email-based password reset with token validation
- **Auth Guard System**: Route protection with automatic redirects based on user role

### Backend Integration
- **RESTful API Design**: Centralized APIService class handling all backend communications
- **PHP Backend Expected**: API endpoints structured for PHP server-side implementation
- **Configurable Base URLs**: Dynamic API URL construction based on deployment configuration
- **Error Handling**: Comprehensive error management with user-friendly notifications

### Data Management
- **Client-Side State Management**: Global state management for cached data and loading states
- **Local Storage Utilization**: User sessions and preferences stored client-side
- **API Response Caching**: TTL-based caching system to prevent duplicate API calls
- **Optimistic Updates**: Immediate UI updates with server synchronization

### Video Handling
- **YouTube Integration**: YouTube Data API v3 for video uploads and metadata management
- **Embedded Player**: YouTube iframe player with custom controls and monetization
- **Video Metadata**: Title, description, pricing, and analytics stored separately from video files
- **Purchase System**: Pay-per-view model with transaction tracking

### UI/UX Design Patterns
- **Design System**: Consistent color palette with CSS custom properties
- **Toast Notifications**: Non-intrusive user feedback system
- **Modal Workflows**: Complex forms and video viewing in overlay modals
- **Responsive Tables**: DataTables integration for data-heavy admin interfaces
- **Loading States**: Skeleton loaders and progress indicators for better UX

### Payment Processing
- **Demo Payment System**: Simulated payment flows for development/testing
- **Multiple Payment Methods**: Support for cards, PayPal, and digital wallets
- **Transaction Management**: Purchase history and earnings tracking
- **Processing Fees**: Configurable fee structure for different payment methods

## External Dependencies

### Frontend Libraries
- **Bootstrap 5.3.0**: UI framework for responsive design and components
- **Font Awesome 6.0.0**: Icon library for consistent iconography
- **DataTables**: Advanced table functionality with sorting, filtering, and pagination
- **Google Fonts (Inter)**: Typography system for modern, readable text

### APIs and Services
- **YouTube Data API v3**: Video upload, metadata management, and player embedding
- **Google OAuth 2.0**: Authentication flow for YouTube integration
- **Payment Gateway APIs**: Integration points for Stripe, PayPal, and other processors

### Backend Requirements
- **PHP Server**: Expected backend implementation for API endpoints
- **Database System**: User management, video metadata, transactions, and analytics storage
- **File Storage**: Video thumbnails, user avatars, and other media assets
- **Email Service**: SMTP integration for verification emails and notifications

### Development Tools
- **CDN Dependencies**: External hosting for CSS/JS libraries to reduce bundle size
- **HTTPS Required**: Secure connections needed for payment processing and OAuth flows
- **Cross-Browser Compatibility**: Support for modern browsers with fallbacks for older versions

## Recent Changes

### August 2025
- Successfully migrated VideoHub from Replit Agent to standard Replit environment
- **MAJOR UPDATE**: Completely replaced mock payment system with real Stripe integration
- Installed Stripe PHP library via Composer and configured environment variables
- Created comprehensive StripeService class for secure payment processing
- Implemented real Payment Intents API for one-time video purchases
- Created MySQL database tables for Stripe payment logging and transaction tracking
- Updated frontend to use Stripe.js library with proper card element integration
- Removed all demo/mock payment code and notifications for production readiness
- Fixed API routing issues and ensured proper base path configuration
- Enhanced payment security with proper error handling and validation
- Fixed critical admin panel navigation issues preventing proper user detail page access
- Replaced all alert/confirm dialogs with professional Bootstrap modal confirmations
- Enhanced admin video page with comprehensive filtering, pagination, and search functionality
- Removed dummy login credentials from authentication pages for security
- Implemented robust error handling and API response validation for video data loading
- Updated logout system to use confirmation modals across all user interfaces
- Added proper null checking and type validation for improved stability
- **CODEBASE OPTIMIZATION**: Comprehensive cleanup completed
  - Removed 4 redundant JavaScript files (948 lines of duplicate code)
  - Consolidated profile management into single unified system
  - Eliminated deployment-config.js in favor of centralized config.js
  - Streamlined authentication and removed unused functionality
  - Optimized file structure from 17 to 14 JavaScript files
  - Improved maintainability and reduced complexity significantly

### December 2024
- Initial admin panel structure implementation
- Basic video management interface setup
- User authentication system foundation