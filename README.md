# Spending Dashboard

A client-side spending dashboard that parses Canadian bank statement PDFs and visualises transactions with interactive charts, filters, and AI-powered categorization.

<!-- Replace with your own screenshot -->
<!-- ![Dashboard Overview](docs/screenshot.png) -->

## Features

- **PDF Statement Parsing** — drag-and-drop PDF upload with automatic bank detection
- **Supported Banks** — RBC (Chequing & Credit), CIBC (Chequing & Credit), American Express
- **AI Categorization** — transactions sorted into 48 categories via Claude API (with regex fallback)
- **Interactive Charts** — donut chart for spending by category, bar chart for monthly income vs. spending
- **Category Breakdown** — ranked list with percentage bars; click any category to filter the transaction table
- **Bank Breakdown** — spending totals by bank and account type
- **Transaction Table** — sortable, searchable, paginated; inline category editing with "apply to all" for bulk re-categorization
- **Date Range Filter** — global filter applied across all views
- **CSV Export** — one-click export of all transactions
- **Offline-First** — all data stays in your browser via localStorage; no server required

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| State | Zustand (persisted to localStorage) |
| PDF | PDF.js |
| AI | Claude API (optional) |

## Getting Started

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/spending-dashboard.git
cd spending-dashboard

# Install
npm install

# (Optional) Add your Anthropic API key for AI categorization
cp .env.example .env
# Edit .env and replace "your-api-key-here" with your key

# Run
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and upload a bank statement PDF.

> **Note:** The AI categorization is optional. Without an API key, the app uses a comprehensive regex-based categorizer that handles most Canadian merchants accurately.

## Project Structure

```
src/
├── App.jsx                  # Root layout, date filter, tab switching
├── components/
│   ├── FileUploader.jsx     # Drag-and-drop PDF upload
│   ├── Dashboard.jsx        # Overview stats + chart grid
│   ├── CategoryChart.jsx    # Donut chart (Recharts)
│   ├── MonthlyChart.jsx     # Income vs. spending bar chart
│   ├── CategoryBreakdown.jsx # Ranked category list
│   ├── BankBreakdown.jsx    # Spending by bank
│   └── TransactionTable.jsx # Sortable/filterable table + inline category editor
├── parsers/
│   ├── bankDetector.js      # Auto-detects bank from PDF text
│   ├── pdfExtractor.js      # PDF.js text extraction with positional data
│   ├── rbc.js               # RBC Chequing + Credit Card parsers
│   ├── cibc.js              # CIBC Chequing + Credit Card parsers
│   └── amex.js              # Amex parser (line-based + positional)
├── services/
│   └── categorizer.js       # Claude API batch categorizer + regex fallback
├── store/
│   └── transactions.js      # Zustand store with localStorage persistence
└── utils/
    └── formatting.js        # Currency/date formatting, category metadata, merchant cleanup
```

## How It Works

1. **Upload** — PDFs are parsed entirely in the browser using PDF.js. No files leave your machine.
2. **Detect** — the bank detector identifies the statement type from keywords in the PDF text.
3. **Parse** — bank-specific parsers extract transactions (date, description, amount) using regex and positional matching.
4. **Categorize** — transactions are categorized via the Claude API in batches of 50, or via regex rules if no API key is set. Results are cached in localStorage.
5. **Display** — the dashboard renders interactive charts and a filterable transaction table.

## License

MIT
