import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useApiClient } from "@/lib/use-api-client";

export const Route = createFileRoute("/_layout/_authenticated/pizza/")({
  head: () => ({
    meta: [
      { title: "Pizza POS | Pay" },
      { name: "description", content: "Pizza point-of-sale powered by PingPay" },
    ],
  }),
  component: PizzaPOS,
});

type OrderStatus = "IDLE" | "CREATING" | "WAITING" | "PAID" | "ERROR";

function PizzaPOS() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [name, setName] = useState("Pizza Margherita");
  const [amount, setAmount] = useState("15");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("IDLE");

  const createOrder = useMutation({
    mutationFn: async () => {
      const usdcAmount = String(Math.round(Number.parseFloat(amount) * 1_000_000));
      const result = await apiClient.createPizzaOrder({ name, amount: usdcAmount });
      return result;
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
      if (result.status === "PAID") {
        setOrderStatus("PAID");
      }
      return result;
    },
    enabled: orderStatus === "WAITING" && !!orderId,
    refetchInterval: orderStatus === "WAITING" ? 2000 : false,
  });

  const bgColor =
    orderStatus === "PAID"
      ? "bg-green-500"
      : orderStatus === "ERROR"
        ? "bg-red-600"
        : "bg-purple-600";

  const handleNewOrder = () => {
    setOrderId(null);
    setQrUrl(null);
    setOrderStatus("IDLE");
    queryClient.removeQueries({ queryKey: ["pizza-order-status"] });
  };

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center p-6 transition-colors duration-700 ${bgColor}`}
    >
      {orderStatus === "IDLE" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <span className="text-6xl">🍕</span>
          <h1 className="text-4xl font-bold text-white tracking-tight">Pizza POS</h1>

          <div className="w-full flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Order name"
              className="w-full rounded-xl bg-white/20 text-white placeholder-white/60 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-white/50"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                step="0.01"
                min="0.01"
                className="w-full rounded-xl bg-white/20 text-white placeholder-white/60 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-white/50"
              />
              <span className="text-white/80 text-lg font-medium shrink-0">USDC</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => createOrder.mutate()}
            disabled={createOrder.isPending || !name || !amount}
            className="w-full rounded-xl bg-white text-purple-700 font-bold text-xl px-6 py-4 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createOrder.isPending ? "Creating..." : "Create Order"}
          </button>

          {createOrder.error && (
            <p className="text-white/80 text-sm">
              {createOrder.error.message || "Failed to create order"}
            </p>
          )}
        </div>
      )}

      {orderStatus === "WAITING" && qrUrl && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <span className="text-6xl">🍕</span>
          <h2 className="text-2xl font-bold text-white">{name}</h2>
          <p className="text-5xl font-bold text-white">{amount} USDC</p>

          <div className="bg-white rounded-2xl p-4">
            <QRCodeSVG value={qrUrl} size={220} />
          </div>

          <p className="text-white/70 text-sm">Scan to pay</p>
          <div className="flex items-center gap-2 text-white/80">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm">Waiting for payment...</span>
          </div>
        </div>
      )}

      {orderStatus === "PAID" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md animate-fade-in">
          <span className="text-7xl">✅</span>
          <h2 className="text-4xl font-bold text-white">PAID!</h2>
          <p className="text-2xl text-white/90">{name}</p>
          <p className="text-3xl font-bold text-white">{amount} USDC</p>

          <button
            type="button"
            onClick={handleNewOrder}
            className="w-full rounded-xl bg-white text-green-700 font-bold text-xl px-6 py-4 hover:bg-white/90 transition-colors mt-4"
          >
            New Order
          </button>
        </div>
      )}

      {orderStatus === "ERROR" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md animate-fade-in">
          <span className="text-7xl">⚠️</span>
          <h2 className="text-3xl font-bold text-white">Order Failed</h2>
          <p className="text-white/80 text-center">
            {createOrder.error?.message ||
              "Could not connect to payment service. Check your PINGPAY_API_KEY in .env"}
          </p>

          <button
            type="button"
            onClick={() => {
              setOrderStatus("IDLE");
            }}
            className="w-full rounded-xl bg-white text-red-700 font-bold text-xl px-6 py-4 hover:bg-white/90 transition-colors mt-4"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
