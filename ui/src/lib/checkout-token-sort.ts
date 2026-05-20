import { getAssetIcon } from "./checkout-assets";
import { normalizeChainId } from "./checkout-chains";

const EVM_ETH_NATIVE_CHAINS = new Set([
  "base",
  "arb",
  "op",
  "scroll",
  "xlayer",
  "plasma",
  "aurora",
  "adi",
  "aleo",
  "hyperliquid",
  "monad",
  "bera",
]);

const CHAIN_NATIVE_SYMBOLS: Record<string, readonly string[]> = {
  near: ["NEAR"],
  eth: ["ETH", "WETH"],
  sol: ["SOL", "WSOL"],
  btc: ["BTC"],
  base: ["ETH", "WETH"],
  arb: ["ETH", "WETH"],
  op: ["ETH", "WETH"],
  pol: ["POL", "MATIC"],
  bsc: ["BNB"],
  avax: ["AVAX"],
  zec: ["ZEC"],
  tron: ["TRX"],
  xrp: ["XRP"],
  sui: ["SUI"],
  ton: ["TON"],
  aptos: ["APT"],
  doge: ["DOGE"],
  ltc: ["LTC"],
  bch: ["BCH"],
  cardano: ["ADA"],
  stellar: ["XLM"],
  gnosis: ["GNO"],
  bera: ["BERA"],
  starknet: ["STRK"],
  hyperliquid: ["HYPE"],
  monad: ["MON"],
  scroll: ["ETH", "WETH"],
  xlayer: ["ETH", "WETH"],
  plasma: ["ETH", "WETH"],
  aurora: ["ETH", "WETH"],
  adi: ["ETH", "WETH"],
  aleo: ["ETH", "WETH"],
  dash: ["DASH"],
};

export const STABLECOIN_ORDER = [
  "USDC",
  "USDT",
  "DAI",
  "USD1",
  "USDF",
  "EURE",
  "GBPE",
] as const;

const stablecoinRank = new Map<string, number>(
  STABLECOIN_ORDER.map((sym, index) => [sym, index]),
);

export const GLOBAL_MAJOR_TOKEN_ORDER = [
  "SOL",
  "ETH",
  "WETH",
  "BTC",
  "WBTC",
  "CBBTC",
  "XBTC",
  "NEAR",
  "ZEC",
  "BNB",
  "AVAX",
  "POL",
  "MATIC",
  "TRX",
  "XRP",
  "DOGE",
  "TON",
  "SUI",
  "APT",
  "ADA",
  "XLM",
  "LTC",
  "BCH",
  "LINK",
  "UNI",
  "AAVE",
  "ARB",
  "OP",
  "STRK",
  "GNO",
  "GMX",
  "SAFE",
  "OKB",
  "KNC",
  "COW",
  "SWEAT",
  "AURORA",
  "BERA",
  "MON",
  "HYPE",
  "DASH",
  "ADI",
  "ASTER",
  "ABG",
  "CFI",
  "GNEAR",
  "HAPI",
  "ITLX",
  "JAMBO",
  "KAT",
  "MPDAO",
  "NOEAR",
  "NPRO",
  "PUBLIC",
  "RHEA",
  "SCORE",
] as const;

const majorTokenRank = new Map<string, number>(
  GLOBAL_MAJOR_TOKEN_ORDER.map((sym, index) => [sym, index]),
);

export const MEMECOIN_SYMBOLS = new Set<string>([
  "PEPE",
  "SHIB",
  "WIF",
  "TURBO",
  "TRUMP",
  "MELANIA",
  "MOG",
  "SPX",
  "KAITO",
  "BRETT",
  "BOME",
  "PENGU",
  "BLACKDRAGON",
  "SHITZU",
  "LOUD",
  "PURGE",
  "BRRR",
]);

const TIER_NATIVE = 0;
const TIER_STABLE = 1;
const TIER_MAJOR = 2;
const TIER_OTHER_KNOWN = 3;
const TIER_MEME = 4;
const TIER_UNKNOWN = 5;

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase();
}

function getChainNativeSymbols(chain: string): readonly string[] {
  const id = normalizeChainId(chain);
  if (CHAIN_NATIVE_SYMBOLS[id]) return CHAIN_NATIVE_SYMBOLS[id];
  if (EVM_ETH_NATIVE_CHAINS.has(id)) return ["ETH", "WETH"];
  return [];
}

function getTokenSortKey(chain: string, displaySymbol: string): [tier: number, subRank: number, label: string] {
  const sym = normalizeSymbol(displaySymbol);
  const label = displaySymbol;

  const natives = getChainNativeSymbols(chain);
  const nativeIdx = natives.indexOf(sym);
  if (nativeIdx !== -1) {
    return [TIER_NATIVE, nativeIdx, label];
  }

  const stableIdx = stablecoinRank.get(sym);
  if (stableIdx !== undefined) {
    return [TIER_STABLE, stableIdx, label];
  }

  const majorIdx = majorTokenRank.get(sym);
  if (majorIdx !== undefined) {
    return [TIER_MAJOR, majorIdx, label];
  }

  if (MEMECOIN_SYMBOLS.has(sym)) {
    return [TIER_MEME, Number.MAX_SAFE_INTEGER, label];
  }

  if (getAssetIcon(displaySymbol) !== undefined) {
    return [TIER_OTHER_KNOWN, Number.MAX_SAFE_INTEGER, label];
  }

  return [TIER_UNKNOWN, Number.MAX_SAFE_INTEGER, label];
}

export function getTokenSortTier(chain: string, displaySymbol: string): number {
  return getTokenSortKey(chain, displaySymbol)[0];
}

export function compareTokensByPriority(
  chain: string,
  aDisplay: string,
  bDisplay: string,
): number {
  const ka = getTokenSortKey(chain, aDisplay);
  const kb = getTokenSortKey(chain, bDisplay);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (ka[1] !== kb[1]) return ka[1] - kb[1];
  return ka[2].localeCompare(kb[2]);
}
