import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

app.use(express.static(__dirname));

const HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
};

// ── CACHE ──────────────────────────────────────────────
let cryptoCache = null;
let cryptoTime  = 0;

let marketCache = null;
let marketTime  = 0;

let sp500Cache  = null;
let sp500Time   = 0;

// ── CRYPTO ─────────────────────────────────────────────
app.get("/crypto", async (req, res) => {
  const now = Date.now();
  if (cryptoCache && now - cryptoTime < 60000) {
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
    cryptoTime  = now;

    res.json(data);
  } catch (err) {
    console.log("Crypto error:", err.message);
    if (cryptoCache) return res.json(cryptoCache);
    res.status(500).json({ error: "Failed to fetch crypto" });
  }
});

// ── MARKET ─────────────────────────────────────────────
app.get("/market", async (req, res) => {
  const now = Date.now();
  if (marketCache && now - marketTime < 60000) {
    return res.json(marketCache);
  }

  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/global",
      { headers: HEADERS }
    );

    const data = await r.json();
    marketCache = data;
    marketTime  = now;

    res.json(data);
  } catch (err) {
    console.log("Market error:", err.message);
    if (marketCache) return res.json(marketCache);
    res.status(500).json({ error: "Failed to fetch market" });
  }
});

// ── S&P 500 (FIXED — FMP API) ──────────────────────────
app.get("/sp500", async (req, res) => {
  const now = Date.now();

  // Cache (5 min)
  if (sp500Cache && now - sp500Time < 300000) {
    console.log("SP500 cache hit:", sp500Cache);
    return res.json(sp500Cache);
  }

  try {
    const r = await fetch(
      "https://financialmodelingprep.com/api/v3/quote/%5EGSPC?apikey=demo"
    );

    const data = await r.json();

    if (!data?.[0]?.price) {
      throw new Error("Invalid FMP response");
    }

    const result = {
      price: data[0].price,
      change: data[0].changesPercentage
    };

    sp500Cache = result;
    sp500Time  = now;

    console.log("SP500 success (FMP):", result);

    return res.json(result);

  } catch (err) {
    console.log("SP500 FMP failed:", err.message);

    if (sp500Cache) {
      console.log("Returning stale SP500 cache");
      return res.json(sp500Cache);
    }

    return res.status(500).json({ error: "Failed to fetch S&P 500" });
  }
});

// ── HOME ───────────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── START ──────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});