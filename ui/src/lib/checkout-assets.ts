// Import asset icons from assets/asset folder (new SVG icons)
import AAVEIcon from "@/assets/asset/AAVE.svg";
import ABGIcon from "@/assets/asset/ABG.svg";
import ADAIcon from "@/assets/asset/ADA.svg";
import ADIIcon from "@/assets/asset/ADI.svg";
import APTIcon from "@/assets/asset/APT.svg";
import ARBIcon from "@/assets/asset/ARB.svg";
import ASTERIcon from "@/assets/asset/ASTER.svg";
import AURORAIcon from "@/assets/asset/AURORA.svg";
import AVAXIcon from "@/assets/asset/AVAX.svg";
import BCHIcon from "@/assets/asset/BCH.svg";
import BERAIcon from "@/assets/asset/BERA.svg";
import BLACKDRAGONIcon from "@/assets/asset/BLACKDRAGON.svg";
import BNBIcon from "@/assets/asset/BNB.svg";
import BOMEIcon from "@/assets/asset/BOME.svg";
import BRETTIcon from "@/assets/asset/BRETT.svg";
import BRRRIcon from "@/assets/asset/BRRR.svg";
import BTCIcon from "@/assets/asset/BTC.svg";
import CFIIcon from "@/assets/asset/CFI.svg";
import COWIcon from "@/assets/asset/COW.svg";
import cbBTCIcon from "@/assets/asset/cbBTC.svg";
import DAIIcon from "@/assets/asset/DAI.svg";
import DOGEIcon from "@/assets/asset/DOGE.svg";
import ETHIcon from "@/assets/asset/ETH.svg";
import EUReIcon from "@/assets/asset/EURe.svg";
import GBPeIcon from "@/assets/asset/GBPe.svg";
import GMXIcon from "@/assets/asset/GMX.svg";
import GNEARIcon from "@/assets/asset/GNEAR.svg";
import GNOIcon from "@/assets/asset/GNO.svg";
import HAPIIcon from "@/assets/asset/HAPI.svg";
import ITLXIcon from "@/assets/asset/ITLX.svg";
import JAMBOIcon from "@/assets/asset/JAMBO.svg";
import KAITOIcon from "@/assets/asset/KAITO.svg";
import KATIcon from "@/assets/asset/KAT.svg";
import KNCIcon from "@/assets/asset/KNC.svg";
import LINKIcon from "@/assets/asset/LINK.svg";
import LOUDIcon from "@/assets/asset/LOUD.svg";
import LTCIcon from "@/assets/asset/LTC.svg";
import MELANIAIcon from "@/assets/asset/MELANIA.svg";
import MOGIcon from "@/assets/asset/MOG.svg";
import MONIcon from "@/assets/asset/MON.svg";
import mpDAOIcon from "@/assets/asset/mpDAO.svg";
import NEARIcon from "@/assets/asset/NEAR.svg";
import NOEARIcon from "@/assets/asset/NOEAR.svg";
import NPROIcon from "@/assets/asset/NPRO.svg";
import OKBIcon from "@/assets/asset/OKB.svg";
import OPIcon from "@/assets/asset/OP.svg";
import PENGUIcon from "@/assets/asset/PENGU.svg";
import PEPEIcon from "@/assets/asset/PEPE.svg";
import POLIcon from "@/assets/asset/POL.svg";
import PUBLICIcon from "@/assets/asset/PUBLIC.svg";
import PURGEIcon from "@/assets/asset/PURGE.svg";
import RHEAIcon from "@/assets/asset/RHEA.svg";
import SAFEIcon from "@/assets/asset/SAFE.svg";
import SCOREIcon from "@/assets/asset/SCORE.svg";
import SHIBIcon from "@/assets/asset/SHIB.svg";
import SHITZUIcon from "@/assets/asset/SHITZU.svg";
import SOLIcon from "@/assets/asset/SOL.svg";
import SPXIcon from "@/assets/asset/SPX.svg";
import STRKIcon from "@/assets/asset/STRK.svg";
import SUIIcon from "@/assets/asset/SUI.svg";
import SWEATIcon from "@/assets/asset/SWEAT.svg";
import TONIcon from "@/assets/asset/TON.svg";
import TRUMPIcon from "@/assets/asset/TRUMP.svg";
import TRXIcon from "@/assets/asset/TRX.svg";
import TURBOIcon from "@/assets/asset/TURBO.svg";
import UNIIcon from "@/assets/asset/UNI.svg";
import USD1Icon from "@/assets/asset/USD1.svg";
import USDCIcon from "@/assets/asset/USDC.svg";
import USDfIcon from "@/assets/asset/USDf.svg";
import USDTIcon from "@/assets/asset/USDT.svg";
import WBTCIcon from "@/assets/asset/WBTC.svg";
import WIFIcon from "@/assets/asset/WIF.svg";
import XLMIcon from "@/assets/asset/XLM.svg";
import XRPIcon from "@/assets/asset/XRP.svg";
import xBTCIcon from "@/assets/asset/xBTC.svg";
import ZECIcon from "@/assets/asset/ZEC.svg";

/**
 * NEAR Asset List for UI
 * Used for displaying available payment assets to users
 */
export interface NearAsset {
  id: string; // Display name (e.g., "Near", "USD Coin")
  name: string; // Symbol for display (e.g., "NEAR", "USDC")
  flag: string; // Path to asset icon
}

export const nearAssets: NearAsset[] = [
  { id: "Near", name: "NEAR", flag: "/Near.png" },
  { id: "USD Coin", name: "USDC", flag: "/USD Coin.png" },
  { id: "Tether USD", name: "USDT", flag: "/Tether USD.png" },
];

/**
 * Asset Display Name to API Symbol Mapping
 * Maps UI display names to the symbols used by the 1Click API
 */
