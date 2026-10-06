import React, { useEffect } from 'react';
import { FeedbackData, MenuItemData } from '../data/initialMenu';

interface SEOHeadProps {
  menuItems: MenuItemData[];
  feedbacks: FeedbackData[];
  isAdminRoute: boolean;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  menuItems,
  feedbacks,
  isAdminRoute,
}) => {
  useEffect(() => {
    const canonicalUrl = window.location.origin + window.location.pathname;

    // 1. Update Document Title
    document.title = isAdminRoute
      ? 'Cheran Foods – Staff Admin Console (Restricted)'
      : 'Cheran Foods – Artisanal Ice Cream Shop & Rupee Menu';

    // 2. Ensure Canonical Link Exists
    let canonicalLink = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    );
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 3. Ensure og:url Meta Tag Exists
    let ogUrlMeta = document.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]'
    );
    if (!ogUrlMeta) {
      ogUrlMeta = document.createElement('meta');
      ogUrlMeta.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrlMeta);
    }
    ogUrlMeta.setAttribute('content', canonicalUrl);

    // 4. Dynamically Sync JSON-LD Structured Data with Live Menu Prices & Ratings
    const totalReviews = feedbacks.length;
    const avgRating =
      totalReviews > 0
        ? (
            feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews
          ).toFixed(1)
        : '4.8';

    const prices = menuItems.map((m) => m.priceInr);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 10;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 50;

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'IceCreamShop',
      name: 'Cheran Foods',
      alternateName: 'Cheran Foods Artisanal Ice Cream Parlor',
      url: canonicalUrl,
      description:
        'Order fresh fruit sticks (₹10), vanilla cups (₹12), chocobars (₹20), ice cream balls (₹30), and crunchy cones (₹50) from Cheran Foods ice cream parlor.',
      priceRange: `₹${minPrice} - ₹${maxPrice}`,
      currenciesAccepted: 'INR',
      paymentAccepted: 'Cash, UPI',
      servesCuisine:
        'Ice Cream, Fruit Popsicles, Waffle Cones, Frozen Desserts',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating,
        reviewCount: String(Math.max(1, totalReviews)),
        bestRating: '5',
        worstRating: '1',
      },
      hasMenu: {
        '@type': 'Menu',
        name: 'Cheran Foods Indian Rupee Ice Cream Menu',
        hasMenuItem: menuItems.map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          description: item.description,
          offers: {
            '@type': 'Offer',
            price: String(item.priceInr),
            priceCurrency: 'INR',
            availability:
              item.isAvailable && item.stockCount > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
          },
        })),
      },
    };

    const scriptEl = document.getElementById('cheran-schema-ld');
    if (scriptEl) {
      scriptEl.textContent = JSON.stringify(schemaData);
    }
  }, [menuItems, feedbacks, isAdminRoute]);

  return null;
};
