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
    
    // Return generic messages to prevent user enumeration
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Try again later');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('Account has been disabled');
    }
    throw new Error('Sign in failed. Please try again');
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
    
    // Return secure error messages
    if (error.code === 'auth/email-already-in-use') {
      // Don't reveal if email exists - generic message
      throw new Error('Registration failed. Please try again');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please choose a stronger password');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Try again later');
    }
    throw new Error('Registration failed. Please try again');
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
  const standardResponse = { 
    success: true, 
    message: 'If an account with that email exists, a password reset email has been sent'
  };
  
  try {
    // Firebase handles the complete password reset flow
    await sendPasswordResetEmail(auth, email);
    return standardResponse;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
      // Return identical response - no way to distinguish from success
      return standardResponse;
    } else if (error.code === 'auth/too-many-requests') {
      return { 
        success: false, 
        error: 'Too many reset attempts. Please try again later' 
      };
    }
    
    return { 
      success: false, 
      error: 'Failed to send password reset email. Please try again' 
    };
  }
};