import express from “express”;
import fetch from “node-fetch”;
import path from “path”;
import { fileURLToPath } from “url”;

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

app.use(express.static(__dirname));

const HEADERS = {
“Accept”: “application/json”,
“User-Agent”: “Mozilla/5.0”
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
app.get(”/crypto”, async (req, res) => {
const now = Date.now();
if (cryptoCache && now - cryptoTime < 60000) return res.json(cryptoCache);
try {
const r = await fetch(
“https://api.coingecko.com/api/v3/simple/price” +
“?ids=bitcoin,hedera-hashgraph,ripple,chainlink,solana” +
“&vs_currencies=usd&include_24hr_change=true”,
{ headers: HEADERS }
);
const data = await r.json();
cryptoCache = data;
cryptoTime  = now;
res.json(data);
} catch (err) {
console.log(“Crypto error:”, err.message);
if (cryptoCache) return res.json(cryptoCache);
res.status(500).json({ error: “Failed to fetch crypto” });
}
});

// MARKET
app.get(”/market”, async (req, res) => {
const now = Date.now();
if (marketCache && now - marketTime < 60000) return res.json(marketCache);
try {
const r = await fetch(
“https://api.coingecko.com/api/v3/global”,
{ headers: HEADERS }
);
const data = await r.json();
marketCache = data;
marketTime  = now;
res.json(data);
} catch (err) {
console.log(“Market error:”, err.message);
if (marketCache) return res.json(marketCache);
res.status(500).json({ error: “Failed to fetch market” });
}
});

// SP500
app.get(”/sp500”, async (req, res) => {
const now = Date.now();
if (sp500Cache && now - sp500Time < 300000) return res.json(sp500Cache);

const attempts = [
async () => {
const r = await fetch(
“https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=2d”,
{ headers: HEADERS }
);
const data = await r.json();
const meta = data?.chart?.result?.[0]?.meta;
if (!meta?.regularMarketPrice) throw new Error(“no data”);
return {
price: meta.regularMarketPrice,
change: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
};
},
async () => {
const r = await fetch(
“https://query2.finance.yahoo.com/v7/finance/quote?symbols=%5EGSPC”,
{ headers: HEADERS }
);
const data = await r.json();
const q = data?.quoteResponse?.result?.[0];
if (!q?.regularMarketPrice) throw new Error(“no data”);
return { price: q.regularMarketPrice, change: q.regularMarketChangePercent };
}
];

for (const attempt of attempts) {
try {
const result = await attempt();
sp500Cache = result;
sp500Time  = now;
return res.json(result);
} catch (e) {
console.log(“SP500 attempt failed:”, e.message);
}
}

if (sp500Cache) return res.json(sp500Cache);
res.status(500).json({ error: “All SP500 sources failed” });
});

// PRICE LOOKUP (crypto or stock)
app.get(”/price/:symbol”, async (req, res) => {
const symbol = req.params.symbol.toLowerCase().trim();
const now    = Date.now();

if (priceCache[symbol] && now - priceCache[symbol].time < priceCacheTTL) {
return res.json(priceCache[symbol].data);
}

const cryptoMap = {
btc: “bitcoin”, bitcoin: “bitcoin”,
eth: “ethereum”, ethereum: “ethereum”,
hbar: “hedera-hashgraph”, hedera: “hedera-hashgraph”,
xrp: “ripple”, ripple: “ripple”,
link: “chainlink”, chainlink: “chainlink”,
sol: “solana”, solana: “solana”,
doge: “dogecoin”, dogecoin: “dogecoin”,
ada: “cardano”, cardano: “cardano”,
dot: “polkadot”, polkadot: “polkadot”,
matic: “matic-network”, polygon: “matic-network”,
avax: “avalanche-2”, avalanche: “avalanche-2”,
ltc: “litecoin”, litecoin: “litecoin”,
uni: “uniswap”, uniswap: “uniswap”,
atom: “cosmos”, cosmos: “cosmos”,
near: “near”, shib: “shiba-inu”,
pepe: “pepe”, floki: “floki”,
sui: “sui”, apt: “aptos”, aptos: “aptos”,
xlm: “stellar”, stellar: “stellar”,
algo: “algorand”, algorand: “algorand”,
xtz: “tezos”, tezos: “tezos”,
sand: “the-sandbox”, mana: “decentraland”,
vet: “vechain”, vechain: “vechain”,
fil: “filecoin”, filecoin: “filecoin”,
icp: “internet-computer”, bnb: “binancecoin”,
trx: “tron”, tron: “tron”
};

const geckoId = cryptoMap[symbol];

if (geckoId) {
try {
const r = await fetch(
“https://api.coingecko.com/api/v3/simple/price?ids=” + geckoId + “&vs_currencies=usd&include_24hr_change=true”,
{ headers: HEADERS }
);
const data = await r.json();
const coin = data[geckoId];
if (coin && coin.usd) {
const result = { price: coin.usd, change24h: coin.usd_24h_change || 0, type: “crypto”, symbol: symbol.toUpperCase() };
priceCache[symbol] = { data: result, time: now };
return res.json(result);
}
} catch (e) {
console.log(“CoinGecko lookup failed:”, e.message);
}
}

const stockSymbol = symbol.toUpperCase();
try {
const r = await fetch(
“https://query1.finance.yahoo.com/v8/finance/chart/” + stockSymbol + “?interval=1d&range=2d”,
{ headers: HEADERS }
);
const data = await r.json();
const meta = data && data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta;
if (meta && meta.regularMarketPrice) {
const prev   = meta.chartPreviousClose || meta.regularMarketPrice;
const change = ((meta.regularMarketPrice - prev) / prev) * 100;
const result = { price: meta.regularMarketPrice, change24h: change, type: “stock”, symbol: stockSymbol };
priceCache[symbol] = { data: result, time: now };
return res.json(result);
}
} catch (e) {
console.log(“Yahoo chart lookup failed:”, e.message);
}

try {
const r = await fetch(
“https://query2.finance.yahoo.com/v7/finance/quote?symbols=” + stockSymbol,
{ headers: HEADERS }
);
const data = await r.json();
const q = data && data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result[0];
if (q && q.regularMarketPrice) {
const result = { price: q.regularMarketPrice, change24h: q.regularMarketChangePercent || 0, type: “stock”, symbol: stockSymbol };
priceCache[symbol] = { data: result, time: now };
return res.json(result);
}
} catch (e) {
console.log(“Yahoo quote lookup failed:”, e.message);
}

res.status(404).json({ error: “Symbol not found: “ + symbol });
});

// CRYPTO NEWS
app.get(”/crypto-news”, async (req, res) => {
try {
const r = await fetch(
“https://min-api.cryptocompare.com/data/v2/news/?lang=EN”,
{ headers: HEADERS }
);
const data = await r.json();
res.json(data);
} catch (err) {
console.log(“Crypto news error:”, err.message);
res.status(500).json({ error: “Failed crypto news” });
}
});

// STOCK NEWS
app.get(”/stock-news”, async (req, res) => {
try {
const r = await fetch(
“https://financialmodelingprep.com/api/v3/stock_news?limit=5&apikey=demo”,
{ headers: HEADERS }
);
const data = await r.json();
res.json(data);
} catch (err) {
console.log(“Stock news error:”, err.message);
res.status(500).json({ error: “Failed stock news” });
}
});

// AI INSIGHT
app.get(”/ai-insight”, async (req, res) => {
try {
const r = await fetch(
“https://api.coingecko.com/api/v3/simple/price” +
“?ids=bitcoin,hedera-hashgraph,ripple,chainlink,solana” +
“&vs_currencies=usd&include_24hr_change=true”
);
const data = await r.json();

```
const prompt = "Give a short, confident 1 sentence crypto market insight based on:\n\n" +
  "BTC: " + data.bitcoin.usd_24h_change.toFixed(2) + "%\n" +
  "HBAR: " + data["hedera-hashgraph"].usd_24h_change.toFixed(2) + "%\n" +
  "XRP: " + data.ripple.usd_24h_change.toFixed(2) + "%\n" +
  "LINK: " + data.chainlink.usd_24h_change.toFixed(2) + "%\n" +
  "SOL: " + data.solana.usd_24h_change.toFixed(2) + "%\n\n" +
  "Keep it sharp, like a trader note.";

const ai = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 60
  })
});

const json = await ai.json();
res.json({ text: json.choices[0].message.content });
```

} catch (err) {
console.log(“AI error:”, err.message);
res.status(500).json({ error: “AI failed” });
}
});

// HOME
app.get(”/”, (req, res) => {
res.sendFile(path.join(__dirname, “index.html”));
});

// START
app.listen(process.env.PORT || 3000, () => {
console.log(“Server running”);
setTimeout(async () => {
console.log(“Warming cache…”);
try {
const [cryptoRes, marketRes] = await Promise.all([
fetch(“http://localhost:” + (process.env.PORT || 3000) + “/crypto”),
fetch(“http://localhost:” + (process.env.PORT || 3000) + “/market”)
]);
console.log(“Cache warmed - crypto:”, cryptoRes.status, “market:”, marketRes.status);
} catch (err) {
console.log(“Cache warm failed:”, err.message);
}
}, 3000);
});