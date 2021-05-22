<script lang="ts">
	import { onMount } from 'svelte'
	import lamden from "../../static/lamden.png";
	import { projectConf } from "../conf";
	import { setCurrentNetwork } from "../utils";
	import { lamdenWalletInfo, currentNetwork, lwc } from "../stores/lamden";

	let walletErrorMessage = "";

	onMount(() => {
		$lwc.walletIsInstalled().then((installed) => {
			if (!installed) {
				walletErrorMessage = "Lamden wallet extension not found";
			}else{
				$lwc.sendConnection(projectConf[$currentNetwork].lamden.clearingHouse)
			}
		});

		$lwc.events.on("newInfo", handleNewInfo);

		return () => {
			$lwc.events.removeListener("newInfo", handleNewInfo);
		}
	})

	const handleNewInfo = (data) => {
		$lamdenWalletInfo = data;
		const { errors } = data;
		if (errors && errors.length > 0) {
			for (const error of errors) {
				if (error.includes("You must be an authorized dApp")) {
					walletErrorMessage = "Please authorize the dApp";
				} else if (error.includes("is Locked")) {
					walletErrorMessage = "Please unlock your lamden wallet";
				} else if (error.includes("User rejected")) {
					walletErrorMessage = "Connection Rejected. Refresh page to try again.";
				} else {
					console.log(error);
				}
			}
		} else {
			console.log("connected")
		}
	}

	const handleNetworkChange = (e) => {
		if ($currentNetwork === "testnet"){
			setCurrentNetwork("mainnet")
			//currentNetwork.set("mainnet")
			location.reload()
		}
		if ($currentNetwork === "mainnet"){
			setCurrentNetwork("testnet")
			//currentNetwork.set("testnet")
			location.reload()
		}

	}
</script>

<img src={lamden} alt="">
{#if walletErrorMessage}
	<h2 class="heading">{walletErrorMessage}</h2>
{:else}
	<h2>Connect to Lamden Wallet</h2>
{/if}
<button on:click={handleNetworkChange}>Switch to {$currentNetwork === "testnet" ? "Mainnet" : "Testnet"}</button>


<style>
	h2{
		text-align: center;
	}
	img{
		display: block;
		margin-bottom: 2rem;
		max-width: 180px;
		margin: 2rem auto;
	}
	.hidden {
		display: none !important;
	}
	.wallet-error {
		display: block;
		width: 100%;
		height: 100%;
		background-color: #f9f9f9;
		text-align: center;
	}
	.wallet-error > img {
		max-width: 120px;
	}
	.wallet-error > h2 {
		font-size: 2rem;
	}
	button{
		display: block;
		margin: 0 auto;
	}
</style>
	