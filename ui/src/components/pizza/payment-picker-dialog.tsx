import { SearchIcon, XIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  compareChainsByPopularity,
  compareTokensByPriority,
  getChainDisplayName,
  getChainImageUrl,
  getChainShortName,
  getTokenImageUrl,
} from "@/lib/pingpay-assets";
import { cn } from "@/lib/utils";

interface TokenOption {
  chain: string;
  symbol: string;
  name?: string;
  iconUrl?: string;
}

function tokenDisplayName(t: TokenOption) {
  if (t.name && t.name !== t.symbol && t.name.toLowerCase() !== t.symbol.toLowerCase()) {
    return t.name;
  }
  return undefined;
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

const PICKER_ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg py-2 pl-2 pr-3 text-left text-black transition-colors hover:bg-[#f4ecd0] focus:bg-[#f4ecd0] focus:outline-none";

const PICKER_PAD = { w: 0, h: 8 };

function getScrollParent(el: HTMLElement | null): HTMLElement | Window {
  if (!el) return window;
  let parent = el.parentElement;
  while (parent) {
    const { overflowY, overflow } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll" || overflow === "auto" || overflow === "scroll") {
      return parent;
    }
    parent = parent.parentElement;
  }
  return window;
}

function usePickerLayout(
  anchorRef: RefObject<HTMLElement | null> | undefined,
  positionRef: RefObject<HTMLElement | null> | undefined,
  open: boolean,
) {
  const [layout, setLayout] = useState<{
    width?: number;
    height?: number;
    top?: number;
    left?: number;
  }>({});

  const measure = useCallback(() => {
    const anchorEl = anchorRef?.current;
    if (!anchorEl) {
      setLayout({});
      return;
    }
    const anchorRect = anchorEl.getBoundingClientRect();
    const cardRect = positionRef?.current?.getBoundingClientRect() ?? anchorRect;
    const maxW = window.innerWidth - 16;
    const maxH = window.innerHeight * 0.85;
    setLayout({
      top: cardRect.top + cardRect.height / 2,
      left: cardRect.left + cardRect.width / 2,
      width: Math.min(anchorRect.width + PICKER_PAD.w, maxW),
      height: Math.min(anchorRect.height + PICKER_PAD.h, maxH),
    });
  }, [anchorRef, positionRef]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const raf = requestAnimationFrame(measure);
    const scrollTarget = getScrollParent(positionRef?.current ?? anchorRef?.current ?? null);
    window.addEventListener("resize", measure);
    scrollTarget.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      scrollTarget.removeEventListener("scroll", measure);
    };
  }, [open, measure, anchorRef, positionRef]);

  return layout;
}

