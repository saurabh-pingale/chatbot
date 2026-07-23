import { memo } from 'react';

interface ChatbotLogoProps {
  size?: number;
  className?: string;
  /** icon = white bubble only (for dark backgrounds); badge = black rounded square with icon */
  variant?: 'icon' | 'badge';
}

const ICON_PATHS = (
  <>
    <path
      d="M8 14C8 10.6863 10.6863 8 14 8H34C37.3137 8 40 10.6863 40 14V22C40 24.2091 38.2091 26 36 26H30L24 32V26C20.6863 26 8 23.3137 8 20V14Z"
      fill="white"
    />
    <circle cx="18" cy="18" r="2" fill="#1A1A1A" />
    <circle cx="30" cy="18" r="2" fill="#1A1A1A" />
    <path
      d="M18 24C20.5 27 27.5 27 30 24"
      stroke="#1A1A1A"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </>
);

/** Inline chatbot logo — centered friendly face in chat bubble */
export const ChatbotLogo = memo(
  ({ size = 32, className, variant = 'badge' }: ChatbotLogoProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {variant === 'badge' && (
        <rect width="48" height="48" rx="12" fill="#1A1A1A" />
      )}
      {ICON_PATHS}
    </svg>
  ),
);

ChatbotLogo.displayName = 'ChatbotLogo';

export const CHATBOT_LOGO_DATA_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#1A1A1A"/><path d="M8 14C8 10.6863 10.6863 8 14 8H34C37.3137 8 40 10.6863 40 14V22C40 24.2091 38.2091 26 36 26H30L24 32V26C20.6863 26 8 23.3137 8 20V14Z" fill="white"/><circle cx="18" cy="18" r="2" fill="#1A1A1A"/><circle cx="30" cy="18" r="2" fill="#1A1A1A"/><path d="M18 24C20.5 27 27.5 27 30 24" stroke="#1A1A1A" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>`,
  );
