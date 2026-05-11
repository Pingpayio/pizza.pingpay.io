import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BillyBadge, isBillysBirthday, PizzaBackground, PizzaPoweredBy } from "@/components";

export const Route = createFileRoute("/_layout/pizza/billy")({
  head: () => ({
    meta: [
      { title: "Pizza Boy Billy | Tortorices on Grand Ave" },
      { name: "description", content: "Home of Pizza Boy Billy — Tortorices on Grand Ave" },
    ],
  }),
  component: BillyPage,
});

function Candle() {
  const [lit, setLit] = useState(true);
  return (
    <button
      type="button"
      onClick={() => setLit((v) => !v)}
      aria-label={lit ? "Blow out candle" : "Light candle"}
      className="flex flex-col items-center gap-0 transition-all"
      style={{ background: "none", border: "none", cursor: "pointer", touchAction: "manipulation" }}
    >
      <span
        className="text-2xl"
        style={{
          filter: lit ? "drop-shadow(0 0 6px #fbbf24)" : "none",
          opacity: lit ? 1 : 0.3,
          transition: "all 0.3s ease",
          lineHeight: 1,
        }}
      >
        🔥
      </span>
      <span className="text-3xl" style={{ lineHeight: 1 }}>
        🕯️
      </span>
    </button>
  );
}

function BillyPage() {
  const birthday = isBillysBirthday();
  const [candlesBlown, setCandlesBlown] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (candlesBlown >= 5) {
      const t = setTimeout(() => setShowMessage(true), 600);
      return () => clearTimeout(t);
    }
  }, [candlesBlown]);

  return (
    <div
      className="fixed inset-0 flex flex-col animate-fade-in"
      style={{
        background: birthday
          ? "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
          : "linear-gradient(160deg, #c0392b 0%, #922b21 60%, #7b241c 100%)",
      }}
    >
      <PizzaBackground />
      <BillyBadge />

      <div
        className="relative z-10 flex flex-col items-center h-full overflow-y-auto overscroll-contain pb-safe px-5"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div className="flex flex-col items-center w-full max-w-md min-h-full justify-center gap-8 py-10">
          {birthday ? (
            <>
              <div className="flex flex-col items-center gap-4 text-center">
                <span
                  className="text-7xl"
                  style={{ filter: "drop-shadow(0 6px 16px rgba(251,191,36,0.6))" }}
                >
                  🎂
                </span>

                <div className="flex flex-col gap-1">
                  <p className="pizza-label" style={{ color: "#fbbf24", letterSpacing: "0.2em" }}>
                    today is the day
                  </p>
                  <h1
                    className="pizza-display font-semibold"
                    style={{
                      fontSize: "clamp(2.5rem, 12vw, 4rem)",
                      color: "white",
                      textShadow: "rgba(0,0,0,0.4) 3px 3px 0, rgba(251,191,36,0.2) 0 0 30px",
                      lineHeight: 1,
                    }}
                  >
                    Happy Birthday
                  </h1>
                  <p
                    className="pizza-display font-bold"
                    style={{
                      fontSize: "clamp(3rem, 18vw, 6rem)",
                      color: "#4ade80",
                      textShadow: "rgba(0,0,0,0.5) 3px 3px 0, rgba(74,222,128,0.3) 0 0 24px",
                      lineHeight: 0.9,
                    }}
                  >
                    BILLY
                  </p>
                </div>

                <p
                  className="text-white/60 text-sm"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif", fontStyle: "italic" }}
                >
                  the man, the myth, the slice
                </p>
              </div>

              {!showMessage ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="pizza-label text-white/50">blow out the candles</p>
                  <div className="flex items-end gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} onClick={() => setCandlesBlown((n) => Math.min(n + 1, 5))}>
                        <Candle />
                      </div>
                    ))}
                  </div>
                  <p
                    className="text-white/30 text-xs"
                    style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                  >
                    {5 - candlesBlown} remaining
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center animate-fade-in">
                  <span className="text-5xl">🍕</span>
                  <p className="text-white/80 text-lg font-medium pizza-display">
                    pizza's on Billy tonight
                  </p>
                  <p
                    className="text-white/45 text-sm"
                    style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                  >
                    Tortorices on Grand Ave
                  </p>
                </div>
              )}

              <div
                className="pizza-card w-full p-5 flex flex-col items-center gap-3 text-center"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                }}
              >
                <p className="pizza-label" style={{ color: "#fbbf24" }}>
                  home of pizza boy billy
                </p>
                <p
                  className="text-white/70 text-sm leading-relaxed"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                >
                  Tortorices on Grand Ave — <br className="hidden sm:block" />
                  where the pizza's made with love and the man never misses a birthday.
                </p>
                <span className="text-2xl">🎉</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 text-center">
                <span
                  className="text-7xl"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
                >
                  🍕
                </span>
                <div className="flex flex-col gap-1">
                  <p className="pizza-label text-white/55">home of</p>
                  <h1
                    className="pizza-display font-semibold"
                    style={{
                      fontSize: "clamp(2rem, 10vw, 3.5rem)",
                      color: "white",
                      textShadow: "rgba(0,0,0,0.3) 2px 2px 0, rgba(0,0,0,0.12) 4px 4px 10px",
                      lineHeight: 1,
                    }}
                  >
                    Pizza Boy
                  </h1>
                  <p
                    className="pizza-display font-bold"
                    style={{
                      fontSize: "clamp(3.5rem, 20vw, 7rem)",
                      color: "#4ade80",
                      textShadow: "rgba(0,0,0,0.4) 3px 3px 0",
                      lineHeight: 0.88,
                    }}
                  >
                    BILLY
                  </p>
                </div>
                <p
                  className="text-white/50 text-sm"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif", fontStyle: "italic" }}
                >
                  Tortorices on Grand Ave
                </p>
              </div>

              <div
                className="pizza-card w-full p-5 flex flex-col items-center gap-3 text-center"
                style={{ background: "#fffde7" }}
              >
                <p className="pizza-label text-black/45">come back on his birthday</p>
                <p
                  className="text-black/60 text-sm leading-relaxed"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                >
                  May 11 — something special happens here.
                </p>
                <span className="text-3xl">🎂</span>
              </div>

              <Link
                to="/pizza"
                className="pizza-btn pizza-btn-primary py-4 px-8 text-white text-center"
                style={{ background: "#c0392b" }}
              >
                order a pizza →
              </Link>
            </>
          )}

          <PizzaPoweredBy />
        </div>
      </div>
    </div>
  );
}
