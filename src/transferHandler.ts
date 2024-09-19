import { Connection } from "@solana/web3.js";
import { transferSOL } from "./transfer";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize a connection to the Solana network
const connection = new Connection("https://little-black-mountain.solana-mainnet.quiknode.pro/c3ef77181317b91f6b8860a318cd9b5aa9618b1c", "confirmed");

// Retrieve private key from environment variable
const fromPrivateKey = process.env.PRIVATE_KEY;

export async function handleTransfer(toPublicKey: string, transferAmount: number) {
    if (!fromPrivateKey) {
        return { success: false, error: "Private key is not defined in environment variables." };
    }

    try {
        // Ensure fromPrivateKey is a string
        const privateKey: string = fromPrivateKey as string;

        const signature = await transferSOL(
            connection,
            transferAmount,
            privateKey,
            toPublicKey
        );
        return { success: true, signature };
    } catch (error) {
        // Handle unknown error type
        console.error(`SOL transfer failed: ${error}`);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: errorMessage };
    }
}