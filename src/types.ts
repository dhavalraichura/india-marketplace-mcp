import { z } from 'zod';

export const ListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  price_inr: z.string().optional(),
  price_raw: z.string().optional(),
  description: z.string().optional(),
  location: z.string(),
  url: z.string(),
  image_urls: z.array(z.string()).optional(),
  source: z.enum(['olx.in', 'facebook_marketplace_in']).optional(),
  seller: z.string().optional(),
  date: z.string().optional(),
});

export const SearchResultSchema = z.object({
  listings: z.array(ListingSchema),
  total_estimate: z.number().optional(),
  source: z.string(),
  query: z.string().optional(),
});

export type Listing = z.infer<typeof ListingSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
