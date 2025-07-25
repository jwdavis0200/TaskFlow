import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './config';

/**
 * Get the current authenticated user
 */
export const getCurrentUser = () => auth.currentUser;

/**
 * Get the ID token for the current user
 */
export const getIdToken = async () => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

/**
 * Sign in with email and password
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

/**
 * Sign up with email and password
 */
export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};


/**
 * Sign out the current user
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Force clear any existing anonymous sessions
 */
export const clearAnonymousSessions = async () => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.isAnonymous) {
      console.log('Clearing anonymous session...');
      await signOut(auth);
    }
  } catch (error) {
    console.error('Error clearing anonymous session:', error);
  }
};

/**
 * Listen to authentication state changes
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Send password reset email using Firebase's built-in handling
 */
export const sendPasswordReset = async (email) => {
  try {
    // Firebase handles the complete password reset flow
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    
    // Return user-friendly error messages
    let message = 'Failed to send password reset email';
    if (error.code === 'auth/user-not-found') {
      // For security, don't reveal if user exists
      message = 'If an account with that email exists, a password reset email has been sent';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many reset attempts. Please try again later';
    }
    
    return { success: false, error: message };
  }
};