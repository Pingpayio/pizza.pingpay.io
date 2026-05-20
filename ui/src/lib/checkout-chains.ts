// Import chain icons from assets/chains (new SVG icons)
import AptosIcon from "@/assets/chains/Aptos.svg";
import ArbitrumIcon from "@/assets/chains/Arbitrum.svg";
import AuroraIcon from "@/assets/chains/Aurora.svg";
import AvalancheIcon from "@/assets/chains/Avalanche.svg";
import BaseIcon from "@/assets/chains/Base.svg";
import BerachainIcon from "@/assets/chains/Berachain.svg";
import BitcoinIcon from "@/assets/chains/Bitcoin.svg";
import BitcoinCashIcon from "@/assets/chains/Bitcoin Cash.svg";
import BNBIcon from "@/assets/chains/BNB.svg";
import CardanoIcon from "@/assets/chains/Cardano.svg";
import DogecoinIcon from "@/assets/chains/Dogecoin.svg";
import EthereumIcon from "@/assets/chains/Ethereum.svg";
import GnosisIcon from "@/assets/chains/Gnosis.svg";
import HyperliquidIcon from "@/assets/chains/Hyperliquid.svg";
import LitecoinIcon from "@/assets/chains/Litecoin.svg";
import MonadIcon from "@/assets/chains/Monad.svg";
import NearIcon from "@/assets/chains/Near.svg";
import OptimismIcon from "@/assets/chains/Optimism.svg";
import PolygonIcon from "@/assets/chains/Polygon.svg";
import SolanaIcon from "@/assets/chains/Solana.svg";
import StarknetIcon from "@/assets/chains/Starknet.svg";
import StellarIcon from "@/assets/chains/Stellar.svg";
import SuiIcon from "@/assets/chains/sui.svg";
import TONIcon from "@/assets/chains/TON.svg";
import TronIcon from "@/assets/chains/Tron.svg";
import XRPLedgerIcon from "@/assets/chains/XRP Ledger.svg";
import ZcashIcon from "@/assets/chains/Zcash.svg";

/**
 * Chain display names mapping
 * Maps chain identifiers to human-readable display names
 * Supports all networks from Intents token list
 */
export const chainDisplayNames: Record<string, string> = {
  // Existing chains
  zec: "Zcash",
  btc: "Bitcoin",
  bch: "Bitcoin Cash",
  xrp: "XRP Ledger",
  eth: "Ethereum",
  sol: "Solana",
  tron: "TRON",
  near: "NEAR Protocol",
  NEAR: "NEAR Protocol", // Support uppercase variant

  // Additional networks from Intents
  sui: "Sui",
  arb: "Arbitrum",
  doge: "Dogecoin",
  gnosis: "Gnosis",
  bera: "Berachain",
  bsc: "BNB Smart Chain",
  pol: "Polygon",
  base: "Base",
  ton: "TON",
  op: "Optimism",
  avax: "Avalanche",
  stellar: "Stellar",
  cardano: "Cardano",
  aptos: "Aptos",
  ltc: "Litecoin",
  aurora: "Aurora",
  starknet: "Starknet",
  strk: "Starknet",
  hyperliquid: "Hyperliquid",
  monad: "Monad",

  // Newer chains from Intents API
  dash: "Dash",
  xlayer: "X Layer",
  plasma: "Plasma",
  aleo: "Aleo",
  adi: "ADI",
  scroll: "Scroll",
};

/**
 * Get display name for a chain
 */
export function getChainDisplayName(chain: string): string {
  return chainDisplayNames[chain] || chain;
}

export const CHAIN_POPULARITY_ORDER = [
  "sol",
  "near",
  "eth",
  "base",
  "zec",
  "btc",
  "tron",
  "xrp",
  "pol",
  "arb",
  "bsc",
  "op",
  "avax",
  "sui",
  "ton",
  "gnosis",
  "stellar",
  "doge",
  "ltc",
  "bch",
  "cardano",
  "aptos",
  "aurora",
  "starknet",
  "hyperliquid",
  "monad",
  "bera",
  "dash",
  "xlayer",
  "plasma",
  "aleo",
  "adi",
  "scroll",
] as const;

