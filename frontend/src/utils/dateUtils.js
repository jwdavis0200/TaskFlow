/**
 * Production-ready date utility functions for consistent date handling
 */

/**
 * Safely converts various date formats to YYYY-MM-DD string for form inputs
 * @param {Date|string|Object} dateValue - Date in various formats
 * @returns {string} - YYYY-MM-DD string or empty string if invalid
 */
export const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";
  
  let date;
  
  try {
    // Handle different date formats
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      // Firestore Timestamp
      date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
      // String format (including "yyyy-MM-dd")
      date = new Date(dateValue);
    } else {
      // Unknown format
      console.warn('Unknown date format:', dateValue);
      return "";
    }
    
    // Validate the date
    if (!date || isNaN(date.getTime())) {
      console.warn('Invalid date value:', dateValue);
      return "";
    }
    
    // Convert to YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date for input:', error, dateValue);
    return "";
  }
};

/**
 * Safely formats date for display
 * @param {Date|string|Object} dateValue - Date in various formats
 * @returns {string|null} - Formatted date string or null if invalid
 */
export const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return null;
  
  let date;
  
  try {
    // Handle different date formats
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
      // Firestore Timestamp
      date = dateValue.toDate();
    } else if (typeof dateValue === 'string') {
      // String format (including ISO strings from backend)
      date = new Date(dateValue);
    } else {
      return null;
    }
    
    // Validate the date
    if (!date || isNaN(date.getTime())) {
      return null;
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error('Error formatting date for display:', error, dateValue);
    return null;
  }
};

/**
 * Creates a Date object for API submission
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date|null} - Date object or null if invalid
 */
export const createDateFromInput = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch (error) {
    console.error('Error creating date from input:', error, dateString);
    return null;
  }
};