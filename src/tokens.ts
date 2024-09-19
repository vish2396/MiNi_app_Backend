import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  ParsedAccountData,
  Keypair,
} from "@solana/web3.js";

export async function getSolBalance(
  connection: Connection,
  accountAddress: string
): Promise<number> {
  const balance = connection.getBalance(new PublicKey(accountAddress));
  return balance;
}

export async function getTokenBalance(
  connection: Connection,
  tokenAddress: string,
  owner: string
): Promise<number> {
  try {
    const accountInfo = await connection.getParsedAccountInfo(
      getAssociatedTokenAddressSync(
        new PublicKey(tokenAddress),
        new PublicKey(owner)
      )
    );

    if (!accountInfo.value?.data) {
      throw Error("Error locating associated token account");
    }
    const { uiAmount } = (accountInfo.value?.data as ParsedAccountData)?.parsed
      ?.info?.tokenAmount;

    return uiAmount;
  } catch (error: any) {
    throw Error(`Error getting token balance: ${error.message}`);
  }
}

export async function getTokenDecimals(
  connection: Connection,
  tokenAddress: string,
  keyPair: Keypair
): Promise<number> {
  try {
    const accountInfo = await connection.getParsedAccountInfo(
      (
        await getOrCreateAssociatedTokenAccount(
          connection,
          keyPair,
          new PublicKey(tokenAddress),
          keyPair.publicKey
        )
      ).address
    );

    if (!accountInfo.value?.data) {
      throw Error("Error locating associated token account");
    }

    const { decimals } = (accountInfo.value?.data as ParsedAccountData)?.parsed
      ?.info?.tokenAmount;

    return decimals;
  } catch (error: any) {
    throw Error(`Error getting token balance: ${error.message}`);
  }
}
