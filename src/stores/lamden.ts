import { writable, derived } from "svelte/store";

export const lamdenWalletInfo = writable(undefined);
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
