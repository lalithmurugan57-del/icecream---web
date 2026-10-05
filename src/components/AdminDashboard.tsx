import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import {
  BLUEPRINT_CONSTRAINTS,
  MenuCategory,
  MenuItemData,
  StockLogData,
} from '../data/initialMenu';

interface AdminDashboardProps {
  menuItems: MenuItemData[];
  stockLogs: StockLogData[];
  isAdmin: boolean;
  currentUserEmail?: string | null;
  onSignIn: () => Promise<void>;
  onUpdateStockAndPrice: (
    itemId: string,
    newPriceInr: number,
    newStockCount: number,
    newLowStockThreshold: number,
    newIsAvailable: boolean,
    note: string
  ) => Promise<void>;
  onAddNewMenuItem: (newItem: Omit<MenuItemData, 'id' | 'updatedByUid'>) => Promise<void>;
  onResetDefaultCatalog: () => Promise<void>;
}

interface RowDraft {
  priceInr: string;
  stockCount: string;
  addStockDelta: string;
  lowStockThreshold: string;
  isAvailable: boolean;
  note: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  menuItems,
  stockLogs,
  isAdmin,
  currentUserEmail,
  onSignIn,
  onUpdateStockAndPrice,
  onAddNewMenuItem,
  onResetDefaultCatalog,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<MenuCategory | 'ALL' | 'LOW_STOCK'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Menu Item State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<MenuCategory>('Sticks & Bars');
  const [newFlavor, setNewFlavor] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriceInr, setNewPriceInr] = useState('25');
  const [newStockCount, setNewStockCount] = useState('60');
  const [newLowThreshold, setNewLowThreshold] = useState('15');
  const [newUnitLabel, setNewUnitLabel] = useState('80ml serving');
  const [newImageKey, setNewImageKey] = useState<'sticks' | 'bars' | 'cones' | 'balls'>('sticks');
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  const getRowDraft = (item: MenuItemData): RowDraft => {
    if (drafts[item.id]) return drafts[item.id];
    return {
      priceInr: String(item.priceInr),
      stockCount: String(item.stockCount),
      addStockDelta: '0',
      lowStockThreshold: String(item.lowStockThreshold),
      isAvailable: item.isAvailable,
      note: '',
    };
  };

  const updateRowDraft = (item: MenuItemData, patch: Partial<RowDraft>) => {
    const current = getRowDraft(item);
    setDrafts((prev) => ({
      ...prev,
      [item.id]: { ...current, ...patch },
    }));
  };

  const handleQuickAddStock = (item: MenuItemData, delta: number) => {
    const current = getRowDraft(item);
    const baseStock = parseInt(current.stockCount, 10) || 0;
    const nextStock = Math.max(
      0,
      Math.min(BLUEPRINT_CONSTRAINTS.STOCK_MAX, baseStock + delta)
    );
    updateRowDraft(item, {
      stockCount: String(nextStock),
      isAvailable: nextStock > 0 ? true : current.isAvailable,
      note:
        delta > 0
          ? `Added +${delta} units to cold storage`
          : `Adjusted stock by ${delta} units`,
    });
  };

  const handleSaveRow = async (item: MenuItemData) => {
    setActionError(null);
    const draft = getRowDraft(item);
    const parsedPrice = Number(draft.priceInr);
    const parsedStock = parseInt(draft.stockCount, 10);
    const parsedThreshold = parseInt(draft.lowStockThreshold, 10);

    if (
      isNaN(parsedPrice) ||
      parsedPrice < BLUEPRINT_CONSTRAINTS.PRICE_MIN ||
      parsedPrice > BLUEPRINT_CONSTRAINTS.PRICE_MAX
    ) {
      setActionError(
        `Invalid price for ${item.name}. Must be between ₹1 and ₹10,000.`
      );
      return;
    }

    if (
      isNaN(parsedStock) ||
      parsedStock < BLUEPRINT_CONSTRAINTS.STOCK_MIN ||
      parsedStock > BLUEPRINT_CONSTRAINTS.STOCK_MAX
    ) {
      setActionError(
        `Invalid stock quantity for ${item.name}. Must be between 0 and 100,000.`
      );
      return;
    }

    const safeThreshold = isNaN(parsedThreshold)
      ? item.lowStockThreshold
      : Math.max(0, Math.min(10000, parsedThreshold));

    const autoNote =
      draft.note.trim() ||
      (parsedPrice !== item.priceInr && parsedStock !== item.stockCount
        ? `Updated price ₹${item.priceInr}→₹${parsedPrice} & stock ${item.stockCount}→${parsedStock}`
        : parsedPrice !== item.priceInr
        ? `Price modified from ₹${item.priceInr} to ₹${parsedPrice}`
        : `Stock updated from ${item.stockCount} to ${parsedStock} units`);

    setSavingId(item.id);
    try {
      await onUpdateStockAndPrice(
        item.id,
        parsedPrice,
        parsedStock,
        safeThreshold,
        draft.isAvailable,
        autoNote.slice(0, BLUEPRINT_CONSTRAINTS.LOG_NOTE_MAX)
      );
      // Clear custom draft after successful save
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setSavedId(item.id);
      setTimeout(() => {
        setSavedId((prev) => (prev === item.id ? null : prev));
      }, 1800);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to update stock and price.'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const trimmedName = newName.trim().slice(0, BLUEPRINT_CONSTRAINTS.ITEM_NAME_MAX);
    const trimmedFlavor = newFlavor.trim().slice(0, BLUEPRINT_CONSTRAINTS.FLAVOR_MAX);
    const trimmedDesc = newDescription.trim().slice(0, BLUEPRINT_CONSTRAINTS.DESC_MAX);
    const trimmedUnit = newUnitLabel.trim().slice(0, BLUEPRINT_CONSTRAINTS.UNIT_LABEL_MAX);
    const priceNum = Number(newPriceInr);
    const stockNum = parseInt(newStockCount, 10);
    const thresholdNum = parseInt(newLowThreshold, 10);

    if (!trimmedName || !trimmedFlavor || !trimmedDesc) {
      setActionError('Please complete item name, flavour, and description.');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0 || priceNum > 10000) {
      setActionError('Price must be between ₹1 and ₹10,000.');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0 || stockNum > 100000) {
      setActionError('Initial stock must be between 0 and 100,000.');
      return;
    }

    setIsCreatingItem(true);
    try {
      await onAddNewMenuItem({
        name: trimmedName,
        category: newCategory,
        flavor: trimmedFlavor,
        description: trimmedDesc,
        priceInr: priceNum,
        stockCount: stockNum,
        lowStockThreshold: isNaN(thresholdNum) ? 15 : thresholdNum,
        unitLabel: trimmedUnit || 'serving',
        imageKey: newImageKey,
        isAvailable: stockNum > 0,
      });
      setNewName('');
      setNewFlavor('');
      setNewDescription('');
      setShowAddForm(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to create new menu item.'
      );
    } finally {
      setIsCreatingItem(false);
    }
  };

  const summary = useMemo(() => {
    const totalSkus = menuItems.length;
    const totalUnits = menuItems.reduce((sum, item) => sum + item.stockCount, 0);
    const lowStockCount = menuItems.filter(
      (item) => item.stockCount <= item.lowStockThreshold
    ).length;
    const totalValueInr = menuItems.reduce(
      (sum, item) => sum + item.priceInr * item.stockCount,
      0
    );
    return { totalSkus, totalUnits, lowStockCount, totalValueInr };
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (categoryFilter === 'LOW_STOCK') {
        if (item.stockCount > item.lowStockThreshold) return false;
      } else if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.flavor.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [menuItems, categoryFilter, searchQuery]);

  return (
    <section className="max-w-[1280px] mx-auto px-6 py-10 space-y-8">
      {/* Workspace Top Bar Contract (Breadcrumbs Left, Actions Right) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E0D5]">
        <div>
          <div className="text-xs text-[#78716C] flex items-center gap-2 mb-1">
            <span>Cheran Foods</span>
            <span aria-hidden="true">/</span>
            <span className="text-[#18181B] font-medium">
              Admin Stock & Price Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#18181B] tracking-tight">
            Inventory & Rupee Price Management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!currentUserEmail ? (
            <button
              type="button"
              onClick={onSignIn}
              className="h-10 px-4 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-xs font-medium text-[#18181B] hover:bg-[#EFECE6] flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
            >
              <LogIn className="w-4 h-4 text-[#C2410C]" />
              <span>Sign in with Google for Cloud Sync</span>
            </button>
          ) : (
            <div className="text-xs text-[#57534E] flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E0D5] bg-[#F5F1E8]">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              <span>
                {isAdmin ? 'Verified Admin' : 'Signed In'} · {currentUserEmail}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onResetDefaultCatalog}
            className="h-10 px-4 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-xs font-medium text-[#57534E] hover:text-[#18181B] hover:bg-[#EFECE6] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restore Default Prices & Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="h-10 px-4 rounded-lg bg-[#C2410C] text-white text-xs font-medium hover:bg-[#9A3412] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Form' : 'Add Ice Cream Item'}</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Strip (Single-Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#E5E0D5] rounded-xl bg-[#FAF8F5] divide-y lg:divide-y-0 lg:divide-x divide-[#E5E0D5]">
        <div className="p-5">
          <div className="text-xs text-[#78716C]">Active Menu SKUs</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B] mt-1">
            {summary.totalSkus}
          </div>
          <div className="text-xs text-[#57534E] mt-1">
            Sticks, Cups, Cones & Balls
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#78716C]">Total Cold Storage Stock</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B] mt-1">
            {summary.totalUnits.toLocaleString('en-IN')} units
          </div>
          <div className="text-xs text-[#57534E] mt-1">
            Live parlor freezer count
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#78716C]">Stock Health Alerts</div>
          <div className="text-2xl font-mono tabular-nums font-semibold mt-1 flex items-center gap-2">
            {summary.lowStockCount > 0 ? (
              <>
                <AlertTriangle className="w-5 h-5 text-[#D97706]" />
                <span className="text-[#D97706]">
                  {summary.lowStockCount} Low Stock
                </span>
              </>
            ) : (
              <span className="text-[#16A34A]">0 Alerts · Optimal</span>
            )}
          </div>
          <div className="text-xs text-[#57534E] mt-1">
            Threshold monitored per SKU
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#78716C]">Total Inventory Value (INR)</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B] mt-1">
            ₹{summary.totalValueInr.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#57534E] mt-1">
            Calculated from current ₹ prices
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-lg border border-[#DC2626]/30 bg-[#FEF2F2] text-xs text-[#DC2626] font-medium flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Expandable Add New Menu Item Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateItem}
          className="p-6 rounded-xl border border-[#D6D0C4] bg-[#F5F1E8] space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E5E0D5] pb-3">
            <div>
              <h2 className="text-base font-semibold text-[#18181B]">
                Add New Ice Cream to Cheran Foods Menu
              </h2>
              <p className="text-xs text-[#57534E]">
                Specify Indian Rupee (₹) price, initial freezer stock count, and category.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Item Name
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_CONSTRAINTS.ITEM_NAME_MAX}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Pista Kulfi Stick"
                className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MenuCategory)}
                className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm"
              >
                <option value="Sticks & Bars">Sticks & Bars</option>
                <option value="Cups">Cups</option>
                <option value="Cones">Cones</option>
                <option value="Ice Cream Balls">Ice Cream Balls</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Flavour Profile
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_CONSTRAINTS.FLAVOR_MAX}
                value={newFlavor}
                onChange={(e) => setNewFlavor(e.target.value)}
                placeholder="e.g. Roasted Pistachio & Cardamom"
                className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Serving Unit Label
              </label>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_CONSTRAINTS.UNIT_LABEL_MAX}
                value={newUnitLabel}
                onChange={(e) => setNewUnitLabel(e.target.value)}
                placeholder="e.g. 70ml stick"
                className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Price in Indian Rupees (₹)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                required
                value={newPriceInr}
                onChange={(e) => setNewPriceInr(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                min={0}
                max={100000}
                required
                value={newStockCount}
                onChange={(e) => setNewStockCount(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                required
                value={newLowThreshold}
                onChange={(e) => setNewLowThreshold(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                Product Visual Style
              </label>
              <select
                value={newImageKey}
                onChange={(e) =>
                  setNewImageKey(
                    e.target.value as 'sticks' | 'bars' | 'cones' | 'balls'
                  )
                }
                className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm"
              >
                <option value="sticks">Fruit Sticks Showcase</option>
                <option value="bars">Choco & Mango Bars</option>
                <option value="cones">Waffle Cones Trio</option>
                <option value="balls">Cups & Ice Cream Balls</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#57534E] mb-1">
              Tasting Description
            </label>
            <input
              type="text"
              required
              maxLength={BLUEPRINT_CONSTRAINTS.DESC_MAX}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe the ingredients, texture, and serving style..."
              className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-10 px-4 rounded-lg border border-[#D6D0C4] text-xs font-medium text-[#57534E] hover:text-[#18181B] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingItem}
              className="h-10 px-5 rounded-lg bg-[#18181B] text-white text-xs font-medium hover:bg-[#27272A] cursor-pointer"
            >
              {isCreatingItem ? 'Saving Item...' : 'Create Menu Item'}
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'All Items' },
              { key: 'Sticks & Bars', label: 'Sticks & Bars' },
              { key: 'Cups', label: 'Cups' },
              { key: 'Cones', label: 'Cones (3 Flavours)' },
              { key: 'Ice Cream Balls', label: 'Ice Cream Balls' },
              { key: 'LOW_STOCK', label: `Low Stock (${summary.lowStockCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === tab.key
                  ? 'bg-[#FAF8F5] text-[#18181B] shadow-xs'
                  : 'text-[#57534E] hover:text-[#18181B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name or flavour..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-xs text-[#18181B] focus:outline-none focus:border-[#C2410C]"
          />
        </div>
      </div>

      {/* High-Density Stock & Price Management Data Grid */}
      <div className="border border-[#E5E0D5] rounded-xl bg-[#FAF8F5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E0D5] bg-[#F5F1E8] text-[11px] font-semibold text-[#57534E]">
                <th className="py-3 px-4">Ice Cream Item & Flavour</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Modify Price (₹ INR)</th>
                <th className="py-3 px-3 text-right">Current Stock</th>
                <th className="py-3 px-3">Quick Add Stock Batch</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Save Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D5] text-sm">
              {filteredItems.map((item) => {
                const draft = getRowDraft(item);
                const draftStockNum = parseInt(draft.stockCount, 10) || 0;
                const draftPriceNum = Number(draft.priceInr) || 0;
                const isLowStock = draftStockNum <= item.lowStockThreshold;
                const hasChanges =
                  draftPriceNum !== item.priceInr ||
                  draftStockNum !== item.stockCount ||
                  draft.isAvailable !== item.isAvailable;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[#F5F1E8]/60 transition-colors"
                  >
                    {/* Item Name & Flavour */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#18181B]">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#78716C]">
                        {item.flavor} · {item.unitLabel}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3 text-xs text-[#57534E] whitespace-nowrap">
                      {item.category}
                    </td>

                    {/* Price in INR Input */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center border border-[#D6D0C4] rounded-lg bg-white px-2.5 h-9 w-28 focus-within:border-[#C2410C]">
                        <span className="text-xs font-mono text-[#78716C] mr-1">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={draft.priceInr}
                          onChange={(e) =>
                            updateRowDraft(item, { priceInr: e.target.value })
                          }
                          aria-label={`Price in Rupees for ${item.name}`}
                          className="w-full text-right text-sm font-mono tabular-nums font-semibold text-[#18181B] focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Current Stock Input */}
                    <td className="py-3.5 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        value={draft.stockCount}
                        onChange={(e) =>
                          updateRowDraft(item, { stockCount: e.target.value })
                        }
                        aria-label={`Stock count for ${item.name}`}
                        className="h-9 w-24 px-2.5 text-right rounded-lg border border-[#D6D0C4] bg-white text-sm font-mono tabular-nums font-semibold text-[#18181B] focus:outline-none focus:border-[#C2410C]"
                      />
                    </td>

                    {/* Quick Add Stock Buttons */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {[10, 25, 50].map((batch) => (
                          <button
                            key={batch}
                            type="button"
                            onClick={() => handleQuickAddStock(item, batch)}
                            className="h-8 px-2.5 rounded-md border border-[#D6D0C4] bg-[#FAF8F5] hover:bg-[#EFECE6] text-xs font-mono tabular-nums font-medium text-[#18181B] whitespace-nowrap cursor-pointer transition-colors"
                          >
                            +{batch}
                          </button>
                        ))}
                      </div>
                    </td>

                    {/* Stock Health & Availability Toggle */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`avail-${item.id}`}
                          checked={draft.isAvailable && draftStockNum > 0}
                          onChange={(e) =>
                            updateRowDraft(item, {
                              isAvailable: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-[#C2410C] rounded cursor-pointer"
                        />
                        <label
                          htmlFor={`avail-${item.id}`}
                          className={`text-xs font-medium cursor-pointer ${
                            !draft.isAvailable || draftStockNum <= 0
                              ? 'text-[#DC2626]'
                              : isLowStock
                              ? 'text-[#D97706]'
                              : 'text-[#16A34A]'
                          }`}
                        >
                          {!draft.isAvailable || draftStockNum <= 0
                            ? 'Sold Out'
                            : isLowStock
                            ? `Low (${draftStockNum})`
                            : 'In Stock'}
                        </label>
                      </div>
                    </td>

                    {/* Save Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSaveRow(item)}
                        disabled={savingId === item.id}
                        className={`h-9 px-3.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                          savedId === item.id
                            ? 'bg-[#16A34A] text-white'
                            : hasChanges
                            ? 'bg-[#C2410C] text-white hover:bg-[#9A3412]'
                            : 'bg-[#EFECE6] text-[#18181B] hover:bg-[#E5E0D5]'
                        }`}
                      >
                        {savedId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved</span>
                          </>
                        ) : savingId === item.id ? (
                          <span>Saving...</span>
                        ) : (
                          <>
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>{hasChanges ? 'Apply Update' : 'Update'}</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock & Price Modification Audit Ledger */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#18181B]">
            Recent Stock & Price Audit Log ({stockLogs.length})
          </h2>
          <span className="text-xs text-[#78716C] font-mono tabular-nums">
            Live Inventory Ledger
          </span>
        </div>

        <div className="border border-[#E5E0D5] rounded-xl bg-[#FAF8F5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#F5F1E8] text-[#57534E] font-semibold">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-3">Ice Cream Item</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3 text-right">Price (₹)</th>
                  <th className="py-2.5 px-3 text-right">Stock Units</th>
                  <th className="py-2.5 px-4">Batch Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D5]">
                {stockLogs.slice(0, 12).map((log) => (
                  <tr key={log.id} className="hover:bg-[#F5F1E8]/40">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-[#78716C] whitespace-nowrap">
                      {log.createdAtLabel}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#18181B]">
                      {log.itemName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#57534E]">
                      {log.actionType}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      ₹{log.previousPriceInr} →{' '}
                      <span className="font-semibold text-[#18181B]">
                        ₹{log.newPriceInr}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {log.previousStock} →{' '}
                      <span className="font-semibold text-[#18181B]">
                        {log.newStock}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-[#57534E]">{log.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
