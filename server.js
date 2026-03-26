import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static (still keep this)
app.use(express.static(__dirname));

// CRYPTO
app.get("/crypto", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,hedera-hashgraph,ripple,chainlink,solana&vs_currencies=usd&include_24hr_change=true",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await response.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: "crypto failed" });
  }
});

// MARKET
app.get("/market", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/global",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const data = await response.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: "market failed" });
  }
});

// 🔥 THIS IS THE FIX
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(process.env.PORT || 3000);