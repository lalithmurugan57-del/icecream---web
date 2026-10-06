import React, { useState } from 'react';
import { Check, Clock, Copy, Globe, MapPin, ShieldCheck, Search } from 'lucide-react';

export interface OrderRecord {
  token: string;
  customerName: string;
  phone: string;
  fulfillment: 'PARLOR_PICKUP' | 'LOCAL_DELIVERY';
  totalInr: number;
  itemsSummary: string;
  createdAtLabel: string;
}

interface ParlourInfoSectionProps {
  recentOrders: OrderRecord[];
}

export const ParlourInfoSection: React.FC<ParlourInfoSectionProps> = ({
  recentOrders,
}) => {
  const [tokenQuery, setTokenQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const siteUrl =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : 'https://cheranfoods.app';

  const matchedOrder = tokenQuery.trim()
    ? recentOrders.find(
        (o) =>
          o.token.toLowerCase() === tokenQuery.trim().toLowerCase() ||
          o.customerName.toLowerCase().includes(tokenQuery.trim().toLowerCase())
      )
    : recentOrders[0];

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(siteUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <section
      id="parlour-story"
      className="py-14 px-6 max-w-[1200px] mx-auto border-t border-[#E5E0D5]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Parlour Craftsmanship & Hours */}
        <div className="lg:col-span-7 space-y-6">
          <div className="text-xs text-[#78716C] flex items-center gap-2">
            <span>About Cheran Foods</span>
            <span aria-hidden="true">·</span>
            <span>Daily Small-Batch Cold Creamery</span>
          </div>

          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#18181B] tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            Pure Dairy, Real Fruit Pulp & Everyday Indian Rupee Prices
          </h2>

          <p className="text-sm text-[#57534E] leading-relaxed max-w-[65ch]">
            Cheran Foods crafts refreshing fruit ice sticks, rich chocolate-dipped bars, parlor cups, crispy waffle cones, and generous scoop balls every morning. Our cold-storage counter maintains strict temperature control so every ₹10 stick and ₹50 cone tastes fresh from the churn.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-[#E5E0D5] bg-[#F5F1E8]/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
                <Clock className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Parlour Hours</span>
              </div>
              <p className="text-xs text-[#57534E] font-mono tabular-nums">
                10:00 AM – 10:30 PM
              </p>
              <p className="text-[11px] text-[#78716C]">Open all 7 days</p>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E0D5] bg-[#F5F1E8]/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
                <MapPin className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Counter & Ice-Box</span>
              </div>
              <p className="text-xs text-[#57534E]">
                Instant Pickup & Local Delivery
              </p>
              <p className="text-[11px] text-[#78716C]">
                Dry-ice insulated packing
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E0D5] bg-[#F5F1E8]/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>100% Hygienic Batch</span>
              </div>
              <p className="text-xs text-[#57534E]">
                RO Water & Grade-A Dairy
              </p>
              <p className="text-[11px] text-[#78716C]">
                UPI & Cash (₹ INR) accepted
              </p>
            </div>
          </div>
        </div>

        {/* Right: Order Token Tracker & Google Search / Direct Web Link Card */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Order Token Tracker */}
          <div className="p-6 rounded-xl border border-[#E5E0D5] bg-[#F5F1E8] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#18181B]">
                Check Your Parlor Order Token
              </h3>
              <span className="text-xs font-mono tabular-nums text-[#78716C]">
                {recentOrders.length} active tokens
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tokenQuery}
                onChange={(e) => setTokenQuery(e.target.value)}
                placeholder="Enter token (e.g. CF-1042) or name..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-xs text-[#18181B] focus:outline-none focus:border-[#C2410C]"
              />
            </div>

            {matchedOrder ? (
              <div className="p-3.5 rounded-lg border border-[#E5E0D5] bg-[#FAF8F5] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[#C2410C]">
                    #{matchedOrder.token} · {matchedOrder.customerName}
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-[#18181B]">
                    ₹{matchedOrder.totalInr}
                  </span>
                </div>
                <p className="text-xs text-[#57534E] truncate">
                  {matchedOrder.itemsSummary}
                </p>
                <div className="text-[11px] text-[#16A34A] font-medium">
                  Status: Ready at Counter · {matchedOrder.createdAtLabel}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#78716C]">
                Place an order from the tray to receive an instant parlor token (#CF-XXXX).
              </p>
            )}
          </div>

          {/* Search Engine & Browser Share Card */}
          <div className="p-5 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#18181B]">
              <Globe className="w-4 h-4 text-[#C2410C]" />
              <span>Cheran Foods — Direct Browser & Search Link</span>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              Indexed with Google Schema.org <code className="font-mono">IceCreamShop</code> structured data so customers searching <strong>Cheran Foods</strong> see your live ₹10–₹50 menu and star ratings.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={siteUrl}
                aria-label="Cheran Foods website link"
                className="flex-1 h-9 px-3 rounded-lg border border-[#D6D0C4] bg-[#F5F1E8] text-xs font-mono text-[#57534E] truncate"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="h-9 px-3 rounded-lg bg-[#18181B] text-white text-xs font-medium hover:bg-[#27272A] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
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
