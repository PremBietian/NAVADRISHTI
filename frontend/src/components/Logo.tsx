export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="33"
        height="33"
        rx="8"
        fill="#0D110F"
        stroke="#243129"
        strokeWidth="1.2"
      />
      <path
        d="M18 7L27.5 12.5V23.5L18 29L8.5 23.5V12.5L18 7Z"
        stroke="#2E4035"
        strokeWidth="1.25"
      />
      <path
        d="M12.5 14.5L18 18M23.5 14.5L18 18M18 18V24.5"
        stroke="#A6FF78"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.5" cy="14.5" r="2" fill="#60A5FA" />
      <circle cx="23.5" cy="14.5" r="2" fill="#34D399" />
      <circle cx="18" cy="24.5" r="2" fill="#F59E0B" />
      <circle cx="18" cy="18" r="2.35" fill="#A6FF78" />
    </svg>
  );
}
