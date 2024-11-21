export interface BTCPurchase {
  date: string;
  averagePrice: number;
  amount: number;
  cost: number;
}

export interface MarketCapData {
  date: string;
  marketCap: number;
}

export interface ChartData {
  date: string;
  btcHoldingsValue: number;
  marketCap: number;
}

export interface BTCPriceData {
  date: string;
  price: number;
}
