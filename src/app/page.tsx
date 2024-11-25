"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BTCPurchase, MarketCapData, BTCPriceData } from "@/types";
import btcPrices from "@/data/btcPrices.json";
import marketCapData from "@/data/marketCap.json";
import { btcPurchases } from "@/data/btcPurchases";

// Define interfaces at the top level
interface DataPoint {
  date: Date;
  marketCap: number;
  btcHoldingsValue: number;
}

interface DataPointWithRatio extends DataPoint {
  ratio: number;
}

export default function Home() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const fetchAndRenderData = async () => {
      try {
        // Create a map of dates to BTC prices for easy lookup
        const btcPriceMap = new Map(
          btcPrices.map((item: BTCPriceData) => [item.date, item.price])
        );

        // Combine market cap data with BTC holdings value
        const chartData = marketCapData.map((mcData: MarketCapData) => {
          const date = new Date(mcData.date);
          const btcPrice = btcPriceMap.get(mcData.date) || 0;
          const btcValue =
            calculateBTCValueAtDate(date, btcPurchases) * btcPrice;

          return {
            date: date,
            marketCap: mcData.marketCap,
            btcHoldingsValue: btcValue,
          };
        });

        renderChart(chartData);
      } catch (error) {
        console.error("Failed to process data:", error);
      }
    };

    fetchAndRenderData();
  }, []);

  const renderChart = (
    data: { date: Date; marketCap: number; btcHoldingsValue: number }[]
  ) => {
    if (!svgRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Set dimensions
    const margin = { top: 50, right: 70, bottom: 50, left: 70 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = svgRef.current.clientHeight - margin.top - margin.bottom;

    // Create clip path
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const svg = d3
      .select(svgRef.current)
      .append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    // Create main chart group
    const g = d3
      .select(svgRef.current)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Calculate ratio data
    const dataWithRatio = data.map((d) => ({
      ...d,
      ratio: ((d.marketCap - d.btcHoldingsValue) / d.btcHoldingsValue) * 100,
    }));

    // Set scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data, (d) =>
          Math.max(d.marketCap, d.btcHoldingsValue)
        ) as number,
      ])
      .range([height, 0]);

    const maxDeviation = d3.max(dataWithRatio, (d) =>
      Math.abs(d.ratio)
    ) as number;
    const yScaleRight = d3
      .scaleLinear()
      .domain([-maxDeviation, maxDeviation])
      .range([height, 0]);

    // Create a group for the clipped content
    const chartContent = g.append("g").attr("clip-path", "url(#clip)");

    // Create lines
    const marketCapLine = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.marketCap));

    const btcLine = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.btcHoldingsValue));

    const ratioLine = d3
      .line<(typeof dataWithRatio)[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScaleRight(d.ratio));

    // Add lines to the clipped group
    chartContent
      .append("path")
      .datum(data)
      .attr("class", "market-cap-line")
      .attr("fill", "none")
      .attr("stroke", "#8884d8")
      .attr("stroke-width", 2)
      .attr("d", marketCapLine);

    chartContent
      .append("path")
      .datum(data)
      .attr("class", "btc-line")
      .attr("fill", "none")
      .attr("stroke", "#82ca9d")
      .attr("stroke-width", 2)
      .attr("d", btcLine);

    chartContent
      .append("path")
      .datum(dataWithRatio)
      .attr("class", "ratio-line")
      .attr("fill", "none")
      .attr("stroke", "#ff7f0e")
      .attr("stroke-width", 2)
      .attr("d", ratioLine);

    // Create axes groups
    const xAxisGroup = g
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`);

    const yAxisGroup = g.append("g").attr("class", "y-axis");

    const yAxisRightGroup = g
      .append("g")
      .attr("class", "y-axis-right")
      .attr("transform", `translate(${width},0)`);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((d) => `$${(+d / 1e9).toFixed(1)}B`);
    const yAxisRight = d3
      .axisRight(yScaleRight)
      .tickFormat((d) => `${(+d).toFixed(0)}%`);

    // Add axes
    xAxisGroup.call(xAxis);
    yAxisGroup.call(yAxis);
    yAxisRightGroup.call(yAxisRight);

    // Add zero line
    chartContent
      .append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", yScaleRight(0))
      .attr("y2", yScaleRight(0))
      .attr("stroke", "#666")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0.5);

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 500]) // Min and max zoom level
      .extent([
        [0, 0],
        [width, height],
      ])
      .translateExtent([
        [0, -Infinity],
        [width, Infinity],
      ])
      .on("zoom", zoomed);

    // Add zoom behavior to SVG
    d3.select(svgRef.current).call(zoom);

    // Add a ref to store current transform
    let currentTransform = d3.zoomIdentity;

    // Zoom function
    function zoomed(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
      const newXScale = event.transform.rescaleX(xScale);
      currentTransform = event.transform; // Store current transform

      // Update lines with new scale
      chartContent.select(".market-cap-line").attr(
        "d",
        d3
          .line<DataPoint>()
          .x((d) => newXScale(d.date))
          .y((d) => yScale(d.marketCap))(data)
      );

      chartContent.select(".btc-line").attr(
        "d",
        d3
          .line<DataPoint>()
          .x((d) => newXScale(d.date))
          .y((d) => yScale(d.btcHoldingsValue))(data)
      );

      chartContent.select(".ratio-line").attr(
        "d",
        d3
          .line<DataPointWithRatio>()
          .x((d) => newXScale(d.date))
          .y((d) => yScaleRight(d.ratio))(dataWithRatio)
      );

      // Update x-axis
      xAxisGroup.call(xAxis.scale(newXScale));
    }

    // Add legend
    const legend = g
      .append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 12)
      .attr("text-anchor", "start")
      .selectAll("g")
      .data([
        { color: "#8884d8", label: "MSTR Market Cap" },
        { color: "#82ca9d", label: "BTC Holdings Value" },
        { color: "#ff7f0e", label: "Market Cap Premium/Discount to BTC" },
      ])
      .join("g")
      .attr("transform", (d, i) => `translate(${i * 250}, ${height + 40})`);

    legend
      .append("rect")
      .attr("x", 0)
      .attr("width", 19)
      .attr("height", 19)
      .attr("fill", (d) => d.color);

    legend
      .append("text")
      .attr("x", 24)
      .attr("y", 9.5)
      .attr("dy", "0.32em")
      .text((d) => d.label);

    // Add y-axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left)
      .attr("x", -height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Value (USD)");

    g.append("text")
      .attr("transform", "rotate(90)")
      .attr("y", -width - margin.right)
      .attr("x", height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Premium/Discount to BTC Holdings (%)");

    // Create tooltip div
    const tooltip = d3
      .select("body")
      .append("div")
      .attr(
        "class",
        "absolute hidden bg-black/80 text-white p-2 rounded text-sm pointer-events-none whitespace-nowrap"
      )
      .style("z-index", "100");

    // Create a vertical line for hover effect
    const verticalLine = g
      .append("line")
      .attr("class", "vertical-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#666")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .style("opacity", 0);

    // Create overlay for mouse events
    const mouseG = g
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all");

    // Mouse move handler
    mouseG.on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event);
      // Use the transformed scale for date lookup
      const xDate = currentTransform.rescaleX(xScale).invert(mouseX);

      // Find the closest data point
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bisect = d3.bisector((d: any) => d.date).left;
      const index = bisect(data, xDate);

      // Handle edge cases
      if (index >= data.length) return;

      // Find the closest point by comparing the current and next point
      const currentPoint = data[index];
      const previousPoint = index > 0 ? data[index - 1] : currentPoint;

      // Determine which point is closer to the mouse
      const d =
        xDate.getTime() - previousPoint.date.getTime() >
        currentPoint.date.getTime() - xDate.getTime()
          ? currentPoint
          : previousPoint;

      if (d) {
        // Update vertical line position using transformed scale
        verticalLine
          .attr("x1", currentTransform.rescaleX(xScale)(d.date))
          .attr("x2", currentTransform.rescaleX(xScale)(d.date))
          .style("opacity", 1);

        // Calculate ratio
        const ratio =
          ((d.marketCap - d.btcHoldingsValue) / d.btcHoldingsValue) * 100;

        // Format date
        const formattedDate = d.date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        // Update tooltip content and position
        tooltip
          .html(
            `<div class="space-y-1">
              <div class="font-bold">${formattedDate}</div>
              <div>MSTR Market Cap: $${(d.marketCap / 1e9).toFixed(2)}B</div>
              <div>BTC Holdings: $${(d.btcHoldingsValue / 1e9).toFixed(
                2
              )}B</div>
              <div>Premium/Discount: ${ratio.toFixed(1)}%</div>
            </div>`
          )
          .style("left", `${event.pageX + 15}px`)
          .style("top", `${event.pageY - 15}px`)
          .style("display", "block");
      }
    });

    // Mouse leave handler
    mouseG.on("mouseleave", function () {
      verticalLine.style("opacity", 0);
      tooltip.style("display", "none");
    });
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Updated navigation buttons */}
        <div className="flex gap-4 mb-8">
          <a
            href="https://ze-codes.github.io/"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Back to Main Page
          </a>
          <a
            href="https://github.com/ze-codes/mstr-vs-btc"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </div>

        <h1 className="text-2xl font-bold mb-8">
          MicroStrategy: Market Cap vs BTC Holdings Value
        </h1>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="text-sm text-gray-500 mb-2">
            Use mouse wheel to zoom, drag to pan
          </div>
          <svg
            ref={svgRef}
            className="w-full h-[600px]"
            style={{ overflow: "visible", marginBottom: "40px" }}
          />
        </div>
      </div>
    </div>
  );
}

function calculateBTCValueAtDate(date: Date, purchases: BTCPurchase[]): number {
  let totalBTC = 0;
  for (const purchase of purchases) {
    if (new Date(purchase.date) <= date) {
      totalBTC += purchase.amount;
    }
  }
  return totalBTC;
}
