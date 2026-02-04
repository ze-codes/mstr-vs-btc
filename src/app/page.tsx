"use client";

import { useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { BTCPurchase, MarketCapData, BTCPriceData } from "@/types";
import btcPrices from "@/data/btcPrices.json";
import marketCapData from "@/data/marketCap.json";
import btcPurchases from "@/data/btcPurchases.json";
import type { EChartsOption, ECharts } from "echarts";

// Dynamically import ECharts to avoid SSR issues
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

function calculateBTCValueAtDate(date: Date, purchases: BTCPurchase[]): number {
  let totalBTC = 0;
  for (const purchase of purchases) {
    if (new Date(purchase.date) <= date) {
      totalBTC += purchase.amount;
    }
  }
  return totalBTC;
}

export default function Home() {
  const chartInstanceRef = useRef<ECharts | null>(null);

  const chartData = useMemo(() => {
    // Create a map of dates to BTC prices for easy lookup
    const btcPriceMap = new Map(
      btcPrices.map((item: BTCPriceData) => [item.date, item.price])
    );

    // Combine market cap data with BTC holdings value
    return marketCapData.map((mcData: MarketCapData) => {
      const date = new Date(mcData.date);
      const btcPrice = btcPriceMap.get(mcData.date) || 0;
      const btcValue = calculateBTCValueAtDate(date, btcPurchases) * btcPrice;
      const ratio = btcValue > 0 ? ((mcData.marketCap - btcValue) / btcValue) * 100 : 0;

      return {
        date: mcData.date,
        marketCap: mcData.marketCap,
        btcHoldingsValue: btcValue,
        ratio,
      };
    });
  }, []);

  // Handle dataZoom to auto-scale Y-axis
  const handleDataZoom = useCallback(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;

    const option = chart.getOption() as {
      dataZoom: Array<{ start: number; end: number }>;
    };
    const dataZoom = option.dataZoom?.[0];
    if (!dataZoom) return;

    const { start, end } = dataZoom;
    const startIdx = Math.floor((start / 100) * chartData.length);
    const endIdx = Math.ceil((end / 100) * chartData.length);
    const visibleData = chartData.slice(startIdx, endIdx);

    if (visibleData.length === 0) return;

    // Calculate min/max for visible data
    let minValue = Infinity;
    let maxValue = -Infinity;
    let minRatio = Infinity;
    let maxRatio = -Infinity;

    visibleData.forEach((d) => {
      minValue = Math.min(minValue, d.marketCap, d.btcHoldingsValue);
      maxValue = Math.max(maxValue, d.marketCap, d.btcHoldingsValue);
      minRatio = Math.min(minRatio, d.ratio);
      maxRatio = Math.max(maxRatio, d.ratio);
    });

    // Add 5% padding
    const valuePadding = (maxValue - minValue) * 0.05;
    const ratioPadding = (maxRatio - minRatio) * 0.05;

    chart.setOption({
      yAxis: [
        {
          min: Math.max(0, minValue - valuePadding),
          max: maxValue + valuePadding,
        },
        {
          min: minRatio - ratioPadding,
          max: maxRatio + ratioPadding,
        },
      ],
    });
  }, [chartData]);

  const option: EChartsOption = useMemo(() => {
    const dates = chartData.map((d) => d.date);
    const marketCapValues = chartData.map((d) => d.marketCap);
    const btcValues = chartData.map((d) => d.btcHoldingsValue);
    const ratioValues = chartData.map((d) => d.ratio);

    return {
      tooltip: {
        trigger: "axis",
        confine: true, // Keep tooltip within chart bounds
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: {
          color: "#171717",
        },
        formatter: (params: unknown) => {
          const p = params as Array<{
            axisValue: string;
            marker: string;
            seriesName: string;
            value: number;
          }>;
          if (!p || p.length === 0) return "";
          
          const date = new Date(p[0].axisValue).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          let html = `<div style="font-weight: bold; margin-bottom: 4px;">${date}</div>`;
          
          p.forEach((item) => {
            const value = item.value;
            let formattedValue: string;
            
            if (item.seriesName === "Premium/Discount") {
              formattedValue = `${value.toFixed(1)}%`;
            } else {
              formattedValue = `$${(value / 1e9).toFixed(2)}B`;
            }
            
            html += `<div>${item.marker} ${item.seriesName}: ${formattedValue}</div>`;
          });
          
          return html;
        },
      },
      legend: {
        data: ["MSTR Market Cap", "BTC Holdings Value", "Premium/Discount"],
        bottom: 20,
        textStyle: {
          color: "#374151",
        },
      },
      grid: {
        left: 80,
        right: 80,
        top: 40,
        bottom: 100,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
            });
          },
          color: "#374151",
        },
        axisLine: {
          lineStyle: {
            color: "#9ca3af",
          },
        },
      },
      yAxis: [
        {
          type: "value",
          name: "Value (USD)",
          nameLocation: "middle",
          nameGap: 55,
          nameTextStyle: {
            color: "#374151",
          },
          axisLabel: {
            formatter: (value: number) => `$${(value / 1e9).toFixed(0)}B`,
            color: "#374151",
          },
          axisLine: {
            lineStyle: {
              color: "#9ca3af",
            },
          },
          splitLine: {
            lineStyle: {
              color: "#e5e7eb",
            },
          },
        },
        {
          type: "value",
          name: "Premium/Discount (%)",
          nameLocation: "middle",
          nameGap: 55,
          nameTextStyle: {
            color: "#374151",
          },
          axisLabel: {
            formatter: (value: number) => `${value.toFixed(0)}%`,
            color: "#374151",
          },
          axisLine: {
            lineStyle: {
              color: "#9ca3af",
            },
          },
          splitLine: {
            show: false,
          },
        },
      ],
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
        },
      ],
      series: [
        {
          name: "MSTR Market Cap",
          type: "line",
          data: marketCapValues,
          yAxisIndex: 0,
          symbol: "none",
          lineStyle: {
            color: "#8884d8",
            width: 2,
          },
          itemStyle: {
            color: "#8884d8",
          },
        },
        {
          name: "BTC Holdings Value",
          type: "line",
          data: btcValues,
          yAxisIndex: 0,
          symbol: "none",
          lineStyle: {
            color: "#82ca9d",
            width: 2,
          },
          itemStyle: {
            color: "#82ca9d",
          },
        },
        {
          name: "Premium/Discount",
          type: "line",
          data: ratioValues,
          yAxisIndex: 1,
          symbol: "none",
          lineStyle: {
            color: "#ff7f0e",
            width: 2,
          },
          itemStyle: {
            color: "#ff7f0e",
          },
        },
      ],
    };
  }, [chartData]);

  const onEvents = useMemo(
    () => ({
      datazoom: handleDataZoom,
    }),
    [handleDataZoom]
  );

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation buttons */}
        <div className="flex gap-3 mb-8">
          <a
            href="https://ze-codes.github.io/"
            className="btn btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            ← Back to Main Page
          </a>
          <a
            href="https://github.com/ze-codes/mstr-vs-btc"
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </div>

        <h1 className="text-2xl font-bold mb-4">
          MicroStrategy: Market Cap vs BTC Holdings Value
        </h1>
        <p className="text-gray-600 mb-6 max-w-3xl">
          This chart was created to support my investment thesis of shorting MSTR and longing BTC,
          betting that MSTR market cap&apos;s premium over its BTC holdings would go to 0.{" "}
          <a
            href="https://zespace.notion.site/MicroStrategy-s-Bitcoin-Accumulation-What-You-Should-Know-1435df8e68ee8051b11adb9539e8e1ca?pvs=4"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Click here to view my original analysis
          </a>
          .
        </p>
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
          <div className="text-sm text-gray-500 mb-2">
            Scroll to zoom, drag to pan. Y-axis auto-scales to visible data.
          </div>
          <ReactECharts
            option={option}
            style={{ height: "600px", width: "100%" }}
            opts={{ renderer: "canvas" }}
            onEvents={onEvents}
            onChartReady={(chart: ECharts) => {
              chartInstanceRef.current = chart;
            }}
          />
        </div>
      </div>
    </div>
  );
}
