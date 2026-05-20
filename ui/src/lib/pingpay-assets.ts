import { getAssetIcon } from "./checkout-assets";
import {
  compareChainsByPopularity,
  getChainDisplayName,
  getChainIcon,
  getChainShortName,
} from "./checkout-chains";
import { compareTokensByPriority } from "./checkout-token-sort";

export {
  compareChainsByPopularity,
  compareTokensByPriority,
  getAssetIcon,
  getChainDisplayName,
  getChainIcon,
  getChainShortName,
};

export function getTokenImageUrl(
  symbol: string,
  iconUrlFromApi?: string | undefined,
): string | undefined {
  const fromApi = iconUrlFromApi?.trim();
  if (fromApi) return fromApi;
  return getAssetIcon(symbol);
}

export function getChainImageUrl(chain: string): string | undefined {
  const url = getChainIcon(chain);
  return url || undefined;
}
