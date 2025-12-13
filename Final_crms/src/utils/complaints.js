// src/utils/complaints.js
import { doc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Reassign a complaint to another officer.
 * - updates complaints/{id}.assignedOfficer & assignedOfficerName
 * - writes an audit entry to complaints/{id}/audit
 *
 * @param {string} complaintId
 * @param {object} adminUser  { uid, name, email }
 * @param {object} newOfficer { uid, name, email }
 */
export async function reassignComplaint(complaintId, adminUser, newOfficer) {
  if (!complaintId) throw new Error("complaintId missing");
  if (!adminUser || !adminUser.uid) throw new Error("adminUser required");
  if (!newOfficer || !newOfficer.uid) throw new Error("newOfficer required");

  const complaintRef = doc(db, "complaints", complaintId);

  // 1. update assignedOfficer field
  await updateDoc(complaintRef, {
    assignedOfficer: newOfficer.uid,
    assignedOfficerName: newOfficer.name || newOfficer.email || null,
    updatedAt: serverTimestamp()
  });

  // 2. write audit entry
  const auditRef = collection(db, "complaints", complaintId, "audit");
  await addDoc(auditRef, {
    type: "reassign",
    fromUid: adminUser.uid,
    fromName: adminUser.name || adminUser.email || adminUser.uid,
    toUid: newOfficer.uid,
    toName: newOfficer.name || newOfficer.email || newOfficer.uid,
    createdAt: serverTimestamp(),
    note: `${adminUser.name || adminUser.email} reassigned to ${newOfficer.name || newOfficer.email}`
  });

  return true;
}
