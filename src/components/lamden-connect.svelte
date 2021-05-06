<script lang="ts">
    import lamden from "../../static/lamden.jpg";
    import WalletController from "lamden_wallet_controller";
    import { projectConf } from "../conf";
    import { lamdenWalletInfo } from "../stores/lamden";
    let walletErrorMessage = "";
  
    const clearingHouseConnectionRequest = projectConf.lamden.clearingHouse;
  
    const lamdenClearingHouse = new WalletController(
      clearingHouseConnectionRequest
    );
    lamdenClearingHouse.walletIsInstalled().then((installed) => {
      if (!installed) {
        walletErrorMessage = "Lamden wallet extension not found";
      }
    });
  
    lamdenClearingHouse.events.on("newInfo", (data) => {
      $lamdenWalletInfo = data;
      const { errors } = data;
      if (errors && errors.length > 0) {
        for (const error of errors) {
          if (error.includes("You must be an authorized dApp")) {
            walletErrorMessage = "Please authorize the dApp";
          } else if (error.includes("is Locked")) {
            walletErrorMessage = "Please unlock your lamden wallet";
          } else {
            console.log(error);
          }
        }
      } else {
        console.log(data);
      }
    });
    lamdenClearingHouse.getInfo();  
  </script>

  <div class="{ walletErrorMessage ? "wallet-error" : "hidden"}">
    <img src={lamden} alt="">
    <h1 class="heading">{walletErrorMessage}</h1>
  </div>

  <style>
    .hidden {
      display: none !important;
    }
  
    .wallet-error {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #f9f9f9;
      text-align: center;
    }
    .wallet-error > img {
      margin-top: 35vh;
      max-width: 120px;
    }
    .wallet-error > h1 {
      font-size: 2rem;
    }
  </style>
  