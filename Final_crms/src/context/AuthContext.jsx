// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  enableNetwork,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import { db } from "../utils/firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // user object from users/{uid}
  const [loading, setLoading] = useState(true);

  // ----------------- SIGNUP -----------------
  async function signup(email, password, name = "", role = "user") {
    try {
      // SECURITY: Prevent admin role creation through signup
      if (role === "admin") {
        throw new Error("Admin role cannot be created through signup. Only one admin can exist in the system.");
      }

      // Check if admin already exists (additional security check)
      const adminCheckQuery = query(
        collection(db, "users"),
        where("role", "==", "admin")
      );
      const adminSnapshot = await getDocs(adminCheckQuery);
      if (!adminSnapshot.empty && role === "admin") {
        throw new Error("An admin already exists. Only one admin is allowed in the system.");
      }

      const auth = getAuth();

      // create auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // optional displayName
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }

      // Ensure role is not admin (double check)
      const safeRole = role === "admin" ? "officer" : role;

      // create user doc in Firestore
      const userDocRef = doc(db, "users", cred.user.uid);
      await setDoc(userDocRef, {
        uid: cred.user.uid,
        email,
        name: name || "",
        role: safeRole,
        createdAt: serverTimestamp(),
      });

      // fetch and set local state
      const snap = await getDoc(userDocRef);
      if (snap.exists()) setUser(snap.data());
      else
        setUser({
          uid: cred.user.uid,
          email,
          name: name || "",
          role: safeRole,
        });

      return cred;
    } catch (err) {
      console.error("signup error:", err);
      throw err;
    }
  }

  // ----------------- LOGIN -----------------
  async function login(email, password) {
    try {
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // do not block UI here; onAuthStateChanged handles state update
      return cred;
    } catch (err) {
      console.error("login error:", err);
      throw err;
    }
  }

  // ----------------- LOGOUT -----------------
  async function logout() {
    try {
      const auth = getAuth();
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("logout error:", err);
      throw err;
    }
  }

  // ----------------- AUTH LISTENER (non-blocking) -----------------
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("onAuthStateChanged fired:", firebaseUser ? firebaseUser.uid : null);

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Immediately provide minimal user so UI renders fast
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || "",
        role: "user",
      });
      setLoading(false);

      // Fetch full profile in background (server-first, then network fallback)
      (async () => {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);

          // Try server fetch first (avoids stale cached offline doc)
          const snapServer = await getDocFromServer(userDocRef).catch(() => null);
          if (snapServer && snapServer.exists()) {
            setUser(snapServer.data());
            return;
          }

          // Enable network and retry
          await enableNetwork(db).catch(() => {});
          const snap = await getDoc(userDocRef).catch(() => null);
          if (snap && snap.exists()) setUser(snap.data());
        } catch (err) {
          console.warn("Background user fetch failed:", err);
          // keep minimal user; do not block UI
        }
      })();
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
