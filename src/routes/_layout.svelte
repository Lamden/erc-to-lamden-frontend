<script lang="ts">
	import { beforeUpdate } from 'svelte'
	import { getCurrentNetwork } from "../utils";
	import { currentNetwork, lwc } from "../stores/lamden";
	import WalletController from "lamden_wallet_controller";

	import { projectConf } from "../conf.js";

	beforeUpdate(() => {
		if (!$currentNetwork) currentNetwork.set(getCurrentNetwork())
		if (!$lwc) lwc.set(new WalletController())
	})
</script>

<svelte:head>
	<title>{projectConf.site.title}</title>

	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="{projectConf.site.title}" />
	<meta name="twitter:description" content="{projectConf.site.description}" />
	<meta name="twitter:site" content="@LamdenTau" />
	<meta name="twitter:creator" content="Lamden.io" />
	<meta name="twitter:image" content="{projectConf.site.siteLogo}" />
	<meta name="twitter:image:alt" content="{projectConf.site.siteLogo}" />

	<meta property="og:url" content="https://www.lamdenlink.com" />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="{projectConf.site.title}" />
	<meta property="og:image" content="{projectConf.site.imageBig}" />
	<meta property="og:description" content="{projectConf.site.description}" />
	<meta property="og:image:url" content="{projectConf.site.imageBig}" />
	<meta property="og:image:secure_url" content="{projectConf.site.imageBig}" />
	<meta property="og:image:width" content="192" />
	<meta property="og:image:height" content="192" />
	<meta property="og:image:type" content="image/png" />
</svelte:head>

<main>
	<slot></slot>
</main>