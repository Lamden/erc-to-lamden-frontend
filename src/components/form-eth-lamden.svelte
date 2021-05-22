<script lang="ts">
	import {onMount} from 'svelte'	
	import Alert from "../components/alert.svelte";
	import { projectConf } from "../conf.js";
	import { web3, selectedAccount, chainData } from "svelte-web3";
	import { vk, ethBalance, currentNetwork } from "../stores/lamden";
	import BN from 'bignumber.js'

	let tokenName = ""
	let isLoading = false;
	let conf = projectConf[$currentNetwork]

	$: message = "";
	$: success = "";
	$: status = ""
	$: buttonDisabled = $chainData.chainId !== conf.ethereum.chainId || $ethBalance.isLessThanOrEqualTo(0)

	let balance = new BN(0);

	chainData.subscribe(current => checkChain(current))

	onMount(() => {
		checkChain($chainData)
	})

	function checkChain (current){
		if (current.chainId !== conf.ethereum.chainId){
			message = `Switch Metamask to ${conf.ethereum.networkName}.`
			return
		}
		if (current.chainId === conf.ethereum.chainId && message === `Switch Metamask to ${conf.ethereum.networkName}.`){
			message = ""
		}	
	}

	function isString(s) {
		return typeof s === "string" || s instanceof String;
	}

	async function checkTokenBalance(event) {
		if (event.target.value) {
			tokenName = event.target.value;
			const token = conf.ethereum.tokens
				.filter((t) => t.name === tokenName)
				.pop();
			try {
				const erc20TokenContract = new $web3.eth.Contract(
					token.abi,
					token.address
				);
				const val = await erc20TokenContract.methods
					.balanceOf($selectedAccount)
					.call();
				if (val) {
					balance = new BN(Web3.utils.fromWei(val, 'ether'))
				} else {
					balance = new BN(0)
				}
			} catch (error) {
				console.log(error);
			}
		}
	}

	function toBaseUnit(value, decimals, BN) {
		if (!isString(value)) {
			throw new Error(
				"Pass strings to prevent floating point precision issues."
			);
		}
		const ten = new BN(10);
		const base = ten.pow(new BN(decimals));

		// Is it negative?
		let negative = value.substring(0, 1) === "-";
		if (negative) {
			value = value.substring(1);
		}

		if (value === ".") {
			throw new Error(
				`Invalid value ${value} cannot be converted to` +
				` base unit with ${decimals} decimals.`
			);
		}

		// Split it into a whole and fractional part
		let comps = value.split(".");
			if (comps.length > 2) {
			throw new Error("Too many decimal points");
		}

		let whole = comps[0],
		fraction = comps[1];

		if (!whole) {
			whole = "0";
		}
		if (!fraction) {
			fraction = "0";
		}
		if (fraction.length > decimals) {
			throw new Error("Too many decimal places");
		}

		while (fraction.length < decimals) {
			fraction += "0";
		}

		whole = new BN(whole);
		fraction = new BN(fraction);
		let wei = whole.mul(base).add(fraction);

		if (negative) {
			wei = wei.neg();
		}

		return new BN(wei.toString(10), 10);
	}

	async function startSwap(event) {
		isLoading = true
		message = ""
		status = ""

		const formData = new FormData(event.target);
		const tokenName = formData.get("tokenName").toString();
		const recipient = $vk;
		let quantity = new BN(formData.get("quantity"));

		const token = conf.ethereum.tokens
		.filter((t) => t.name === tokenName)
		.pop();

		if (!token) {
			isLoading = false;
			message = "Invalid Token Selected.";
		return;
		}

		if (
			!recipient ||
			recipient.length != 64 ||
			!recipient.match(/[0-9A-Fa-f]{6}/g)
		) {
			isLoading = false;
			message = "Recipient's Lamden key is not correct.";
			return;
		}
		if (quantity.isNaN() || quantity.isLessThanOrEqualTo(0)) {
			isLoading = false;
			message = "Invalid quantity";
			return;
		}

		quantity = toBaseUnit(
			quantity.toString(),
			token.decimals,
			$web3.utils.BN
		).toString();

		const erc20TokenContract = new $web3.eth.Contract(token.abi, token.address);
		const clearingHouseContract = new $web3.eth.Contract(
			conf.ethereum.clearingHouse.abi,
			conf.ethereum.clearingHouse.address
		);

		try {
			let currentBalance = await erc20TokenContract.methods
				.balanceOf($selectedAccount)
				.call();

			currentBalance = new BN(currentBalance)

			if (currentBalance.isLessThan(quantity)) {
				message = 
					`You do not have enough balance in your metamask wallet. 
					You currently own ${balance.toFixed(token.decimals)} ${tokenName} but you are trying to swap 
					${new BN(Web3.utils.fromWei(quantity.toString(), 'ether')).toFixed(token.decimals)} ${tokenName} tokens.`;
				isLoading = false;
				return;
			}
		} catch (error) {
			console.log(error);
			isLoading = false;
			message = "Something went wrong.";
			return;
		}

		try {
			status = "Sending Etherum token approval..."
			const approval = await erc20TokenContract.methods
				.approve(conf.ethereum.clearingHouse.address, quantity.toString())
				.send({ from: $selectedAccount });

			if (approval.status === true) {
				status = `Sending ${token.name} tokens from Ethereum to Lamden...`
				const swaped = await clearingHouseContract.methods
				.deposit(token.address, quantity.toString(), recipient)
				.send({ from: $selectedAccount });

				if (swaped.status) {
					isLoading = false;
					success = "Swapping was successful";
					return;
				} else {
					throw new Error("Clearing house status is not true.");
				}
			} else {
				throw new Error("Erc20 Status is not true.");
			}
		} catch (error) {
			console.log(error);
			if (error.code && error.code === 4001) {
				message = "Transaction canceled by user.";
			} else {
				message = "Transaction failed.";
			}
			isLoading = false;
			return;
		}
	}

	const handleInput = (e) => {
		e.target.setCustomValidity('')
		e.target.value = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
	}
	const handleInvalid = (e) => e.target.setCustomValidity('A number is required')

