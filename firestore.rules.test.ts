/**
 * Phase 0 Payload-First Security TDD Specification for Cheran Foods Firestore Rules.
 * Verifies that all 12 "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof on Admin Menu Write',
    collectionPath: '/menuItems/grapes-stick',
    operation: 'update',
    auth: { uid: 'spoof1', email: 'lalithmurugan57@gmail.com', email_verified: false },
    payload: { priceInr: 15 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on MenuItem Create',
    collectionPath: '/menuItems/grapes-stick',
    operation: 'create',
    auth: { uid: 'admin1', email: 'lalithmurugan57@gmail.com', email_verified: true },
    payload: {
      name: 'Grapes Stick',
      category: 'Sticks & Bars',
      flavor: 'Black Grape',
      description: 'Tangy grape ice stick',
      priceInr: 10,
      stockCount: 100,
      lowStockThreshold: 20,
      unitLabel: 'stick',
      imageKey: 'sticks',
      isAvailable: true,
      updatedByUid: 'admin1',
      isSuperFeatured: true, // Ghost field
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Negative Price Poisoning on MenuItem Update',
    collectionPath: '/menuItems/chocobar',
    operation: 'update',
    auth: { uid: 'admin1', email: 'lalithmurugan57@gmail.com', email_verified: true },
    payload: { priceInr: -50 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unauthenticated Customer Feedback Creation',
    collectionPath: '/feedbacks/fb-1',
    operation: 'create',
    auth: null,
    payload: {
      customerName: 'Guest',
      favoriteItem: 'Chocobar',
      rating: 5,
      comment: 'Delicious!',
      authorUid: 'anon',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Customer Feedback (authorUid mismatch)',
    collectionPath: '/feedbacks/fb-2',
    operation: 'create',
    auth: { uid: 'userA', email: 'usera@example.com', email_verified: true },
    payload: {
      customerName: 'Arun',
      favoriteItem: 'Chocobar',
      rating: 5,
      comment: 'Great!',
      authorUid: 'userB',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Out-of-Bounds Star Rating (rating: 6)',
    collectionPath: '/feedbacks/fb-3',
    operation: 'create',
    auth: { uid: 'userA', email: 'usera@example.com', email_verified: true },
    payload: {
      customerName: 'Arun',
      favoriteItem: 'Mango Ball',
      rating: 6,
      comment: 'Extra stars!',
      authorUid: 'userA',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Resource Exhaustion String in Feedback (comment > 600 chars)',
    collectionPath: '/feedbacks/fb-4',
    operation: 'create',
    auth: { uid: 'userA', email: 'usera@example.com', email_verified: true },
    payload: {
      customerName: 'Arun',
      favoriteItem: 'Vanilla Cup',
      rating: 5,
      comment: 'A'.repeat(1200),
      authorUid: 'userA',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Forged Client Timestamp on Feedback Create',
    collectionPath: '/feedbacks/fb-5',
    operation: 'create',
    auth: { uid: 'userA', email: 'usera@example.com', email_verified: true },
    payload: {
      customerName: 'Arun',
      favoriteItem: 'Pineapple Stick',
      rating: 4,
      comment: 'Refreshing!',
      authorUid: 'userA',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Tampering (createdAt modified on MenuItem Update)',
    collectionPath: '/menuItems/vanilla-cup',
    operation: 'update',
    auth: { uid: 'admin1', email: 'lalithmurugan57@gmail.com', email_verified: true },
    payload: {
      priceInr: 14,
      createdAt: '2099-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned StockLog referencing non-existent MenuItem',
    collectionPath: '/stockLogs/log-999',
    operation: 'create',
    auth: { uid: 'admin1', email: 'lalithmurugan57@gmail.com', email_verified: true },
    payload: {
      itemId: 'non-existent-ghost-item',
      itemName: 'Ghost Stick',
      actionType: 'RESTOCK',
      previousPriceInr: 10,
      newPriceInr: 10,
      previousStock: 0,
      newStock: 50,
      note: 'Restocked ghost item',
      adminUid: 'admin1',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Self-Assigned Admin Privilege Escalation',
    collectionPath: '/admins/attackerUid',
    operation: 'create',
    auth: { uid: 'attackerUid', email: 'attacker@example.com', email_verified: true },
    payload: {
      role: 'admin',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Path ID Poisoning with Illegal Characters',
    collectionPath: '/menuItems/invalid$id!@#',
    operation: 'get',
    auth: { uid: 'userA', email: 'usera@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
