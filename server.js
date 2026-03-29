import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

app.use(express.static(__dirname));

const HEADERS = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0"
};

// CACHE
let cryptoCache = null;
let cryptoTime  = 0;
let marketCache = null;
let marketTime  = 0;
let sp500Cache  = null;
let sp500Time   = 0;
const priceCache = {};
const priceCacheTTL = 15000;

// CRYPTO
app.get("/crypto", async (req, res) => {
  const now = Date.now();
  if (cryptoCache && now - cryptoTime < 60000) return res.json(cryptoCache);

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

// MARKET
app.get("/market", async (req, res) => {
  const now = Date.now();
  if (marketCache && now - marketTime < 60000) return res.json(marketCache);

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

// SP500
app.get("/sp500", async (req, res) => {
  const now = Date.now();
  if (sp500Cache && now - sp500Time < 300000) {
    return res.json(sp500Cache);
  }

  const attempts = [
    async () => {
      const r = await fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=2d",
        { headers: HEADERS }
      );

      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (!meta?.regularMarketPrice) throw new Error("no data");

      return {
        price: meta.regularMarketPrice,
        change: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
      };
    },

    async () => {
      const r = await fetch(
        "https://query2.finance.yahoo.com/v7/finance/quote?symbols=%5EGSPC",
        { headers: HEADERS }
      );

      const data = await r.json();
      const q = data?.quoteResponse?.result?.[0];

      if (!q?.regularMarketPrice) throw new Error("no data");

      return {
        price: q.regularMarketPrice,
        change: q.regularMarketChangePercent
      };
    }
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      sp500Cache = result;
      sp500Time  = now;
      return res.json(result);
    } catch (e) {
      console.log("SP500 attempt failed:", e.message);
    }
  }

  if (sp500Cache) return res.json(sp500Cache);

  res.status(500).json({ error: "All SP500 sources failed" });
});

// PRICE LOOKUP
app.get("/price/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toLowerCase().trim();
  const now    = Date.now();

  if (priceCache[symbol] && now - priceCache[symbol].time < priceCacheTTL) {
    return res.json(priceCache[symbol].data);
  }

  const cryptoMap = {
    btc: "bitcoin",
    eth: "ethereum",
    hbar: "hedera-hashgraph",
    xrp: "ripple",
    link: "chainlink",
    sol: "solana",
    doge: "dogecoin",
    ada: "cardano",
    dot: "polkadot",
    matic: "matic-network",
    avax: "avalanche-2",
    ltc: "litecoin",
    uni: "uniswap",
    atom: "cosmos",
    near: "near",
    shib: "shiba-inu",
    pepe: "pepe",
    sui: "sui",
    apt: "aptos",
    xlm: "stellar",
    algo: "algorand",
    xtz: "tezos",
    sand: "the-sandbox",
    mana: "decentraland",
    vet: "vechain",
    fil: "filecoin",
    icp: "internet-computer",
    bnb: "binancecoin",
    trx: "tron"
  };

  const geckoId = cryptoMap[symbol];

  if (geckoId) {
    try {
      const r = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`,
        { headers: HEADERS }
      );

      const data = await r.json();
      const coin = data[geckoId];

      if (coin?.usd) {
        const result = {
          price: coin.usd,
          change24h: coin.usd_24h_change || 0,
          type: "crypto",
          symbol: symbol.toUpperCase()
        };

        priceCache[symbol] = { data: result, time: now };
        return res.json(result);
      }

    } catch (e) {
      console.log("CoinGecko failed:", e.message);
    }
  }

  res.status(404).json({ error: "Symbol not found: " + symbol });
});

// NEWS
app.get("/crypto-news", async (req, res) => {
  try {
    const r = await fetch("https://min-api.cryptocompare.com/data/v2/news/?lang=EN");
    res.json(await r.json());
  } catch {
    res.status(500).json({ error: "Failed crypto news" });
  }
});

app.get("/stock-news", async (req, res) => {
  try {
    const r = await fetch("https://financialmodelingprep.com/api/v3/stock_news?limit=5&apikey=demo");
    res.json(await r.json());
  } catch {
    res.status(500).json({ error: "Failed stock news" });
  }
});

// AI
app.get("/ai-insight", async (req, res) => {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,hedera-hashgraph,ripple,chainlink,solana&vs_currencies=usd&include_24hr_change=true"
    );

    const d = await r.json();

    const prompt =
      `BTC ${d.bitcoin.usd_24h_change.toFixed(2)}%, ` +
      `HBAR ${d["hedera-hashgraph"].usd_24h_change.toFixed(2)}%, ` +
      `XRP ${d.ripple.usd_24h_change.toFixed(2)}%, ` +
      `LINK ${d.chainlink.usd_24h_change.toFixed(2)}%, ` +
      `SOL ${d.solana.usd_24h_change.toFixed(2)}%. ` +
      `Give 1 short trader insight.`;

    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50
      })
    });

    const json = await ai.json();
    res.json({ text: json.choices[0].message.content });

  } catch (err) {
    console.log("AI error:", err.message);
    res.status(500).json({ error: "AI failed" });
  }
});

// HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// START
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");

  setTimeout(async () => {
    try {
      await fetch("http://localhost:" + (process.env.PORT || 3000) + "/crypto");
      await fetch("http://localhost:" + (process.env.PORT || 3000) + "/market");
    } catch {}
  }, 3000);
});