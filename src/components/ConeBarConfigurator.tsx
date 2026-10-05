import React, { useState } from 'react';
import { Check, Plus, ShoppingBag } from 'lucide-react';
import { MenuItemData } from '../data/initialMenu';
import { ProductImage } from './ProductImage';

interface ConeBarConfiguratorProps {
  menuItems: MenuItemData[];
  onAddToCart: (item: MenuItemData, quantity: number) => void;
}

export const ConeBarConfigurator: React.FC<ConeBarConfiguratorProps> = ({
  menuItems,
  onAddToCart,
}) => {
  const coneItems = menuItems.filter((item) => item.category === 'Cones');
  const [selectedConeId, setSelectedConeId] = useState<string>(
    coneItems[0]?.id || 'cone-butterscotch'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  const activeCone =
    coneItems.find((c) => c.id === selectedConeId) || coneItems[0];

  if (!activeCone) return null;

  const isOutOfStock = !activeCone.isAvailable || activeCone.stockCount <= 0;
  const maxQty = Math.max(1, Math.min(20, activeCone.stockCount));

  const handleAddCone = () => {
    if (isOutOfStock) return;
    onAddToCart(activeCone, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <section
      id="cone-bar"
      className="border-y border-[#E5E0D5] bg-[#F5F1E8]/70 py-14 px-6"
    >
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Image Column */}
        <div className="lg:col-span-5">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#E5E0D5] bg-[#FAF8F5]">
            <ProductImage
              imageKey="cones"
              alt={activeCone.name}
              title={activeCone.name}
              subtitle={activeCone.flavor}
              className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.02]"
            />
          </div>
        </div>

        {/* Right Interactive Flavour Selector */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="text-xs text-[#78716C] flex items-center gap-2 mb-2">
              <span>Signature Crunchy Waffle Cones</span>
              <span aria-hidden="true">·</span>
              <span>3 Classic Flavours</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#18181B] font-semibold">
                ₹{activeCone.priceInr} per cone
              </span>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-semibold text-[#18181B] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Cheran Crunchy Cone Bar — Choose Your Flavour
            </h2>
            <p className="text-sm sm:text-base text-[#57534E] mt-2 max-w-[65ch] leading-relaxed">
              Every Cheran Foods cone is baked fresh for maximum crunch, lined with rich roasted cocoa, and topped with a generous scoop of your chosen flavour.
            </p>
          </div>

          {/* Interactive Flavour Tabs */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#57534E]">
              Select Cone Flavour ({coneItems.length} options available)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {coneItems.map((cone) => {
                const selected = cone.id === activeCone.id;
                const soldOut = !cone.isAvailable || cone.stockCount <= 0;
                return (
                  <button
                    key={cone.id}
                    type="button"
                    onClick={() => {
                      setSelectedConeId(cone.id);
                      setQuantity(1);
                    }}
                    className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#18181B] text-[#FAF8F5] border-[#18181B]'
                        : 'bg-[#FAF8F5] text-[#18181B] border-[#DFD9CE] hover:border-[#18181B]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold whitespace-nowrap truncate">
                        {cone.flavor}
                      </span>
                      <span
                        className={`text-sm font-mono tabular-nums font-semibold ${
                          selected ? 'text-[#FDBA74]' : 'text-[#C2410C]'
                        }`}
                      >
                        ₹{cone.priceInr}
                      </span>
                    </div>
                    <div
                      className={`text-xs mt-1 font-mono tabular-nums ${
                        selected ? 'text-[#D6D3D1]' : 'text-[#78716C]'
                      }`}
                    >
                      {soldOut ? 'Out of stock' : `${cone.stockCount} cones in stock`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Flavour Details & Contiguous Purchase Action */}
          <div className="pt-4 border-t border-[#E5E0D5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[#18181B]">
                {activeCone.name} ({activeCone.unitLabel})
              </div>
              <p className="text-xs text-[#57534E] mt-0.5 max-w-md">
                {activeCone.description}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-[#D6D0C4] rounded-lg bg-[#FAF8F5]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={isOutOfStock || quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center text-sm font-mono text-[#18181B] hover:bg-[#EFECE6] disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Decrease cone quantity"
                >
                  −
                </button>
                <span className="w-9 text-center text-sm font-mono tabular-nums font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={isOutOfStock || quantity >= maxQty}
                  className="w-10 h-10 flex items-center justify-center text-sm font-mono text-[#18181B] hover:bg-[#EFECE6] disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Increase cone quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddCone}
                disabled={isOutOfStock}
                className={`h-10 px-5 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isOutOfStock
                    ? 'bg-[#E5E0D5] text-[#78716C] cursor-not-allowed'
                    : justAdded
                    ? 'bg-[#15803D] text-white'
                    : 'bg-[#C2410C] text-white hover:bg-[#9A3412]'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added · ₹{activeCone.priceInr * quantity}</span>
                  </>
                ) : isOutOfStock ? (
                  <span>Out of Stock</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      Add to Tray · ₹{activeCone.priceInr * quantity}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
