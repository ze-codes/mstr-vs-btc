# MicroStrategy vs BTC Holdings Value

This project visualizes the relationship between MicroStrategy's (now Strategy) market capitalization and the value of its Bitcoin holdings. It shows:

- MSTR's market capitalization over time
- The value of MSTR's BTC holdings
- The premium/discount ratio between market cap and BTC holdings

## Live Demo

[View the live chart](https://ze-codes.github.io/mstr-vs-btc/)

## Features

- Interactive ECharts visualization with zoom and pan
- Auto-scaling Y-axis that adjusts to visible data
- Daily data updates via GitHub Actions
- Hover tooltips with detailed information
- Responsive design

## Data Sources

- **Bitcoin prices**: CryptoCompare API (free, no key required)
- **MSTR stock prices**: Yahoo Finance API
- **BTC purchase history**: CoinGecko Public Treasury API

## Development

### Prerequisites

- Node.js 20+
- CoinGecko API key (free at [coingecko.com/api/pricing](https://www.coingecko.com/en/api/pricing))

### Setup

```bash
# Install dependencies
npm install

# Create .env.local with your API key
echo "COINGECKO_API_KEY=your_key_here" > .env.local

# Fetch latest data
npm run fetch-data

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Deployment

The project is automatically deployed to GitHub Pages:

- On every push to the main branch
- Daily at 00:00 UTC to refresh price data

### GitHub Secrets

Add the following secret to your repository (Settings → Secrets → Actions):

- `COINGECKO_API_KEY`: Your CoinGecko Demo API key

## Tech Stack

- Next.js 16
- ECharts
- TypeScript
- Tailwind CSS
- GitHub Actions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
