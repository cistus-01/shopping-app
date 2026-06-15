export default function MoSoroLogo({ size = 64, uid = 'a' }) {
  const bg = `msLogo_bg_${uid}`
  const clip = `msLogo_clip_${uid}`
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <clipPath id={clip}>
          <rect x="58" y="60" width="84" height="112" rx="22" />
        </clipPath>
      </defs>

      {/* 背景 */}
      <rect width="200" height="200" rx="45" fill={`url(#${bg})`} />

      {/* 影 */}
      <ellipse cx="100" cy="183" rx="40" ry="6" fill="#047857" opacity="0.2" />

      {/* キャップ */}
      <rect x="76" y="26" width="48" height="18" rx="9" fill="white" />
      {/* ネック */}
      <rect x="86" y="36" width="28" height="26" fill="white" />
      {/* ボディ（薄い白） */}
      <rect x="58" y="60" width="84" height="112" rx="22" fill="white" opacity="0.18" />
      {/* ボディアウトライン */}
      <rect x="58" y="60" width="84" height="112" rx="22" stroke="white" strokeWidth="5" />

      {/* 液体（低レベル 約22%） */}
      <rect x="58" y="143" width="84" height="29" fill="white" opacity="0.9" clipPath={`url(#${clip})`} />

      {/* 水位ライン（点線） */}
      <line x1="64" y1="143" x2="136" y2="143" stroke="white" strokeWidth="2.5" strokeDasharray="7 4" opacity="0.55" />

      {/* 右上の！マーク */}
      <circle cx="158" cy="40" r="18" fill="white" opacity="0.25" />
      <circle cx="158" cy="40" r="13" fill="white" opacity="0.55" />
      <rect x="155" y="29" width="6" height="10" rx="3" fill="#059669" />
      <circle cx="158" cy="45" r="3" fill="#059669" />
    </svg>
  )
}
