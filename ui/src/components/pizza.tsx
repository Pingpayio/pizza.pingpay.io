const BG_EMOJIS = [
  { emoji: "🍕", top: 8, left: 5, rotate: -12, size: 4 },
  { emoji: "🧀", top: 75, left: 85, rotate: 18, size: 3.2 },
  { emoji: "🍅", top: 35, left: 50, rotate: -6, size: 5 },
  { emoji: "🌶️", top: 88, left: 12, rotate: 22, size: 3.5 },
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
