# VideoHub Deployment Configuration

## Quick Setup

To configure VideoHub for different deployment scenarios, simply edit the `deployment-config.js` file in the root directory.

### Option 1: Root Domain Deployment
```javascript
// For https://yourdomain.com/
BASE_PATH: '',
```

### Option 2: Subfolder Deployment
```javascript
// For https://yourdomain.com/video-platform/
BASE_PATH: '/video-platform',

// For https://yourdomain.com/apps/videohub/
BASE_PATH: '/apps/videohub',
```

### Option 3: Auto-Detection
```javascript
// Let the system automatically detect the path (works in most cases)
BASE_PATH: 'auto',
```

## How It Works

1. **Global Configuration**: The `deployment-config.js` file sets the `VIDEOHUB_DEPLOYMENT_CONFIG.BASE_PATH` variable.

2. **Automatic Loading**: All HTML pages load this config before other scripts, ensuring consistent behavior.

3. **API Calls**: The `APIService` class automatically uses the configured base path for all API calls.

4. **Navigation**: All internal links use the configured path for seamless navigation.

## Example Configurations

### Root Domain
```javascript
window.VIDEOHUB_DEPLOYMENT_CONFIG = {
    BASE_PATH: ''  // https://yourdomain.com/
};
```

### Subfolder
```javascript
window.VIDEOHUB_DEPLOYMENT_CONFIG = {
    BASE_PATH: '/video-platform'  // https://yourdomain.com/video-platform/
};
```

## Testing Different Configurations

1. Open `deployment-config.js`
2. Change the `BASE_PATH` value
3. Save the file
4. Refresh your browser
5. All API calls and navigation will use the new path

## Files That Use This Configuration

- All HTML pages in `auth/`, `admin/`, `creator/`, and `viewer/` folders
- `assets/js/api.js` - API service for backend communication
- `assets/js/config.js` - Configuration management
- `index.html` - Landing page

The system is designed to work seamlessly regardless of where you deploy VideoHub on your server.