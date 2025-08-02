import toast from 'react-hot-toast';
import NotificationToast from './NotificationToast';
import { TOAST_CONFIG } from './config';

// Toast service that can be used outside of React components
class ToastService {
  constructor() {
    this.toastLimit = TOAST_CONFIG.limit;
    this.activeToasts = new Set(); // Track active toast IDs
  }

  // Check if we need to dismiss old toasts
  _checkToastLimit() {
    if (this.activeToasts.size >= this.toastLimit) {
      // Get the oldest toast ID and dismiss it
      const oldestToastId = this.activeToasts.values().next().value;
      if (oldestToastId) {
        toast.dismiss(oldestToastId);
        this.activeToasts.delete(oldestToastId);
      }
    }
  }

  // Base method to show toast
  _showToast(message, severity = 'info', duration) {
    this._checkToastLimit();

    const toastDuration = duration || TOAST_CONFIG.duration[severity] || TOAST_CONFIG.duration.info;

    const toastId = toast.custom(
      (t) => (
        <NotificationToast
          toast={t}
          message={message}
          severity={severity}
          onDismiss={() => {
            toast.dismiss(t.id);
            this.activeToasts.delete(t.id);
          }}
        />
      ),
      {
        duration: toastDuration,
        position: 'bottom-center',
      }
    );

    // Track this toast
    this.activeToasts.add(toastId);

    // Auto-remove from tracking when it expires
    setTimeout(() => {
      this.activeToasts.delete(toastId);
    }, toastDuration);

    return toastId;
  }

  success(message, duration) {
    return this._showToast(message, 'success', duration);
  }

  error(message, duration) {
    return this._showToast(message, 'error', duration);
  }

  warning(message, duration) {
    return this._showToast(message, 'warning', duration);
  }

  info(message, duration) {
    return this._showToast(message, 'info', duration);
  }

  dismiss(toastId) {
    toast.dismiss(toastId);
  }

  dismissAll() {
    toast.dismiss();
  }

  // Handle errors and show appropriate toasts based on error type
  handleError(error, operation = 'operation') {
    console.error(`Error during ${operation}:`, error);
    
    // Handle different types of errors
    if (error.code === 'failed-precondition') {
      this.error('Task was modified by another user. Board will refresh with latest data.', 5000);
    } else if (error.code === 'permission-denied') {
      this.error('You don\'t have permission to perform this action.');
    } else if (error.code === 'not-found') {
      this.error('The item you\'re trying to access no longer exists.');
    } else if (error.code === 'invalid-argument') {
      this.error('Invalid data provided. Please check your input and try again.');
    } else if (error.code === 'unauthenticated') {
      this.error('You need to sign in to perform this action.');
    } else if (error.message?.includes('network')) {
      this.error('Network error. Please check your connection and try again.');
    } else {
      // Generic error message
      const message = error.message || `Failed to ${operation}`;
      this.error(message);
    }
  }
}

// Create and export a singleton instance
export const toastService = new ToastService();
export default toastService;