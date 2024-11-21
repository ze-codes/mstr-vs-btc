import { BTCPurchase } from "@/types";

// This is your BTC purchase data from the image
export const btcPurchases: BTCPurchase[] = [
  {
    date: "2024-11-18",
    averagePrice: 88627.0,
    amount: 51780,
    cost: 4600000000.0,
  },
  {
    date: "2024-11-11",
    averagePrice: 74463.0,
    amount: 27200,
    cost: 2030000000.0,
  },
  {
    date: "2024-09-20",
    averagePrice: 61750.0,
    amount: 7420,
    cost: 458200000.0,
  },
  {
    date: "2024-09-13",
    averagePrice: 60408.0,
    amount: 18300,
    cost: 1110000000.0,
  },
  {
    date: "2024-08-01",
    averagePrice: 67455.0,
    amount: 169,
    cost: 11400000.0,
  },
  {
    date: "2023-12-27",
    averagePrice: 43500.0,
    amount: 850,
    cost: 37000000.0,
  },
  {
    date: "2023-12-22",
    averagePrice: 43750.0,
    amount: 14620,
    cost: 639600000.0,
  },
  {
    date: "2023-11-30",
    averagePrice: 37500.0,
    amount: 16130,
    cost: 605000000.0,
  },
  {
    date: "2023-09-24",
    averagePrice: 26500.0,
    amount: 5445,
    cost: 144300000.0,
  },
  {
    date: "2023-06-28",
    averagePrice: 30300.0,
    amount: 12333,
    cost: 373700000.0,
  },
  {
    date: "2023-03-27",
    averagePrice: 26500.0,
    amount: 6455,
    cost: 171100000.0,
  },
  {
    date: "2023-03-24",
    averagePrice: 28000.0,
    amount: 6500,
    cost: 182000000.0,
  },
  {
    date: "2023-03-23",
    averagePrice: 28000.0,
    amount: 1045,
    cost: 29300000.0,
  },
  {
    date: "2022-12-24",
    averagePrice: 16800.0,
    amount: 2395,
    cost: 40200000.0,
  },
  {
    date: "2022-12-22",
    averagePrice: 16800.0,
    amount: 810,
    cost: 13600000.0,
  },
  {
    date: "2022-11-01",
    averagePrice: 19200.0,
    amount: 301,
    cost: 5800000.0,
  },
  {
    date: "2022-09-20",
    averagePrice: 19000.0,
    amount: 301,
    cost: 5700000.0,
  },
  {
    date: "2022-06-29",
    averagePrice: 20000.0,
    amount: 480,
    cost: 9600000.0,
  },
  {
    date: "2022-04-05",
    averagePrice: 44645.0,
    amount: 4167,
    cost: 190600000.0,
  },
  {
    date: "2022-02-15",
    averagePrice: 44645.0,
    amount: 660,
    cost: 25000000.0,
  },
  {
    date: "2022-01-31",
    averagePrice: 37240.0,
    amount: 660,
    cost: 24600000.0,
  },
  {
    date: "2021-12-30",
    averagePrice: 49229.0,
    amount: 1914,
    cost: 94200000.0,
  },
  {
    date: "2021-12-09",
    averagePrice: 49229.0,
    amount: 1434,
    cost: 70600000.0,
  },
  {
    date: "2021-12-04",
    averagePrice: 49229.0,
    amount: 1434,
    cost: 70600000.0,
  },
  {
    date: "2021-11-29",
    averagePrice: 57477.0,
    amount: 7002,
    cost: 414400000.0,
  },
  {
    date: "2021-09-13",
    averagePrice: 44645.0,
    amount: 5050,
    cost: 242900000.0,
  },
  {
    date: "2021-08-24",
    averagePrice: 44645.0,
    amount: 3907,
    cost: 177000000.0,
  },
  {
    date: "2021-07-19",
    averagePrice: 31808.0,
    amount: 13759,
    cost: 437900000.0,
  },
  {
    date: "2021-06-21",
    averagePrice: 37617.0,
    amount: 13005,
    cost: 489200000.0,
  },
  {
    date: "2021-06-07",
    averagePrice: 33810.0,
    amount: 13005,
    cost: 439700000.0,
  },
  {
    date: "2021-05-13",
    averagePrice: 43663.0,
    amount: 229,
    cost: 10000000.0,
  },
  {
    date: "2021-02-24",
    averagePrice: 52765.0,
    amount: 19452,
    cost: 1026000000.0,
  },
  {
    date: "2021-02-02",
    averagePrice: 33810.0,
    amount: 295,
    cost: 10000000.0,
  },
  {
    date: "2021-01-22",
    averagePrice: 31808.0,
    amount: 314,
    cost: 10000000.0,
  },
  {
    date: "2020-12-21",
    averagePrice: 23910.0,
    amount: 29646,
    cost: 650000000.0,
  },
  {
    date: "2020-12-04",
    averagePrice: 19427.0,
    amount: 2574,
    cost: 50000000.0,
  },
  {
    date: "2020-09-14",
    averagePrice: 10419.0,
    amount: 16796,
    cost: 175000000.0,
  },
  {
    date: "2020-08-11",
    averagePrice: 11653.0,
    amount: 21454,
    cost: 250000000.0,
  },
];

export const getTotalBTCHoldings = (): number => {
  return btcPurchases.reduce((total, purchase) => total + purchase.amount, 0);
};

export const getTotalCost = (): number => {
  return btcPurchases.reduce((total, purchase) => total + purchase.cost, 0);
};

export const getAveragePrice = (): number => {
  const totalCost = getTotalCost();
  const totalBTC = getTotalBTCHoldings();
  return totalCost / totalBTC;
};
