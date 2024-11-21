import { NextResponse } from "next/server";
import { MarketCapData } from "@/types";

export async function GET() {
  try {
    // You can use Financial Modeling Prep API, Alpha Vantage, or similar
    // This is a placeholder URL - you'll need to sign up for an API key
    const response = await fetch(
      "https://financialmodelingprep.com/api/v3/historical-market-capitalization/MSTR?apikey=YOUR_API_KEY"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MarketCapData[] = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch market cap data:", error);
    return NextResponse.json(
      { error: "Failed to fetch market cap data" },
      { status: 500 }
    );
  }
}
