// src/components/ui/Button.jsx
import React from "react";

export default function Button({ children, onClick, variant = "primary", ...rest }) {
  return (
    <button className={`ui-btn ui-btn-${variant}`} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
