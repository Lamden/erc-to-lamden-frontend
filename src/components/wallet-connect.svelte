<script lang="ts">
  import { ethStore, web3, connected } from "svelte-web3";
  import ModelViewer from "@metamask/logo";
  import { onMount } from "svelte";

  let metamaskError = "";

  onMount(async () => {
    const viewer = ModelViewer({
      pxNotRatio: true,
      width: 300,
      height: 240,
      followMouse: true,
      slowDrift: false,
    });
    const container = document.getElementById("foxy");
    container.appendChild(viewer.container);
    await ethStore.setBrowserProvider();
  });

  async function connectMetamask(event) {
    try {
      await ethStore.setBrowserProvider();
    } catch (error) {
      if (error.code === -32002) {
        metamaskError =
          "Please open metamask and accept the connection request.";
      } else if (error.code === 4001) {
        metamaskError = "Request Rejected.";
      } else {
        metamaskError = "Something went wrong.";
      }
    }
  }
</script>

{#if !$connected}
  <div class="container">
    <div class="col-md-8 offset-md-2 text-center" style="padding-top: 20vh;">
      <h1 class="heading text-capitalize" style="font-size: 2rem;">
        Please connect your metamask wallet
      </h1>
      <br />
      <div id="foxy" />
      <br />
      <p class="text-danger" style="font-weight: 700;">{metamaskError}</p>
      <br />
      <button
        type="button"
        class="btn btn-outline-primary"
        on:click={connectMetamask}>Connect</button
      >
    </div>
  </div>
{/if}
