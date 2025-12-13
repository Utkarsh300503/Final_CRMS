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
 * Update a user's role field in the users collection.
 * - uid: string
 * - newRole: string ('admin' | 'officer' | 'user')
 */
export async function updateUserRole(uid, newRole) {
  if (!uid) throw new Error("Missing uid");
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    role: newRole,
    roleUpdatedAt: serverTimestamp(),
  });
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
