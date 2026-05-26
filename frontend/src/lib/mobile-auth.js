/**
 * Mobile authentication utilities for Capacitor.
 * Detects if running in native Android wrapper and uses native Google Sign-In.
 * Falls back gracefully when running in browser.
 */

export function isCapacitor() {
  try {
    return (
      typeof window !== "undefined" &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform()
    );
  } catch {
    return false;
  }
}

/**
 * Sign in with Google using native Capacitor Firebase Auth plugin.
 * Returns the Google ID token string, or null if not running in Capacitor.
 */
export async function signInWithGoogleMobile() {
  if (!isCapacitor()) {
    return null;
  }

  try {
    const { FirebaseAuthentication } = await import(
      "@capacitor-firebase/authentication"
    );
    const result = await FirebaseAuthentication.signInWithGoogle();
    return result.credential?.idToken || null;
  } catch (error) {
    console.error("[mobileAuth] Native Google sign-in failed:", error);
    return null;
  }
}

/**
 * Get the current ID token from native Firebase Auth if already signed in.
 */
export async function getIdTokenMobile() {
  if (!isCapacitor()) {
    return null;
  }

  try {
    const { FirebaseAuthentication } = await import(
      "@capacitor-firebase/authentication"
    );
    const result = await FirebaseAuthentication.getIdToken();
    return result.token || null;
  } catch (error) {
    console.error("[mobileAuth] Get ID token failed:", error);
    return null;
  }
}
