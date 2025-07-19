# Environment Configuration Guide

This frontend application supports multiple environments for easy switching between local development and cloud deployment.

## 🚀 Quick Start

### Automatic Detection
The application automatically detects the environment:
- **Development**: Uses `http://localhost:8000` when running `npm start`
- **Production**: Uses the deployed backend URL when deployed to GitHub Pages

### Manual Override (Development Only)
When running in development mode, you'll see an environment switcher in the top-right corner:
- Click **DEV** to use localhost:8000
- Click **PROD** to use the deployed backend

## 🔧 Configuration Options

### 1. Environment Variables
Create a `.env` file in the frontend directory:

```bash
# Force a specific environment
REACT_APP_ENVIRONMENT=development  # or production

# Or override the API URL directly
REACT_APP_API_BASE_URL=http://localhost:8000
```

### 2. Configuration File
Edit `src/config.js` to modify the URLs:

```javascript
const config = {
  development: {
    API_BASE_URL: "http://localhost:8000",
    ENVIRONMENT: "development"
  },
  production: {
    API_BASE_URL: "http://your-backend-url.com",
    ENVIRONMENT: "production"
  }
};
```

## 📋 Environment Priority

The application checks for the environment in this order:

1. **Direct API URL override** (`REACT_APP_API_BASE_URL`)
2. **User preference** (stored in localStorage, development only)
3. **Environment variable** (`REACT_APP_ENVIRONMENT`)
4. **Auto-detection** (based on `NODE_ENV`)
5. **Default** (production)

## 🎯 Use Cases

### Local Development
```bash
npm start
# Automatically uses localhost:8000
# Use the environment switcher to test with production backend
```

### Testing Production Backend Locally
1. Start the development server: `npm start`
2. Click the **PROD** button in the environment switcher
3. The app will reload and use the deployed backend

### Custom Backend URL
```bash
# In .env file
REACT_APP_API_BASE_URL=http://your-custom-backend.com
```

## 🔍 Troubleshooting

### Environment Switcher Not Visible
- Only appears in development mode (`npm start`)
- Won't show in production builds

### Configuration Not Working
1. Check that the `.env` file is in the frontend root directory
2. Restart the development server after changing environment variables
3. Clear localStorage if switching environments manually

### API Connection Issues
- Verify the backend URL is correct and accessible
- Check CORS settings on the backend
- Ensure the backend is running (for local development)

## 📝 Notes

- Environment preferences are stored in localStorage and persist between sessions
- The environment switcher only appears in development mode for security
- Production deployments always use the production configuration
- Changes to `config.js` require a rebuild to take effect 