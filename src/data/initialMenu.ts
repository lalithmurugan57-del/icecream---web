const bundledImages = import.meta.glob<string>('../assets/images/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

function resolveAssetImage(filename: string, fallbackPath: string): string {
  for (const [key, url] of Object.entries(bundledImages)) {
    if (key.endsWith(filename)) {
      return url;
    }
  }
  return fallbackPath;
}

export type MenuCategory = 'Sticks & Bars' | 'Cups' | 'Cones' | 'Ice Cream Balls';

export interface MenuItemData {
  id: string;
  name: string;
  category: MenuCategory;
  flavor: string;
  description: string;
  priceInr: number;
  stockCount: number;
  lowStockThreshold: number;
  unitLabel: string;
  imageKey: 'sticks' | 'bars' | 'cones' | 'balls';
  isAvailable: boolean;
  updatedByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FeedbackData {
  id: string;
  customerName: string;
  favoriteItem: string;
  rating: number;
  comment: string;
  authorUid: string;
  createdAtLabel: string;
  createdAt?: unknown;
}

export interface StockLogData {
  id: string;
  itemId: string;
  itemName: string;
  actionType: 'RESTOCK' | 'PRICE_UPDATE' | 'STOCK_ADJUST' | 'NEW_ITEM';
  previousPriceInr: number;
  newPriceInr: number;
  previousStock: number;
  newStock: number;
  note: string;
  adminUid: string;
  createdAtLabel: string;
  createdAt?: unknown;
}

export interface CartItem {
  item: MenuItemData;
  quantity: number;
}

// Validation constants synchronized verbatim with firebase-blueprint.json
export const BLUEPRINT_CONSTRAINTS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX_LEN: 128,
  ITEM_NAME_MAX: 80,
  FLAVOR_MAX: 60,
  DESC_MAX: 300,
  UNIT_LABEL_MAX: 30,
  IMAGE_KEY_MAX: 60,
  PRICE_MIN: 1,
  PRICE_MAX: 10000,
  STOCK_MIN: 0,
  STOCK_MAX: 100000,
  CUSTOMER_NAME_MAX: 80,
  COMMENT_MAX: 600,
  LOG_NOTE_MAX: 200,
  BOOTSTRAPPED_ADMIN_EMAIL: 'lalithmurugan57@gmail.com',
} as const;

export const PRODUCT_IMAGES: Record<'logo' | 'hero' | 'sticks' | 'bars' | 'cones' | 'balls', string> = {
  logo: resolveAssetImage(
    'cheran_foods_logo_1791261882165.jpg',
    '/src/assets/images/cheran_foods_logo_1791261882165.jpg'
  ),
  hero: resolveAssetImage(
    'hero_cheran_icecream_1791217593477.jpg',
    '/src/assets/images/hero_cheran_icecream_1791217593477.jpg'
  ),
  sticks: resolveAssetImage(
    'item_fruit_sticks_1791217608442.jpg',
    '/src/assets/images/item_fruit_sticks_1791217608442.jpg'
  ),
  bars: resolveAssetImage(
    'item_choco_mango_bars_1791217621616.jpg',
    '/src/assets/images/item_choco_mango_bars_1791217621616.jpg'
  ),
  cones: resolveAssetImage(
    'item_trio_cones_1791217646665.jpg',
    '/src/assets/images/item_trio_cones_1791217646665.jpg'
  ),
  balls: resolveAssetImage(
    'item_icecream_balls_1791217658348.jpg',
    '/src/assets/images/item_icecream_balls_1791217658348.jpg'
  ),
};

export const INITIAL_MENU_ITEMS: MenuItemData[] = [
  {
    id: 'grapes-stick',
    name: 'Grapes Stick',
    category: 'Sticks & Bars',
    flavor: 'Tangy Black Grape',
    description: 'Refreshing juicy black grape ice pop crafted with real fruit crush on a classic wooden stick.',
    priceInr: 10,
    stockCount: 120,
    lowStockThreshold: 25,
    unitLabel: '65ml stick',
    imageKey: 'sticks',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'pineapple-stick',
    name: 'Pineapple Stick',
    category: 'Sticks & Bars',
    flavor: 'Tropical Pineapple',
    description: 'Sun-ripened golden pineapple ice stick with a bright tropical zing and crisp icy finish.',
    priceInr: 10,
    stockCount: 110,
    lowStockThreshold: 25,
    unitLabel: '65ml stick',
    imageKey: 'sticks',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'vanilla-cup',
    name: 'Vanilla Cup',
    category: 'Cups',
    flavor: 'Classic Madagascar Vanilla',
    description: 'Smooth, rich dairy vanilla ice cream served in a chilled parlor cup with wooden spoon.',
    priceInr: 12,
    stockCount: 140,
    lowStockThreshold: 30,
    unitLabel: '80ml cup',
    imageKey: 'balls',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'chocobar',
    name: 'Chocobar',
    category: 'Sticks & Bars',
    flavor: 'Dark Chocolate & Vanilla',
    description: 'Velvety vanilla cream core dipped in a snappy roasted cocoa and dark chocolate shell.',
    priceInr: 20,
    stockCount: 95,
    lowStockThreshold: 20,
    unitLabel: '75ml bar',
    imageKey: 'bars',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'mangobar',
    name: 'Mangobar',
    category: 'Sticks & Bars',
    flavor: 'Alphonso Mango Duet',
    description: 'Luscious Alphonso mango pulp jacket wrapped around a sweet dairy cream center.',
    priceInr: 20,
    stockCount: 12,
    lowStockThreshold: 20,
    unitLabel: '75ml bar',
    imageKey: 'bars',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'cone-vanilla',
    name: 'Cone — Vanilla',
    category: 'Cones',
    flavor: 'Vanilla',
    description: 'Baked crunchy sugar waffle cone lined with chocolate and crowned with creamy Vanilla bean.',
    priceInr: 50,
    stockCount: 64,
    lowStockThreshold: 15,
    unitLabel: '120ml cone',
    imageKey: 'cones',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'cone-butterscotch',
    name: 'Cone — Butterscotch',
    category: 'Cones',
    flavor: 'Butterscotch',
    description: 'Crispy waffle cone filled with golden Butterscotch ice cream and roasted cashew praline crunch.',
    priceInr: 50,
    stockCount: 72,
    lowStockThreshold: 15,
    unitLabel: '120ml cone',
    imageKey: 'cones',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'cone-chocolate',
    name: 'Cone — Chocolate',
    category: 'Cones',
    flavor: 'Chocolate',
    description: 'Crunchy waffle cone loaded with rich Belgian dark Chocolate ice cream and fudge drizzle.',
    priceInr: 50,
    stockCount: 9,
    lowStockThreshold: 15,
    unitLabel: '120ml cone',
    imageKey: 'cones',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'vanilla-ball',
    name: 'Vanilla Ball',
    category: 'Ice Cream Balls',
    flavor: 'Madagascar Vanilla',
    description: 'Generous hand-scooped artisan Vanilla ice cream ball with pure vanilla bean speckling.',
    priceInr: 30,
    stockCount: 80,
    lowStockThreshold: 18,
    unitLabel: '100g scoop ball',
    imageKey: 'balls',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'strawberry-ball',
    name: 'Strawberry Ball',
    category: 'Ice Cream Balls',
    flavor: 'Mahabaleshwar Strawberry',
    description: 'Creamy pink Strawberry ice cream ball churned with sweet-tart berry compote.',
    priceInr: 30,
    stockCount: 75,
    lowStockThreshold: 18,
    unitLabel: '100g scoop ball',
    imageKey: 'balls',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
  {
    id: 'mango-ball',
    name: 'Mango Ball',
    category: 'Ice Cream Balls',
    flavor: 'Ripe Alphonso Mango',
    description: 'Rich golden Mango ice cream ball bursting with authentic Ratnagiri Alphonso mango notes.',
    priceInr: 30,
    stockCount: 90,
    lowStockThreshold: 18,
    unitLabel: '100g scoop ball',
    imageKey: 'balls',
    isAvailable: true,
    updatedByUid: 'system-seed',
  },
];

export const INITIAL_FEEDBACKS: FeedbackData[] = [
  {
    id: 'fb-seed-1',
    customerName: 'Karthik Sundaram',
    favoriteItem: 'Cone — Butterscotch',
    rating: 5,
    comment:
      'Stopped by Cheran Foods with family after dinner. Switched from regular packed tubs to their fresh ₹50 Butterscotch Cone and ₹10 Grapes Stick — the cashew praline crunch and waffle crispness stayed intact till the last bite.',
    authorUid: 'seed-user-1',
    createdAtLabel: '2 hours ago',
  },
  {
    id: 'fb-seed-2',
    customerName: 'Divya Lakshmi R.',
    favoriteItem: 'Grapes Stick',
    rating: 5,
    comment:
      'Ordered 15 Grapes Sticks (₹10) and Pineapple Sticks (₹10) for our apartment kids meet. Authentic tangy fruit taste without artificial heaviness, and unbeatable pocket-friendly ₹10 pricing.',
    authorUid: 'seed-user-2',
    createdAtLabel: 'Yesterday',
  },
  {
    id: 'fb-seed-3',
    customerName: 'Meenakshi Narayanan',
    favoriteItem: 'Mango Ball',
    rating: 5,
    comment:
      'Tried the Mango Ball (₹30), Strawberry Ball (₹30), and Chocobar (₹20). The Alphonso mango richness feels like real fruit pulp churned into fresh cream.',
    authorUid: 'seed-user-3',
    createdAtLabel: '3 days ago',
  },
  {
    id: 'fb-seed-4',
    customerName: 'Prashanth V.',
    favoriteItem: 'Vanilla Cup',
    rating: 4,
    comment:
      'Classic Vanilla Cup at ₹12 and Mangobar at ₹20 are my daily afternoon treats. Super clean parlor counter and always well stocked.',
    authorUid: 'seed-user-4',
    createdAtLabel: '5 days ago',
  },
];

export const INITIAL_STOCK_LOGS: StockLogData[] = [
  {
    id: 'log-seed-1',
    itemId: 'grapes-stick',
    itemName: 'Grapes Stick',
    actionType: 'RESTOCK',
    previousPriceInr: 10,
    newPriceInr: 10,
    previousStock: 70,
    newStock: 120,
    note: 'Morning cold-storage batch #CF-104 (+50 sticks)',
    adminUid: 'system-seed',
    createdAtLabel: 'Today, 08:30 AM',
  },
  {
    id: 'log-seed-2',
    itemId: 'cone-butterscotch',
    itemName: 'Cone — Butterscotch',
    actionType: 'RESTOCK',
    previousPriceInr: 50,
    newPriceInr: 50,
    previousStock: 42,
    newStock: 72,
    note: 'Fresh waffle cone batch restocked (+30 cones)',
    adminUid: 'system-seed',
    createdAtLabel: 'Today, 09:00 AM',
  },
];
