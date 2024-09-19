import { Wallet } from "@project-serum/anchor";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import {
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  PublicKey,
  Connection,
  ComputeBudgetProgram,
} from "@solana/web3.js";

import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { getSolBalance, getTokenBalance, getTokenDecimals } from "./tokens";
import { base58EncodedPrivateKeyToBase58EncodedPublicKey } from "./accounts";

export async function transferSOL(
  connection: Connection,
  transferAmount: number,
  fromPrivateKey: string,
  toPublicKeyString: string,
  priorityFee = 25000
): Promise<string> {
  const fromWallet = new Wallet(
    Keypair.fromSecretKey(bs58.decode(fromPrivateKey))
  );
  // Define the amount of lamports to transfer
  const transferAmountInLamports: any = (
    transferAmount * LAMPORTS_PER_SOL
  ).toFixed(0);

  const toPublicKey = new PublicKey(toPublicKeyString);

  const PRIORITY_FEE_INSTRUCTIONS = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: priorityFee,
  });

  // Create the transaction
  const transaction: Transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey: toPublicKey,
      lamports: transferAmountInLamports,
    }),
    PRIORITY_FEE_INSTRUCTIONS
  );

  return sendAndConfirmTransaction(connection, transaction, [fromWallet.payer]);
}

export async function transferSOLBalance(
  connection: Connection,
  fromPrivateKey: string,
  toPublicKeyString: string,
  fee = 7000,
  priorityFee = 25000
): Promise<string> {
  let transferAmountInLamports;
  try {
    const balance = await getSolBalance(
      connection,
      base58EncodedPrivateKeyToBase58EncodedPublicKey(fromPrivateKey)
    );

    transferAmountInLamports = balance - fee;
  } catch (error: any) {
    throw Error(`Error getting balance: ${error.message}`);
  }

  if (transferAmountInLamports < 0) throw Error("Insufficient balance.");
  return transferSOL(
    connection,
    transferAmountInLamports / LAMPORTS_PER_SOL,
    fromPrivateKey,
    toPublicKeyString,
    priorityFee
  );
}

export async function transferSPLTokens(
  connection: Connection,
  tokenAddress: string,
  transferAmount: number,
  fromPrivateKeyString: string,
  toPublicKeyString: string,
  priorityFee = 25000
): Promise<string> {
  const fromKeyPair = Keypair.fromSecretKey(bs58.decode(fromPrivateKeyString));
  const toPublicKey = new PublicKey(toPublicKeyString);

  const senderTokenAccount = await getAssociatedTokenAddress(
    new PublicKey(tokenAddress),
    fromKeyPair.publicKey
  );
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromKeyPair,
    new PublicKey(tokenAddress),
    toPublicKey
  );

  try {
    const decimals = await getTokenDecimals(
      connection,
      tokenAddress,
      fromKeyPair
    );

    const [integerPart, fractionalPart] = transferAmount.toString().split(".");
    const integerBigInt = BigInt(integerPart);
    const fractionalBigInt = fractionalPart
      ? BigInt(fractionalPart)
      : BigInt(0);

    const amountToTransfer =
      integerBigInt * BigInt(10) ** BigInt(decimals) + fractionalBigInt;

    const PRIORITY_FEE_INSTRUCTIONS = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    });

    // Create the transaction
    const transaction = new Transaction().add(
      createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount.address,
        fromKeyPair.publicKey,
        amountToTransfer
      ),
      PRIORITY_FEE_INSTRUCTIONS
    );

    return sendAndConfirmTransaction(connection, transaction, [fromKeyPair]);
  } catch (error: any) {
    throw Error(`Getting token info failed: ${error.message}`);
  }
}

export async function transferSPLTokenBalance(
  connection: Connection,
  tokenAddress: string,
  fromPrivateKeyString: string,
  toPublicKeyString: string,
  priorityFee = 25000
): Promise<string> {
  let amountToTransfer;
  try {
    const balance = await getTokenBalance(
      connection,
      tokenAddress,
      base58EncodedPrivateKeyToBase58EncodedPublicKey(fromPrivateKeyString)
    );

    amountToTransfer = balance;

    if (amountToTransfer < 0) throw Error("Insufficient funds");
  } catch (error: any) {
    throw Error(`Error getting balance: ${error.message}`);
  }
  return transferSPLTokens(
    connection,
    tokenAddress,
    amountToTransfer,
    fromPrivateKeyString,
    toPublicKeyString,
    priorityFee
  );
}
