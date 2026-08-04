import type { MetadataRoute } from "next";

/**
 * Nothing here is for the public. The site had no robots.txt at all, so every
 * page was fair game for a crawler, which meant the stockist list and shipment
 * history could end up in a search index and outlive any later fix.
 *
 * This is a request, not a control: a crawler that ignores robots.txt is not
 * stopped by it. The actual gate is the deployment protection and, after that,
 * the team login.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
