import {
  calcAmountIn,
  calcAmountOut,
  Connection,
  Keypair,
  SOL_ADDRESS,
  swap,
  waitSeconds,
} from ".";
import { decodePrivateKey } from "./accounts";
import { fetchPoolKeys } from "./pools";

const connection = new Connection(
  "https://empty-frequent-market.solana-mainnet.quiknode.pro/0c31c32206dc159ae6577b5201427e8fb41d95dd/",
  "confirmed"
);
const tokenAddress = "6pxT5UmTumQXBknjwSzLePRwBA5k8VGs68LiZwncC2mB";
fetchPoolKeys(connection, tokenAddress, SOL_ADDRESS, "processed").then(
  async (poolKeys) => {
    console.log(poolKeys);
    // let i = 0;
    // await waitSeconds(5);
    // while (true) {
    //   const rpcUrl = [
    //     "https://empty-frequent-market.solana-mainnet.quiknode.pro/0c31c32206dc159ae6577b5201427e8fb41d95dd/",
    //     "https://omniscient-attentive-spring.solana-mainnet.quiknode.pro/50a4fdf44fcd9e439433b4425a420511b6c61a2f/",
    //   ][i % 2];

    //   const connection = new Connection(rpcUrl, {
    //     commitment: "confirmed",
    //     disableRetryOnRateLimit: true,
    //   });
    //   await waitSeconds(0.75);
    //   swap(
    //     connection,
    //     Keypair.fromSecretKey(
    //       decodePrivateKey(
    //         "SaR7cC4bM1Hev3C6RQxFs8fTp9irb9n9EKFihgw9yMobhBf2jC3yg29WNWveESRiu3Cq1JYKPWPgoqcqaJwthpL"
    //       )
    //     ),
    //     0.00005,
    //     tokenAddress,
    //     1,
    //     poolKeys[0],
    //     30000,
    //     "in",
    //     true
    //   )
    //     .then(console.log)
    //     .catch(() => {
    //       console.log("Error");
    //     });
    //   await waitSeconds(0.75);
    //   i++;
    // }
  }
);
