import React from "react";

/**
 * ShortcutsIcon - 快捷键图标
 */
const ShortcutsIcon: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <line x1="6" y1="8" x2="8" y2="8" />
      <line x1="10" y1="8" x2="12" y2="8" />
      <line x1="14" y1="8" x2="16" y2="8" />
      <line x1="6" y1="12" x2="8" y2="12" />
      <line x1="10" y1="12" x2="14" y2="12" />
      <line x1="16" y1="12" x2="18" y2="12" />
      <line x1="8" y1="15.5" x2="16" y2="15.5" />
    </svg>
  );
};

export default ShortcutsIcon;
