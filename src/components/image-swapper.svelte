<script lang="ts">
	import { onMount } from 'svelte'
	import { ethToLamdenStore } from "../stores/ethToLamden";
	import { projectConf } from "../conf.js";
	import { web3, selectedAccount } from "svelte-web3";
	import { vk, tauBalance, ethBalance } from "../stores/lamden.ts"
	import BN from 'bignumber.js'


	/* Images */
	import eth from "../../static/ethereum.jpg";
	import lamden from "../../static/lamden.png";
	import swapIcon from "../../static/swap.png";

	export let ethToLamden: boolean;

	let timer = null;

	ethToLamdenStore.subscribe((e2l) => {
		ethToLamden = e2l;
	});

	onMount(() => {
		setTimeout(checkAccoutBalances, 5000)
		timer = setInterval(checkAccoutBalances, 30000)
		return () => {
			clearInterval(checkAccoutBalances)
			timer = null
		}
	})

	function changePosition() {
		ethToLamdenStore.update(e2l => !e2l);
	}

	async function checkAccoutBalances(){
		if (typeof window === 'undefined') return
		if (document.hidden) return
		checkLamdenBalance()
		checkETHBalance()
	}

	async function checkLamdenBalance() {
		if (!$vk) return
		try {
			const res = await fetch(
				`${projectConf.lamden.network.apiLink}/states/currency/balances/${$vk}`,
				{
				method: "GET",
				}
			);
			if (res.status === 200) {
				const value = (await res.json()).value;
				if (value) {
				if (value.__fixed__) tauBalance.set(new BN(value.__fixed__));
				else tauBalance.set(new BN(value));
				} else {
					tauBalance.set(new BN(0));
				}
			}
		} catch (error) {
			tauBalance.set(new BN(0));
		}
	}

	async function checkETHBalance(){
		if (!$selectedAccount) return
		$web3.eth.getBalance($selectedAccount).then(res => {
			ethBalance.set(new BN(Web3.utils.fromWei(res, 'ether')))
		})
	}
</script>

	<div class="row">
	<div class="col">
		<img src={eth} class="token-img img-thumbnail" alt="" />
		<p class="img-thumbnail text-center">Kovan Ethereum 
			<br>
			<a href="https://faucet.kovan.network/" rel="noopener noreferrer" target="_blank">Kovan ETH Faucet</a>
		</p>
		<p class="img-thumbnail text-center">{`${$ethBalance.toFixed(8)} ETH`}</p>
		
	</div>
	<div class="switch col" id="arrow" on:click={changePosition}>
		<img
		src={swapIcon}
		id=""
		class={ethToLamden ? "" : "reverse-arrow"}
		alt=""
		/>
		<strong>Switch</strong>
	</div>
	<div class="col">
		<img src={lamden} class="token-img img-thumbnail" alt="" />
		<p class="img-thumbnail text-center">Lamden Testnet</p>
		<p class="img-thumbnail text-center">{`${$tauBalance.toFixed(8)} ${projectConf.lamden.currencySymbol}`}</p>
	</div>
</div>

<style>
	.reverse-arrow {
		transform: rotate(180deg);
	}
	.switch{
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.switch > strong {
		text-decoration: underline;
		color: var(--primary-color);
	}
</style>
