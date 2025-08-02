export const TOAST_CONFIG = {
  limit: 3,
  duration: {
    success: 4000,
    error: 6000,
    warning: 5000,
    info: 4000,
  },
  dimensions: {
    desktop: {
      minWidth: '320px',
      maxWidth: '480px',
      maxLines: 3,
    },
    mobile: {
      minWidth: '280px',
      maxWidth: '90vw',
      maxLines: 2,
    },
  },
  className: 'taskflow-toast',
  colors: {
    success: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: '#4CAF50',
      icon: '#4CAF50',
      text: '#333',
    },
    error: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: '#f44336',
      icon: '#f44336',
      text: '#333',
    },
    warning: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: '#ff9800',
      icon: '#ff9800',
      text: '#333',
    },
    info: {
      background: 'rgba(255, 255, 255, 0.95)',
      border: '#667eea',
      icon: '#667eea',
      text: '#333',
    },
  },
};