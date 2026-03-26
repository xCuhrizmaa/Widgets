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

// Headers
const HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0"
};

// 🔥 CRYPTO CACHE
let cryptoCache = null;
let cryptoTime = 0;

// 🔥 MARKET CACHE
let marketCache = null;
let marketTime = 0;

// 🔥 S&P CACHE (NEW)
let stocksCache = null;
let stocksTime  = 0;

// CRYPTO
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
    cryptoTime = now;

    res.json(data);

  } catch {
    if (cryptoCache) return res.json(cryptoCache);
    res.status(500).json({ error: "crypto failed" });
  }
});

// MARKET
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
    marketTime = now;

    res.json(data);

  } catch {
    if (marketCache) return res.json(marketCache);
    res.status(500).json({ error: "market failed" });
  }
});

// 🔥 S&P 500 (NEW — FROM YOUR FRIEND)
app.get("/sp500", async (req, res) => {
  const now = Date.now();

  if (stocksCache && now - stocksTime < 60000) {
    return res.json(stocksCache);
  }

  try {
    const r = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=2d",
      { headers: HEADERS }
    );

    const data = await r.json();
    const meta = data.chart.result[0].meta;

    const price = meta.regularMarketPrice;
    const prev  = meta.chartPreviousClose;
    const change = ((price - prev) / prev) * 100;

    stocksCache = { price, change };
    stocksTime  = now;

    res.json(stocksCache);

  } catch {
    if (stocksCache) return res.json(stocksCache);
    res.status(500).json({ error: "sp500 failed" });
  }
});

// HOMEPAGE
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// START
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});