import { writable, derived } from "svelte/store";
import BN from 'bignumber.js'

export const lamdenWalletInfo = writable(undefined);
export const tauBalance = writable(new BN(0));
export const ethBalance = writable(new BN(0));
export const currentNetwork = writable(null);
export const lwc = writable(null)
export const vk = derived(lamdenWalletInfo, ($lamdenWalletInfo) => {
  if (
    $lamdenWalletInfo &&
    $lamdenWalletInfo.wallets &&
    $lamdenWalletInfo.wallets.length > 0
  ) {

    return $lamdenWalletInfo.wallets[0];
  } else {
    return undefined;
  }
});
