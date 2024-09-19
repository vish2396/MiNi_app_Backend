import express from 'express';
import cors from 'cors';
import router from './routes'; // Assuming other routes are handled in routes.ts

const app = express();

app.use(cors({ origin: 'https://telebotfrontend.vercel.app/' }));

// Middleware to parse JSON request bodies
app.use(express.json());

// Use the router for handling all routes
app.use(router);

// Default route for health check
app.get("/", (req, res) => {
    res.send("Welcome to the Solana SOL transfer API");
});

// Start the server
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});