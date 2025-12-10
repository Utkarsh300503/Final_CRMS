// src/components/ui/ComplaintCard.jsx
import React from "react";

export default function ComplaintCard({ complaint, onClick }) {
  return (
    <article className="ui-card" onClick={() => onClick && onClick(complaint)}>
      <div className="ui-card-head">
        <h3 className="ui-card-title">{complaint.title}</h3>
        <span className={`ui-badge ui-${complaint.status || "open"}`}>
          {complaint.status || "open"}
        </span>
      </div>

      <div className="ui-card-body">
        <p className="ui-desc">{complaint.description?.slice(0, 120) || "—"}</p>
      </div>

      <div className="ui-card-meta">
        <div>By: <strong>{complaint.createdByName || complaint.createdBy}</strong></div>
        <div>Assigned: <strong>{complaint.assignedOfficerName || complaint.assignedOfficer}</strong></div>
      </div>
    </article>
  );
}
