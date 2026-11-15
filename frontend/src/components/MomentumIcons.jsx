import React from "react";

/**
 * Momentum Design System — Pure Inline SVG Icon System
 * Standard: viewBox="0 0 24 24", strokeWidth=1.7, strokeLinecap="round", strokeLinejoin="round"
 * No external icon libraries or messy AI icons.
 */

export const Ic = ({ children, size = 20, sw = 1.7, fill = "none", className = "", ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={fill === "none" ? "currentColor" : "none"}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block shrink-0 ${className}`}
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const Search = (p) => (
  <Ic {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Ic>
);

export const CalendarDays = (p) => (
  <Ic {...p}>
    <rect x="3" y="4.5" width="18" height="17" rx="4" />
    <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
  </Ic>
);

export const Sun = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M4.3 4.3l1.4 1.4M18.3 18.3l1.4 1.4M2.5 12h2M19.5 12h2M4.3 19.7l1.4-1.4M18.3 5.7l1.4-1.4" />
  </Ic>
);

export const Moon = (p) => (
  <Ic {...p}>
    <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
  </Ic>
);

export const Bell = (p) => (
  <Ic {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
    <path d="M10.3 19.5a2 2 0 0 0 3.4 0" />
  </Ic>
);

export const Grid = (p) => (
  <Ic {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="2.2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" />
  </Ic>
);

export const Layers = (p) => (
  <Ic {...p}>
    <path d="m12 2.5 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12.5 9 5 9-5M3 17l9 5 9-5" />
  </Ic>
);

export const Box = (p) => (
  <Ic {...p}>
    <path d="M12 2.7 21 7v10l-9 4.3L3 17V7l9-4.3Z" />
    <path d="M3 7l9 4.3L21 7M12 21.3V11.3" />
  </Ic>
);

export const Doc = (p) => (
  <Ic {...p}>
    <path d="M14 2.5H6.5A2.5 2.5 0 0 0 4 5v14a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 19V8.5L14 2.5Z" />
    <path d="M14 2.5V8.5h6M8 13h8M8 17h5" />
  </Ic>
);

export const Chat = (p) => (
  <Ic {...p}>
    <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-3.9-.9L3 20.5l1.6-4.8A8 8 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3.2 8.4 8.4 0 0 1 21 11.5Z" />
  </Ic>
);

export const CheckSquare = (p) => (
  <Ic {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <path d="m8 12.2 2.8 2.8L16.5 9" />
  </Ic>
);

export const Sparkles = (p) => (
  <Ic {...p}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9 12 3.5Z" />
    <path d="M19 2.5v3M17.5 4h3M5 17.5v2.5M3.75 18.75h2.5" />
  </Ic>
);

export const ArrowUpRight = (p) => (
  <Ic {...p}>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </Ic>
);

export const ChevronLeft = (p) => (
  <Ic {...p}>
    <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />
  </Ic>
);

export const ChevronRight = (p) => (
  <Ic {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Ic>
);

export const ChevronDown = (p) => (
  <Ic {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Ic>
);

export const ChevronUp = (p) => (
  <Ic {...p}>
    <path d="m18 14.5-6-6-6 6" />
  </Ic>
);

export const Plus = (p) => (
  <Ic {...p}>
    <path d="M12 5v14M5 12h14" />
  </Ic>
);

export const Minus = (p) => (
  <Ic {...p}>
    <path d="M5 12h14" />
  </Ic>
);

export const X = (p) => (
  <Ic {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Ic>
);

export const Crown = (p) => (
  <Ic {...p}>
    <path d="M3 8.5l4 3.5 5-7 5 7 4-3.5-1.6 10a2 2 0 0 1-2 1.7H6.6a2 2 0 0 1-2-1.7L3 8.5Z" />
  </Ic>
);

export const Repeat = (p) => (
  <Ic {...p}>
    <path d="m17 2.5 4 4-4 4" />
    <path d="M3 11.5v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 21.5-4-4 4-4" />
    <path d="M21 12.5v1a4 4 0 0 1-4 4H3" />
  </Ic>
);

export const Target = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5.2" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Ic>
);

export const Clock = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.4 2" />
  </Ic>
);

export const CheckCircle = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.2 12.3 2.6 2.6 5-5.4" />
  </Ic>
);

export const AlertTriangle = (p) => (
  <Ic {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </Ic>
);

export const ShieldCheck = (p) => (
  <Ic {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </Ic>
);

export const BlockchainShield = ({ size = 32, className = '', ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`inline-block shrink-0 ${className}`}
    {...rest}
  >
    <path
      d="M12 2.5 4 6v6c0 5.5 3.4 10.3 8 11.8 4.6-1.5 8-6.3 8-11.8V6l-8-3.5Z"
      fill="currentColor"
      fillOpacity="0.22"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m8.5 12 2.5 2.5 5-5.5"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Thermometer = (p) => (
  <Ic {...p}>
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z" />
  </Ic>
);

export const QrCode = (p) => (
  <Ic {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M7 7h.01M18 7h.01M7 18h.01M14 14h3v3h-3zM14 20h7v-3M20 14v3" />
  </Ic>
);

export const Database = (p) => (
  <Ic {...p}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </Ic>
);

export const Truck = (p) => (
  <Ic {...p}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.3-4.13A1 1 0 0 0 17.7 8H14v10" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Ic>
);

export const Cpu = (p) => (
  <Ic {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
  </Ic>
);

export const Power = (p) => (
  <Ic {...p}>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
  </Ic>
);

export const Download = (p) => (
  <Ic {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </Ic>
);

export const Lock = (p) => (
  <Ic {...p}>
    <rect x="3" y="11" width="18" height="11" rx="3" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Ic>
);

export const Unlock = (p) => (
  <Ic {...p}>
    <rect x="3" y="11" width="18" height="11" rx="3" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </Ic>
);

export const Camera = (p) => (
  <Ic {...p}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
    <circle cx="12" cy="13" r="3.5" />
  </Ic>
);

export const Trash2 = (p) => (
  <Ic {...p}>
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
  </Ic>
);

export const ShoppingCart = (p) => (
  <Ic {...p}>
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </Ic>
);

export const UserCheck = (p) => (
  <Ic {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </Ic>
);

export const MapPin = (p) => (
  <Ic {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Ic>
);

export const Copy = (p) => (
  <Ic {...p}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </Ic>
);

export const ExternalLink = (p) => (
  <Ic {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
  </Ic>
);

export const Activity = (p) => (
  <Ic {...p}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </Ic>
);

export const Flame = (p) => (
  <Ic {...p}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </Ic>
);

export const Lightning = (p) => (
  <Ic {...p}>
    {/* Geometric 3D Blockchain Cube & Cold Storage Node (Replaces generic lightning bolt) */}
    <path d="M12 2.5 20.5 7.5v9L12 21.5l-8.5-5v-9L12 2.5Z" />
    <path d="M12 12 20.5 7.5M12 12v9.5M12 12 3.5 7.5" />
  </Ic>
);

export const AdminBadge = (p) => (
  <Ic {...p}>
    {/* Security Governance Shield & System Keyhole */}
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <circle cx="12" cy="10.5" r="2.2" />
    <path d="M12 12.7v3.3" />
  </Ic>
);

export const SmartChainCube = (p) => (
  <Ic {...p}>
    <path d="M12 2.5 20.5 7.5v9L12 21.5l-8.5-5v-9L12 2.5Z" />
    <path d="M12 12 20.5 7.5M12 12v9.5M12 12 3.5 7.5" />
  </Ic>
);

export const Sliders = (p) => (
  <Ic {...p}>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
  </Ic>
);

export const Maximize = (p) => (
  <Ic {...p}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </Ic>
);

export const Minimize = (p) => (
  <Ic {...p}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
  </Ic>
);


