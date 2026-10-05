import React, { useState } from 'react';
import { CheckCircle2, ShoppingBag, Trash2, X } from 'lucide-react';
import { CartItem } from '../data/initialMenu';

interface OrderTrayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onClearCart: () => void;
  onConfirmOrder: (customerDetails: {
    name: string;
    phone: string;
    fulfillment: 'PARLOR_PICKUP' | 'LOCAL_DELIVERY';
  }) => Promise<string>;
}

export const OrderTrayDrawer: React.FC<OrderTrayDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onClearCart,
  onConfirmOrder,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [fulfillment, setFulfillment] = useState<'PARLOR_PICKUP' | 'LOCAL_DELIVERY'>(
    'PARLOR_PICKUP'
  );
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const subtotalInr = cart.reduce(
    (sum, entry) => sum + entry.item.priceInr * entry.quantity,
    0
  );
  const totalItems = cart.reduce((sum, entry) => sum + entry.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const orderId = await onConfirmOrder({
        name: customerName.trim() || 'Walk-in Guest',
        phone: customerPhone.trim() || 'Counter Token',
        fulfillment,
      });
      setConfirmedOrderId(orderId);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
      <div className="w-full max-w-md bg-[#FAF8F5] h-full border-l border-[#E5E0D5] flex flex-col justify-between shadow-2xl">
        {/* Top Drawer Bar */}
        <div className="p-5 border-b border-[#E5E0D5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#C2410C]" />
            <h2 className="text-base font-semibold text-[#18181B]">
              Cheran Foods Order Tray ({totalItems})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrderId(null);
              onClose();
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#57534E] hover:bg-[#EFECE6] cursor-pointer"
            aria-label="Close order tray"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {confirmedOrderId ? (
            <div className="p-6 rounded-xl border border-[#16A34A]/30 bg-[#F0FDF4] space-y-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#16A34A] mx-auto" />
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase text-[#15803D]">
                  Token #{confirmedOrderId} Confirmed
                </div>
                <h3 className="text-lg font-semibold text-[#18181B]">
                  Order Sent to Cheran Foods Counter
                </h3>
                <p className="text-xs text-[#57534E]">
                  Live stock quantities have been updated automatically. Pay at parlor counter via UPI or Cash (₹).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrderId(null);
                  onClose();
                }}
                className="w-full h-10 rounded-lg bg-[#18181B] text-white text-xs font-medium hover:bg-[#27272A] cursor-pointer"
              >
                Back to Ice Cream Menu
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-sm font-medium text-[#18181B]">
                Your ice cream tray is empty
              </p>
              <p className="text-xs text-[#78716C] max-w-xs mx-auto">
                Add ₹10 Grapes or Pineapple Sticks, ₹12 Vanilla Cups, ₹20 Chocobars, ₹30 Ice Cream Balls, or ₹50 Crunchy Cones from the menu.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[#E5E0D5] border border-[#E5E0D5] rounded-xl bg-white">
                {cart.map(({ item, quantity }) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#18181B] truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#78716C] font-mono tabular-nums">
                        ₹{item.priceInr} × {quantity} ={' '}
                        <span className="font-semibold text-[#18181B]">
                          ₹{item.priceInr * quantity}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-[#D6D0C4] rounded-md bg-[#FAF8F5]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-xs font-mono hover:bg-[#EFECE6] cursor-pointer"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-xs font-mono tabular-nums font-semibold">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.id,
                              Math.min(item.stockCount, quantity + 1)
                            )
                          }
                          className="w-7 h-7 flex items-center justify-center text-xs font-mono hover:bg-[#EFECE6] cursor-pointer"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, 0)}
                        className="p-1.5 text-[#78716C] hover:text-[#DC2626] cursor-pointer"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Parlor Token Verification Form */}
              <form
                id="order-tray-form"
                onSubmit={handleCheckout}
                className="space-y-4 pt-2"
              >
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#EFECE6] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFulfillment('PARLOR_PICKUP')}
                    className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      fulfillment === 'PARLOR_PICKUP'
                        ? 'bg-[#FAF8F5] text-[#18181B] shadow-xs'
                        : 'text-[#57534E]'
                    }`}
                  >
                    Parlor Counter Pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillment('LOCAL_DELIVERY')}
                    className={`py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      fulfillment === 'LOCAL_DELIVERY'
                        ? 'bg-[#FAF8F5] text-[#18181B] shadow-xs'
                        : 'text-[#57534E]'
                    }`}
                  >
                    Ice-Box Local Delivery
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Customer Name (for Order Token)
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Senthil Kumar"
                    className="w-full h-9 px-3 rounded-lg border border-[#D6D0C4] bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +91 98400 12345"
                    className="w-full h-9 px-3 rounded-lg border border-[#D6D0C4] bg-white text-sm font-mono tabular-nums"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && !confirmedOrderId && (
          <div className="p-5 border-t border-[#E5E0D5] bg-[#F5F1E8] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#57534E]">Total Payable (INR)</span>
              <span className="text-xl font-mono tabular-nums font-semibold text-[#18181B]">
                ₹{subtotalInr}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClearCart}
                className="h-10 px-3 rounded-lg border border-[#D6D0C4] text-xs font-medium text-[#57534E] hover:text-[#18181B] cursor-pointer"
              >
                Clear
              </button>
              <button
                type="submit"
                form="order-tray-form"
                disabled={isProcessing}
                className="flex-1 h-10 rounded-lg bg-[#C2410C] text-white text-sm font-medium hover:bg-[#9A3412] cursor-pointer transition-colors"
              >
                {isProcessing
                  ? 'Confirming Token...'
                  : `Confirm Order · ₹${subtotalInr}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
