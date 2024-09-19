import { BN } from "@project-serum/anchor";
import {
  Liquidity,
  LiquidityPoolInfo,
  LiquidityPoolKeysV4,
  Percent,
  SPL_ACCOUNT_LAYOUT,
  Token,
  TOKEN_PROGRAM_ID,
  TokenAmount,
} from "@raydium-io/raydium-sdk";
import {
  Connection,
  Keypair,
  ParsedAccountData,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export async function swap(
  connection: Connection,
  ownerKeyPair: Keypair,
  amount: number,
  tokenAddress: string,
  slippage: number,
  poolKeys: LiquidityPoolKeysV4,
  maxFeeInLamports = 10_000,
  fixedSide: "in" | "out" = "in",
  shouldConfirm = false
): Promise<string | Error> {
  const directionIn = poolKeys.quoteMint.toString() === tokenAddress;
  try {
    let finalAmountIn, finalAmountOut;
    if (fixedSide === "in") {
      const { minAmountOut, amountIn } = await calcAmountOut(
        connection,
        poolKeys,
        amount,
        slippage,
        directionIn
      );

      finalAmountIn = amountIn;
      finalAmountOut = minAmountOut;
    } else {
      const { maxAmountIn, amountOut } = await calcAmountIn(
        connection,
        poolKeys,
        amount,
        slippage,
        directionIn
      );

      finalAmountIn = maxAmountIn;
      finalAmountOut = amountOut;
    }

    try {
      const swapTransaction = await Liquidity.makeSwapInstructionSimple({
        connection,
        makeTxVersion: 0,
        poolKeys,
        userKeys: {
          tokenAccounts: await getOwnerTokenAccounts(
            connection,
            ownerKeyPair.publicKey
          ),
          owner: ownerKeyPair.publicKey,
        },
        amountIn: finalAmountIn,
        amountOut: finalAmountOut,
        fixedSide,
        config: {
          bypassAssociatedCheck: false,
        },
        computeBudgetConfig: {
          microLamports: maxFeeInLamports,
        },
      });

      try {
        const recentBlockhashForSwap = await connection.getLatestBlockhash();
        const instructions =
          swapTransaction.innerTransactions[0].instructions.filter(Boolean);

        const versionedTransaction = new VersionedTransaction(
          new TransactionMessage({
            payerKey: ownerKeyPair.publicKey,
            recentBlockhash: recentBlockhashForSwap.blockhash,
            instructions: instructions,
          }).compileToV0Message()
        );

        versionedTransaction.sign([ownerKeyPair]);

        try {
          const txId = await connection.sendTransaction(versionedTransaction, {
            skipPreflight: true,
            maxRetries: 2,
          });

          if (shouldConfirm) {
            try {
              const data = await connection.confirmTransaction({
                blockhash: recentBlockhashForSwap.blockhash,
                lastValidBlockHeight:
                  recentBlockhashForSwap.lastValidBlockHeight,
                signature: txId,
              });

              if (data?.value?.err) {
                return Promise.reject(Error("Transaction not confirmed"));
              }

              return txId;
            } catch (error: any) {
              return Promise.reject(
                Error(`Transaction not confirmed: ${error.message}`)
              );
            }
          } else {
            return txId;
          }
        } catch (error: any) {
          return Promise.reject(
            Error(`Sending transaction failed: ${error.message}`)
          );
        }
      } catch (error: any) {
        return Promise.reject(
          Error(`Getting recent block hash faield: ${error.message}`)
        );
      }
    } catch (error: any) {
      return Promise.reject(
        Error(`Making swap transaction failed: ${error.message}`)
      );
    }
  } catch (error: any) {
    if (fixedSide === "in") {
      return Promise.reject(
        Error(`Calculating output amounts failed: ${error.message}`)
      );
    } else {
      return Promise.reject(
        Error(`Calculating input amounts failed: ${error.message}`)
      );
    }
  }
}

export async function getOwnerTokenAccounts(
  connection: Connection,
  ownerAddress: PublicKey,
  programId = TOKEN_PROGRAM_ID
) {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(
    ownerAddress,
    {
      programId,
    }
  );

  return walletTokenAccount.value.map((account) => ({
    pubkey: account.pubkey,
    programId: account.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.account.data),
  }));
}

