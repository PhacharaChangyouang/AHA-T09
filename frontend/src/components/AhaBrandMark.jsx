export default function AhaBrandMark({ className }) {
  // Shared identity mark: both the authenticated AHA navigation and public landing.
  // Its intrinsic 60:42 viewBox prevents aspect-ratio distortion.
  return (
    <svg
      className={className}
      viewBox="0 0 60 42"
      width="60"
      height="42"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M3 25C12 25 12 5 21 5s9 30 18 30 9-25 18-25"
        stroke="#159FE0"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M40 29c7 0 8-13 17-13"
        stroke="#22B8AA"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
