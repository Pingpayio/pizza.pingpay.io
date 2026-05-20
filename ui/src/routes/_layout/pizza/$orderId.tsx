import { consumeEventIterator } from "@orpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getSocialImageMeta } from "everything-dev/ui/metadata";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PizzaBackground, PizzaPoweredBy } from "@/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiClient } from "@/lib/api";
import {
  getChainDisplayName,
  getChainImageUrl,
  getChainShortName,
  getTokenImageUrl,
} from "@/lib/pingpay-assets";

export const Route = createFileRoute("/_layout/pizza/$orderId")({
  loader: async ({ context, params }) => {
    try {
      return await context.apiClient.getPizzaOrder({ orderId: params.orderId });
    } catch {
      return null;
    }
  },
  head: ({ loaderData, matches, params }) => {
    const name = loaderData?.order?.name;
    const amount = loaderData?.order?.amount
      ? (Number(loaderData.order.amount) / 1_000_000).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;
    const title = name ? `${name} | Pizza Pay` : "Pizza Pay";
    const description =
      name && amount
        ? `Pizza Boy Billy rings up ${name} at Tortorices on Grand Ave. Pay ${amount} USDC for Chicago pizza — pick any token or chain, scan, and settle via PingPay.`
        : "Pizza Boy Billy rings up your slice at Tortorices on Grand Ave. Pay for Chicago pizza with crypto — pick any token or chain, scan, and settle in USDC via PingPay.";
    const rootMatch = matches[0] as
      | { loaderData?: { assetsUrl?: string; runtimeConfig?: { hostUrl?: string } } }
      | undefined;
    const assetsUrl = rootMatch?.loaderData?.assetsUrl ?? "";
    const hostUrl = rootMatch?.loaderData?.runtimeConfig?.hostUrl ?? "";
    const siteUrl = hostUrl ? `${hostUrl}/pizza/${params.orderId}` : "";
    const ogImage = `${assetsUrl}/metadata.jpg`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...getSocialImageMeta({
          imageUrl: ogImage,
          title,
          description,
          siteName: "Pizza Pay",
          siteUrl,
          alt: name ? `Pay for ${name} at Tortorices` : "Pizza Pay at Tortorices",
        }),
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

function pickString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function normalizePingPayToken(raw: unknown): TokenOption | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const chainRaw = pickString(o.chain ?? o.network ?? o.networkId ?? o.chainId);
  const symbol = pickString(o.symbol ?? o.ticker ?? o.currency);
  if (!chainRaw || !symbol) return null;
  const chain = chainRaw.toLowerCase();
  const name = pickString(o.name ?? o.title);
  const nestedAsset =
    typeof o.asset === "object" && o.asset !== null ? (o.asset as Record<string, unknown>) : null;
  const iconUrl = pickString(
    o.iconUrl ??
      o.imageUrl ??
      o.logoUrl ??
      (typeof o.icon === "string" ? o.icon : undefined) ??
      nestedAsset?.iconUrl ??
      nestedAsset?.imageUrl ??
      nestedAsset?.logoUrl ??
      (typeof nestedAsset?.icon === "string" ? nestedAsset.icon : undefined),
  );
  const decimals = typeof o.decimals === "number" ? o.decimals : undefined;
  const priceUsd = pickString(o.priceUsd);
  const contractAddress = pickString(o.contractAddress ?? o.address);
  return { chain, symbol, name, iconUrl, decimals, priceUsd, contractAddress };
}

function tokenDisplayName(t: TokenOption) {
  if (t.name && t.name !== t.symbol && t.name.toLowerCase() !== t.symbol.toLowerCase()) {
    return t.name;
  }
  return undefined;
}

const SYMBOL_DISPLAY_MAP: Record<string, string> = {
  wnear: "NEAR",
  wNEAR: "NEAR",
  WNEAR: "NEAR",
};

const SYMBOL_API_MAP: Record<string, string> = {
  NEAR: "wnear",
};

function normalizeDisplaySymbol(symbol: string): string {
  return SYMBOL_DISPLAY_MAP[symbol] ?? symbol;
}

function toApiSymbol(symbol: string): string {
  return SYMBOL_API_MAP[symbol] ?? symbol;
}

function TokenGlyph({ iconUrl, symbol }: { iconUrl?: string; symbol: string }) {
  const [failed, setFailed] = useState(false);
  const letter = (symbol?.[0] ?? "?").toUpperCase();
  const src = getTokenImageUrl(symbol, iconUrl);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-full border border-black/10 bg-white object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-black/15 bg-[#f0e8c0] text-sm font-semibold text-black/70 pizza-display"
      aria-hidden
    >
      {letter}
    </span>
  );
}

function PlaceholderGlyph() {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-black/25 bg-white"
      aria-hidden
    >
      <svg width="20" height="20" viewBox="0 0 20 20" className="text-black/20" aria-hidden>
        <title>Placeholder</title>
        <circle
          cx="10"
          cy="10"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </svg>
    </span>
  );
}

function ChainGlyph({ chain }: { chain: string }) {
  const [failed, setFailed] = useState(false);
  const letter = (getChainShortName(chain)?.[0] ?? chain?.[0] ?? "?").toUpperCase();
  const src = getChainImageUrl(chain);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-full border border-black/10 bg-white object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-black/15 bg-[#f0e8c0] text-sm font-semibold text-black/70 pizza-display"
      aria-hidden
    >
      {letter}
    </span>
  );
}

function PaymentFieldTriggerContent({
  glyph,
  microLabel,
  primaryText,
  placeholder,
}: {
  glyph: ReactNode;
  microLabel: string;
  primaryText: string | undefined;
  placeholder: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {glyph}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="text-[11px] font-medium uppercase tracking-wide text-black/45 pizza-label">
          {microLabel}
        </span>
        <span className="truncate text-base font-semibold leading-tight text-black pizza-display">
          {primaryText ?? placeholder}
        </span>
      </div>
    </div>
  );
}

const BG: Partial<Record<PageStatus, string>> = {
  LOADING: "linear-gradient(160deg, #d35400 0%, #a04000 55%, #884000 100%)",
  ORDER: "linear-gradient(160deg, #d35400 0%, #a04000 55%, #884000 100%)",
  QUOTING: "linear-gradient(160deg, #b7770d 0%, #9a6310 55%, #7d5012 100%)",
  DEPOSIT: "linear-gradient(160deg, #b7770d 0%, #9a6310 55%, #7d5012 100%)",
  VERIFYING: "linear-gradient(160deg, #b7770d 0%, #9a6310 55%, #7d5012 100%)",
  PAID: "linear-gradient(160deg, #1e8449 0%, #196f3d 60%, #145a32 100%)",
  ERROR: "linear-gradient(160deg, #922b21 0%, #7b241c 55%, #641e16 100%)",
};

const BG_FALLBACK = BG.ORDER as string;

function formatAmount(raw: string) {
  const num = Number(raw) / 1_000_000;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function ClipboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PizzaPayer() {
  const apiClient = useApiClient();
  const { orderId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const [pageStatus, setPageStatus] = useState<PageStatus>("LOADING");
  const [selectedSymbol, setSelectedSymbol] = useState("USDC");
  const [chainPreferences, setChainPreferences] = useState<Record<string, string>>({
    USDC: "base",
  });
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
  const hasInitializedRef = useRef(false);
  const selectedContractAddressRef = useRef<string | undefined>(undefined);

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

  const normalizedTokens = useMemo(() => {
    const raw = orderData?.config?.tokens;
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: TokenOption[] = [];
    for (const item of raw) {
      const t = normalizePingPayToken(item);
      if (!t) continue;
      const k = t.contractAddress ? `${t.chain}:${t.contractAddress}` : `${t.chain}:${t.symbol}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  }, [orderData?.config?.tokens]);

  const symbolGroups = useMemo(() => {
    const byDisplayUpper = new Map<string, TokenOption[]>();
    for (const t of normalizedTokens) {
      const display = normalizeDisplaySymbol(t.symbol);
      const k = display.toUpperCase();
      if (!byDisplayUpper.has(k)) byDisplayUpper.set(k, []);
      byDisplayUpper.get(k)!.push(t);
    }
    const groups: { displaySymbol: string; representative: TokenOption }[] = [];
    for (const [, list] of byDisplayUpper) {
      const rep = list.find((x) => x.iconUrl) ?? list[0];
      if (!rep) continue;
      groups.push({ displaySymbol: normalizeDisplaySymbol(rep.symbol), representative: rep });
    }
    groups.sort((a, b) => a.displaySymbol.localeCompare(b.displaySymbol));
    return groups;
  }, [normalizedTokens]);

  const chainsForSymbol = useMemo(() => {
    const displayUpper = selectedSymbol.toUpperCase();
    const set = new Set<string>();
    for (const t of normalizedTokens) {
      if (normalizeDisplaySymbol(t.symbol).toUpperCase() !== displayUpper) continue;
      set.add(t.chain);
    }
    return Array.from(set).sort((a, b) =>
      getChainDisplayName(a).localeCompare(getChainDisplayName(b)),
    );
  }, [normalizedTokens, selectedSymbol]);

  const effectiveChain = useMemo(() => {
    const preferred = chainPreferences[selectedSymbol];
    if (preferred && chainsForSymbol.includes(preferred)) return preferred;
    return chainsForSymbol[0] ?? "base";
  }, [chainPreferences, selectedSymbol, chainsForSymbol]);

  const selectedSymbolRep = useMemo(() => {
    return symbolGroups.find((g) => g.displaySymbol.toUpperCase() === selectedSymbol.toUpperCase())
      ?.representative;
  }, [symbolGroups, selectedSymbol]);

  useEffect(() => {
    if (hasInitializedRef.current || normalizedTokens.length === 0) return;
    hasInitializedRef.current = true;
    const baseUsdc = normalizedTokens.find((t) => t.chain === "base" && t.symbol === "USDC");
    if (baseUsdc) {
      setSelectedSymbol(normalizeDisplaySymbol(baseUsdc.symbol));
      setChainPreferences({ [normalizeDisplaySymbol(baseUsdc.symbol)]: baseUsdc.chain });
      return;
    }
    const first = normalizedTokens[0];
    setSelectedSymbol(normalizeDisplaySymbol(first.symbol));
    setChainPreferences({ [normalizeDisplaySymbol(first.symbol)]: first.chain });
  }, [normalizedTokens]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      sseCancelRef.current?.();
    };
  }, []);

  const selectedToken = useMemo(() => {
    const candidates = normalizedTokens.filter(
      (t) =>
        normalizeDisplaySymbol(t.symbol).toUpperCase() === selectedSymbol.toUpperCase() &&
        t.chain === effectiveChain,
    );
    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0];
    const preferredContract = selectedContractAddressRef.current;
    if (preferredContract) {
      const byContract = candidates.find((t) => t.contractAddress === preferredContract);
      if (byContract) return byContract;
    }
    return candidates[0];
  }, [normalizedTokens, effectiveChain, selectedSymbol]);

  useEffect(() => {
    if (selectedToken?.contractAddress) {
      selectedContractAddressRef.current = selectedToken.contractAddress;
    }
  }, [selectedToken]);

  const preparePayment = useMutation({
    onMutate: () => {
      setPageStatus("QUOTING");
    },
    mutationFn: () =>
      apiClient.preparePizzaPayment({
        orderId,
        payerAsset: {
          chain: effectiveChain,
          symbol: toApiSymbol(selectedSymbol),
          ...(selectedToken?.contractAddress
            ? { contractAddress: selectedToken.contractAddress }
            : {}),
        },
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

      <div
        className="relative z-10 flex flex-col items-center h-full overflow-y-auto overscroll-contain pb-safe px-5"
        style={{ WebkitOverflowScrolling: "touch" } as CSSProperties}
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

              <div
                className="pizza-card w-full p-6 flex flex-col gap-5"
                style={{ background: "#fffde7" }}
              >
                <p className="pizza-label text-[11px] text-black/40">payment</p>
                {normalizedTokens.length === 0 ? (
                  <p
                    className="rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-black/55"
                    style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                  >
                    No payment options available for this order.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Select
                      value={selectedSymbol}
                      onValueChange={(sym) => {
                        setSelectedSymbol(sym);
                      }}
                    >
                      <SelectTrigger
                        id="pay-token"
                        size="default"
                        aria-label={
                          selectedSymbolRep
                            ? `Pay with ${normalizeDisplaySymbol(selectedSymbolRep.symbol)}`
                            : "Select token"
                        }
                        className="h-auto min-h-[60px] w-full rounded-xl border border-[rgba(200,100,80,0.38)] bg-white px-3 py-2.5 text-left text-black shadow-none focus:ring-2 focus:ring-[#d35400]/35 focus:ring-offset-0 data-[size=default]:h-auto dark:border-[rgba(200,100,80,0.38)] dark:bg-white [&_svg]:text-black/45"
                      >
                        <span className="sr-only">
                          <SelectValue placeholder="Select Token" />
                        </span>
                        <PaymentFieldTriggerContent
                          glyph={
                            selectedSymbolRep ? (
                              <TokenGlyph
                                iconUrl={selectedSymbolRep.iconUrl}
                                symbol={selectedSymbol}
                              />
                            ) : (
                              <PlaceholderGlyph />
                            )
                          }
                          microLabel="Pay with this token"
                          primaryText={selectedSymbol}
                          placeholder="Select Token"
                        />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={6}
                        className="z-[110] max-h-[min(70vh,22rem)] border border-black/12 bg-[#fffef8] text-black shadow-xl dark:bg-[#fffef8] dark:text-black"
                      >
                        {symbolGroups.map((g) => {
                          const subtitle = tokenDisplayName(g.representative);
                          return (
                            <SelectItem
                              key={g.displaySymbol}
                              value={g.displaySymbol}
                              textValue={`${g.displaySymbol} ${subtitle ?? ""}`}
                              className="cursor-pointer rounded-lg py-2 pr-8 pl-2 text-black focus:bg-[#f4ecd0] focus:text-black data-[highlighted]:bg-[#f4ecd0] data-[state=checked]:bg-[#f0e4c0]"
                            >
                              <span className="flex items-center gap-3">
                                <TokenGlyph
                                  iconUrl={g.representative.iconUrl}
                                  symbol={g.displaySymbol}
                                />
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                                  <span className="truncate text-base font-semibold leading-tight pizza-display">
                                    {g.displaySymbol}
                                  </span>
                                  {subtitle ? (
                                    <span
                                      className="truncate text-xs leading-snug text-black/50"
                                      style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                                    >
                                      {subtitle}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Select
                      value={effectiveChain}
                      onValueChange={(chain) => {
                        setChainPreferences((prev) => ({ ...prev, [selectedSymbol]: chain }));
                      }}
                      disabled={chainsForSymbol.length === 0}
                    >
                      <SelectTrigger
                        id="pay-network"
                        size="default"
                        aria-label={
                          effectiveChain
                            ? `On network ${getChainDisplayName(effectiveChain)}`
                            : "Select network"
                        }
                        className="h-auto min-h-[60px] w-full rounded-xl border border-[rgba(200,100,80,0.38)] bg-white px-3 py-2.5 text-left text-black shadow-none focus:ring-2 focus:ring-[#d35400]/35 focus:ring-offset-0 data-[size=default]:h-auto disabled:cursor-not-allowed disabled:opacity-55 dark:border-[rgba(200,100,80,0.38)] dark:bg-white [&_svg]:text-black/45"
                      >
                        <span className="sr-only">
                          <SelectValue placeholder="Select Network" />
                        </span>
                        <PaymentFieldTriggerContent
                          glyph={
                            chainsForSymbol.length === 0 || !effectiveChain ? (
                              <PlaceholderGlyph />
                            ) : (
                              <ChainGlyph chain={effectiveChain} />
                            )
                          }
                          microLabel="On this network"
                          primaryText={
                            effectiveChain ? getChainShortName(effectiveChain) : undefined
                          }
                          placeholder="Select Network"
                        />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={6}
                        className="z-[110] max-h-[min(70vh,22rem)] border border-black/12 bg-[#fffef8] text-black shadow-xl dark:bg-[#fffef8] dark:text-black"
                      >
                        {chainsForSymbol.map((chain) => (
                          <SelectItem
                            key={chain}
                            value={chain}
                            textValue={getChainDisplayName(chain)}
                            className="cursor-pointer rounded-lg py-2 pr-8 pl-2 text-black focus:bg-[#f4ecd0] focus:text-black data-[highlighted]:bg-[#f4ecd0] data-[state=checked]:bg-[#f0e4c0]"
                          >
                            <span className="flex items-center gap-3">
                              <ChainGlyph chain={chain} />
                              <span className="flex min-w-0 flex-col gap-0.5 text-left">
                                <span className="truncate text-base font-semibold leading-tight pizza-display">
                                  {getChainShortName(chain)}
                                </span>
                                <span className="truncate text-xs text-black/50">
                                  {getChainDisplayName(chain)}
                                </span>
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => preparePayment.mutate()}
                  disabled={
                    preparePayment.isPending ||
                    normalizedTokens.length === 0 ||
                    chainsForSymbol.length === 0 ||
                    !selectedToken
                  }
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

              <div
                className="pizza-card w-full p-5 flex flex-col gap-4"
                style={{ background: "#fffde7" }}
              >
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
                      style={
                        {
                          minWidth: 36,
                          minHeight: 36,
                          background: copiedAmount ? "#1e8449" : "rgba(0,0,0,0.08)",
                          color: copiedAmount ? "white" : "rgba(0,0,0,0.45)",
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                        } as CSSProperties
                      }
                    >
                      {copiedAmount ? <CheckIcon /> : <ClipboardIcon />}
                    </button>
                  </div>
                  <p className="pizza-label text-black/40 mt-0.5">
                    on {getChainDisplayName(effectiveChain)} network
                  </p>
                </div>

                {(rateDisplay || feeDisplay) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {rateDisplay && (
                      <p
                        className="text-xs text-black/40"
                        style={{ fontFamily: "IBM Plex Mono, monospace" }}
                      >
                        {rateDisplay}
                      </p>
                    )}
                    {feeDisplay && (
                      <p
                        className="text-xs text-black/40"
                        style={{ fontFamily: "IBM Plex Mono, monospace" }}
                      >
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
                      style={
                        {
                          fontFamily: "IBM Plex Mono, monospace",
                          background: "#f0e8c0",
                          userSelect: "all",
                          WebkitUserSelect: "all",
                        } as CSSProperties
                      }
                    >
                      {depositAddress}
                    </code>
                    <button
                      type="button"
                      onClick={copyAddress}
                      aria-label={copied ? "Copied!" : "Copy address"}
                      className="shrink-0 flex items-center justify-center transition-colors"
                      style={
                        {
                          minWidth: 48,
                          minHeight: 48,
                          background: copied ? "#1e8449" : "#d35400",
                          color: "white",
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                        } as CSSProperties
                      }
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
                      style={
                        {
                          minWidth: 36,
                          minHeight: 36,
                          background: copiedAmount ? "#1e8449" : "rgba(0,0,0,0.08)",
                          color: copiedAmount ? "white" : "rgba(0,0,0,0.45)",
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                        } as CSSProperties
                      }
                    >
                      {copiedAmount ? <CheckIcon /> : <ClipboardIcon />}
                    </button>
                  </div>
                  <p className="pizza-label text-black/40 mt-0.5">
                    on {getChainDisplayName(effectiveChain)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"
                    style={{ boxShadow: "0 0 8px rgba(255,255,255,0.8)" }}
                  />
                  <span
                    className="text-sm text-white/80"
                    style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                  >
                    confirming on-chain...
                  </span>
                </div>
                <p
                  className="text-xs text-white/45 text-center max-w-xs"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                >
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
                <p
                  className="text-white/45 text-sm mt-1"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif", fontStyle: "italic" }}
                >
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
