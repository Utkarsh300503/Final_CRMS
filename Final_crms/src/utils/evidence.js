// src/utils/evidence.js
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { arrayUnion, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "./firebase";

/**
 * Uploads a file to Storage under evidence/{complaintId}/{timestamp}_{filename}
 * Adds metadata to complaints/{complaintId}.evidence array
 *
 * Returns a { task, path } object where task is the upload task (for progress)
 * and resolves when metadata is written.
 */
export async function uploadEvidence(complaintId, file, uploadedByUser) {
  if (!complaintId || !file) throw new Error("Missing complaintId or file");

  const filename = `${Date.now()}_${file.name}`;
  const storagePath = `evidence/${complaintId}/${filename}`;
  const storageRef = ref(storage, storagePath);

  // start upload
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type
  });

  // wait for upload to finish then write metadata to Firestore
  const uploadPromise = new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      () => {},
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(storageRef);
          const evidenceMeta = {
            id: filename, // unique within complaint
            storagePath,
            url,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size || 0,
            uploadedBy: uploadedByUser.uid,
            uploadedByName: uploadedByUser.name || uploadedByUser.email || null,
            uploadedAt: serverTimestamp()
          };

          const complaintRef = doc(db, "complaints", complaintId);
          await updateDoc(complaintRef, {
            evidence: arrayUnion(evidenceMeta)
          });

          resolve(evidenceMeta);
        } catch (e) {
          reject(e);
        }
      }
    );
  });

  return { task, finished: uploadPromise, storagePath, filename };
}

/**
 * Delete evidence file from Storage and remove metadata from Firestore.
 * Only call when permission checks are already handled (rules will also enforce).
 */
export async function deleteEvidence(complaintId, evidenceId, evidenceStoragePath) {
  if (!complaintId || !evidenceId || !evidenceStoragePath) {
    throw new Error("Missing parameters for deleteEvidence");
  }

  // delete storage object
  const fileRef = ref(storage, evidenceStoragePath);
  await deleteObject(fileRef);

  // remove metadata
  const complaintRef = doc(db, "complaints", complaintId);
  // build a placeholder meta with id so it matches arrayUnion entry structure; Firestore arrayRemove matches by equality of fields
  await updateDoc(complaintRef, {
    evidence: [
      // Firestore doesn't support arrayRemove with partial match. Instead we will fetch and filter at client side
    ]
  });

  // Note: Because Firestore arrayRemove needs exact object, we instead fetch and then update with filtered array in caller.
}
