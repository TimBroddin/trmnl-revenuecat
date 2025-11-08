# TRMNL RevenueCat Plugin

A private TRMNL plugin that displays RevenueCat metrics including MRR (Monthly Recurring Revenue) and total revenue for the last 28 days, with per-project/app breakdowns.

Inspired by [jazzychad's TRMNL RevenueCat plugin](https://notes.jazzychad.net/post/8ce63855296e29c5596163e6fceece82).

## Features

- 📊 Monthly Recurring Revenue (MRR) - last 28 days
- 💰 Total Revenue - last 28 days
- 📱 Per-project/app metrics breakdown
- 🔐 Secure password authentication via header
- 💱 Multi-currency support (USD, EUR) with live exchange rates

## Setup

### 1. Get Your RevenueCat API Keys

1. Log in to your [RevenueCat dashboard](https://app.revenuecat.com/)
2. Navigate to each project
3. For each project, go to **Settings** → **API Keys**
4. Create a new **V2 Read-Only API Key** for each project
5. Copy all API keys (format: `sk_xxxxxxxxxxxxx`)

### 2. Deploy the Plugin

This is a Next.js application that can be deployed to Vercel, Netlify, or any platform supporting Next.js.

**Deploy to Vercel:**
```bash
npm install
npm run build
vercel deploy
```

### 3. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Authentication password for TRMNL requests
TRMNL_PASSWORD=your_secret_password_here

# Array of RevenueCat API keys (one per project)
REVENUECAT_API_KEYS=["sk_project1_key","sk_project2_key","sk_project3_key"]
```

### 4. Configure TRMNL

Once deployed, configure your TRMNL device:

1. Go to your TRMNL dashboard
2. Add a new **Private Plugin**
3. Set the plugin URL to: `https://your-deployment-url.vercel.app/api/trmnl`
   - For EUR instead of USD, use: `https://your-deployment-url.vercel.app/api/trmnl?currency=EUR`
4. Add a **Custom Header**:
   - Header name: `Authorization`
   - Header value: `Bearer your_secret_password_here` (use the same password from `.env`)

## API Endpoint

**Endpoint:** `GET /api/trmnl`

**Authentication:**
- Header: `Authorization: Bearer <your_trmnl_password>`

**Query Parameters:**
- `currency` (optional): Currency for the response. Supported values: `USD` (default), `EUR`
  - Example: `/api/trmnl?currency=EUR`
- `sort` (optional): Sort order for projects. Supported values: `name` (default), `mrr`, `revenue`
  - `name`: Alphabetical by project name
  - `mrr`: By Monthly Recurring Revenue (descending)
  - `revenue`: By total revenue (descending)
  - Example: `/api/trmnl?sort=mrr`
  - Example with currency: `/api/trmnl?currency=EUR&sort=revenue`
- `demo` (optional): Enable demo mode with mock data for screenshots/testing. Set to `true` to enable.
  - Example: `/api/trmnl?demo=true`
  - Example with currency: `/api/trmnl?demo=true&currency=EUR`

**Response Format (USD):**
```json
{
    "total_mrr": "$15.00",
    "total_revenue": "$119.00",
    "projects": [
      {
        "name": "My lovely project",
        "mrr": "$15.00",
        "revenue": "$119.00"
      }
    ]
}
```

**Response Format (EUR with `?currency=EUR`):**
```json
{
    "total_mrr": "€13.80",
    "total_revenue": "€109.48",
    "projects": [
      {
        "name": "My lovely project",
        "mrr": "€13.80",
        "revenue": "€109.48"
      }
    ]
}
```

**Currency Conversion:**
- Conversions use live exchange rates from exchangerate-api.com
- Rates are cached for 1 hour to improve performance
- If the exchange rate API is unavailable, a fallback rate is used
- RevenueCat reports in USD, so USD values are the source of truth

## TRMNL Template Variables

Use these variables in your TRMNL template:

- `{{ total_mrr }}` - Total Monthly Recurring Revenue across all projects (last 28 days)
- `{{ total_revenue }}` - Total revenue across all projects (last 28 days)
- `{{ projects }}` - Array of project metrics with:
  - `{{ name }}` - Project/App name
  - `{{ mrr }}` - Project MRR
  - `{{ revenue }}` - Project revenue

## TRMNL Templates

Multiple optimized layouts are available in the `/layouts` directory, each designed for different TRMNL screen configurations:

### Layout Files

- **`shared.html`** - Reusable Liquid templates (used in the other layouts)
  - Title bar component
  - Metric box templates
  - Project table templates

- **`full.html`** - Full screen layout (800x480px)
  - Two-column metrics grid (MRR + Revenue)
  - Complete projects table with all data
  - Ideal for comprehensive overview

- **`half_horizontal.html`** - Wide, short display
  - Side-by-side metrics prominently displayed
  - Optimized for horizontal half-screen

- **`half_vertical.html`** - Narrow, tall display
  - Stacked metrics (vertical layout)
  - Project count only (no detailed table)
  - Optimized for vertical half-screen

- **`quadrant.html`** - Small square display
  - Single primary metric (MRR)
  - Large, readable value
  - Compact title bar ("RC")
  - Minimal chrome, maximum data visibility

### Usage

1. Add all four layouts in the editor:
   - **Full Screen** → use `full.html`
   - **Half Horizontal** → use `half_horizontal.html`
   - **Half Vertical** → use `half_vertical.html`
   - **Quadrant** → use `quadrant.html`

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Rate Limits

RevenueCat V2 API has rate limits. This plugin:
- Makes 1 + N API calls per request (projects list + overview per project)
- Recommended: Set TRMNL refresh to 30+ minutes

## Troubleshooting

**401 Unauthorized:**
- Check that your password in the Authorization header matches `TRMNL_PASSWORD` in `.env`
- Verify the Authorization header format: `Bearer your_password_here`
- Ensure you're using the correct password (not your RevenueCat API keys)

**500 Server Error:**
- Check the RevenueCat API status
- Verify all API keys in `REVENUECAT_API_KEYS` are valid V2 keys starting with `sk_`
- Ensure API keys have read permissions for projects and overview metrics
- Check the server logs for detailed error messages
- Verify `REVENUECAT_API_KEYS` is properly formatted as a JSON array

**No Data Showing:**
- Verify your RevenueCat projects have active subscriptions
- Check that all API keys have access to their respective projects
- Ensure you have revenue in the last 28 days
- Check server logs to see if individual projects are failing to load

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive data (password and API keys)
- All RevenueCat API keys should have **read-only** permissions
- Use a strong, unique password for `TRMNL_PASSWORD`
- Consider implementing rate limiting on the endpoint
- In production (Vercel), set environment variables in the deployment settings
