import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve your frontend
app.use(express.static(__dirname));

const HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0"
};

// 🔥 CACHE (prevents rate limits)
let cryptoCache = null;
let cryptoTime = 0;

let marketCache = null;
let marketTime = 0;

// CRYPTO
app.get("/crypto", async (req, res) => {
  const now = Date.now();

  if (cryptoCache && now - cryptoTime < 30000) {
    return res.json(cryptoCache);
  }

  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin,hedera-hashgraph,ripple,chainlink,solana" +
      "&vs_currencies=usd&include_24hr_change=true",
      { headers: HEADERS }
    );

    const data = await r.json();

    cryptoCache = data;
    cryptoTime = now;

    res.json(data);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "crypto failed" });
  }
});

// MARKET
app.get("/market", async (req, res) => {
  const now = Date.now();

  if (marketCache && now - marketTime < 30000) {
    return res.json(marketCache);
  }

  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/global",
      { headers: HEADERS }
    );

    const data = await r.json();

    marketCache = data;
    marketTime = now;

    res.json(data);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "market failed" });
  }
});

// HOMEPAGE FIX
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});