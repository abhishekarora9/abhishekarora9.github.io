import React, { useState, useEffect } from 'react';
import config, { getCurrentEnvironment } from './config';

const EnvironmentSwitcher = () => {
  const [currentEnv, setCurrentEnv] = useState(getCurrentEnvironment());
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Show switcher only in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setShowSwitcher(true);
    }
  }, []);

  const handleEnvironmentChange = (environment) => {
    // Store the environment preference in localStorage
    localStorage.setItem('preferredEnvironment', environment);
    setCurrentEnv(environment);
    
    // Reload the page to apply the new configuration
    window.location.reload();
  };

  const getEnvironmentColor = (env) => {
    switch (env) {
      case 'development':
        return '#10a37f'; // Green
      case 'production':
        return '#1e40af'; // Blue
      case 'custom':
        return '#dc2626'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };

  if (!showSwitcher) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 9999,
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '4px'
      }}>
        <span style={{ fontWeight: 'bold' }}>ENV:</span>
        <span style={{
          color: getEnvironmentColor(currentEnv),
          fontWeight: 'bold'
        }}>
          {currentEnv.toUpperCase()}
        </span>
      </div>
      
      <div style={{
        display: 'flex',
        gap: '4px'
      }}>
        <button
          onClick={() => handleEnvironmentChange('development')}
          style={{
            background: currentEnv === 'development' ? '#10a37f' : '#f3f4f6',
            color: currentEnv === 'development' ? '#ffffff' : '#374151',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: currentEnv === 'development' ? 'bold' : 'normal'
          }}
          title="Switch to localhost:8000"
        >
          DEV
        </button>
        
        <button
          onClick={() => handleEnvironmentChange('production')}
          style={{
            background: currentEnv === 'production' ? '#1e40af' : '#f3f4f6',
            color: currentEnv === 'production' ? '#ffffff' : '#374151',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: currentEnv === 'production' ? 'bold' : 'normal'
          }}
          title="Switch to deployed backend"
        >
          PROD
        </button>
      </div>
      
      <div style={{
        fontSize: '10px',
        color: '#6b7280',
        marginTop: '4px',
        maxWidth: '200px',
        wordBreak: 'break-all'
      }}>
        {config[currentEnv]?.API_BASE_URL || 'Custom URL'}
      </div>
    </div>
  );
};

export default EnvironmentSwitcher; 