<script lang="ts">
  import Alert from "../components/alert.svelte";
  import WalletController from "lamden_wallet_controller";
  import { vk } from "../stores/lamden";
  import { web3, selectedAccount } from "svelte-web3";
  import { projectConf } from "../conf.js";
  import axios from "axios";

  let isLoading = false;

  $: message = "";
  $: success = "";

  let balance = "";

  const lamdenClearingHouse = new WalletController(
    projectConf.lamden.clearingHouse
  );

  async function checkBalance(event) {
    const tokenName = event.target.value;
    if (tokenName) {
      const token = projectConf.ethereum.tokens
        .filter((t) => t.name === tokenName)
        .pop();
      try {
        const res = await fetch(
          `${projectConf.lamden.network.apiLink}/contracts/${projectConf.lamden.token.contractName}/balances?key=${$vk}`,
          {
            method: "GET",
          }
        );
        if (res.status === 200) {
          const value = (await res.json()).value;
          if (value) {
            balance = value.__fixed__ + ` ${tokenName}`;
          } else {
            balance = `0.0 ${tokenName}`;
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  }

  function startBurn(event) {
    isLoading = true;
    message = "";
    const formData = new FormData(event.target);
    const tokenName = formData.get("tokenName").toString();

    let amount = Number.parseFloat(formData.get("quantity").toString());

    const token = projectConf.ethereum.tokens
      .filter((t) => t.name === tokenName)
      .pop();

    if (!token) {
      isLoading = false;
      message = "Invalid Token Selected.";
      return;
    }

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      isLoading = false;
      message = "Invalid quantity";
      return;
    }

    const ethereum_contract = token.address;

    const txInfo = {
      networkType: projectConf.lamden.clearingHouse.networkType,
      methodName: "burn",
      kwargs: {
        ethereum_contract,
        ethereum_address: $selectedAccount,
        amount: amount,
      },
      stampLimit: 65,
    };
    lamdenClearingHouse.sendTransaction(txInfo, async (txResults) => {
      if (txResults.status === "success") {
        try {
          const unSignedABI = txResults.data.txBlockResult.result;
          console.log({ unSignedABI });
          const res = await axios.post(`${projectConf.serverLink}/sign`, {
            unSignedABI,
          });
          const sign = await res.data;
          console.log(sign);
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
          console.log(obj);
          const withdrawRes = await clearingHouseContract.methods
            .withdraw(obj.token, obj.amount, obj.nonce, obj.v, obj.r, obj.s)
            .send({ from: $selectedAccount });
          console.log(withdrawRes);
          isLoading = false;
          success = 'Buring successful';
        } catch (error) {
          console.log(error);
          message = 'Transaction failed';
          isLoading = false;
        }
      } else {
        isLoading = false;
        console.log("Error");
        console.log(txResults.data.resultInfo.errorInfo);
        message = txResults.data.resultInfo.errorInfo[0];
      }
    });
  }
</script>

<div class="loading {isLoading ? 'is-loading' : ''}">
  <h1>Loading</h1>
</div>

<div class="row" style="margin-top: 3rem">
  <Alert {message} type={"danger"} />
  <Alert message={success} type={"success"} />
  <form
    on:submit|preventDefault={startBurn}
    action="#"
    method="POST"
    style="width: 100%"
  >
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
        <p>Your balance is: {balance}</p>
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
        min="0"
      />
    </div>
    <br />

    <button type="submit" class="btn btn-outline-primary btn-block"
      >Begin Burn</button
    >
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
</style>
