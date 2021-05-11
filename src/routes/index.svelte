<script lang="ts">
  import ImageSwapper from "../components/image-swapper.svelte";
  import WalletConnect from "../components/wallet-connect.svelte";
  import { web3, selectedAccount, connected } from "svelte-web3";
  import FormEthLamden from "../components/form-eth-lamden.svelte";
  import { ethToLamdenStore } from "../stores/ethToLamden";
  import FormLamdenEth from "../components/form-lamden-eth.svelte";
  import LamdenConnect from "../components/lamden-connect.svelte";

  $: account = $selectedAccount || "0x0000000000000000000000000000000000000000";
  $: balance = $connected ? $web3.eth.getBalance(account) : "";
</script>

<svelte:head>
  <title>Lamden Link - Token Bridge</title>
</svelte:head>

{#if $connected}
  <div class="container">
    <div class="col-md-8 offset-md-2">
      <h1 class="heading text-center">Lamden Link</h1>
      <ImageSwapper />
      <LamdenConnect />
      {#if $ethToLamdenStore}
        <FormEthLamden />
      {:else}
        <FormLamdenEth />
      {/if}
    </div>
  </div>
{:else}
  <WalletConnect />
{/if}
