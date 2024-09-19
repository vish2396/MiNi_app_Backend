import {
  LIQUIDITY_STATE_LAYOUT_V4,
  LiquidityPoolKeysV4,
  Market,
  MARKET_STATE_LAYOUT_V3,
} from "@raydium-io/raydium-sdk";
import { Commitment, Connection, PublicKey } from "@solana/web3.js";
import { AMM_AUTHORITY, AMM_PROGRAM_ID } from "./const";

// Define a function to fetch and decode Market accounts
export async function fetchPoolKeys(
  connection: Connection,
  token1Address: string,
  token2Address: string,
  commitment: Commitment = "confirmed"
): Promise<LiquidityPoolKeysV4[]> {
  const accounts_1 = connection.getProgramAccounts(
    new PublicKey(AMM_PROGRAM_ID),
    {
      commitment,
      filters: [
        { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
            bytes: token1Address,
          },
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
            bytes: token2Address,
          },
        },
      ],
    }
  );

  const accounts_2 = connection.getProgramAccounts(
    new PublicKey(AMM_PROGRAM_ID),
    {
      commitment,
      filters: [
        { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
            bytes: token2Address,
          },
        },
        {
          memcmp: {
            offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
            bytes: token1Address,
          },
        },
      ],
    }
  );

  const accounts = (await Promise.allSettled([accounts_1, accounts_2]))
    .map((response) => {
      if (response.status === "fulfilled") {
        return response.value;
      }
      return [];
    })
    .flat(1);

  const pools: LiquidityPoolKeysV4[] = [];

  for (const { pubkey, account } of accounts) {
    const data = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

    const marketData = (await connection.getParsedAccountInfo(data.marketId))
      .value?.data;

    const decodedMarketData = MARKET_STATE_LAYOUT_V3.decode(
      marketData as Buffer
    );

    const formattedData = {
      id: pubkey,
      baseMint: data.baseMint,
      quoteMint: data.quoteMint,
      lpMint: data.lpMint,
      baseDecimals: Number(data.baseDecimal.toString()),
      quoteDecimals: Number(data.quoteDecimal.toString()),
      lpDecimals: Number(data.baseDecimal.toString()),
      version: 4,
      programId: new PublicKey(AMM_PROGRAM_ID),
      authority: new PublicKey(AMM_AUTHORITY),
      openOrders: data.openOrders,
      targetOrders: data.targetOrders,
      baseVault: data.baseVault,
      quoteVault: data.quoteVault,
      withdrawQueue: data.withdrawQueue,
      lpVault: data.lpVault,
      marketVersion: 3,
      marketProgramId: data.marketProgramId,
      marketId: data.marketId,
      marketAuthority: Market.getAssociatedAuthority({
        programId: data.marketProgramId,
        marketId: data.marketId,
      }).publicKey,
      marketBaseVault: decodedMarketData.baseVault,
      marketQuoteVault: decodedMarketData.quoteVault,
      marketBids: decodedMarketData.bids,
      marketAsks: decodedMarketData.asks,
      marketEventQueue: decodedMarketData.eventQueue,
      lookupTableAccount: PublicKey.default,
    };

    pools.push(formattedData as LiquidityPoolKeysV4);
  }
  return pools;
}
