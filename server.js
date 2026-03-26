import express from "express";
import fetch from "node-fetch";

const app = express();

// CRYPTO ENDPOINT
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

// MARKET ENDPOINT
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

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});