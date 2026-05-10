import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { BillyBadge, PizzaBackground, PizzaPoweredBy } from "@/components";
import { useApiClient } from "@/lib/api";

const SPECIALS = [
  "Deep Dish with the Caramelized Crust",
  "Thin Crust with the Hot Honey",
  "Gucci's Signature Buffalo Wings",
  "Jalapeño Poppers with the Marinara & Ranch",
  "Crispy and Fresh Chicken Caesar Salad",
  "Next Level Mozzarella Sticks & Marinara",
];

export const Route = createFileRoute("/_layout/_authenticated/pizza/")({
  head: () => ({
    meta: [
      { title: "Pizza Pay | Tortorices on Grand Ave" },
      { name: "description", content: "Pizza Boy Billy's point of sale — Tortorices on Grand Ave" },
    ],
  }),
  component: PizzaPOS,
});

type OrderStatus = "IDLE" | "CREATING" | "WAITING" | "PAID" | "ERROR";

const BG: Record<OrderStatus, string> = {
  IDLE:     "linear-gradient(160deg, #c0392b 0%, #922b21 60%, #7b241c 100%)",
  CREATING: "linear-gradient(160deg, #c0392b 0%, #922b21 60%, #7b241c 100%)",
  WAITING:  "linear-gradient(160deg, #d35400 0%, #a04000 55%, #884000 100%)",
  PAID:     "linear-gradient(160deg, #1e8449 0%, #196f3d 60%, #145a32 100%)",
  ERROR:    "linear-gradient(160deg, #922b21 0%, #7b241c 55%, #641e16 100%)",
};