export const assetDisplayToSymbolMap: Record<string, string> = {
  // Primary mappings
  Near: "wnear",
  "USD Coin": "USDC",
  "Tether USD": "USDT",

  // Fallbacks (direct symbol usage)
  USDC: "USDC",
  USDT: "USDT",
  NEAR: "wnear",
  wnear: "wnear",
  wNEAR: "wnear",
  WRAP: "wnear",
};

/**
 * Convert UI display name to API symbol
 * @param displayName - The display name from UI (e.g., "Near", "USD Coin")
 * @returns The API symbol (e.g., "wnear", "USDC")
 */
export function getAssetSymbol(displayName: string): string {
  return assetDisplayToSymbolMap[displayName] || displayName;
}

/**
 * Get asset by display name
 */
export function getAssetByDisplayName(displayName: string): NearAsset | undefined {
  return nearAssets.find((asset) => asset.id === displayName || asset.name === displayName);
}

/**
 * Get asset by API symbol
 */
export function getAssetBySymbol(symbol: string): NearAsset | undefined {
  const displayName = Object.keys(assetDisplayToSymbolMap).find(
    (key) => assetDisplayToSymbolMap[key] === symbol,
  );
  if (!displayName) return undefined;
  return getAssetByDisplayName(displayName);
}

/**
 * Convert ProcessedToken to asset format for payment preparation
 * Maps token symbols to API symbols using the display-to-symbol mapping
 * @param token - The token to convert
 * @param chain - Optional chain identifier (defaults to 'NEAR' for backward compatibility)
 */
export function tokenToAssetFormat(
  token: { symbol: string; accountId: string },
  chain: string = "NEAR",
): {
  chain: string;
  symbol: string;
} {
  // For native NEAR, use wnear as the symbol
  if (token.accountId === "NATIVE" || token.symbol === "NEAR") {
    return { chain: "NEAR", symbol: "wnear" };
  }

  // For other tokens, use the symbol directly (it should match API symbols)
  // If it doesn't match, try to map it
  const apiSymbol = getAssetSymbol(token.symbol);
  return { chain, symbol: apiSymbol };
}

/**
 * Get asset icon from assets/asset folder (new SVG icons)
 * Maps token symbols to their corresponding SVG icons
 * @param symbol - The token symbol (e.g., "USDC", "ETH", "BTC")
 * @returns The imported SVG icon path, or undefined if not found
 */
export function getAssetIcon(symbol: string): string | undefined {
  // Normalize symbol to uppercase
  const symbolUpper = symbol.toUpperCase();

  // Map symbols to imported SVG icon assets
  const iconMap: Record<string, string> = {
    // Stablecoins
    USDC: USDCIcon,
    USDT: USDTIcon,
    DAI: DAIIcon,
    USDF: USDfIcon,
    USD1: USD1Icon,
    EURE: EUReIcon,
    GBPE: GBPeIcon,

    // Major tokens
    ETH: ETHIcon,
    WETH: ETHIcon,
    BTC: BTCIcon,
    WBTC: WBTCIcon,
    XBTC: xBTCIcon,
    CBBTC: cbBTCIcon,
    SOL: SOLIcon,
    WSOL: SOLIcon,

    // NEAR ecosystem
    NEAR: NEARIcon,
    WNEAR: NEARIcon,
    SWEAT: SWEATIcon,

    // L1 tokens
    SUI: SUIIcon,
    APT: APTIcon,
    TON: TONIcon,
    TRX: TRXIcon,
    XRP: XRPIcon,
    XLM: XLMIcon,
    ADA: ADAIcon,
    DOGE: DOGEIcon,
    LTC: LTCIcon,
    BCH: BCHIcon,
    ZEC: ZECIcon,

    // L2 / EVM tokens
    ARB: ARBIcon,
    OP: OPIcon,
    POL: POLIcon,
    MATIC: POLIcon,
    AVAX: AVAXIcon,
    BNB: BNBIcon,
    BERA: BERAIcon,
    STRK: STRKIcon,
    GNO: GNOIcon,
    MON: MONIcon,
    AURORA: AURORAIcon,

    // DeFi tokens
    AAVE: AAVEIcon,
    UNI: UNIIcon,
    LINK: LINKIcon,
    GMX: GMXIcon,
    SAFE: SAFEIcon,
    OKB: OKBIcon,
    KNC: KNCIcon,
    COW: COWIcon,

    // Meme tokens
    PEPE: PEPEIcon,
    SHIB: SHIBIcon,
    WIF: WIFIcon,
    TURBO: TURBOIcon,
    TRUMP: TRUMPIcon,
    MELANIA: MELANIAIcon,
    MOG: MOGIcon,
    SPX: SPXIcon,
    KAITO: KAITOIcon,
    BRETT: BRETTIcon,
    BOME: BOMEIcon,
    PENGU: PENGUIcon,

    // Additional tokens
    ABG: ABGIcon,
    ADI: ADIIcon,
    ASTER: ASTERIcon,
    BLACKDRAGON: BLACKDRAGONIcon,
    BRRR: BRRRIcon,
    CFI: CFIIcon,
    GNEAR: GNEARIcon,
    HAPI: HAPIIcon,
    ITLX: ITLXIcon,
    JAMBO: JAMBOIcon,
    KAT: KATIcon,
    LOUD: LOUDIcon,
    MPDAO: mpDAOIcon,
    NOEAR: NOEARIcon,
    NPRO: NPROIcon,
    PUBLIC: PUBLICIcon,
    PURGE: PURGEIcon,
    RHEA: RHEAIcon,
    SCORE: SCOREIcon,
    SHITZU: SHITZUIcon,
  };

  return iconMap[symbolUpper];
}