const chainPopularityRank = new Map<string, number>(
  CHAIN_POPULARITY_ORDER.map((id, index) => [id, index]),
);

export function normalizeChainId(chain: string): string {
  const k = chain.toLowerCase();
  if (k === "strk") return "starknet";
  return k;
}

export function getChainPopularityRank(chain: string): number {
  return chainPopularityRank.get(normalizeChainId(chain)) ?? Number.MAX_SAFE_INTEGER;
}

export function compareChainsByPopularity(a: string, b: string): number {
  const ra = getChainPopularityRank(a);
  const rb = getChainPopularityRank(b);
  if (ra !== rb) return ra - rb;
  return getChainDisplayName(a).localeCompare(getChainDisplayName(b));
}

/**
 * Chain short names mapping for compact display (e.g., in pills/badges)
 * Uses abbreviated names to avoid overflow
 */
export const chainShortNames: Record<string, string> = {
  zec: "ZEC",
  btc: "BTC",
  bch: "BCH",
  xrp: "XRP",
  eth: "ETH",
  sol: "SOL",
  tron: "TRON",
  near: "NEAR",
  NEAR: "NEAR",
  sui: "SUI",
  arb: "ARB",
  doge: "DOGE",
  gnosis: "GNOSIS",
  bera: "BERA",
  bsc: "BNB",
  pol: "POL",
  base: "BASE",
  ton: "TON",
  op: "OP",
  avax: "AVAX",
  stellar: "XLM",
  cardano: "ADA",
  aptos: "APT",
  ltc: "LTC",
  aurora: "AURORA",
  starknet: "STRK",
  strk: "STRK",
  hyperliquid: "HYPE",
  monad: "MONAD",
};

/**
 * Get short display name for a chain (for compact UI elements)
 */
export function getChainShortName(chain: string): string {
  return chainShortNames[chain.toLowerCase()] || chainShortNames[chain] || chain.toUpperCase();
}

/**
 * Get chain icon from assets/chains folder (new SVG icons)
 * Maps chain identifiers to the corresponding SVG icons
 */
export function getChainIcon(chain: string): string {
  const chainLower = chain.toLowerCase();

  // Map chain identifiers to imported SVG icon assets
  const iconMap: Record<string, string> = {
    // Primary chains
    near: NearIcon,
    eth: EthereumIcon,
    ethereum: EthereumIcon,
    sol: SolanaIcon,
    solana: SolanaIcon,
    btc: BitcoinIcon,
    bitcoin: BitcoinIcon,
    bch: BitcoinCashIcon,

    // EVM chains
    arb: ArbitrumIcon,
    arbitrum: ArbitrumIcon,
    op: OptimismIcon,
    optimism: OptimismIcon,
    base: BaseIcon,
    pol: PolygonIcon,
    polygon: PolygonIcon,
    avax: AvalancheIcon,
    avalanche: AvalancheIcon,
    bsc: BNBIcon,
    bnb: BNBIcon,
    gnosis: GnosisIcon,
    aurora: AuroraIcon,

    // Other L1s
    sui: SuiIcon,
    aptos: AptosIcon,
    ton: TONIcon,
    tron: TronIcon,
    stellar: StellarIcon,
    cardano: CardanoIcon,
    doge: DogecoinIcon,
    dogecoin: DogecoinIcon,
    xrp: XRPLedgerIcon,
    zec: ZcashIcon,
    zcash: ZcashIcon,
    ltc: LitecoinIcon,
    litecoin: LitecoinIcon,

    // Newer chains
    bera: BerachainIcon,
    berachain: BerachainIcon,
    starknet: StarknetIcon,
    strk: StarknetIcon,
    hyperliquid: HyperliquidIcon,
    monad: MonadIcon,
  };

  return iconMap[chainLower]; // undefined for unknown chains — let UI show letter fallback
}
