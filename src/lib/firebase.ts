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
const isWebView = typeof window !== 'undefined' && (
  /wv|WebView|Android.*Version\/[0-9.]+/i.test(navigator.userAgent) ||
  (window as any).Capacitor ||
  (window as any).cordova
);

// Sign in with Google Popup or Redirect based on environment
export async function signInWithGoogle() {
  try {
    // We always attempt signInWithPopup first because it is highly reliable, 
    // works on standard mobile and desktop browsers, and avoids the third-party 
    // cookie blocking issue that plagues signInWithRedirect on custom domains.
    console.log("Attempting signInWithPopup for Google Sign-In...");
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("signInWithPopup was blocked, closed, or unsupported. Attempting redirection fallback:", error);
    
    // Fallback: If popup is blocked, closed, or unsupported in this browser/WebView/PWA,
    // we use signInWithRedirect as a secondary safety net.
    const isPopupError = error instanceof Error && (
      error.message.includes('popup') || 
      error.message.includes('closed') ||
      error.message.includes('cancelled') ||
      (error as any).code === 'auth/popup-blocked' ||
      (error as any).code === 'auth/popup-closed-by-user' ||
      (error as any).code === 'auth/cancelled-popup-request' ||
      (error as any).code === 'auth/operation-not-supported-in-this-environment'
    );

    if (isStandalone || isWebView || isPopupError) {
      console.log("Popup failed or standalone/webview environment detected. Using signInWithRedirect as fallback.");
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
