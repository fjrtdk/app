import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { getMe, logout as apiLogout, postFirebaseSession } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch (err) {
      if (err?.response?.status !== 401) console.error("[checkAuth]", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const loginWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const u = await postFirebaseSession(idToken);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      try { await signOut(auth); } catch (e) { /* ignore */ }
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, refresh: checkAuth, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
