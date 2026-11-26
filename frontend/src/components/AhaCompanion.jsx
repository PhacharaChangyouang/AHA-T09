'use client';

// Original AHA vector character. No external model, embed, texture or runtime.
export default function AhaCompanion({ state = 'idle', compact = false }) {
  const mood = ['listening', 'speaking', 'understanding', 'processing'].includes(state) ? state : 'idle';
  return (
    <span className={`aha-companion ${compact ? 'compact' : ''} mood-${mood}`}>
      <svg viewBox="0 0 320 320" role="img" aria-label="เอ เอช เอ ผู้ช่วยดูแลเรื่องยา" focusable="false">
        <ellipse className="aha-companion-shadow" cx="160" cy="286" rx="70" ry="10" fill="#204582" opacity=".12" />
        <g className="aha-companion-float">
          <path className="aha-companion-arm left" d="M108 205C83 199 69 210 73 231c3 16 18 21 31 9" fill="#e3edff" stroke="#bdcfea" strokeWidth="2" />
          <path className="aha-companion-arm right" d="M212 205c25-6 39 5 35 26-3 16-18 21-31 9" fill="#e3edff" stroke="#bdcfea" strokeWidth="2" />
          <path d="M119 190h82l15 48c8 28-18 42-56 42s-64-14-56-42z" fill="#f8fbff" stroke="#bdcfea" strokeWidth="2" />
          <path d="M115 254c20 12 70 12 90 0l-5 15c-21 13-59 13-80 0z" fill="#dce8fc" />
          <rect x="128" y="211" width="64" height="45" rx="18" fill="#2f6bff" />
          <path d="M160 241s-14-8-14-16a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 8-14 16-14 16z" fill="#fff" />
          <path d="M160 64V43" stroke="#a9bfdf" strokeWidth="7" strokeLinecap="round" />
          <circle className="aha-companion-beacon" cx="160" cy="36" r="10" fill="#2f6bff" />
          <rect className="aha-companion-ear left" x="58" y="112" width="22" height="50" rx="11" fill="#2f6bff" />
          <rect className="aha-companion-ear right" x="240" y="112" width="22" height="50" rx="11" fill="#2f6bff" />
          <rect x="72" y="65" width="176" height="139" rx="53" fill="#f8fbff" stroke="#bdcfea" strokeWidth="2" />
          <path d="M93 105c10-22 35-26 58-26" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
          <rect x="86" y="88" width="148" height="99" rx="36" fill="#173456" />
          <path d="M99 122c10-17 31-22 54-22" fill="none" stroke="#24476f" strokeWidth="7" strokeLinecap="round" />
          <g className="aha-companion-eyes" fill="#a8dcff">
            <rect x="119" y="119" width="13" height="23" rx="6.5" />
            <rect x="188" y="119" width="13" height="23" rx="6.5" />
          </g>
          <g className="aha-companion-thought" fill="#a8dcff"><circle cx="138" cy="132" r="5" /><circle cx="160" cy="132" r="5" /><circle cx="182" cy="132" r="5" /></g>
          <path className="aha-companion-smile" d="M147 153q13 13 26 0" fill="none" stroke="#a8dcff" strokeWidth="5" strokeLinecap="round" />
          <ellipse className="aha-companion-mouth" cx="160" cy="158" rx="10" ry="7" fill="#a8dcff" />
          <ellipse cx="108" cy="151" rx="8" ry="4" fill="#80b7f7" opacity=".25" />
          <ellipse cx="212" cy="151" rx="8" ry="4" fill="#80b7f7" opacity=".25" />
        </g>
      </svg>
    </span>
  );
}
