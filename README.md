# India Marketplace MCP Server

A unified MCP server that lets AI assistants search and retrieve listings from **OLX India (olx.in)** and **Facebook Marketplace India**.

## Features

- `search_marketplace` — unified search across OLX India and Facebook Marketplace India
- `get_listing_details` — retrieve full details for a specific listing
- Standardized output (id, title, price in INR, description, location, url, images, source)

## Installation

Use with any MCP client (Claude Desktop, Cursor) via `npx` or local build.

### Quick Start (npx)

In your MCP client config (e.g., Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "india-marketplace": {
      "command": "npx",
      "args": ["-y", "india-marketplace-mcp"]
    }
  }
}
```

> Note: The package is not published on npm yet. For local use, build first and point to `dist/index.js`.

### Local Development / Build

```bash
git clone <repo-url>
cd marketplace-mcp
npm install
npm run build
```

Then configure your client to use the built server:

```json
{
  "mcpServers": {
    "india-marketplace": {
      "command": "node",
      "args": ["/absolute/path/to/marketplace-mcp/dist/index.js"]
    }
  }
}
```

## Usage

### Search
```
{
  "name": "search_marketplace",
  "arguments": {
    "query": "iphone",
    "source": "both",
    "location": "Delhi",
    "limit": 10
  }
}
```

### Get Listing Details
```
{
  "name": "get_listing_details",
  "arguments": {
    "id": "1856655223",
    "source": "olx.in"
  }
}
```

## Adapted Logic

- **OLX India**: Uses `https://www.olx.in` with Indian query parameters. Parses `data-aut-id` selectors (`itemTitle`, `itemPrice`, `itemImage`, `item-location`) and extracts `Product` schema JSON for item details.
- **Facebook Marketplace India**: Scrapes the logged-out search page (`/marketplace/delhi/search`) using RelayPrefetchedStreamCache JSON segments (`MarketplaceFeedListingStoryObject`) to extract `marketplace_listing_title`, `formatted_amount` (INR), `city`, and image URIs.
- **Headers**: `Accept-Language: en-IN,en;q=0.9`, Indian `User-Agent`, and `Sec-Fetch-Mode: navigate` to align with Indian regional endpoints.

## Requirements

- Node.js 18+
- Network access to `olx.in` and `facebook.com`
