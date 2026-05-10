import { Link, useRouterState } from "@tanstack/react-router";

const BG_EMOJIS = [
  { emoji: "🍕", top: 8,  left: 5,  rotate: -12, size: 4   },
  { emoji: "🧀", top: 75, left: 85, rotate: 18,  size: 3.2 },
  { emoji: "🍅", top: 35, left: 50, rotate: -6,  size: 5   },
  { emoji: "🌶️", top: 88, left: 12, rotate: 22,  size: 3.5 },
  { emoji: "🫒", top: 60, left: 78, rotate: -28, size: 4.5 },
] as const;

export function PizzaBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {BG_EMOJIS.map(({ emoji, top, left, rotate, size }) => (
        <span
          key={emoji}
          className="absolute opacity-[0.07]"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            transform: `rotate(${rotate}deg)`,
            fontSize: `${size}rem`,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

const PINGPAY_LOGO = "https://onramp.pingpay.io/ping-pay-logo.png";

export function PizzaPoweredBy() {
  return (
    <div className="flex items-center gap-2 opacity-70">
      <span className="pizza-label text-white/50">powered by</span>
      <img src={PINGPAY_LOGO} alt="PingPay" className="pingpay-logo" />
    </div>
  );
}

export function isBillysBirthday(): boolean {
  const now = new Date();
  return now.getMonth() === 4 && now.getDate() === 11; // May 11
}

export function BillyBadge() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isBillyPage = pathname === "/pizza/billy";

  return (
    <div
      className="sticky top-0 z-50 flex items-center justify-center py-2 px-4"
      style={{
        background: "#c0392b",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}
    >
      <Link
        to="/pizza/billy"
        className="flex items-center gap-0 select-none"
        style={{
          textDecoration: "none",
          opacity: isBillyPage ? 0.7 : 1,
          pointerEvents: isBillyPage ? "none" : "auto",
        }}
      >
        <span
          className="pizza-display"
          style={{
            fontFamily: "Fredoka, sans-serif",
            fontWeight: 500,
            fontSize: "0.95rem",
            color: "white",
            letterSpacing: "0.01em",
            fontStyle: "italic",
            paddingRight: "0.3em",
          }}
        >
          Pizza Boy
        </span>
        <span
          className="pizza-display"
          style={{
            fontFamily: "Fredoka, sans-serif",
            fontWeight: 700,
            fontSize: "1.15rem",
            color: "#4ade80",
            letterSpacing: "0.02em",
            textShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        >
          BILLY
        </span>
        {isBillysBirthday() && (
          <span style={{ marginLeft: "0.4em", fontSize: "1rem" }}>🎂</span>
        )}
      </Link>
    </div>
  );
}
