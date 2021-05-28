<script>
  export let type = "primary";
  export let message = "";
</script>

{#if message}
  <div class="alert alert-{type}" role="alert" style="width: 100%">
    {message}
    <strong />
    <slot name="tx_hash" />
  </div>
{/if}
