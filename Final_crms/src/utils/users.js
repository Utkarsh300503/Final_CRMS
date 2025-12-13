// src/utils/users.js
// Firestore helpers for admin user management.

import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../utils/firebase";

/**
 * Fetch all user documents from `users` collection.
 * Returns array of { uid, email, name, role, ... }
 */
export async function fetchAllUsers() {
  const col = collection(db, "users");
  // order by role (admins first) then name
  const q = query(col, orderBy("role", "desc"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/**
 * Check if an admin user already exists in the system.
 * Returns true if at least one admin exists.
 */
export async function adminExists() {
  const col = collection(db, "users");
  const q = query(col, where("role", "==", "admin"));
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Update a user's role field in the users collection.
 * - uid: string
 * - newRole: string ('admin' | 'officer' | 'user')
 * 
 * SECURITY: Prevents creating multiple admins. Only one admin can exist.
 */
export async function updateUserRole(uid, newRole) {
  if (!uid) throw new Error("Missing uid");
  
  // SECURITY: Prevent creating multiple admins
  if (newRole === "admin") {
    const adminExists = await checkAdminExists(uid);
    if (adminExists) {
      throw new Error("An admin already exists. Only one admin is allowed in the system. Please remove the existing admin first.");
    }
  }
  
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    role: newRole,
    roleUpdatedAt: serverTimestamp(),
  });
}

/**
 * Helper function to check if an admin exists (excluding the current user being updated)
 */
async function checkAdminExists(excludeUid) {
  const col = collection(db, "users");
  const q = query(col, where("role", "==", "admin"));
  const snap = await getDocs(q);
  
  // Check if there's an admin that's not the user being updated
  const admins = snap.docs.filter(doc => doc.id !== excludeUid);
  return admins.length > 0;
}

/**
 * Delete a user document from the users collection.
 * Note: This only deletes the Firestore document, NOT the Firebase Auth user.
 * If you want to remove the Auth user too, do that from a secure server / admin SDK.
 */
export async function deleteUserDoc(uid) {
  if (!uid) throw new Error("Missing uid");
  const ref = doc(db, "users", uid);
  await deleteDoc(ref);
}
