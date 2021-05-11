<script lang="ts">
	import ImageSwapper from "../components/image-swapper.svelte";
	import WalletConnect from "../components/wallet-connect.svelte";
	import { web3, selectedAccount, connected } from "svelte-web3";
	import FormEthLamden from "../components/form-eth-lamden.svelte";
	import { ethToLamdenStore } from "../stores/ethToLamden";
	import FormLamdenEth from "../components/form-lamden-eth.svelte";
	import LamdenConnect from "../components/lamden-connect.svelte";

	// Images

	$: account = $selectedAccount || "0x0000000000000000000000000000000000000000";
	$: balance = $connected ? $web3.eth.getBalance(account) : "";
</script>

<style>
	.heading{
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		margin: 1rem 0 2rem;
	}
	.heading > img{
		width: 75px;

	}
	.heading > h1 {
		margin: 0 0 0 0.25rem;
	}
</style>

<svelte:head>
<title>Lamden Link - Token Bridge</title>
</svelte:head>


<div class="container">
	<div class="col-md-8 offset-md-2">
		<div class="heading">
			<img src="/logo-512.png" alt="lamden-link-logo" />
			<h1 class="heading text-center">Lamden Link</h1>
		</div>
		{#if $connected}
			<ImageSwapper />
			<LamdenConnect />
			{#if $ethToLamdenStore}
				<FormEthLamden />
			{:else}
				<FormLamdenEth />
			{/if}
		{:else}
			<WalletConnect />
		{/if}
	</div>
</div>

