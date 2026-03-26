import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// serve frontend
app.use(express.static(__dirname));

// crypto
app.get("/crypto", async (req, res) => {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,hedera-hashgraph,ripple,chainlink,solana&vs_currencies=usd&include_24hr_change=true",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const d = await r.json();
    res.json(d);
  } catch (e) {
    console.log(e);
    res.status(500).send("error");
  }
});

// market
app.get("/market", async (req, res) => {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/global",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const d = await r.json();
    res.json(d);
  } catch (e) {
    console.log(e);
    res.status(500).send("error");
  }
});

// homepage FIX
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("running");
});