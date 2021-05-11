<script lang="ts">
import {onMount} from 'svelte'
import Alert from "../components/alert.svelte";
import WalletController from "lamden_wallet_controller";
import { vk, tauBalance } from "../stores/lamden";
import { web3, selectedAccount } from "svelte-web3";
import { projectConf } from "../conf.js";
import axios from "axios";
import BN from 'bignumber.js'
import { getErrorInfo } from "../utils.js"

let isLoading = false;
let tokenName = ""

$: message = ""
$: success = ""
$: status = ""

let balance = new BN(0);
let approval = new BN(0);
let selectedTokenName = ""

onMount(() => {
	//setTimeout(signAndSendABI, 10000)
})

const walletController = new WalletController(
	projectConf.lamden.clearingHouse
);

async function checkTokenBalance(event) {
	if (event.target.value) {
		tokenName = event.target.value;
		const token = projectConf.ethereum.tokens
			.filter((t) => t.name === tokenName)
			.pop();
		try {
			const res = await fetch(
				`${projectConf.lamden.network.apiLink}/states/${projectConf.lamden.token.contractName}/balances/${$vk}`,
				{
					method: "GET",
				}
			);
			if (res.status === 200) {
				const value = (await res.json()).value;
				if (value) {
					if (value.__fixed__) balance = new BN(value.__fixed__)
					else balance = new BN(value)
				} else {
					balance = new BN(0);
				}
			}
		} catch (error) {
			balance = new BN(0);
		}
	}else{
		tokenName = ""
	}
}

async function checkApproval() {
	status = "Checking for Approval...";
	try {
		const res = await fetch(
			`${projectConf.lamden.network.apiLink}/states/${projectConf.lamden.token.contractName}/balances/${$vk}:${projectConf.lamden.clearingHouse.contractName}`,
			{
				method: "GET",
			}
		).catch((e) => console.log("ERROR"));
		if (res.status === 200) {
			const value = (await res.json()).value;
			if (value) {
				if (value.__fixed__) return new BN(value.__fixed__)
				else return new BN(value)
			} else {
				return new BN(0);
			}
		}else{
			return new BN(0);
		}
	} catch (error) {
		return new BN(0);
	}
}

const sendApproval = (amountToApprove) => new Promise(resolve => {
	status = "Sending Lamden approval (check popup)...";
	const txInfo = {
		networkType: projectConf.lamden.clearingHouse.networkType,
		contractName: projectConf.lamden.token.contractName,
		methodName: "approve",
		kwargs: {
			amount: { "__fixed__": amountToApprove.toFixed(18) },
			to: projectConf.lamden.clearingHouse.contractName
		},
		stampLimit: projectConf.lamden.stamps.approval,
	};
	walletController.sendTransaction(txInfo, async (txResults) => {
		console.log(txResults)
		if (txResults.status === "Transaction Cancelled") {
			message = "Transaction canceled by user."
			resolve(false)
		}

		if (txResults.status === "success") {
			try {
				status = "Lamden approval sent...";
				resolve(true)
			} catch (error) {
				message = 'Transaction failed';
				resolve(false)
			}
		} else {
			message = getErrorInfo(txResults)
			resolve(false)
		}
	});	
})

const sendBurn = (token, amount) => new Promise(resolve => {
	const ethereum_contract = token.address;
	const txInfo = {
		networkType: projectConf.lamden.clearingHouse.networkType,
		methodName: "burn",
		kwargs: {
			ethereum_contract,
			ethereum_address: $selectedAccount,
			amount: { "__fixed__": amount.toFixed(18) },
		},
		stampLimit: projectConf.lamden.stamps.burn,
	};

	walletController.sendTransaction(txInfo, async (txResults) => {
		console.log(txResults)
		if (txResults.status === "Transaction Cancelled") {
			message = "Transaction canceled by user."
		}else{
			if (txResults.status === "success") {
				try {
					const unSignedABI = txResults.data.txBlockResult.result
					const res = await axios.post(`/.netlify/functions/sign`, unSignedABI, {
						headers: { 'Content-Type': 'text/plain' }
					});
					const sign = await res.data;
					const nonce = "0x" + unSignedABI.substring(129, 193);
					const { v, r, s } = sign;

					const amountHex = "0x" + unSignedABI.substring(65, 129);
					const clearingHouseContract = new $web3.eth.Contract(
						projectConf.ethereum.clearingHouse.abi,
						projectConf.ethereum.clearingHouse.address
					);
					const obj = {
						unSignedABI,
						token: token.address,
						amount: amountHex,
						nonce: nonce,
						v,
						r,
						s,
					};
					const withdrawRes = await clearingHouseContract.methods
						.withdraw(obj.token, obj.amount, obj.nonce, obj.v, obj.r, obj.s)
						.send({ from: $selectedAccount });

					success = 'WETH tokens sent to Ethereum Chain';
					isLoading = false;
					status = ""

					resolve(true)

				} catch (error) {
					message = 'Transaction failed';
				}
			} else {
				message = getErrorInfo(txResults)
			}
		}
		status = ""
		resolve(false)
		isLoading = false;
	});
})

async function startBurn(event) {
	isLoading = true
	message = ""
	status = ""
	success = ""
	const formData = new FormData(event.target);
	const tokenName = formData.get("tokenName").toString();

	let amount = new BN(formData.get("quantity"));

	const token = projectConf.ethereum.tokens
		.filter((t) => t.name === tokenName)
		.pop();

	if (!token) {
		isLoading = false;
		message = "Invalid Token Selected.";
		return;
	}

	if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
		isLoading = false;
		message = "Invalid quantity";
		return;
	}

	let currentApprovalAmount = await checkApproval()
	console.log({currentApprovalAmount})

	if (currentApprovalAmount.isLessThan(amount)){
		if ($tauBalance.isLessThan(projectConf.lamden.stamps.approval / projectConf.lamden.currentStampRatio)){
			status = ""
			isLoading = false;
			message =  `Not enough Lamden ${projectConf.lamden.currencySymbol} to send transactions.
						Send ${projectConf.lamden.currencySymbol} to your Lamden Link account from within the Lamden Wallet.`;
			return;
		}else{
			if (!await sendApproval(amount)) {
				isLoading = false;
				return;
			}
		}
	}

	if ($tauBalance.isLessThan(projectConf.lamden.stamps.burn / projectConf.lamden.currentStampRatio)){
		isLoading = false;
		status = ""
		message =   `Not enough Lamden ${projectConf.lamden.currencySymbol} to send transactions.
					Send ${projectConf.lamden.currencySymbol} to your Lamden Link account from within the Lamden Wallet.`;
		return;
	}else{
		status = `Sending ${token.name} tokens from Lamden to Ethereum (check for popup)...`
		sendBurn(token, amount)
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
		on:submit|preventDefault={startBurn}
		action="#"
		method="POST"
		style="width: 100%">
		<div class="form-group">
			<label for="tokenName">Token Name</label>
			<select
				class="form-control"
				on:change={checkTokenBalance}
				name="tokenName"
				id="tokenName"
				>
				<option value="">Select Token</option>
				{#each projectConf.ethereum.tokens as token}
					<option value={token.name}>{token.name}</option>
				{/each}
			</select>
			{#if tokenName}
				<p>Your Lamden balance is: {`${balance.toFixed(18)} ${tokenName}`}</p>
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

		<button type="submit" class="btn btn-outline-primary btn-block">
			{`Send To Ethereum`}
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