export async function calcAmountOut(
  connection: Connection,
  poolKeys: LiquidityPoolKeysV4,
  amount: number,
  slippageAmount: Number,
  swapInDirection: boolean
) {
  let poolInfo: LiquidityPoolInfo;
  try {
    poolInfo = await Liquidity.fetchInfo({
      connection: connection,
      poolKeys,
    });
  } catch (error: any) {
    const quoteVault = await connection.getParsedAccountInfo(
      poolKeys.quoteVault,
      "confirmed"
    );

    const baseVault = await connection.getParsedAccountInfo(
      poolKeys.baseVault,
      "confirmed"
    );

    poolInfo = {
      status: new BN(),
      baseDecimals: poolKeys.baseDecimals,
      quoteDecimals: poolKeys.quoteDecimals,
      lpDecimals: poolKeys.lpDecimals,
      baseReserve: new BN(
        (
          baseVault.value?.data as ParsedAccountData
        ).parsed.info.tokenAmount.amount
      ),
      quoteReserve: new BN(
        (
          quoteVault.value?.data as ParsedAccountData
        ).parsed.info.tokenAmount.amount
      ),
      lpSupply: new BN(
        (
          baseVault.value?.data as ParsedAccountData
        ).parsed.info.tokenAmount.amount
      ),
      startTime: new BN("0"),
    };
  }

  let currencyInMint = poolKeys.baseMint;
  let currencyInDecimals = poolKeys.baseDecimals;
  let currencyOutMint = poolKeys.quoteMint;
  let currencyOutDecimals = poolKeys.quoteDecimals;

  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint;
    currencyInDecimals = poolKeys.quoteDecimals;
    currencyOutMint = poolKeys.baseMint;
    currencyOutDecimals = poolKeys.baseDecimals;
  }

  const currencyIn = new Token(
    TOKEN_PROGRAM_ID,
    currencyInMint,
    currencyInDecimals
  );
  const amountIn = new TokenAmount(currencyIn, amount, false);
  const currencyOut = new Token(
    TOKEN_PROGRAM_ID,
    currencyOutMint,
    currencyOutDecimals
  );
  const slippage = new Percent(
    (slippageAmount.valueOf() * 100).toFixed(0),
    10000
  );

  const {
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  } = Liquidity.computeAmountOut({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage,
  });
  return {
    amountIn,
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  };
}

export async function calcAmountIn(
  connection: Connection,
  poolKeys: LiquidityPoolKeysV4,
  amount: number,
  slippageAmount: Number,
  swapInDirection: boolean
) {
  let poolInfo: LiquidityPoolInfo;
  try {
    poolInfo = await Liquidity.fetchInfo({
      connection: connection,
      poolKeys,
    });
  } catch (error: any) {
    const quoteVault = await connection.getParsedAccountInfo(
      poolKeys.quoteVault,
      "confirmed"
    );

    const baseVault = await connection.getParsedAccountInfo(
      poolKeys.baseVault,
      "confirmed"
    );

    poolInfo = {
      status: new BN(),
      baseDecimals: poolKeys.baseDecimals,
      quoteDecimals: poolKeys.quoteDecimals,
      lpDecimals: poolKeys.lpDecimals,
      baseReserve: new BN(
        (
          baseVault.value?.data as ParsedAccountData
        ).parsed.info.tokenAmount.amount
      ),
      quoteReserve: new BN(
        (
          quoteVault.value?.data as ParsedAccountData
        ).parsed.info.tokenAmount.amount
      ),
      lpSupply: new BN(
        (
          baseVault.value?.data as ParsedAccountData
        ).parsed.info.tokenAmount.amount
      ),
      startTime: new BN("0"),
    };
  }

  let currencyInMint = poolKeys.baseMint;
  let currencyInDecimals = poolKeys.baseDecimals;
  let currencyOutMint = poolKeys.quoteMint;
  let currencyOutDecimals = poolKeys.quoteDecimals;

  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint;
    currencyInDecimals = poolKeys.quoteDecimals;
    currencyOutMint = poolKeys.baseMint;
    currencyOutDecimals = poolKeys.baseDecimals;
  }

  const currencyOut = new Token(
    TOKEN_PROGRAM_ID,
    currencyOutMint,
    currencyOutDecimals
  );
  const amountOut = new TokenAmount(currencyOut, amount, false);
  const currencyIn = new Token(
    TOKEN_PROGRAM_ID,
    currencyInMint,
    currencyInDecimals
  );
  const slippage = new Percent(
    (slippageAmount.valueOf() * 100).toFixed(0),
    10000
  );

  const { amountIn, maxAmountIn, currentPrice, executionPrice, priceImpact } =
    Liquidity.computeAmountIn({
      poolKeys,
      poolInfo,
      amountOut,
      currencyIn,
      slippage,
    });

  return {
    amountIn,
    amountOut,
    maxAmountIn,
    currentPrice,
    executionPrice,
    priceImpact,
  };
}
