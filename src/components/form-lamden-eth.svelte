<script lang="ts">
import Alert from "../components/alert.svelte";
import WalletController from "lamden_wallet_controller";
import { vk } from "../stores/lamden";
import { web3, selectedAccount } from "svelte-web3";
import { projectConf } from "../conf.js";
import axios from "axios";
import BN from 'bignumber.js'

let isLoading = false;
let tokenName = ""

$: message = ""
$: success = ""
$: status = ""

let balance = new BN(0);
let approval = new BN(0);
let selectedTokenName = ""

const walletController = new WalletController(
	projectConf.lamden.clearingHouse
);

async function checkBalance(event) {
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
		);
		if (res.status === 200) {
			const value = (await res.json()).value;
			if (value) {
				if (value.__fixed__) return new BN(value.__fixed__)
				else return new BN(value)
			} else {
				return new BN(0);
			}
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
		stampLimit: 65,
	};
	walletController.sendTransaction(txInfo, async (txResults) => {
		if (txResults.status === "success") {
			try {
				status = "Lamden approval sent...";
				resolve(true)
			} catch (error) {
				message = 'Transaction failed';
				resolve(false)
			}
		} else {
			message = txResults.data.resultInfo.errorInfo[0];
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
		stampLimit: 65,
	};

	walletController.sendTransaction(txInfo, async (txResults) => {
		if (txResults.status === "success") {
			try {
				const unSignedABI = txResults.data.txBlockResult.result;
				const res = await axios.post(`${window.location.origin}/sign`, {
					unSignedABI,
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
			} catch (error) {
				message = 'Transaction failed';
			}
		} else {
			message = txResults.data.resultInfo.errorInfo[0];
		}
		status = ""
		isLoading = false;
	});
})

async function startBurn(event) {
	isLoading = true;
	message = "";
	status = "";
	const formData = new FormData(event.target);
	const tokenName = formData.get("tokenName").toString();

	let amount = new BN(formData.get("quantity").toString());

	const token = projectConf.ethereum.tokens
		.filter((t) => t.name === tokenName)
		.pop();

	if (!token) {
		isLoading = false;
		message = "Invalid Token Selected.";
		return;
	}

	if (amount.isNaN(amount) || amount.isLessThanOrEqualTo(0)) {
		isLoading = false;
		message = "Invalid quantity";
		return;
	}

	let currentApprovalAmount = await checkApproval()
	if (currentApprovalAmount.isLessThan(amount)){
		status = "Needs Approval...";
		if (!await sendApproval(amount)) {
			isLoading = false;
			return;
		}
	}
	status = `Sending ${token.name} tokens from Lamden to Ethereum...`

	sendBurn(token, amount)
}
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
				on:change={checkBalance}
				name="tokenName"
				id="tokenName"
				>
				<option value="">Select Token</option>
				{#each projectConf.ethereum.tokens as token}
					<option value={token.name}>{token.name}</option>
				{/each}
			</select>
			{#if balance}
				<p>Your balance is: {`${balance.toFixed(18)} ${tokenName}`}</p>
			{/if}
		</div>

		<div class="form-group">
			<label for="quantity">Amount</label>
			<input
				type="number"
				step="0.000000000000000001"
				class="form-control"
				name="quantity"
				id="quantity"
				placeholder=""
				min="0"/>
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