function PizzaPOS() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("15");
  const [specialIndex, setSpecialIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setSpecialIndex((i) => (i + 1) % SPECIALS.length);
        setPlaceholderVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(interval);
  }, []);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("IDLE");

  const createOrder = useMutation({
    onMutate: () => {
      setOrderStatus("CREATING");
    },
    mutationFn: async () => {
      const usdcAmount = String(Math.round(Number.parseFloat(amount) * 1_000_000));
      return apiClient.createPizzaOrder({ name, amount: usdcAmount });
    },
    onSuccess: (data) => {
      setOrderId(data.orderId);
      setQrUrl(data.qrUrl);
      setOrderStatus("WAITING");
    },
    onError: (error) => {
      console.error("[Pizza] Order creation failed:", error);
      setOrderStatus("ERROR");
    },
  });

  useQuery({
    queryKey: ["pizza-order-status", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const result = await apiClient.getPizzaOrderStatus({ orderId });
      if (result.status === "PAID") setOrderStatus("PAID");
      return result;
    },
    enabled: orderStatus === "WAITING" && !!orderId,
    refetchInterval: orderStatus === "WAITING" ? 2000 : false,
  });

  const handleNewOrder = () => {
    setOrderId(null);
    setQrUrl(null);
    setOrderStatus("IDLE");
    queryClient.removeQueries({ queryKey: ["pizza-order-status"] });
  };

  const displayAmount = Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const qrSize = typeof window !== "undefined" ? Math.min(220, window.innerWidth - 96) : 220;

  return (
    <div
      className="fixed inset-0 flex flex-col transition-[background] duration-700 animate-fade-in"
      style={{ background: BG[orderStatus] }}
    >
      <PizzaBackground />
      <BillyBadge />

      <div className="relative z-10 flex flex-col items-center h-full overflow-y-auto overscroll-contain pb-safe px-5"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div className="flex flex-col items-center w-full max-w-md min-h-full justify-center gap-8 py-6">

          {(orderStatus === "IDLE" || orderStatus === "CREATING") && (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  className="text-6xl"
                  style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.4))" }}
                >
                  🍕
                </span>
                <p className="pizza-label text-white/55 mt-1">Tortorices on Grand Ave</p>
                <h1
                  className="text-5xl sm:text-6xl font-semibold text-white pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.25) 2px 2px 0, rgba(0,0,0,0.1) 4px 4px 12px" }}
                >
                  Pizza Pay
                </h1>
              </div>

              <div className="pizza-card w-full p-6 flex flex-col gap-5" style={{ background: "#fffde7" }}>
                <div className="flex flex-col gap-2">
                  <label htmlFor="order-name" className="pizza-label text-black/45">
                    order name
                  </label>
                  <div className="relative">
                    <input
                      id="order-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder=""
                      autoComplete="off"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      className="pizza-input w-full px-4 py-3 bg-white text-black"
                    />
                    {!name && (
                      <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/30 truncate max-w-[calc(100%-2rem)]"
                        style={{
                          fontFamily: "IBM Plex Sans, sans-serif",
                          fontSize: "1rem",
                          transition: "opacity 0.4s ease",
                          opacity: placeholderVisible ? 1 : 0,
                        }}
                      >
                        {SPECIALS[specialIndex]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="order-amount" className="pizza-label text-black/45">
                    amount (USDC)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40 font-semibold">
                        $
                      </span>
                      <input
                        id="order-amount"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        autoComplete="off"
                        enterKeyHint="done"
                        className="pizza-input w-full pl-8 pr-4 py-3 bg-white text-black placeholder-black/30"
                      />
                    </div>
                    <span
                      className="pizza-label text-black/45 shrink-0 px-3 py-[13px] rounded-xl border border-black/12"
                      style={{ background: "#f0e8c0" }}
                    >
                      USDC
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => createOrder.mutate()}
                  disabled={createOrder.isPending || !name || !amount}
                  className="pizza-btn pizza-btn-primary w-full py-4 text-white"
                  style={{ background: "#c0392b" }}
                >
                  {createOrder.isPending ? "ringing up..." : "ring it up →"}
                </button>

                {createOrder.error && (
                  <p className="text-red-700 text-xs text-center" style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
                    {createOrder.error.message || "Failed to create order"}
                  </p>
                )}
              </div>

              <PizzaPoweredBy />
            </>
          )}

          {orderStatus === "WAITING" && qrUrl && (
            <>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="pizza-label text-white/55">pizza is cooking</p>
                <h2
                  className="text-3xl sm:text-4xl font-semibold text-white pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.2) 2px 2px 0" }}
                >
                  {name}
                </h2>
                <p
                  className="text-4xl font-semibold text-white/90 mt-1 pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.15) 1px 1px 0" }}
                >
                  ${displayAmount}
                  <span className="text-xl text-white/60 ml-2">USDC</span>
                </p>
              </div>

              <div className="pizza-card p-5 bg-white flex items-center justify-center">
                <QRCodeSVG value={qrUrl} size={qrSize} />
              </div>

              <div className="flex flex-col items-center gap-2">
                <p className="pizza-label text-white/60">scan to pay the man</p>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full bg-white animate-waiting-dot"
                    style={{ boxShadow: "0 0 6px rgba(255,255,255,0.8)" }}
                  />
                  <span className="text-sm text-white/70" style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
                    waiting for payment...
                  </span>
                </div>
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/35 text-xs underline underline-offset-2 hover:text-white/60 break-all max-w-[280px] text-center transition-colors"
                  style={{ fontFamily: "IBM Plex Mono, monospace" }}
                >
                  {qrUrl}
                </a>
              </div>

              <PizzaPoweredBy />
            </>
          )}

          {orderStatus === "PAID" && (
            <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
              <div className="flex flex-col items-center gap-3 text-center animate-pizza-paid">
                <span
                  className="text-7xl"
                  style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.4))" }}
                >
                  ✅
                </span>
                <p className="pizza-label text-white/60">order up!</p>
                <h2
                  className="text-6xl sm:text-7xl font-semibold text-white pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.3) 3px 3px 0, rgba(0,0,0,0.15) 6px 6px 14px" }}
                >
                  PAID
                </h2>
                <p className="text-2xl font-semibold text-white/80 pizza-display">{name}</p>
                <p className="text-3xl font-semibold text-white pizza-display">
                  ${displayAmount}
                  <span className="text-lg text-white/60 ml-2">USDC</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleNewOrder}
                className="pizza-btn pizza-btn-success w-full max-w-xs py-4 text-white"
                style={{ background: "#1e8449" }}
              >
                new order →
              </button>

              <PizzaPoweredBy />
            </div>
          )}

          {orderStatus === "ERROR" && (
            <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-7xl">⚠️</span>
                <p className="pizza-label text-white/60">something went wrong</p>
                <h2
                  className="text-4xl font-semibold text-white pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.2) 2px 2px 0" }}
                >
                  Order Failed
                </h2>
                <p
                  className="text-white/70 text-sm text-center max-w-xs"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                >
                  {createOrder.error?.message ||
                    "Could not connect to payment service. Check your PINGPAY_API_KEY in .env"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOrderStatus("IDLE")}
                className="pizza-btn pizza-btn-primary w-full max-w-xs py-4 text-white"
                style={{ background: "#922b21" }}
              >
                try again →
              </button>

              <PizzaPoweredBy />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
