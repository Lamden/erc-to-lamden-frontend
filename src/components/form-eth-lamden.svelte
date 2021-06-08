<script lang="ts">
	import {onMount} from 'svelte'	
	import Alert from "../components/alert.svelte";
	import { projectConf } from "../conf.js";
	import { checkEthTransactionUntilResult } from "../utils.js";
	import { web3, selectedAccount, chainData } from "svelte-web3";
	import { vk, ethBalance, currentNetwork } from "../stores/lamden";
	import BN from 'bignumber.js'

	let tokenName = ""
	let isLoading = false;
	let conf = projectConf[$currentNetwork]
	let ethApprovalTxHash = {hash: "", success: false}
	let ethDepositTxHash = {hash: "", success: false}

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
		ethApprovalTxHash = {hash: "", success: false}
		ethDepositTxHash = {hash: "", success: false}

		isLoading = true
		message = ""
		status = ""

		const formData = new FormData(event.target);
		tokenName = formData.get("tokenName").toString();
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

		status = "Sending Ethereum token approval transaction (check for metamask popup)..."
		let approvalTxHashResult = await new Promise(resolver => {
			const approve = erc20TokenContract.methods
				.approve(conf.ethereum.clearingHouse.address, quantity.toString())

			try{
				approve.send({ from: $selectedAccount }).once('transactionHash', (hash) => {
					ethApprovalTxHash.hash = hash
					checkEthTransactionUntilResult(ethApprovalTxHash.hash, $web3, resolver)
				})
				.catch(err => {
					if (err.code === 4001) resolver({status: false, message:"User denied Metamask popup."})
					else resolver({status: false})					
				})
			}catch (err) {
				resolver({status: false})
			}
		})

		if (!approvalTxHashResult.status){
			message = approvalTxHashResult.message || "Error sending Ethereum Transaction."
			ethApprovalTxHash.success = false
			return
		}else{
			ethApprovalTxHash.success = true 
		}

		status = `Sending Ethereum ${tokenName} deposit transaction (check for metamask popup)...`
		let depositTxHashResult = await new Promise(resolver => {
			const deposit = clearingHouseContract.methods
				.deposit(token.address, quantity.toString(), recipient)

			try{
				deposit.send({ from: $selectedAccount }).once('transactionHash', (hash) => {
					ethDepositTxHash.hash = hash
					checkEthTransactionUntilResult(ethDepositTxHash.hash, $web3, resolver)
				})
				.catch(err => {
					if (err.code === 4001) resolver({status: false, message:"User denied Metamask popup."})
					else resolver({status: false})					
				})
			}catch (err) {
				resolver({status: false})
			}
		})

		if (!depositTxHashResult.status){
			message = depositTxHashResult.message || "Error sending Ethereum Transaction."
			ethDepositTxHash.success = false
			return
		}else{
			ethDepositTxHash.success = true 
		}

		isLoading = false;
		success = "Swapping was successful";
	}

	const handleInput = (e) => {
		e.target.setCustomValidity('')
		e.target.value = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
	}
	const handleInvalid = (e) => e.target.setCustomValidity('A number is required')

</script>
<div class="loading {isLoading ? 'is-loading' : ''}">
	<h1>Processing</h1>
	<p class="status">{status}</p>
	{#if ethApprovalTxHash.hash}
		<a href="{`${conf.ethereum.blockexplorer}/tx/${ethApprovalTxHash.hash}`}" target="_blank" rel="noreferrer noopener">
			{`Etheruem Approval: ${conf.ethereum.blockexplorer}/tx/${ethApprovalTxHash.hash.substring(0, 12)}...`}
		</a>
		<br>
	{/if}
	{#if ethDepositTxHash.hash}
		<a href="{`${conf.ethereum.blockexplorer}/tx/${ethDepositTxHash.hash}`}" target="_blank" rel="noreferrer noopener">
			{`Etheruem Deposit: ${conf.ethereum.blockexplorer}/tx/${ethDepositTxHash.hash.substring(0, 12)}...`}
		</a>
	{/if}
</div>

{#if $vk !== "9984186b51ebbb096784a7dcc134882dcda55eb30fbf13a651034df619ceb678"}
	<Alert message={"Ethereum to Lamden bridge is currently down for maintenance. Sorry for the inconvenience."} type={"danger"} /> 
{:else}
	<div class="row" style="margin-top: 3rem">
		<Alert {message} type={"danger"} >
			<div slot="tx_hash">
				{#if ethApprovalTxHash.hash}
					<a href="{`${conf.ethereum.blockexplorer}/tx/${ethApprovalTxHash.hash}`}" target="_blank" rel="noreferrer noopener">
						{`Etheruem Approval: ${conf.ethereum.blockexplorer}/tx/${ethApprovalTxHash.hash.substring(0, 12)}...`}
					</a>
					<br>
				{/if}
				{#if ethDepositTxHash.hash}
					<a href="{`${conf.ethereum.blockexplorer}/tx/${ethDepositTxHash.hash}`}" target="_blank" rel="noreferrer noopener">
						{`Etheruem Deposit: ${conf.ethereum.blockexplorer}/tx/${ethDepositTxHash.hash.substring(0, 12)}...`}
					</a>
				{/if}
			</div>
		</Alert>
		<Alert message={success} type={"success"}>
			<div slot="tx_hash">
				{#if ethApprovalTxHash.hash}
					<a href="{`${conf.ethereum.blockexplorer}/tx/${ethApprovalTxHash.hash}`}" target="_blank" rel="noreferrer noopener">
						{`Etheruem Approval: ${conf.ethereum.blockexplorer}/tx/${ethApprovalTxHash.hash.substring(0, 12)}...`}
					</a>
					<br>
				{/if}
				{#if ethDepositTxHash.hash}
					<a href="{`${conf.ethereum.blockexplorer}/tx/${ethDepositTxHash.hash}`}" target="_blank" rel="noreferrer noopener">
						{`Etheruem Deposit: ${conf.ethereum.blockexplorer}/tx/${ethDepositTxHash.hash.substring(0, 12)}...`}
					</a>
				{/if}
			</div>
		</Alert>
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
{/if}
<style>
	.loading {
		display: none;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(249, 249, 249, 0.9);
	}
	.is-loading {
		display: block;
	}
	.status{
		margin: 0
	}
</style>