</script>
<div class="loading {isLoading ? 'is-loading' : ''}">
	<h1>Loading</h1>
	<p class="status">{status}</p>
</div>

<div class="row" style="margin-top: 3rem">
	<Alert {message} type={"danger"} />
	<Alert message={success} type={"success"} />
	<form
		on:submit|preventDefault={startSwap}
		action="#"
		method="POST"
		style="width: 100%"
	>
		<div class="form-group">
		<label for="tokenName">Token Name</label>
		<select
			class="form-control"
			on:change={checkTokenBalance}
			name="tokenName"
			id="tokenName"
		>
			<option value="">Select Token</option>
			{#each conf.ethereum.tokens as token}
				<option value={token.name}>{token.name}</option>
			{/each}
		</select>
		{#if tokenName}
			<p> {`Your Ethereum ${tokenName} balance is: ${balance.toFixed(18)} ${tokenName}`}</p>
		{/if}
		</div>
		<div class="form-group">
		<label for="quantity">Amount</label>
		<input 
			class="form-control"
			type="text"
			placeholder=""
			name="quantity"
			id="quantity"
			required 
			pattern="^\d*\.?\d*$"
			on:invalid={handleInvalid}
			on:input={handleInput}>
		</div>
		<br />
		<button type="submit" disabled={buttonDisabled} class="btn btn-outline-primary btn-block">
			Send Tokens To Lamden
		</button>
	</form>
</div>

<style>
	.loading {
		display: none;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(249, 249, 249, 0.7);
	}
	.is-loading {
		display: block;
	}
	.status{
		margin: 0
	}
</style>
