// src/components/admin/ReassignPanel.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { reassignComplaint } from "../../utils/complaints";

/**
 * Props:
 * - complaintId (string) required
 * - currentAssignedUid (string) optional
 * - adminUser (object) required - { uid, name, email }
 * - onDone(updated) callback -> receives { assignedOfficer, assignedOfficerName } on success or null on cancel
 */
export default function ReassignPanel({ complaintId, currentAssignedUid, adminUser, onDone }) {
  const [officers, setOfficers] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);     // assignment action
  const [fetching, setFetching] = useState(true);    // initial fetch
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setFetching(true);
      setError("");
      try {
        // NOTE: DON'T use orderBy + where combination if you want to avoid creating composite index.
        const q = query(collection(db, "users"), where("role", "==", "officer"));
        const snap = await getDocs(q);
        let list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));

        // client-side sort
        list.sort((a, b) => {
          const na = (a.name || a.email || a.uid || "").toLowerCase();
          const nb = (b.name || b.email || b.uid || "").toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        });

        setOfficers(list);
        if (currentAssignedUid) {
          const exists = list.find((x) => x.uid === currentAssignedUid);
          if (exists) setSelected(currentAssignedUid);
        }
      } catch (e) {
        console.error("Failed fetching officers", e);
        setError(e?.message || "Failed fetching officers");
      } finally {
        setFetching(false);
      }
    })();
  }, [currentAssignedUid]);

  async function handleAssign() {
    setError("");
    if (!selected) return setError("Select an officer first.");
    if (!adminUser || !adminUser.uid) return setError("Admin context missing.");
    if (selected === currentAssignedUid) return setError("Selected officer is already assigned.");

    setLoading(true);
    try {
      const newOfficer = officers.find((o) => o.uid === selected);
      if (!newOfficer) throw new Error("Selected officer not found");

      // CLIENT-side helper (calls Firestore directly). See cloud function alternative below.
      await reassignComplaint(complaintId, adminUser, newOfficer);

      onDone && onDone({ assignedOfficer: newOfficer.uid, assignedOfficerName: newOfficer.name || newOfficer.email });
    } catch (e) {
      console.error("Reassign failed", e);
      setError(e?.message || "Reassign failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h4 style={{ marginTop: 0, marginBottom: "16px" }}>Reassign Complaint</h4>

      {fetching && <div className="loading" style={{ marginBottom: "16px" }}>Loading officers…</div>}
      {error && <div className="error" style={{ marginBottom: "12px" }}>{error}</div>}

      {!fetching && (
        <>
          {officers.length === 0 ? (
            <div style={{ marginBottom: "16px", color: "var(--muted, #a9b1b8)", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
              No officers found. Make sure users with role "officer" exist.
            </div>
          ) : (
            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="officer-select">Select Officer</label>
              <select
                id="officer-select"
                aria-label="Select officer to assign"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">— select officer —</option>
                {officers.map((o) => (
                  <option key={o.uid} value={o.uid}>
                    {o.name || o.email || o.uid}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleAssign}
              disabled={loading || !selected || selected === currentAssignedUid}
              className="primary"
              style={{ flex: 1 }}
            >
              {loading ? "Assigning…" : "Assign"}
            </button>

            <button
              onClick={() => onDone && onDone(null)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
