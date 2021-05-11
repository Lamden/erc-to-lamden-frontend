<script lang="ts">
  import { ethToLamdenStore } from "../stores/ethToLamden";

  /* Images */
  import eth from "../../static/ethereum.jpg";
  import lamden from "../../static/lamden.png";
  import swapIcon from "../../static/swap.png";

  export let ethToLamden: boolean;

  ethToLamdenStore.subscribe((e2l) => {
    ethToLamden = e2l;
  });
  function changePosition() {
    ethToLamdenStore.update(e2l => !e2l);
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
  </div>
</div>

<style>
  .reverse-arrow {
    transform: rotate(180deg);
  }
  .switch{
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .switch > strong {
    text-decoration: underline;
    color: var(--primary-color);
  }
</style>
