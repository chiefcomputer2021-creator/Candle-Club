const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const Icon = {
  calendar: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>,
  orders: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M7 3.5h10a2 2 0 0 1 2 2V21l-3-2-2 2-2-2-2 2-2-2-3 2V5.5a2 2 0 0 1 2-2z" /><path d="M9 8.5h6M9 12.5h6" /></svg>,
  finances: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg>,
  plus: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>,
  plusBold: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg>,
  left: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M15 6l-6 6 6 6" /></svg>,
  right: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M9 6l6 6-6 6" /></svg>,
  search: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>,
  close: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  trash: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M4 7h16M9 7V5h6v2M18 7l-1 13H7L6 7" /></svg>,
  bin: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>,
  download: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  team: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19.5c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" /><circle cx="16.8" cy="9.5" r="2.5" /><path d="M15.6 14.9c2.4-.3 4.3 1.2 4.9 4.1" /></svg>,
  check: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  tag: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.3 6.3a1.5 1.5 0 0 1-2.1 0z" /><circle cx="8" cy="8" r="1.4" /></svg>,
  up: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M6 15l6-6 6 6" /></svg>,
  down: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>,
  sun: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></svg>,
  moon: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>,
  device: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><rect x="3" y="4.5" width="18" height="12" rx="2" /><path d="M8.5 20h7M12 16.5V20" /></svg>,
  menu: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  signOut: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" /></svg>,
  settings: <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.8}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>,
  google: <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.3-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8l3.7-2.8z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.7 2.8C6.7 7.3 9.2 5.4 12 5.4z" /></svg>,
};

export function CandleBig() {
  return (
    <svg className="big" viewBox="0 0 38 56" aria-hidden="true">
      <path d="M19 5c3.6 4.6 5.4 7.6 5.4 10.4A5.4 5.4 0 0 1 19 20.8a5.4 5.4 0 0 1-5.4-5.4C13.6 12.6 15.4 9.6 19 5z" fill="#E8B45A" />
      <rect x="18.3" y="20" width="1.4" height="4" rx=".7" fill="#6B5A44" />
      <path d="M10 24h18v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V24z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** The Candle Club badge. Uses the larger file when shown big. */
export function BrandLogo({ size, className = '' }: { size: number; className?: string }) {
  return (
    <img className={'brand-logo ' + className} src={size > 128 ? '/logo-512.webp' : '/logo-256.webp'}
      width={size} height={size} alt="The Candle Club" draggable={false} />
  );
}

/** The original drawn candle with a flickering glow and swaying flame; used on the loading screen. */
export function CandleFlicker() {
  return (
    <svg className="brand-candle" viewBox="0 0 38 56" aria-hidden="true">
      <circle className="glow" cx="19" cy="14" r="11" fill="#E8B45A" opacity=".55" />
      <path className="flm" d="M19 5c3.6 4.6 5.4 7.6 5.4 10.4A5.4 5.4 0 0 1 19 20.8a5.4 5.4 0 0 1-5.4-5.4C13.6 12.6 15.4 9.6 19 5z" fill="#F4C66B" />
      <path d="M19 12.5c1.5 2 2.2 3.2 2.2 4.4a2.2 2.2 0 0 1-4.4 0c0-1.2.7-2.4 2.2-4.4z" fill="#FFF2D2" />
      <rect x="18.3" y="20" width="1.4" height="4" rx=".7" fill="#3B2F22" />
      <path d="M10 24h18v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V24z" fill="#F6EFE2" stroke="#B9AC9C" strokeWidth="1" />
      <path d="M10 24h18v4c-2 0-2 3.5-4 3.5S22 28 19 28s-3 5-5 5-2-5-4-5v-4z" fill="#FFFFFF" opacity=".55" />
    </svg>
  );
}
