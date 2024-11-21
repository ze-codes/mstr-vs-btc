# MicroStrategy vs BTC Holdings Value

This project visualizes the relationship between MicroStrategy's market capitalization and the value of its Bitcoin holdings. It shows:

- MSTR's market capitalization over time
- The value of MSTR's BTC holdings
- The premium/discount ratio between market cap and BTC holdings

## Features

- Interactive D3.js chart with zoom and pan capabilities
- Daily data updates via GitHub Actions
- Hover tooltips with detailed information
- Dark mode support
- Responsive design

## Data Sources

- Bitcoin price data from CryptoCompare API
- Market capitalization data from Financial Modeling Prep API
- BTC holdings data from MicroStrategy's public disclosures

## Development

To run this project locally:

```bash
# Install dependencies
npm install
# Fetch latest data
npm run fetch-data
# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## Deployment

The project is automatically deployed to GitHub Pages:

- On every push to the main branch
- Daily at 00:00 UTC to update price data

## Environment Variables

Required environment variables:

- `FMP_API_KEY`: Financial Modeling Prep API key

## Tech Stack

- Next.js
- D3.js
- TypeScript
- Tailwind CSS
- GitHub Actions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
