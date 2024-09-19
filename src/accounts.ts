import { Keypair, PublicKey } from "@solana/web3.js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";

export function generateKeyPairs(numberOfWallets: number) {
  const base58EncodedPrivateKeys: string[] = [];
  const privateKeys: Uint8Array[] = [];
  const publicKeys: PublicKey[] = [];
  const base58EncodedPublicKeys: string[] = [];
  try {
    for (let i = 0; i < numberOfWallets; i++) {
      const keypair = Keypair.generate();
      const privateKey = bs58.encode(keypair.secretKey);
      privateKeys.push(keypair.secretKey);
      base58EncodedPrivateKeys.push(privateKey);
      publicKeys.push(keypair.publicKey);
      base58EncodedPublicKeys.push(keypair.publicKey.toBase58());
    }

    return {
      privateKeys,
      base58EncodedPrivateKeys,
      publicKeys,
      base58EncodedPublicKeys,
    };
  } catch (error: any) {
    throw Error(`Unexpected error. Wallet generation failed: ${error.message}`);
  }
}

export function base58EncodedPrivateKeysToBase58EncodedPublicKeys(
  privateKeys: string[]
): string[] {
  const publicKeys = [];
  for (const privatekey of privateKeys) {
    const keypair = Keypair.fromSecretKey(bs58.decode(privatekey));
    const publicKeyBase58 = keypair.publicKey.toBase58();
    publicKeys.push(publicKeyBase58);
  }
  return publicKeys;
}

export function base58EncodedPrivateKeyToBase58EncodedPublicKey(
  privateKey: string
): string {
  return base58EncodedPrivateKeysToBase58EncodedPublicKeys([privateKey])[0];
}

export function encodePrivateKey(privateKey: Uint8Array) {
  return bs58.encode(privateKey);
}

export function decodePrivateKey(privateKey: string) {
  return new Uint8Array(bs58.decode(privateKey));
}

export function encodePublicKey(publicKey: PublicKey) {
  return publicKey.toBase58();
}

export function decodePublicKey(publicKey: string) {
  return new PublicKey(publicKey);
}
