<script lang="ts">
	import { onMount } from 'svelte'
	import { ethToLamdenStore } from "../stores/ethToLamden";
	import { projectConf } from "../conf.js";
	import { vk, tauBalance } from "../stores/lamden.ts"


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
		checkLamdenBalance()
		timer = setInterval(checkLamdenBalance, 15000)
		return () => {
			clearInterval(checkLamdenBalance)
			timer = null
		}
	})

	function changePosition() {
		ethToLamdenStore.update(e2l => !e2l);
	}

	async function checkLamdenBalance() {
		if (typeof window === 'undefined') return
		if (document.hidden) return
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
</script>

	<div class="row">
	<div class="col">
		<img src={eth} class="token-img img-thumbnail" alt="" />
		<p class="img-thumbnail text-center">Ethereum</p>
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
		<p class="img-thumbnail text-center">Lamden</p>
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
