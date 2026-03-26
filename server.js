import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend
app.use(express.static(__dirname));

// Headers (prevents CoinGecko blocking)
const HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0"
};

// 🔥 CACHE STORAGE
let cryptoCache = null;
let cryptoTime = 0;

let marketCache = null;
let marketTime = 0;

// 🔥 CRYPTO ENDPOINT (cached + fallback)
app.get("/crypto", async (req, res) => {
  const now = Date.now();

  // 60 second cache
  if (cryptoCache && now - cryptoTime < 60000) {
    return res.json(cryptoCache);
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin,hedera-hashgraph,ripple,chainlink,solana" +
      "&vs_currencies=usd&include_24hr_change=true",
      { headers: HEADERS }
    );

    const data = await response.json();

    // Save to cache
    cryptoCache = data;
    cryptoTime = now;

    res.json(data);

  } catch (err) {
    console.log("Crypto fetch error:", err);

    // fallback to cache if available
    if (cryptoCache) {
      return res.json(cryptoCache);
    }

    res.status(500).json({ error: "Failed to fetch crypto" });
  }
});

// 🔥 MARKET ENDPOINT (cached + fallback)
app.get("/market", async (req, res) => {
  const now = Date.now();

  // 60 second cache
  if (marketCache && now - marketTime < 60000) {
    return res.json(marketCache);
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/global",
      { headers: HEADERS }
    );

    const data = await response.json();

    // Save to cache
    marketCache = data;
    marketTime = now;

    res.json(data);

  } catch (err) {
    console.log("Market fetch error:", err);

    // fallback to cache if available
    if (marketCache) {
      return res.json(marketCache);
    }

    res.status(500).json({ error: "Failed to fetch market" });
  }
});

// 🔥 HOMEPAGE FIX
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// START SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});