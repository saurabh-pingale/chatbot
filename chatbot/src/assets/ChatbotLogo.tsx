import { memo } from 'react';

interface ChatbotLogoProps {
  size?: number;
  className?: string;
  /** icon = white message circle only; badge = black rounded square with white message circle */
  variant?: 'icon' | 'badge';
}

const ICON_PATHS = (
  <path
    d="M19.8 38A16 16 0 1 0 12 30.2L8 42Z"
    fill="none"
    stroke="white"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

/** Inline chatbot logo — message circle icon */
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#1A1A1A"/><path d="M19.8 38A16 16 0 1 0 12 30.2L8 42Z" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  );