function PaymentPickerDialog({
  open,
  onOpenChange,
  title,
  searchPlaceholder,
  sectionLabel,
  searchQuery,
  onSearchQueryChange,
  emptyMessage,
  children,
  anchorRef,
  positionRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchPlaceholder: string;
  sectionLabel: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  emptyMessage?: string;
  children?: ReactNode;
  anchorRef?: RefObject<HTMLElement | null>;
  positionRef?: RefObject<HTMLElement | null>;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const prevOpen = useRef(false);
  const pickerLayout = usePickerLayout(anchorRef, positionRef, open);
  const hasMeasuredLayout =
    pickerLayout.width != null &&
    pickerLayout.height != null &&
    pickerLayout.top != null &&
    pickerLayout.left != null;

  useEffect(() => {
    if (open && !prevOpen.current) {
      onSearchQueryChange("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    prevOpen.current = open;
  }, [open, onSearchQueryChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        manualPosition={open}
        style={
          hasMeasuredLayout
            ? {
                position: "fixed",
                top: pickerLayout.top,
                left: pickerLayout.left,
                width: pickerLayout.width,
                height: pickerLayout.height,
                transform: "translate(-50%, -50%)",
                maxWidth: "none",
              }
            : undefined
        }
        className={cn(
          "!flex max-w-none flex-col gap-2.5 rounded-[20px] border border-[rgba(200,100,80,0.38)] bg-[#fffef8] p-3 shadow-xl sm:p-4",
          "border-2 border-[rgba(200,100,80,0.38)] dark:border-[rgba(200,100,80,0.38)]",
          !hasMeasuredLayout && "h-[min(28rem,80vh)] w-[min(28rem,calc(100vw-2.5rem))]",
        )}
      >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <DialogTitle className="m-0 text-left text-base font-semibold text-black pizza-display">
              {title}
            </DialogTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 rounded-md p-1 text-black/45 transition-opacity hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d35400]/35"
              aria-label="Close"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <div className="relative shrink-0">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/35"
              aria-hidden
            />
            <Input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 rounded-xl border border-[rgba(200,100,80,0.38)] bg-white pl-10 text-base text-black shadow-none placeholder:text-black/40 focus:ring-2 focus:ring-[#d35400]/35 focus:ring-offset-0 dark:bg-white"
            />
          </div>

          <p className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-black/40 pizza-label">
            {sectionLabel}
          </p>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              {children ??
                (emptyMessage ? (
                  <p
                    className="flex min-h-full items-center justify-center px-2 py-6 text-center text-sm text-black/50"
                    style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                  >
                    {emptyMessage}
                  </p>
                ) : null)}
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentNetworkPickerDialog({
  open,
  onOpenChange,
  chains,
  value,
  onSelect,
  anchorRef,
  positionRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chains: string[];
  value: string;
  onSelect: (chain: string) => void;
  anchorRef?: RefObject<HTMLElement | null>;
  positionRef?: RefObject<HTMLElement | null>;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChains = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? chains
      : chains.filter((chain) => {
          const short = getChainShortName(chain).toLowerCase();
          const full = getChainDisplayName(chain).toLowerCase();
          return chain.toLowerCase().includes(q) || short.includes(q) || full.includes(q);
        });
    return [...list].sort(compareChainsByPopularity);
  }, [chains, searchQuery]);

  const emptyMessage =
    filteredChains.length === 0
      ? searchQuery.trim()
        ? "No networks found"
        : "No networks available"
      : undefined;

  return (
    <PaymentPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      positionRef={positionRef}
      title="Select network"
      searchPlaceholder="Search networks"
      sectionLabel="Available networks"
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      emptyMessage={emptyMessage}
    >
      {filteredChains.length > 0 ? (
        <div className="flex flex-col gap-1">
          {filteredChains.map((chain) => {
            const selected = chain === value;
            const displayName = getChainDisplayName(chain);
            const shortName = getChainShortName(chain);
            const showShortSubtitle =
              shortName.toLowerCase() !== displayName.toLowerCase();
            return (
              <button
                key={chain}
                type="button"
                aria-selected={selected}
                className={cn(PICKER_ROW_CLASS, selected && "bg-[#f0e4c0]")}
                onClick={() => {
                  onSelect(chain);
                  onOpenChange(false);
                }}
              >
                <ChainGlyph chain={chain} />
                <span className="flex min-w-0 flex-col gap-0.5 text-left">
                  <span className="truncate text-base font-semibold leading-tight pizza-display">
                    {displayName}
                  </span>
                  {showShortSubtitle ? (
                    <span
                      className="truncate text-xs text-black/50"
                      style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
                    >
                      {shortName}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : undefined}
    </PaymentPickerDialog>
  );
}

export function PaymentTokenPickerDialog({
  open,
  onOpenChange,
  chain,
  groups,
  value,
  onSelect,
  anchorRef,
  positionRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: string;
  groups: { displaySymbol: string; representative: TokenOption }[];
  value: string;
  onSelect: (displaySymbol: string) => void;
  anchorRef?: RefObject<HTMLElement | null>;
  positionRef?: RefObject<HTMLElement | null>;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = !q
      ? groups
      : groups.filter((g) => {
          const subtitle = tokenDisplayName(g.representative);
          const haystack = [g.displaySymbol, g.representative.symbol, subtitle ?? ""]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
    return [...list].sort((a, b) =>
      compareTokensByPriority(chain, a.displaySymbol, b.displaySymbol),
    );
  }, [chain, groups, searchQuery]);

  const emptyMessage =
    filteredGroups.length === 0
      ? searchQuery.trim()
        ? "No tokens found"
        : "No tokens available"
      : undefined;

  return (
    <PaymentPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      positionRef={positionRef}
      title="Select token"
      searchPlaceholder="Search tokens"
      sectionLabel="All tokens"
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      emptyMessage={emptyMessage}
    >
      {filteredGroups.length > 0 ? (
        <div className="flex flex-col gap-1">
          {filteredGroups.map((g) => {
            const selected = g.displaySymbol === value;
            const subtitle = tokenDisplayName(g.representative);
            return (
              <button
                key={g.displaySymbol}
                type="button"
                aria-selected={selected}
                className={cn(PICKER_ROW_CLASS, selected && "bg-[#f0e4c0]")}
                onClick={() => {
                  onSelect(g.displaySymbol);
                  onOpenChange(false);
                }}
              >
                <TokenGlyph iconUrl={g.representative.iconUrl} symbol={g.displaySymbol} />
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
              </button>
            );
          })}
        </div>
      ) : undefined}
    </PaymentPickerDialog>
  );
}
