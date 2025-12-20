import fs from "fs/promises";
import path from "path";
import { BTCPriceData, MarketCapData } from "@/types";

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

    // Fetch BTC price data
    console.log("\nFetching BTC price data...");
    const daysDiff = Math.ceil(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`Fetching ${daysDiff} days of price data...`);

    const btcResponse = await fetch(
      `https://min-api.cryptocompare.com/data/v2/histoday?` +
        `fsym=BTC&tsym=USD&limit=${daysDiff}&toTs=${Math.floor(
          today.getTime() / 1000
        )}`
    );

    if (!btcResponse.ok) {
      throw new Error(`BTC HTTP error! status: ${btcResponse.status}`);
    }

    const btcData: CryptoCompareResponse = await btcResponse.json();

    if (btcData.Response !== "Success") {
      throw new Error(`BTC API error: ${btcData.Message}`);
    }

    // Format BTC data
    const formattedBTCData: BTCPriceData[] = btcData.Data.Data.map((item) => ({
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

    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), "src/data");
    await fs.mkdir(dataDir, { recursive: true });

    // Save both datasets
    const btcFilePath = path.join(dataDir, "btcPrices.json");
    const mstrFilePath = path.join(dataDir, "marketCap.json");

    await Promise.all([
      fs.writeFile(btcFilePath, JSON.stringify(formattedBTCData, null, 2)),
      fs.writeFile(mstrFilePath, JSON.stringify(formattedMSTRData, null, 2)),
    ]);

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
  } catch (error) {
    console.error("\nFailed to fetch data:", error);
    process.exit(1);
  }
}

// Run the script
fetchData();
