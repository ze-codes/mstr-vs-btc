import fs from "fs/promises";
import path from "path";
import { BTCPriceData, MarketCapData } from "@/types";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

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

interface FMPResponse {
  symbol: string;
  date: string;
  marketCap: number;
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

    // Fetch market cap data
    console.log("\nFetching MSTR market cap data...");
    const API_KEY = process.env.FMP_API_KEY;
    if (!API_KEY) {
      throw new Error("FMP_API_KEY not found in environment variables");
    }

    const mstrResponse = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-market-capitalization/MSTR?` +
        `from=${
          startDate.toISOString().split("T")[0]
        }&to=${toDate}&apikey=${API_KEY}`
    );

    if (!mstrResponse.ok) {
      throw new Error(`MSTR HTTP error! status: ${mstrResponse.status}`);
    }

    const mstrData: FMPResponse[] = await mstrResponse.json();

    if (!Array.isArray(mstrData) || mstrData.length === 0) {
      throw new Error("Invalid or empty MSTR response from API");
    }

    // Format market cap data
    const formattedMSTRData: MarketCapData[] = mstrData.map((item) => ({
      date: item.date,
      marketCap: item.marketCap,
    }));

    // Sort market cap data
    formattedMSTRData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Save both datasets
    const btcFilePath = path.join(process.cwd(), "src/data/btcPrices.json");
    const mstrFilePath = path.join(process.cwd(), "src/data/marketCap.json");

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
