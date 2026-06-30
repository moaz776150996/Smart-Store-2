import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if provided and not default
export const db = firebaseConfig.firestoreDatabaseId && 
  firebaseConfig.firestoreDatabaseId !== 'remixed-firestore-database-id' && 
  firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Always request select_account prompt to let users choose their Google account
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Detect environment
const isIframe = typeof window !== 'undefined' && window.self !== window.top;
const isStandalone = typeof window !== 'undefined' && (
  (window.navigator as any).standalone || 
  window.matchMedia('(display-mode: standalone)').matches
);
const isMobile = typeof window !== 'undefined' && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
);

// Sign in with Google Popup or Redirect based on environment
export async function signInWithGoogle() {
  try {
    // Under stand-alone PWA, Webviews or Mobile environments, popups fail / get blocked
    // or lose standard session context (blank page parent disconnect). 
    // Therefore, if NOT in an iframe (which requires popup), and on mobile/standalone, use redirect.
    if (!isIframe && (isMobile || isStandalone)) {
      console.log("Mobile or standalone environment detected. Using signInWithRedirect for Google Sign-In.");
      await signInWithRedirect(auth, googleProvider);
      return null;
    } else {
      console.log("Desktop or iframe environment detected. Using signInWithPopup for Google Sign-In.");
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error("Error during Google Sign-In:", error);
    // Fallback: If popup was blocked or failed, attempt redirection as secondary safety net
    if (error instanceof Error && (
      error.message.includes('popup') || 
      (error as any).code === 'auth/popup-blocked' ||
      (error as any).code === 'auth/popup-closed-by-user'
    )) {
      console.log("Popup action was blocked or closed. Retrying via redirect.");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

// Sign out
export async function signOutUser() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}
