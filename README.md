# VideoShare Platform

A premium video-sharing platform with pay-per-view functionality, featuring separate dashboards for content creators and viewers.

## 🚀 Getting Started

### Quick Setup
1. Clone or download the project
2. Run the static server: `python -m http.server 5000`
3. Open browser to `http://localhost:5000`

### Demo Accounts
- **Creator**: `creator@demo.com` / `password123`
- **Viewer**: `viewer@demo.com` / `password123`

## 📁 Project Structure

```
/
├── assets/
│   ├── css/styles.css          # Main styles
│   └── js/
│       ├── config.js           # Configuration & constants
│       ├── auth.js             # Authentication system
│       ├── dashboard.js        # Dashboard functionality
│       └── main.js             # Global functionality
├── creator/                    # Creator dashboard pages
│   └── creator-dashboard.html  # Main creator dashboard
├── viewer/                     # Viewer dashboard pages  
│   └── viewer-dashboard.html   # Main viewer dashboard
├── index.html                  # Homepage
├── login.html                  # Login page
└── signup.html                 # Signup page
```

## 🛠️ Development

### Code Architecture

**Frontend Framework**: Vanilla JavaScript + Bootstrap 5
- **Modular Design**: Separate JS files for different functionality
- **Configuration Management**: Centralized config in `config.js`
- **Role-based Routing**: Different dashboards for creators/viewers
- **Responsive Design**: Mobile-first approach with Bootstrap

### Key Files

- **`config.js`**: Contains all configuration, routes, demo accounts, and utility functions
- **`auth.js`**: Handles login, signup, password reset, and session management
- **`dashboard.js`**: Manages dashboard navigation, charts, and user interactions
- **`main.js`**: Global functionality and homepage features

### Adding New Features

1. **New Dashboard Section**: Add to `CONFIG.SECTIONS` in `config.js`
2. **New Route**: Add to `CONFIG.ROUTES` in `config.js`  
3. **New Demo Account**: Add to `CONFIG.DEMO_ACCOUNTS` in `config.js`
4. **UI Settings**: Modify `CONFIG.UI` values for timeouts, delays, etc.

### Code Standards

- **Clear Function Names**: Use descriptive names like `handleLogin()`, `switchSection()`
- **Consistent Structure**: All JS files follow the same pattern with initialization functions
- **Error Handling**: Use try/catch blocks and proper error messages
- **Comments**: Document functions with JSDoc-style comments
- **Configuration**: Use CONFIG constants instead of hardcoded values

## 🎯 Features

### Authentication
- Login/Signup with form validation
- Role-based access (Creator/Viewer)
- Session management
- Password visibility toggle
- Remember me functionality

### Creator Dashboard
- Video upload interface
- Analytics with Chart.js integration
- Earnings tracking
- Content management
- Performance metrics

### Viewer Dashboard
- Video discovery and browsing
- Personal library management
- Watch history
- Wallet and payment management
- Subscription tracking

## 🔧 Configuration

All configuration is centralized in `assets/js/config.js`:

- **Routes**: Page URLs and navigation paths
- **Demo Accounts**: Test users with different roles
- **UI Settings**: Timeouts, delays, and interface behavior
- **Storage Keys**: LocalStorage key names
- **Sections**: Available dashboard sections per role

## 🚀 Deployment

This is a static frontend ready for deployment on:
- Replit (current setup)
- Netlify, Vercel, GitHub Pages
- Any static hosting service
- CDN or web server

### Backend Integration

The frontend is designed for easy backend integration:
- Replace `simulate*()` functions in `auth.js` with real API calls
- Update `CONFIG.ROUTES` for production URLs
- Replace demo accounts with real user management
- Add real payment processing for wallet functionality

## 🔒 Security Notes

- Demo accounts are for development only
- All authentication is client-side simulation
- No real payment processing implemented
- Ready for HTTPS deployment and real security implementation

## 📱 Browser Support

- Modern browsers with ES6+ support
- Mobile browsers (responsive design)
- Bootstrap 5 compatible browsers

## 🤝 Contributing

When making changes:

1. Update `replit.md` with architectural changes
2. Follow existing code patterns and naming conventions
3. Test with both creator and viewer demo accounts
4. Update configuration in `config.js` when needed
5. Maintain responsive design principles

---

**Version**: 1.0.0  
**Last Updated**: August 8, 2025  
**Status**: Development Ready