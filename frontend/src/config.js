// Environment configuration for API endpoints
const config = {
  // Development environment (local)
  development: {
    API_BASE_URL: "http://localhost:8000",
    ENVIRONMENT: "development"
  },
  
  // Production environment (cloud) - Using HTTP temporarily (HTTPS has connectivity issues)
  production: {
    API_BASE_URL: "http://bpmn-backend.eba-nkwvxj2u.us-east-2.elasticbeanstalk.com",
    ENVIRONMENT: "production"
  }
};

// Determine current environment
const getCurrentEnvironment = () => {
  // Check for direct API URL override first
  if (process.env.REACT_APP_API_BASE_URL) {
    return 'custom';
  }
  
  // Check localStorage for user preference (only in development)
  if (process.env.NODE_ENV === 'development') {
    const storedEnv = localStorage.getItem('preferredEnvironment');
    if (storedEnv && (storedEnv === 'development' || storedEnv === 'production')) {
      return storedEnv;
    }
  }
  
  // Check for environment variable override
  if (process.env.REACT_APP_ENVIRONMENT) {
    return process.env.REACT_APP_ENVIRONMENT;
  }
  
  // Check if we're in development mode (React development server)
  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }
  
  // Default to production for GitHub Pages deployment
  return 'production';
};

// Get the current configuration
const getCurrentConfig = () => {
  const environment = getCurrentEnvironment();
  
  // If custom API URL is provided, use it
  if (environment === 'custom') {
    return {
      API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
      ENVIRONMENT: 'custom'
    };
  }
  
  return config[environment] || config.production;
};

// Export the current configuration
const currentConfig = getCurrentConfig();

export default currentConfig;
export { config, getCurrentEnvironment, getCurrentConfig }; 