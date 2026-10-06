import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  LogIn,
  LogOut,
  Search,
  ShoppingBag,
  Star,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  BLUEPRINT_CONSTRAINTS,
  CartItem,
  FeedbackData,
  INITIAL_FEEDBACKS,
  INITIAL_MENU_ITEMS,
  INITIAL_STOCK_LOGS,
  MenuCategory,
  MenuItemData,
  StockLogData,
} from './data/initialMenu';
import { ProductImage } from './components/ProductImage';
import { ConeBarConfigurator } from './components/ConeBarConfigurator';
import { CustomerFeedbackSection } from './components/CustomerFeedbackSection';
import { AdminDashboard } from './components/AdminDashboard';
import { OrderTrayDrawer } from './components/OrderTrayDrawer';

const LOCAL_STORAGE_MENU_KEY = 'cheran_foods_menu_v2';
const LOCAL_STORAGE_FEEDBACK_KEY = 'cheran_foods_feedback_v1';
const LOCAL_STORAGE_LOGS_KEY = 'cheran_foods_stock_logs_v1';

export default function App() {
  const [activeView, setActiveView] = useState<'STOREFRONT' | 'ADMIN'>('STOREFRONT');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isAdminRoleInDb, setIsAdminRoleInDb] = useState<boolean>(false);

  // Menu, Feedbacks, and Stock Logs state (initialized immediately for zero-latency UX)
  const [menuItems, setMenuItems] = useState<MenuItemData[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MENU_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage parse error
    }
    return INITIAL_MENU_ITEMS;
  });

  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_FEEDBACK_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage parse error
    }
    return INITIAL_FEEDBACKS;
  });

  const [stockLogs, setStockLogs] = useState<StockLogData[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage parse error
    }
    return INITIAL_STOCK_LOGS;
  });

  // Storefront Filter & Cart State
  const [selectedCategory, setSelectedCategory] = useState<
    MenuCategory | 'ALL' | 'LOW_STOCK'
  >('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC'>('DEFAULT');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Sync to localStorage as fallback cache
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(menuItems));
    } catch {
      // Ignore quota errors
    }
  }, [menuItems]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_FEEDBACK_KEY, JSON.stringify(feedbacks));
    } catch {
      // Ignore quota errors
    }
  }, [feedbacks]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(stockLogs));
    } catch {
      // Ignore quota errors
    }
  }, [stockLogs]);

  // Determine if current user has admin authority in Firestore
  const isCloudAdmin = Boolean(
    currentUser &&
      currentUser.emailVerified &&
      (currentUser.email === BLUEPRINT_CONSTRAINTS.BOOTSTRAPPED_ADMIN_EMAIL ||
        isAdminRoleInDb)
  );

  // 1. Track Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);

      if (user && user.emailVerified) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          setIsAdminRoleInDb(adminDoc.exists());
        } catch {
          setIsAdminRoleInDb(false);
        }
      } else {
        setIsAdminRoleInDb(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Attach Firestore listeners when Auth is ready and user is signed in
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    // Menu Items listener (Query Enforcer: where('priceInr', '>', 0))
    const menuQuery = query(
      collection(db, 'menuItems'),
      where('priceInr', '>', 0)
    );
    const unsubMenu = onSnapshot(
      menuQuery,
      async (snapshot) => {
        if (snapshot.empty) {
          // If signed in as bootstrapped admin and collection is empty, seed the 11 Cheran Foods items
          if (
            currentUser.emailVerified &&
            currentUser.email === BLUEPRINT_CONSTRAINTS.BOOTSTRAPPED_ADMIN_EMAIL
          ) {
            try {
              const batch = writeBatch(db);
              for (const item of INITIAL_MENU_ITEMS) {
                const itemRef = doc(db, 'menuItems', item.id);
                batch.set(itemRef, {
                  name: item.name,
                  category: item.category,
                  flavor: item.flavor,
                  description: item.description,
                  priceInr: item.priceInr,
                  stockCount: item.stockCount,
                  lowStockThreshold: item.lowStockThreshold,
                  unitLabel: item.unitLabel,
                  imageKey: item.imageKey,
                  isAvailable: item.isAvailable,
                  updatedByUid: currentUser.uid,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }
              await batch.commit();
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, 'menuItems');
            }
          }
          return;
        }

        const loadedItems: MenuItemData[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || ''),
            category: (data.category as MenuCategory) || 'Sticks & Bars',
            flavor: String(data.flavor || ''),
            description: String(data.description || ''),
            priceInr: Number(data.priceInr || 10),
            stockCount: Number(data.stockCount ?? 0),
            lowStockThreshold: Number(data.lowStockThreshold ?? 15),
            unitLabel: String(data.unitLabel || 'serving'),
            imageKey:
              (data.imageKey as 'sticks' | 'bars' | 'cones' | 'balls') || 'sticks',
            isAvailable: Boolean(data.isAvailable),
            updatedByUid: String(data.updatedByUid || ''),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

        // Sort in canonical parlor order (sticks -> cups -> bars -> cones -> balls)
        const orderMap = new Map(
          INITIAL_MENU_ITEMS.map((item, idx) => [item.id, idx])
        );
        loadedItems.sort((a, b) => {
          const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
          const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
          return idxA - idxB;
        });

        setMenuItems(loadedItems);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'menuItems');
      }
    );

    // Feedbacks listener (Query Enforcer: where('rating', '>=', 1))
    const feedbackQuery = query(
      collection(db, 'feedbacks'),
      where('rating', '>=', 1)
    );
    const unsubFeedback = onSnapshot(
      feedbackQuery,
      (snapshot) => {
        if (snapshot.empty) return;
        const loadedFeedbacks: FeedbackData[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            customerName: String(data.customerName || 'Guest'),
            favoriteItem: String(data.favoriteItem || 'Cheran Ice Cream'),
            rating: Number(data.rating || 5),
            comment: String(data.comment || ''),
            authorUid: String(data.authorUid || ''),
            createdAtLabel: 'Verified Cloud Review',
            createdAt: data.createdAt,
          };
        });
        setFeedbacks([...loadedFeedbacks, ...INITIAL_FEEDBACKS]);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'feedbacks');
      }
    );

    return () => {
      unsubMenu();
      unsubFeedback();
    };
  }, [isAuthReady, currentUser]);

  // 3. Attach StockLogs listener when signed in as Cloud Admin
  useEffect(() => {
    if (!isAuthReady || !currentUser || !isCloudAdmin) return;

    const logsQuery = query(
      collection(db, 'stockLogs'),
      where('adminUid', '==', currentUser.uid)
    );
    const unsubLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        if (snapshot.empty) return;
        const loadedLogs: StockLogData[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            itemId: String(data.itemId || ''),
            itemName: String(data.itemName || ''),
            actionType:
              (data.actionType as StockLogData['actionType']) || 'STOCK_ADJUST',
            previousPriceInr: Number(data.previousPriceInr || 0),
            newPriceInr: Number(data.newPriceInr || 0),
            previousStock: Number(data.previousStock || 0),
            newStock: Number(data.newStock || 0),
            note: String(data.note || ''),
            adminUid: String(data.adminUid || ''),
            createdAtLabel: 'Synced to Firestore',
            createdAt: data.createdAt,
          };
        });
        setStockLogs([...loadedLogs, ...INITIAL_STOCK_LOGS]);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'stockLogs');
      }
    );

    return () => unsubLogs();
  }, [isAuthReady, currentUser, isCloudAdmin]);

  // Sign In / Sign Out handlers
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In cancelled or failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-Out error:', error);
    }
  };

  // Cart Handlers
  const handleAddToCart = (item: MenuItemData, quantity = 1) => {
    if (!item.isAvailable || item.stockCount <= 0) return;
    setCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        const nextQty = Math.min(item.stockCount, existing.quantity + quantity);
        return prev.map((entry) =>
          entry.item.id === item.id ? { ...entry, quantity: nextQty } : entry
        );
      }
      return [...prev, { item, quantity: Math.min(item.stockCount, quantity) }];
    });
    setRecentlyAddedId(item.id);
    setTimeout(() => {
      setRecentlyAddedId((prev) => (prev === item.id ? null : prev));
    }, 1200);
  };

  const handleUpdateCartQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((entry) => entry.item.id !== itemId));
      return;
    }
    setCart((prev) =>
      prev.map((entry) =>
        entry.item.id === itemId ? { ...entry, quantity: newQty } : entry
      )
    );
  };

  const handleConfirmOrder = async (customerDetails: {
    name: string;
    phone: string;
    fulfillment: 'PARLOR_PICKUP' | 'LOCAL_DELIVERY';
  }): Promise<string> => {
    const tokenNumber = `CF-${Math.floor(1000 + Math.random() * 9000)}`;

    // Deduct ordered stock from menuItems locally
    const updatedMenu = menuItems.map((menuItem) => {
      const ordered = cart.find((c) => c.item.id === menuItem.id);
      if (!ordered) return menuItem;
      const nextStock = Math.max(0, menuItem.stockCount - ordered.quantity);
      return {
        ...menuItem,
        stockCount: nextStock,
        isAvailable: nextStock > 0 ? menuItem.isAvailable : false,
      };
    });
    setMenuItems(updatedMenu);

    // If signed in as Cloud Admin, also persist stock deduction to Firestore
    if (isCloudAdmin && currentUser) {
      try {
        const batch = writeBatch(db);
        for (const ordered of cart) {
          const currentItem = menuItems.find((m) => m.id === ordered.item.id);
          if (!currentItem) continue;
          const nextStock = Math.max(0, currentItem.stockCount - ordered.quantity);
          const itemRef = doc(db, 'menuItems', currentItem.id);
          batch.set(
            itemRef,
            {
              name: currentItem.name,
              category: currentItem.category,
              flavor: currentItem.flavor,
              description: currentItem.description,
              priceInr: currentItem.priceInr,
              stockCount: nextStock,
              lowStockThreshold: currentItem.lowStockThreshold,
              unitLabel: currentItem.unitLabel,
              imageKey: currentItem.imageKey,
              isAvailable: nextStock > 0 ? currentItem.isAvailable : false,
              updatedByUid: currentUser.uid,
              createdAt: currentItem.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: false }
          );
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'menuItems');
      }
    }

    // Add audit entry for order fulfillment
    const newLogs: StockLogData[] = cart.map((ordered, idx) => ({
      id: `log-order-${Date.now()}-${idx}`,
      itemId: ordered.item.id,
      itemName: ordered.item.name,
      actionType: 'STOCK_ADJUST',
      previousPriceInr: ordered.item.priceInr,
      newPriceInr: ordered.item.priceInr,
      previousStock: ordered.item.stockCount,
      newStock: Math.max(0, ordered.item.stockCount - ordered.quantity),
      note: `Order #${tokenNumber} (${customerDetails.name}) · -${ordered.quantity} units`,
      adminUid: currentUser?.uid || 'counter-pos',
      createdAtLabel: 'Just now',
    }));
    setStockLogs((prev) => [...newLogs, ...prev]);
    setCart([]);
    return tokenNumber;
  };

  // Admin: Update Stock and Price
  const handleUpdateStockAndPrice = async (
    itemId: string,
    newPriceInr: number,
    newStockCount: number,
    newLowStockThreshold: number,
    newIsAvailable: boolean,
    note: string
  ) => {
    const targetItem = menuItems.find((m) => m.id === itemId);
    if (!targetItem) return;

    const actionType: StockLogData['actionType'] =
      newPriceInr !== targetItem.priceInr
        ? 'PRICE_UPDATE'
        : newStockCount > targetItem.stockCount
        ? 'RESTOCK'
        : 'STOCK_ADJUST';

    // Update local state immediately
    setMenuItems((prev) =>
      prev.map((m) =>
        m.id === itemId
          ? {
              ...m,
              priceInr: newPriceInr,
              stockCount: newStockCount,
              lowStockThreshold: newLowStockThreshold,
              isAvailable: newIsAvailable,
            }
          : m
      )
    );

    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newLogEntry: StockLogData = {
      id: logId,
      itemId: targetItem.id,
      itemName: targetItem.name,
      actionType,
      previousPriceInr: targetItem.priceInr,
      newPriceInr,
      previousStock: targetItem.stockCount,
      newStock: newStockCount,
      note: note.slice(0, BLUEPRINT_CONSTRAINTS.LOG_NOTE_MAX),
      adminUid: currentUser?.uid || 'local-admin',
      createdAtLabel: 'Just now',
    };
    setStockLogs((prev) => [newLogEntry, ...prev]);

    // Sync to Firestore if signed in as Cloud Admin
    if (isCloudAdmin && currentUser) {
      try {
        const batch = writeBatch(db);
        const itemRef = doc(db, 'menuItems', itemId);
        const logRef = doc(db, 'stockLogs', logId);

        batch.set(itemRef, {
          name: targetItem.name.slice(0, BLUEPRINT_CONSTRAINTS.ITEM_NAME_MAX),
          category: targetItem.category,
          flavor: targetItem.flavor.slice(0, BLUEPRINT_CONSTRAINTS.FLAVOR_MAX),
          description: targetItem.description.slice(0, BLUEPRINT_CONSTRAINTS.DESC_MAX),
          priceInr: Number(newPriceInr),
          stockCount: Math.round(newStockCount),
          lowStockThreshold: Math.round(newLowStockThreshold),
          unitLabel: targetItem.unitLabel.slice(0, BLUEPRINT_CONSTRAINTS.UNIT_LABEL_MAX),
          imageKey: targetItem.imageKey,
          isAvailable: Boolean(newIsAvailable),
          updatedByUid: currentUser.uid,
          createdAt: targetItem.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(logRef, {
          itemId: targetItem.id,
          itemName: targetItem.name.slice(0, BLUEPRINT_CONSTRAINTS.ITEM_NAME_MAX),
          actionType,
          previousPriceInr: Number(targetItem.priceInr),
          newPriceInr: Number(newPriceInr),
          previousStock: Math.round(targetItem.stockCount),
          newStock: Math.round(newStockCount),
          note: note.slice(0, BLUEPRINT_CONSTRAINTS.LOG_NOTE_MAX),
          adminUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `menuItems/${itemId}`);
      }
    }
  };

  // Admin: Add New Ice Cream Item
  const handleAddNewMenuItem = async (
    newItem: Omit<MenuItemData, 'id' | 'updatedByUid'>
  ) => {
    const slugId =
      newItem.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) +
      '-' +
      Math.random().toString(36).slice(2, 6);

    const createdItem: MenuItemData = {
      ...newItem,
      id: slugId,
      updatedByUid: currentUser?.uid || 'local-admin',
    };

    setMenuItems((prev) => [...prev, createdItem]);

    const logId = `log-new-${Date.now()}`;
    const logEntry: StockLogData = {
      id: logId,
      itemId: slugId,
      itemName: createdItem.name,
      actionType: 'NEW_ITEM',
      previousPriceInr: createdItem.priceInr,
      newPriceInr: createdItem.priceInr,
      previousStock: 0,
      newStock: createdItem.stockCount,
      note: `Added new menu item at ₹${createdItem.priceInr} (${createdItem.stockCount} units)`,
      adminUid: currentUser?.uid || 'local-admin',
      createdAtLabel: 'Just now',
    };
    setStockLogs((prev) => [logEntry, ...prev]);

    if (isCloudAdmin && currentUser) {
      try {
        const batch = writeBatch(db);
        const itemRef = doc(db, 'menuItems', slugId);
        const logRef = doc(db, 'stockLogs', logId);

        batch.set(itemRef, {
          name: createdItem.name.slice(0, BLUEPRINT_CONSTRAINTS.ITEM_NAME_MAX),
          category: createdItem.category,
          flavor: createdItem.flavor.slice(0, BLUEPRINT_CONSTRAINTS.FLAVOR_MAX),
          description: createdItem.description.slice(0, BLUEPRINT_CONSTRAINTS.DESC_MAX),
          priceInr: Number(createdItem.priceInr),
          stockCount: Math.round(createdItem.stockCount),
          lowStockThreshold: Math.round(createdItem.lowStockThreshold),
          unitLabel: createdItem.unitLabel.slice(0, BLUEPRINT_CONSTRAINTS.UNIT_LABEL_MAX),
          imageKey: createdItem.imageKey,
          isAvailable: Boolean(createdItem.isAvailable),
          updatedByUid: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(logRef, {
          itemId: slugId,
          itemName: createdItem.name.slice(0, BLUEPRINT_CONSTRAINTS.ITEM_NAME_MAX),
          actionType: 'NEW_ITEM',
          previousPriceInr: Number(createdItem.priceInr),
          newPriceInr: Number(createdItem.priceInr),
          previousStock: 0,
          newStock: Math.round(createdItem.stockCount),
          note: logEntry.note.slice(0, BLUEPRINT_CONSTRAINTS.LOG_NOTE_MAX),
          adminUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `menuItems/${slugId}`);
      }
    }
  };

  // Admin: Reset Default Menu & Prices
  const handleResetDefaultCatalog = async () => {
    setMenuItems(INITIAL_MENU_ITEMS);
    localStorage.setItem(
      LOCAL_STORAGE_MENU_KEY,
      JSON.stringify(INITIAL_MENU_ITEMS)
    );

    if (isCloudAdmin && currentUser) {
      try {
        const batch = writeBatch(db);
        for (const item of INITIAL_MENU_ITEMS) {
          const itemRef = doc(db, 'menuItems', item.id);
          batch.set(itemRef, {
            name: item.name,
            category: item.category,
            flavor: item.flavor,
            description: item.description,
            priceInr: item.priceInr,
            stockCount: item.stockCount,
            lowStockThreshold: item.lowStockThreshold,
            unitLabel: item.unitLabel,
            imageKey: item.imageKey,
            isAvailable: item.isAvailable,
            updatedByUid: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'menuItems');
      }
    }
  };

  // Customer Feedback Submission
  const handleSubmitFeedback = async (payload: {
    customerName: string;
    favoriteItem: string;
    rating: number;
    comment: string;
  }) => {
    const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newEntry: FeedbackData = {
      id: feedbackId,
      customerName: payload.customerName.slice(
        0,
        BLUEPRINT_CONSTRAINTS.CUSTOMER_NAME_MAX
      ),
      favoriteItem: payload.favoriteItem.slice(
        0,
        BLUEPRINT_CONSTRAINTS.ITEM_NAME_MAX
      ),
      rating: Math.min(5, Math.max(1, Math.round(payload.rating))),
      comment: payload.comment.slice(0, BLUEPRINT_CONSTRAINTS.COMMENT_MAX),
      authorUid: currentUser?.uid || 'guest-reviewer',
      createdAtLabel: 'Just now',
    };

    // Always update state immediately
    setFeedbacks((prev) => [newEntry, ...prev]);

    // If signed in with verified email, persist to Firestore
    if (currentUser && currentUser.emailVerified) {
      try {
        await setDoc(doc(db, 'feedbacks', feedbackId), {
          customerName: newEntry.customerName,
          favoriteItem: newEntry.favoriteItem,
          rating: newEntry.rating,
          comment: newEntry.comment,
          authorUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `feedbacks/${feedbackId}`
        );
      }
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
    if (currentUser && currentUser.emailVerified && !feedbackId.startsWith('fb-seed-')) {
      try {
        await deleteDoc(doc(db, 'feedbacks', feedbackId));
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `feedbacks/${feedbackId}`
        );
      }
    }
  };

  const lowStockItemsCount = useMemo(
    () =>
      menuItems.filter(
        (item) =>
          item.isAvailable &&
          item.stockCount > 0 &&
          item.stockCount <= item.lowStockThreshold
      ).length,
    [menuItems]
  );

  // Filtered & Sorted Menu Items for Storefront
  const displayedMenuItems = useMemo(() => {
    const list = menuItems.filter((item) => {
      if (selectedCategory === 'LOW_STOCK') {
        const isLow =
          item.isAvailable &&
          item.stockCount > 0 &&
          item.stockCount <= item.lowStockThreshold;
        if (!isLow) return false;
      } else if (
        selectedCategory !== 'ALL' &&
        item.category !== selectedCategory
      ) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.flavor.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === 'PRICE_ASC') {
      return [...list].sort((a, b) => a.priceInr - b.priceInr);
    }
    if (sortBy === 'PRICE_DESC') {
      return [...list].sort((a, b) => b.priceInr - a.priceInr);
    }
    return list;
  }, [menuItems, selectedCategory, searchTerm, sortBy]);

  const totalCartItems = cart.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalCartInr = cart.reduce(
    (sum, entry) => sum + entry.item.priceInr * entry.quantity,
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#18181B]">
      {/* Strict Top Bar Contract: 3 Zones (Single-element Brand, 4 Nav Links, 2 Primary Actions) */}
      <header className="sticky top-0 z-40 h-16 bg-[#FAF8F5]/95 backdrop-blur-xs border-b border-[#E5E0D5] px-6 flex items-center justify-between">
        {/* Zone 1: Brand lockup with generated minimalist logo */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('STOREFRONT');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-[#18181B] whitespace-nowrap"
        >
          <span className="w-9 h-9 rounded-lg overflow-hidden border border-[#E5E0D5] bg-[#FAF8F5] shrink-0 flex items-center justify-center">
            <ProductImage
              imageKey="logo"
              alt="Cheran Foods Logo"
              className="w-full h-full object-cover"
            />
          </span>
          <span>Cheran Foods</span>
        </a>

        {/* Zone 2: 4 Clean Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]">
          <a
            href="#ice-cream-menu"
            onClick={() => setActiveView('STOREFRONT')}
            className={`hover:text-[#18181B] hover:underline underline-offset-4 transition-colors whitespace-nowrap ${
              activeView === 'STOREFRONT' ? 'text-[#18181B]' : ''
            }`}
          >
            Ice Cream Menu
          </a>
          <a
            href="#cone-bar"
            onClick={() => setActiveView('STOREFRONT')}
            className="hover:text-[#18181B] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Cone Flavours
          </a>
          <a
            href="#customer-feedback"
            onClick={() => setActiveView('STOREFRONT')}
            className="hover:text-[#18181B] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
          >
            Customer Ratings
          </a>
          <button
            type="button"
            onClick={() =>
              setActiveView((v) => (v === 'ADMIN' ? 'STOREFRONT' : 'ADMIN'))
            }
            className={`hover:text-[#18181B] hover:underline underline-offset-4 transition-colors whitespace-nowrap cursor-pointer ${
              activeView === 'ADMIN'
                ? 'text-[#C2410C] font-semibold underline'
                : ''
            }`}
          >
            Admin Dashboard
          </button>
        </nav>

        {/* Zone 3: 1–2 Primary Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="h-9 px-3 rounded-lg border border-[#D6D0C4] text-xs font-medium text-[#57534E] hover:text-[#18181B] hover:bg-[#EFECE6] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              title={`Signed in as ${currentUser.email}`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="h-9 px-3 rounded-lg border border-[#D6D0C4] text-xs font-medium text-[#18181B] hover:bg-[#EFECE6] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-[#C2410C]" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-[#18181B] text-[#FAF8F5] text-xs font-medium hover:bg-[#27272A] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#FDBA74]" />
            <span>Tray</span>
            <span className="font-mono tabular-nums">
              ({totalCartItems}) · ₹{totalCartInr}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar for Quick Switching */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-[#F5F1E8] border-b border-[#E5E0D5] text-xs font-medium">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveView('STOREFRONT')}
            className={`${
              activeView === 'STOREFRONT'
                ? 'text-[#C2410C] font-semibold'
                : 'text-[#57534E]'
            }`}
          >
            Ice Cream Menu
          </button>
          <a
            href="#customer-feedback"
            onClick={() => setActiveView('STOREFRONT')}
            className="text-[#57534E]"
          >
            Star Ratings
          </a>
        </div>
        <button
          type="button"
          onClick={() =>
            setActiveView((v) => (v === 'ADMIN' ? 'STOREFRONT' : 'ADMIN'))
          }
          className={`${
            activeView === 'ADMIN'
              ? 'text-[#C2410C] font-semibold'
              : 'text-[#18181B]'
          }`}
        >
          {activeView === 'ADMIN' ? '← Back to Shop' : 'Admin Dashboard →'}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === 'ADMIN' ? (
          <AdminDashboard
            menuItems={menuItems}
            stockLogs={stockLogs}
            isAdmin={isCloudAdmin}
            currentUserEmail={currentUser?.email}
            onSignIn={handleSignIn}
            onUpdateStockAndPrice={handleUpdateStockAndPrice}
            onAddNewMenuItem={handleAddNewMenuItem}
            onResetDefaultCatalog={handleResetDefaultCatalog}
          />
        ) : (
          <>
            {/* Section 1: Storefront Hero Showcase */}
            <section
              id="top"
              className="max-w-[1200px] mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
            >
              <div className="lg:col-span-6 space-y-6">
                {/* Clean Unboxed Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
                  <span className="font-medium text-[#C2410C]">
                    Artisanal Parlor & Cold Creamery
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Fresh Daily Batches</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-[#18181B]">
                    ₹10 to ₹50 Menu
                  </span>
                </div>

                <h1
                  className="text-3xl sm:text-5xl font-bold text-[#18181B] tracking-tight leading-[1.12]"
                  style={{ textWrap: 'balance' }}
                >
                  Handcrafted Fruit Sticks, Creamy Cups & Crunchy Cones.
                </h1>

                <p className="text-base text-[#57534E] leading-relaxed max-w-[58ch]">
                  Welcome to <strong className="font-semibold text-[#18181B]">Cheran Foods</strong>. From pocket-friendly ₹10 Grapes and Pineapple Sticks to ₹12 Vanilla Cups, ₹20 Chocobars and Mangobars, ₹30 Ice Cream Scoop Balls, and ₹50 Cones in Vanilla, Butterscotch, and Chocolate.
                </p>

                {/* Primary Hero Action + Quick Route to Admin Stock Console */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="#ice-cream-menu"
                    className="h-11 px-6 rounded-lg bg-[#C2410C] text-white text-sm font-medium hover:bg-[#9A3412] inline-flex items-center gap-2 whitespace-nowrap transition-colors"
                  >
                    <span>Explore Rupee Menu</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveView('ADMIN')}
                    className="h-11 px-5 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm font-medium text-[#18181B] hover:bg-[#EFECE6] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <span>Manage Stock & Prices</span>
                  </button>
                </div>

                {/* Claim-to-Proof Adjacency: Quick Price & Rating Proof */}
                <div className="pt-6 border-t border-[#E5E0D5] grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-xl font-mono tabular-nums font-semibold text-[#18181B]">
                      ₹10 – ₹50
                    </div>
                    <div className="text-xs text-[#78716C] mt-0.5">
                      Honest Indian Rupee Pricing
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-mono tabular-nums font-semibold text-[#18181B]">
                      {menuItems.length} Varieties
                    </div>
                    <div className="text-xs text-[#78716C] mt-0.5">
                      Sticks, Cups, Cones & Balls
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-mono tabular-nums font-semibold text-[#18181B] flex items-center gap-1">
                      <span>4.8</span>
                      <Star className="w-4 h-4 fill-[#D97706] text-[#D97706]" />
                    </div>
                    <div className="text-xs text-[#78716C] mt-0.5">
                      Customer Star Rating
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero 16:9 Studio Visual */}
              <div className="lg:col-span-6">
                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden border border-[#E5E0D5] bg-[#F3EFE6] shadow-xs">
                  <ProductImage
                    imageKey="hero"
                    alt="Cheran Foods Artisanal Ice Cream Counter Showcase"
                    title="Cheran Foods Ice Cream Showcase"
                    subtitle="Sticks · Cups · Cones · Ice Cream Balls"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Quick Menu Price Index Strip under Hero */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E] px-1">
                  <span>Grapes & Pineapple Stick: <strong className="font-mono text-[#18181B]">₹10</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Vanilla Cup: <strong className="font-mono text-[#18181B]">₹12</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Chocobar & Mangobar: <strong className="font-mono text-[#18181B]">₹20</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Balls: <strong className="font-mono text-[#18181B]">₹30</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Cones: <strong className="font-mono text-[#18181B]">₹50</strong></span>
                </div>
              </div>
            </section>

            {/* Section 2: Featured Ice Cream Menu Grid */}
            <section
              id="ice-cream-menu"
              className="max-w-[1200px] mx-auto px-6 py-12 border-t border-[#E5E0D5] space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="text-xs text-[#78716C] flex items-center gap-2 mb-1">
                    <span>Cheran Foods Parlour Menu</span>
                    <span aria-hidden="true">·</span>
                    <span>All Prices in Indian Rupees (₹)</span>
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl font-semibold text-[#18181B] tracking-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    Complete Ice Cream Menu
                  </h2>
                </div>

                {/* Interactive Category Filter Controls + Search + Sort */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg overflow-x-auto">
                    {(
                      [
                        { key: 'ALL', label: 'All Items' },
                        { key: 'Sticks & Bars', label: 'Sticks & Bars' },
                        { key: 'Cups', label: 'Cups' },
                        { key: 'Cones', label: 'Cones' },
                        { key: 'Ice Cream Balls', label: 'Balls' },
                        {
                          key: 'LOW_STOCK',
                          label: `Selling Fast (${lowStockItemsCount})`,
                        },
                      ] as const
                    ).map((tab) => {
                      const isLowTab = tab.key === 'LOW_STOCK';
                      const active = selectedCategory === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setSelectedCategory(tab.key)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                            active
                              ? isLowTab
                                ? 'bg-[#DC2626] text-white shadow-xs'
                                : 'bg-[#FAF8F5] text-[#18181B] shadow-xs'
                              : isLowTab
                              ? 'text-[#DC2626] hover:bg-[#FEE2E2]/60 font-semibold'
                              : 'text-[#57534E] hover:text-[#18181B]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search flavour..."
                      className="h-9 pl-8 pr-3 w-40 sm:w-48 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-xs text-[#18181B] focus:outline-none focus:border-[#C2410C]"
                    />
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC'
                      )
                    }
                    aria-label="Sort menu items"
                    className="h-9 px-2.5 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-xs text-[#18181B] focus:outline-none focus:border-[#C2410C]"
                  >
                    <option value="DEFAULT">Menu Order</option>
                    <option value="PRICE_ASC">Price: Low to High (₹)</option>
                    <option value="PRICE_DESC">Price: High to Low (₹)</option>
                  </select>
                </div>
              </div>

              {/* 3-Column Product Grid (References/1_ecommerce_retail.md) */}
              {displayedMenuItems.length === 0 ? (
                <div className="py-14 text-center border border-dashed border-[#D6D0C4] rounded-xl space-y-2">
                  <p className="text-sm font-medium text-[#18181B]">
                    No ice cream items match your current filter
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setSearchTerm('');
                    }}
                    className="text-xs font-medium text-[#C2410C] hover:underline cursor-pointer"
                  >
                    Reset menu filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                  {displayedMenuItems.map((item) => {
                    const isSoldOut = !item.isAvailable || item.stockCount <= 0;
                    const isLowStock =
                      !isSoldOut && item.stockCount <= item.lowStockThreshold;
                    const isRecentlyAdded = recentlyAddedId === item.id;
                    const inCartEntry = cart.find((c) => c.item.id === item.id);
                    const stockPercent =
                      item.lowStockThreshold > 0
                        ? Math.min(
                            100,
                            Math.max(
                              12,
                              Math.round(
                                (item.stockCount / item.lowStockThreshold) * 100
                              )
                            )
                          )
                        : 50;

                    return (
                      <article
                        key={item.id}
                        className={`group rounded-xl border overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-[2px] ${
                          isLowStock
                            ? 'border-[#DC2626] bg-[#FEF2F2]/45 ring-1 ring-[#DC2626]/20'
                            : 'border-[#E5E0D5] bg-[#FAF8F5]'
                        }`}
                      >
                        <div>
                          {/* 4:3 Product Image (65%-75% visual lead) */}
                          <div
                            className={`aspect-[4/3] w-full bg-[#F3EFE6] overflow-hidden border-b ${
                              isLowStock ? 'border-[#DC2626]/30' : 'border-[#E5E0D5]'
                            }`}
                          >
                            <ProductImage
                              imageKey={item.imageKey}
                              alt={`${item.name} - ${item.flavor}`}
                              title={item.name}
                              subtitle={item.flavor}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                            />
                          </div>

                          {/* Card Body */}
                          <div className="p-5 space-y-2.5">
                            {/* Clean Unboxed Metadata (Zero-Pill Discipline) */}
                            <div className="flex items-center justify-between gap-2 text-xs text-[#78716C]">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="uppercase tracking-wider">
                                  {item.category}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{item.flavor}</span>
                              </div>
                              <span
                                className={`font-mono tabular-nums shrink-0 flex items-center gap-1 ${
                                  isSoldOut
                                    ? 'text-[#78716C] line-through'
                                    : isLowStock
                                    ? 'text-[#DC2626] font-semibold'
                                    : 'text-[#57534E]'
                                }`}
                              >
                                {isSoldOut ? (
                                  <span>Sold Out</span>
                                ) : isLowStock ? (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                                    <span>Only {item.stockCount} left!</span>
                                  </>
                                ) : (
                                  <span>{item.stockCount} in stock</span>
                                )}
                              </span>
                            </div>

                            {/* Title & Tabular INR Price */}
                            <div className="flex items-baseline justify-between gap-3">
                              <h3
                                className={`text-base font-semibold ${
                                  isLowStock ? 'text-[#991B1B]' : 'text-[#18181B]'
                                }`}
                              >
                                {item.name}
                              </h3>
                              <span
                                className={`text-lg font-mono tabular-nums font-semibold shrink-0 ${
                                  isLowStock ? 'text-[#DC2626]' : 'text-[#18181B]'
                                }`}
                              >
                                ₹{item.priceInr}
                              </span>
                            </div>

                            <p className="text-xs text-[#57534E] leading-relaxed line-clamp-2">
                              {item.description}
                            </p>

                            {/* Low-Stock Urgency Bar when stock drops below lowStockThreshold */}
                            {isLowStock && (
                              <div className="pt-1.5 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-medium text-[#DC2626]">
                                  <span>Low Stock · Selling Fast</span>
                                  <span className="font-mono tabular-nums">
                                    {item.stockCount} / {item.lowStockThreshold} threshold
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-[#FECACA] rounded-xs overflow-hidden">
                                  <div
                                    className="h-full bg-[#DC2626] transition-all duration-200"
                                    style={{ width: `${stockPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Action */}
                        <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3">
                          <span
                            className={`text-xs font-mono tabular-nums ${
                              isLowStock ? 'text-[#991B1B] font-medium' : 'text-[#78716C]'
                            }`}
                          >
                            {item.unitLabel}
                            {inCartEntry ? ` · ${inCartEntry.quantity} in tray` : ''}
                          </span>

                          <button
                            type="button"
                            disabled={isSoldOut}
                            onClick={() => handleAddToCart(item, 1)}
                            className={`h-9 px-4 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                              isSoldOut
                                ? 'bg-[#E5E0D5] text-[#78716C] cursor-not-allowed'
                                : isRecentlyAdded
                                ? 'bg-[#15803D] text-white'
                                : isLowStock
                                ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                                : 'bg-[#18181B] text-[#FAF8F5] hover:bg-[#C2410C]'
                            }`}
                          >
                            {isRecentlyAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added</span>
                              </>
                            ) : isSoldOut ? (
                              <span>Out of Stock</span>
                            ) : isLowStock ? (
                              <span>Grab Now · ₹{item.priceInr}</span>
                            ) : (
                              <span>Add to Tray · ₹{item.priceInr}</span>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 3: Signature Crunchy Cone Bar (Vanilla, Butterscotch, Chocolate at ₹50) */}
            <ConeBarConfigurator
              menuItems={menuItems}
              onAddToCart={handleAddToCart}
            />

            {/* Section 4: Customer Feedback & Star Ratings */}
            <CustomerFeedbackSection
              feedbacks={feedbacks}
              menuItems={menuItems}
              currentUserUid={currentUser?.uid}
              currentUserName={currentUser?.displayName}
              isAdmin={isCloudAdmin}
              onSubmitFeedback={handleSubmitFeedback}
              onDeleteFeedback={handleDeleteFeedback}
            />
          </>
        )}
      </main>

      {/* Slide-Over Order Tray Drawer */}
      <OrderTrayDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onClearCart={() => setCart([])}
        onConfirmOrder={handleConfirmOrder}
      />

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E5E0D5] bg-[#F5F1E8] py-8 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#57534E]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-bold text-sm text-[#18181B]">
              Cheran Foods
            </span>
            <span aria-hidden="true">·</span>
            <span>Artisanal Ice Cream Parlour</span>
            <span aria-hidden="true">·</span>
            <span>All prices inclusive in Indian Rupees (₹)</span>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => {
                setActiveView('STOREFRONT');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#18181B] cursor-pointer"
            >
              Storefront Menu
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('ADMIN');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-[#18181B] cursor-pointer"
            >
              Admin Stock & Price Console
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
