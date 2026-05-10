import { consumeEventIterator } from "@orpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BillyBadge, PizzaBackground, PizzaPoweredBy } from "@/components";
import { useApiClient } from "@/lib/use-api-client";

export const Route = createFileRoute("/_layout/pizza/$orderId")({
  loader: async ({ context, params }) => {
    try {
      return await context.apiClient.getPizzaOrder({ orderId: params.orderId });
    } catch {
      return null;
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData?.order?.name;
    const amount = loaderData?.order?.amount
      ? (Number(loaderData.order.amount) / 1_000_000).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;
    const title = name ? `${name} | Pizza Boy Billy | Tortorices` : "Pizza Boy Billy | Tortorices";
    const description =
      name && amount
        ? `Pay ${amount} USDC for ${name}`
        : "Pay for your pizza order";
    return {
      meta: [
        { title },
        { name: "description", content: description },
      ],
    };
  },
  component: PizzaPayer,
});

type PageStatus = "LOADING" | "ORDER" | "QUOTING" | "DEPOSIT" | "VERIFYING" | "PAID" | "ERROR";

interface TokenOption {
  chain: string;
  symbol: string;
  name?: string;
  iconUrl?: string;
  decimals?: number;
  priceUsd?: string;
  contractAddress?: string;
}

const BG: Partial<Record<PageStatus, string>> = {
  LOADING:   "linear-gradient(160deg, #d35400 0%, #a04000 55%, #884000 100%)",
  ORDER:     "linear-gradient(160deg, #d35400 0%, #a04000 55%, #884000 100%)",
  QUOTING:   "linear-gradient(160deg, #b7770d 0%, #9a6310 55%, #7d5012 100%)",
  DEPOSIT:   "linear-gradient(160deg, #b7770d 0%, #9a6310 55%, #7d5012 100%)",
  VERIFYING: "linear-gradient(160deg, #b7770d 0%, #9a6310 55%, #7d5012 100%)",
  PAID:      "linear-gradient(160deg, #1e8449 0%, #196f3d 60%, #145a32 100%)",
  ERROR:     "linear-gradient(160deg, #922b21 0%, #7b241c 55%, #641e16 100%)",
};

const BG_FALLBACK = BG.ORDER as string;

function formatAmount(raw: string) {
  const num = Number(raw) / 1_000_000;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function ClipboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PizzaPayer() {
  const apiClient = useApiClient();
  const { orderId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const [pageStatus, setPageStatus] = useState<PageStatus>("LOADING");
  const [selectedChain, setSelectedChain] = useState("base");
  const [selectedSymbol, setSelectedSymbol] = useState("USDC");
  const [depositAddress, setDepositAddress] = useState("");
  const [amountToDepositFormatted, setAmountToDepositFormatted] = useState("");
  const [feeDisplay, setFeeDisplay] = useState("");
  const [rateDisplay, setRateDisplay] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const sseCancelRef = useRef<(() => Promise<void>) | null>(null);
  const sseRetryRef = useRef(0);
  const mountedRef = useRef(true);
  const isPaidRef = useRef(false);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["pizza-order", orderId],
    queryFn: () => apiClient.getPizzaOrder({ orderId }),
    initialData: loaderData ?? undefined,
  });

  const startSSE = useCallback(() => {
    sseRetryRef.current = 0;

    const connect = async () => {
      if (!mountedRef.current || isPaidRef.current) return;
      const maxRetries = 10;
      try {
        const cancel = await consumeEventIterator(apiClient.subscribePizzaOrder({ orderId }), {
          onEvent: (event) => {
            if (event.status === "SUCCESS") {
              sseRetryRef.current = 0;
              isPaidRef.current = true;
              setPageStatus("PAID");
            }
          },
          onError: () => {},
          onFinish: () => {
            if (mountedRef.current && !isPaidRef.current) {
              sseRetryRef.current += 1;
              if (sseRetryRef.current < maxRetries) {
                const delay = Math.min(1000 * 2 ** sseRetryRef.current, 30000);
                setTimeout(connect, delay);
              }
            }
          },
        });
        sseCancelRef.current = cancel;
      } catch {
        sseRetryRef.current += 1;
        if (sseRetryRef.current < maxRetries && mountedRef.current) {
          const delay = Math.min(1000 * 2 ** sseRetryRef.current, 30000);
          setTimeout(connect, delay);
        }
      }
    };

    void connect();
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
      const baseUsdc = tokens.find(
        (t) => t.chain?.toLowerCase() === "base" && t.symbol === "USDC",
      );
      if (baseUsdc) {
        setSelectedChain("base");
        setSelectedSymbol("USDC");
      }
    }
  }, [orderData]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      sseCancelRef.current?.();
    };
  }, []);

  const tokens = (orderData?.config?.tokens || []) as TokenOption[];
  const groupedTokens = tokens.reduce<Record<string, TokenOption[]>>((acc, t) => {
    const chain = (t.chain || "other").toLowerCase();
    if (!acc[chain]) acc[chain] = [];
    acc[chain].push(t);
    return acc;
  }, {});

  const preparePayment = useMutation({
    onMutate: () => {
      setPageStatus("QUOTING");
    },
    mutationFn: () =>
      apiClient.preparePizzaPayment({
        orderId,
        payerAsset: { chain: selectedChain, symbol: selectedSymbol },
      }),
    onSuccess: (data) => {
      setDepositAddress(data.depositAddress);
      setAmountToDepositFormatted(data.amountToDepositFormatted || data.amountToDeposit);
      setFeeDisplay(data.quote?.feeDisplay || "");
      setRateDisplay(data.quote?.pricingRateDisplay || "");
      setPageStatus("DEPOSIT");
      startSSE();
    },
    onError: () => {
      setPageStatus("ERROR");
    },
  });

  useQuery({
    queryKey: ["pizza-order-status", orderId],
    queryFn: async () => {
      const result = await apiClient.getPizzaOrderStatus({ orderId });
      if (result.status === "PAID") setPageStatus("PAID");
      return result;
    },
    enabled: pageStatus === "DEPOSIT" || pageStatus === "VERIFYING",
    refetchInterval: pageStatus === "DEPOSIT" || pageStatus === "VERIFYING" ? 5000 : false,
  });

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(amountToDepositFormatted);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleIPaid = () => {
    setPageStatus("VERIFYING");
    void apiClient.notifyPizzaDeposit?.({ orderId });
    startSSE();
  };

  const handleCheckAgain = () => {
    void apiClient.notifyPizzaDeposit?.({ orderId });
    startSSE();
  };

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ background: BG.LOADING }}
      >
        <span className="text-5xl animate-pulse mb-4">🍕</span>
        <p className="pizza-label text-white/60">firing up the oven...</p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col transition-[background] duration-700 animate-fade-in"
      style={{ background: BG[pageStatus] ?? BG_FALLBACK }}
    >
      <PizzaBackground />
      <BillyBadge />

      <div
        className="relative z-10 flex flex-col items-center h-full overflow-y-auto overscroll-contain pb-safe px-5"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div className="flex flex-col items-center w-full max-w-md min-h-full justify-center gap-8 py-6">

          {(pageStatus === "ORDER" || pageStatus === "QUOTING") && (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  className="text-6xl"
                  style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.4))" }}
                >
                  🍕
                </span>
                <p className="pizza-label text-white/55 mt-1">pizza boy billy</p>
                <h2
                  className="text-4xl sm:text-5xl font-semibold text-white pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.25) 2px 2px 0, rgba(0,0,0,0.1) 4px 4px 12px" }}
                >
                  {orderData?.order?.name}
                </h2>
                <p
                  className="text-white/50 text-sm"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif", fontStyle: "italic" }}
                >
                  the man wants to give you a pizza
                </p>
                <p className="text-4xl font-semibold text-white/90 mt-1 pizza-display">
                  {formatAmount(orderData?.order?.amount || "0")}
                  <span className="text-xl text-white/60 ml-2">USDC</span>
                </p>
              </div>

              <div className="pizza-card w-full p-6 flex flex-col gap-5" style={{ background: "#fffde7" }}>
                <div className="flex flex-col gap-2">
                  <label htmlFor="token-select" className="pizza-label text-black/45">
                    pay with
                  </label>
                  <select
                    id="token-select"
                    value={`${selectedChain}:${selectedSymbol}`}
                    onChange={(e) => {
                      const [chain, symbol] = e.target.value.split(":");
                      setSelectedChain(chain);
                      setSelectedSymbol(symbol);
                    }}
                    className="pizza-select w-full px-4 py-3 bg-white text-black"
                  >
                    {Object.entries(groupedTokens).map(([chain, chainTokens]) => (
                      <optgroup key={chain} label={chain.toUpperCase()}>
                        {chainTokens.map((t) => (
                          <option key={`${chain}:${t.symbol}`} value={`${chain}:${t.symbol}`}>
                            {t.symbol}{t.name ? ` — ${t.name}` : ""}
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
                  className="pizza-btn pizza-btn-primary w-full py-4 text-white"
                  style={{ background: "#d35400" }}
                >
                  {preparePayment.isPending ? "getting your rate..." : "pay now →"}
                </button>
              </div>

              <PizzaPoweredBy />
            </>
          )}

          {pageStatus === "DEPOSIT" && (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  className="text-5xl"
                  style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }}
                >
                  🍕
                </span>
                <p className="pizza-label text-white/55 mt-1">pizza is cooking</p>
                <h2
                  className="text-2xl sm:text-3xl font-semibold text-white pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.2) 2px 2px 0" }}
                >
                  {orderData?.order?.name}
                </h2>
              </div>

              <div className="pizza-card w-full p-5 flex flex-col gap-4" style={{ background: "#fffde7" }}>
                <div className="flex flex-col gap-1">
                  <p className="pizza-label text-black/45">send exactly</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-semibold text-black pizza-display flex-1">
                      {amountToDepositFormatted}{" "}
                      <span className="text-black/55">{selectedSymbol}</span>
                    </p>
                    <button
                      type="button"
                      onClick={copyAmount}
                      aria-label={copiedAmount ? "Copied!" : "Copy amount"}
                      className="shrink-0 flex items-center justify-center rounded-full transition-colors"
                      style={{
                        minWidth: 36,
                        minHeight: 36,
                        background: copiedAmount ? "#1e8449" : "rgba(0,0,0,0.08)",
                        color: copiedAmount ? "white" : "rgba(0,0,0,0.45)",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                      } as React.CSSProperties}
                    >
                      {copiedAmount ? <CheckIcon /> : <ClipboardIcon />}
                    </button>
                  </div>
                  <p className="pizza-label text-black/40 mt-0.5">
                    on {selectedChain.toUpperCase()} network
                  </p>
                </div>

                {(rateDisplay || feeDisplay) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {rateDisplay && (
                      <p className="text-xs text-black/40" style={{ fontFamily: "IBM Plex Mono, monospace" }}>
                        {rateDisplay}
                      </p>
                    )}
                    {feeDisplay && (
                      <p className="text-xs text-black/40" style={{ fontFamily: "IBM Plex Mono, monospace" }}>
                        fee: {feeDisplay}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <p className="pizza-label text-black/45">deposit address</p>
                  <div
                    className="flex items-stretch gap-0 rounded-xl overflow-hidden"
                    style={{ border: "1.5px solid rgba(0,0,0,0.15)" }}
                  >
                    <code
                      className="flex-1 text-xs text-black/75 break-all leading-relaxed px-3 py-3 select-all"
                      style={{
                        fontFamily: "IBM Plex Mono, monospace",
                        background: "#f0e8c0",
                        userSelect: "all",
                        WebkitUserSelect: "all",
                      } as React.CSSProperties}
                    >
                      {depositAddress}
                    </code>
                    <button
                      type="button"
                      onClick={copyAddress}
                      aria-label={copied ? "Copied!" : "Copy address"}
                      className="shrink-0 flex items-center justify-center transition-colors"
                      style={{
                        minWidth: 48,
                        minHeight: 48,
                        background: copied ? "#1e8449" : "#d35400",
                        color: "white",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                      } as React.CSSProperties}
                    >
                      {copied ? <CheckIcon /> : <ClipboardIcon />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleIPaid}
                className="pizza-btn pizza-btn-primary w-full py-4 text-white"
                style={{ background: "#c0392b" }}
              >
                I've sent it →
              </button>

              <PizzaPoweredBy />
            </>
          )}

          {pageStatus === "VERIFYING" && (
            <>
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  className="text-5xl"
                  style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.35))" }}
                >
                  🍕
                </span>
                <p className="pizza-label text-white/55 mt-1">checking the oven</p>
                <h2
                  className="text-2xl sm:text-3xl font-semibold text-white pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.2) 2px 2px 0" }}
                >
                  {orderData?.order?.name}
                </h2>
              </div>

              <div className="pizza-card w-full p-5" style={{ background: "#fffde7" }}>
                <div className="flex flex-col gap-1">
                  <p className="pizza-label text-black/45">you sent</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-semibold text-black pizza-display flex-1">
                      {amountToDepositFormatted}{" "}
                      <span className="text-black/55">{selectedSymbol}</span>
                    </p>
                    <button
                      type="button"
                      onClick={copyAmount}
                      aria-label={copiedAmount ? "Copied!" : "Copy amount"}
                      className="shrink-0 flex items-center justify-center rounded-full transition-colors"
                      style={{
                        minWidth: 36,
                        minHeight: 36,
                        background: copiedAmount ? "#1e8449" : "rgba(0,0,0,0.08)",
                        color: copiedAmount ? "white" : "rgba(0,0,0,0.45)",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                      } as React.CSSProperties}
                    >
                      {copiedAmount ? <CheckIcon /> : <ClipboardIcon />}
                    </button>
                  </div>
                  <p className="pizza-label text-black/40 mt-0.5">on {selectedChain.toUpperCase()}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"
                    style={{ boxShadow: "0 0 8px rgba(255,255,255,0.8)" }}
                  />
                  <span className="text-sm text-white/80" style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
                    confirming on-chain...
                  </span>
                </div>
                <p className="text-xs text-white/45 text-center max-w-xs" style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
                  usually takes a few seconds
                </p>
              </div>

              <button
                type="button"
                onClick={handleCheckAgain}
                className="pizza-btn w-full max-w-xs py-3 text-white/80"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                check again →
              </button>

              <PizzaPoweredBy />
            </>
          )}

          {pageStatus === "PAID" && (
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
                  PAID!
                </h2>
                <p className="text-2xl font-semibold text-white/80 pizza-display">
                  {orderData?.order?.name}
                </p>
                <p className="text-3xl font-semibold text-white pizza-display">
                  {formatAmount(orderData?.order?.amount || "0")}
                  <span className="text-lg text-white/60 ml-2">USDC</span>
                </p>
                <p className="text-white/45 text-sm mt-1" style={{ fontFamily: "IBM Plex Sans, sans-serif", fontStyle: "italic" }}>
                  made with love at Tortorices 🍕
                </p>
              </div>

              <PizzaPoweredBy />
            </div>
          )}

          {pageStatus === "ERROR" && (
            <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-7xl">❌</span>
                <p className="pizza-label text-white/60">oven's cold</p>
                <h2
                  className="text-4xl font-semibold text-white pizza-display"
                  style={{ textShadow: "rgba(0,0,0,0.2) 2px 2px 0" }}
                >
                  Something went wrong
                </h2>
                <p
                  className="text-white/60 text-sm text-center max-w-xs"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                >
                  dropped your slice — try again or contact the shop
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPageStatus("ORDER")}
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
