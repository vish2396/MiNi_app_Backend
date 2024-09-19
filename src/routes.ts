import express from 'express';
import { handleTransfer } from './transferHandler';

const router = express.Router();

// Route for handling SOL transfers
router.post("/transfer_sol", async (req, res) => {
    const { toPublicKey, transferAmount } = req.body;

    // Ensure required fields are present and valid
    if (!toPublicKey || typeof transferAmount !== 'number') {
        return res.status(400).json({ error: "Missing or invalid required fields." });
    }

    try {
        // Call handleTransfer with the specific data needed
        const result = await handleTransfer(toPublicKey, transferAmount);

        if (result.success) {
            return res.json({ message: "SOL transfer successful.", signature: result.signature });
        } else {
            return res.status(500).json({ error: result.error });
        }
    } catch (error) {
        // Catch any unexpected errors
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "An unexpected error occurred." });
    }
});

export default router;