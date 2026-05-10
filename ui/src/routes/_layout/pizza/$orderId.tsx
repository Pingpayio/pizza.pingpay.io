import { consumeEventIterator } from "@orpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/use-api-client";

export const Route = createFileRoute("/_layout/pizza/$orderId")({
  head: () => ({
    meta: [
      { title: "Pay for Pizza" },
      { name: "description", content: "Pay for your pizza order" },
    ],
  }),
  component: PizzaPayer,
});

type PageStatus = "LOADING" | "ORDER" | "PREPARING" | "DEPOSIT" | "PAID" | "ERROR";

interface TokenOption {
  chain: string;
  symbol: string;
  name?: string;
  iconUrl?: string;
  decimals?: number;
  priceUsd?: string;
  contractAddress?: string;
}

function PizzaPayer() {
  const apiClient = useApiClient();
  const { orderId } = Route.useParams();
  const [pageStatus, setPageStatus] = useState<PageStatus>("LOADING");
  const [selectedChain, setSelectedChain] = useState("base");
  const [selectedSymbol, setSelectedSymbol] = useState("USDC");
  const [depositAddress, setDepositAddress] = useState("");
  const [amountToDeposit, setAmountToDeposit] = useState("");
  const [sseCancel, setSseCancel] = useState<(() => Promise<void>) | null>(null);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["pizza-order", orderId],
    queryFn: async () => {
      const result = await apiClient.getPizzaOrder({ orderId });
      return result;
    },
  });

  const startSSE = useCallback(() => {
    const cancel = consumeEventIterator(
      apiClient.subscribePizzaOrder({ orderId }),
      {
        onEvent: (event) => {
          if (event.status === "SUCCESS") {
            setPageStatus("PAID");
          }
        },
        onError: () => {},
        onFinish: () => {},
      },
    );
    setSseCancel(() => cancel);
  }, [apiClient, orderId]);

  useEffect(() => {
    if (!isLoading && orderData) {
      if (orderData.order.status === "PAID") {
        setPageStatus("PAID");
      } else if (orderData.order.status === "PENDING" && orderData.order.depositAddress) {
        setDepositAddress(orderData.order.depositAddress);
        setPageStatus("DEPOSIT");
        startSSE();
      } else {
        setPageStatus("ORDER");
      }
    }
  }, [isLoading, orderData, startSSE]);

  useEffect(() => {
    if (orderData?.config?.tokens) {
      const tokens = orderData.config.tokens as TokenOption[];
      const baseUsdc = tokens.find((t) => t.chain?.toLowerCase() === "base" && t.symbol === "USDC");
      if (baseUsdc) {
        setSelectedChain("base");
        setSelectedSymbol("USDC");
      }
    }
  }, [orderData]);

  const tokens = (orderData?.config?.tokens || []) as TokenOption[];
  const groupedTokens = tokens.reduce<Record<string, TokenOption[]>>((acc, t) => {
    const chain = (t.chain || "other").toLowerCase();
    if (!acc[chain]) acc[chain] = [];
    acc[chain].push(t);
    return acc;
  }, {});

  const preparePayment = useMutation({
    mutationFn: async () => {
      const amount = orderData?.order?.amount || "0";
      const payerAmount = amount;

      const result = await apiClient.preparePizzaPayment({
        orderId,
        payerAsset: { chain: selectedChain, symbol: selectedSymbol, amount: payerAmount },
      });
      return result;
    },
    onSuccess: (data) => {
      setDepositAddress(data.depositAddress);
      setAmountToDeposit(data.amountToDeposit);
      setPageStatus("DEPOSIT");
      startSSE();
    },
    onError: () => {
      setPageStatus("ERROR");
    },
  });

  useEffect(() => {
    return () => {
      sseCancel?.();
    };
  }, [sseCancel]);

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
  };

  const formatAmount = (raw: string) => {
    const num = Number(raw) / 1_000_000;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const bgColor =
    pageStatus === "PAID"
      ? "bg-green-500"
      : pageStatus === "ERROR"
        ? "bg-red-600"
        : "bg-orange-500";

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-orange-500">
        <div className="text-white text-2xl animate-pulse">Loading order...</div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center p-6 transition-colors duration-700 ${bgColor}`}
    >
      {pageStatus === "ORDER" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <span className="text-6xl">🍕</span>
          <h2 className="text-2xl font-bold text-white">{orderData?.order?.name}</h2>
          <p className="text-5xl font-bold text-white">
            {formatAmount(orderData?.order?.amount || "0")} USDC
          </p>

          <div className="w-full flex flex-col gap-3">
            <label htmlFor="asset-select" className="text-white/80 text-sm font-medium">
              Pay with
            </label>
            <select
              id="asset-select"
              value={`${selectedChain}:${selectedSymbol}`}
              onChange={(e) => {
                const [chain, symbol] = e.target.value.split(":");
                setSelectedChain(chain);
                setSelectedSymbol(symbol);
              }}
              className="w-full rounded-xl bg-white/20 text-white px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-white/50"
            >
              {Object.entries(groupedTokens).map(([chain, chainTokens]) => (
                <optgroup key={chain} label={chain.toUpperCase()}>
                  {chainTokens.map((t) => (
                    <option key={`${chain}:${t.symbol}`} value={`${chain}:${t.symbol}`}>
                      {t.symbol} {t.name ? `— ${t.name}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => preparePayment.mutate()}
            disabled={preparePayment.isPending}
            className="w-full rounded-xl bg-white text-orange-700 font-bold text-xl px-6 py-4 hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {preparePayment.isPending ? "Generating..." : "Generate Deposit Address"}
          </button>
        </div>
      )}

      {pageStatus === "DEPOSIT" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <span className="text-6xl">🍕</span>
          <h2 className="text-2xl font-bold text-white">{orderData?.order?.name}</h2>

          <p className="text-white/80 text-sm text-center">
            Send exactly{" "}
            <strong className="text-white">
              {formatAmount(amountToDeposit)} {selectedSymbol}
            </strong>{" "}
            on <strong className="text-white">{selectedChain.toUpperCase()}</strong> to:
          </p>

          <div className="w-full bg-white/10 rounded-xl p-4 break-all">
            <code className="text-white text-sm font-mono">{depositAddress}</code>
          </div>

          <button
            type="button"
            onClick={copyAddress}
            className="w-full rounded-xl bg-white text-orange-700 font-bold text-lg px-6 py-3 hover:bg-white/90 transition-colors"
          >
            Copy Address
          </button>

          <div className="flex items-center gap-2 text-white/80">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-sm">Waiting for payment...</span>
          </div>
        </div>
      )}

      {pageStatus === "PAID" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md animate-fade-in">
          <span className="text-7xl">✅</span>
          <h2 className="text-4xl font-bold text-white">PAID!</h2>
          <p className="text-2xl text-white/90">{orderData?.order?.name}</p>
          <p className="text-3xl font-bold text-white">
            {formatAmount(orderData?.order?.amount || "0")} USDC
          </p>
          <p className="text-white/60 text-sm">Thanks for your order!</p>
        </div>
      )}

      {pageStatus === "ERROR" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <span className="text-6xl">❌</span>
          <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
          <p className="text-white/80">Please try again or contact the merchant.</p>
          <button
            type="button"
            onClick={() => setPageStatus("ORDER")}
            className="w-full rounded-xl bg-white text-red-700 font-bold text-lg px-6 py-3 hover:bg-white/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
