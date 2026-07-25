export function SawbladeMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M32 4l3.2 7.4 7.6-2.6-2.2 7.7 7.1 3.7-5.5 5.7 5.5 5.7-7.1 3.7 2.2 7.7-7.6-2.6L32 60l-3.2-7.4-7.6 2.6 2.2-7.7-7.1-3.7 5.5-5.7-5.5-5.7 7.1-3.7-2.2-7.7 7.6 2.6L32 4z" />
      <circle cx="32" cy="32" r="10" fill="#fffef8" />
      <circle cx="32" cy="32" r="4.5" />
    </svg>
  );
}
