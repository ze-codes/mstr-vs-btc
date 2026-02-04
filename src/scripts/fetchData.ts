import fs from "fs/promises";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { BTCPriceData, MarketCapData, BTCPurchase } from "@/types";

// Load .env.local if it exists (for local development)
const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=");
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

// CoinGecko API configuration
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

interface CoinGeckoEntity {
  id: string;
  symbol: string;
  name: string;
  country: string;
}

interface CoinGeckoTransaction {
  date: number; // Unix timestamp in milliseconds
  type: string; // "buy" or "sell"
  holding_net_change: number; // BTC amount
  transaction_value_usd: number; // Total cost in USD
  average_entry_value_usd: number; // Price per BTC
  coin_id: string;
  source_url: string;
  holding_balance: number;
}

interface CoinGeckoTransactionResponse {
  id: string;
  name: string;
  symbol: string;
  transactions: CoinGeckoTransaction[];
}

interface CryptoCompareResponse {
  Response: string;
  Message: string;
  Data: {
    TimeFrom: number;
    TimeTo: number;
    Data: Array<{
      time: number;
      high: number;
      low: number;
      open: number;
      close: number;
      volumefrom: number;
      volumeto: number;
      conversionType: string;
      conversionSymbol: string;
    }>;
  };
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
        }>;
        adjclose?: Array<{
          adjclose: (number | null)[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

async function fetchData() {
  try {
    console.log("Starting data fetch...");

    // Common date parameters
    const startDate = new Date("2020-08-11");
    const today = new Date();
    const toDate = today.toISOString().split("T")[0];

    // Fetch BTC price data (CryptoCompare histoday has a max limit of 2000 per request)
    const CRYPTOCOMPARE_MAX_LIMIT = 2000;
    console.log("\nFetching BTC price data...");
    const daysDiff = Math.ceil(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`Fetching ${daysDiff} days of price data...`);

    const allBtcRows: Array<{ time: number; close: number }> = [];
    let toTs = Math.floor(today.getTime() / 1000);
    let remaining = daysDiff;

    while (remaining > 0) {
      const limit = Math.min(remaining, CRYPTOCOMPARE_MAX_LIMIT);
      const btcResponse = await fetch(
        `https://min-api.cryptocompare.com/data/v2/histoday?` +
          `fsym=BTC&tsym=USD&limit=${limit}&toTs=${toTs}`
      );

      if (!btcResponse.ok) {
        throw new Error(`BTC HTTP error! status: ${btcResponse.status}`);
      }

      const btcData: CryptoCompareResponse = await btcResponse.json();

      if (btcData.Response !== "Success") {
        throw new Error(`BTC API error: ${btcData.Message}`);
      }

      const data = btcData.Data.Data;
      if (data.length === 0) break;

      allBtcRows.push(...data.map((item) => ({ time: item.time, close: item.close })));
      remaining -= data.length;
      if (data.length < limit) break;
      toTs = data[0].time - 1;
    }

    // Format BTC data (newest first from API, sort by date ascending)
    const formattedBTCData: BTCPriceData[] = allBtcRows
      .sort((a, b) => a.time - b.time)
      .map((item) => ({
        date: new Date(item.time * 1000).toISOString().split("T")[0],
        price: item.close,
      }));

    // Verify BTC data range
    const earliestBTCDate = formattedBTCData[0].date;
    if (new Date(earliestBTCDate) > startDate) {
      throw new Error(
        `BTC data starts from ${earliestBTCDate}, but we need data from ${
          startDate.toISOString().split("T")[0]
        }`
      );
    }

    // Sort BTC data
    formattedBTCData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Fetch MSTR market cap data using Yahoo Finance
    console.log("\nFetching MSTR market cap data from Yahoo Finance...");

    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(today.getTime() / 1000);

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/MSTR?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;

    const mstrResponse = await fetch(yahooUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!mstrResponse.ok) {
      throw new Error(`MSTR HTTP error! status: ${mstrResponse.status}`);
    }

    const yahooData: YahooChartResponse = await mstrResponse.json();

    if (yahooData.chart.error) {
      throw new Error(
        `Yahoo Finance API error: ${yahooData.chart.error.description}`
      );
    }

    const result = yahooData.chart.result[0];
    if (!result || !result.timestamp || !result.indicators.quote[0]) {
      throw new Error("Invalid or empty MSTR response from Yahoo Finance");
    }

    const timestamps = result.timestamp;
    const closes =
      result.indicators.adjclose?.[0]?.adjclose ||
      result.indicators.quote[0].close;

    // MSTR shares outstanding (approximate, updated periodically)
    // As of late 2024, MSTR has approximately 244 million shares outstanding
    // This is an approximation - actual historical market caps would vary due to stock issuance
    const SHARES_OUTSTANDING = 244_000_000;

    // Format market cap data
    const formattedMSTRData: MarketCapData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const price = closes[i];
      if (price !== null && price !== undefined) {
        const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
        formattedMSTRData.push({
          date,
          marketCap: Math.round(price * SHARES_OUTSTANDING),
        });
      }
    }

    // Sort market cap data
    formattedMSTRData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Fetch MSTR Bitcoin purchases from CoinGecko
    console.log("\nFetching MSTR Bitcoin purchases from CoinGecko...");

    let formattedPurchases: BTCPurchase[] = [];

    if (!COINGECKO_API_KEY) {
      console.warn(
        "Warning: COINGECKO_API_KEY not set. Skipping purchase data fetch."
      );
    } else {
      // First, find MicroStrategy's entity ID from the entities list
      console.log("Fetching entities list...");
      const entitiesResponse = await fetch(
        `${COINGECKO_BASE_URL}/entities/list?per_page=250`,
        {
          headers: {
            "x-cg-demo-api-key": COINGECKO_API_KEY,
          },
        }
      );

      if (!entitiesResponse.ok) {
        console.warn(
          `Warning: Failed to fetch entities list (${entitiesResponse.status}). Trying direct lookup...`
        );
      }

      let mstrEntityId: string | null = null;

      if (entitiesResponse.ok) {
        const entities: CoinGeckoEntity[] = await entitiesResponse.json();
        // Look for MicroStrategy/Strategy in the entities list
        const mstrEntity = entities.find(
          (e) =>
            (e.name && e.name.toLowerCase().includes("microstrategy")) ||
            (e.name && e.name.toLowerCase().includes("strategy")) ||
            (e.symbol && e.symbol.toLowerCase().includes("mstr"))
        );

        if (mstrEntity) {
          mstrEntityId = mstrEntity.id;
          console.log(
            `Found MicroStrategy entity: ${mstrEntity.name} (${mstrEntityId})`
          );
        } else {
          const entityNames = entities
            .filter((e) => e.name)
            .map((e) => `${e.name} (${e.id})`)
            .slice(0, 20);
          console.log("Sample entities:", entityNames.join(", "));
          console.warn("MicroStrategy not found in entities list.");
        }
      }

      // Try to fetch transaction history if we have an entity ID
      if (mstrEntityId) {
        const purchaseResponse = await fetch(
          `${COINGECKO_BASE_URL}/public_treasury/${mstrEntityId}/transaction_history`,
          {
            headers: {
              "x-cg-demo-api-key": COINGECKO_API_KEY,
            },
          }
        );

        if (!purchaseResponse.ok) {
          const errorText = await purchaseResponse.text();
          console.warn(
            `Warning: CoinGecko API returned ${purchaseResponse.status}. ${errorText}`
          );
        } else {
          const purchaseData = await purchaseResponse.json();
          console.log("API Response:", JSON.stringify(purchaseData, null, 2).slice(0, 500));

          // Handle different response structures
          const transactions: CoinGeckoTransaction[] = purchaseData.transactions || purchaseData.data || [];
          
          if (Array.isArray(transactions) && transactions.length > 0) {
            // Filter for "buy" transactions and format the data
            formattedPurchases = transactions
              .filter((tx) => tx.type === "buy")
              .map((tx) => ({
                date: new Date(tx.date).toISOString().split("T")[0],
                averagePrice: tx.average_entry_value_usd,
                amount: tx.holding_net_change,
                cost: tx.transaction_value_usd,
              }))
              .sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              );
          }

          console.log(`Fetched ${formattedPurchases.length} purchase records`);
        }
      }
    }

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), "src/data");
    await fs.mkdir(dataDir, { recursive: true });

    // Save all datasets
    const btcFilePath = path.join(dataDir, "btcPrices.json");
    const mstrFilePath = path.join(dataDir, "marketCap.json");
    const purchasesFilePath = path.join(dataDir, "btcPurchases.json");

    const filesToWrite = [
      fs.writeFile(btcFilePath, JSON.stringify(formattedBTCData, null, 2)),
      fs.writeFile(mstrFilePath, JSON.stringify(formattedMSTRData, null, 2)),
    ];

    if (formattedPurchases.length > 0) {
      filesToWrite.push(
        fs.writeFile(
          purchasesFilePath,
          JSON.stringify(formattedPurchases, null, 2)
        )
      );
    }

    await Promise.all(filesToWrite);

    console.log("\nData fetch completed successfully!");
    console.log(`BTC Prices: ${formattedBTCData.length} records`);
    console.log(
      `Date range: ${formattedBTCData[0].date} to ${
        formattedBTCData[formattedBTCData.length - 1].date
      }`
    );
    console.log(`\nMSTR Market Cap: ${formattedMSTRData.length} records`);
    console.log(
      `Date range: ${formattedMSTRData[0].date} to ${
        formattedMSTRData[formattedMSTRData.length - 1].date
      }`
    );
    if (formattedPurchases.length > 0) {
      console.log(`\nMSTR BTC Purchases: ${formattedPurchases.length} records`);
    }
  } catch (error) {
    console.error("\nFailed to fetch data:", error);
    process.exit(1);
  }
}

// Run the script
fetchData();
