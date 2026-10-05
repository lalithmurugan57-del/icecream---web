import React, { useState, useMemo } from 'react';
import { Star, Send, CheckCircle2, Trash2 } from 'lucide-react';
import {
  BLUEPRINT_CONSTRAINTS,
  FeedbackData,
  MenuItemData,
} from '../data/initialMenu';

interface CustomerFeedbackSectionProps {
  feedbacks: FeedbackData[];
  menuItems: MenuItemData[];
  currentUserUid?: string | null;
  currentUserName?: string | null;
  isAdmin: boolean;
  onSubmitFeedback: (feedback: {
    customerName: string;
    favoriteItem: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
  onDeleteFeedback?: (feedbackId: string) => Promise<void>;
}

export const CustomerFeedbackSection: React.FC<CustomerFeedbackSectionProps> = ({
  feedbacks,
  menuItems,
  currentUserUid,
  currentUserName,
  isAdmin,
  onSubmitFeedback,
  onDeleteFeedback,
}) => {
  const [customerName, setCustomerName] = useState<string>(
    currentUserName || ''
  );
  const [favoriteItem, setFavoriteItem] = useState<string>(
    menuItems[0]?.name || 'Grapes Stick'
  );
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [starFilter, setStarFilter] = useState<number | 'ALL'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync default name when user logs in
  React.useEffect(() => {
    if (currentUserName && !customerName) {
      setCustomerName(currentUserName.slice(0, BLUEPRINT_CONSTRAINTS.CUSTOMER_NAME_MAX));
    }
  }, [currentUserName]);

  const stats = useMemo(() => {
    const total = feedbacks.length;
    if (total === 0) {
      return {
        average: '0.0',
        total: 0,
        counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      };
    }
    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbacks.forEach((f) => {
      const r = Math.min(5, Math.max(1, Math.round(f.rating)));
      counts[r] = (counts[r] || 0) + 1;
    });
    return {
      average: (sum / total).toFixed(1),
      total,
      counts,
    };
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    if (starFilter === 'ALL') return feedbacks;
    return feedbacks.filter((f) => Math.round(f.rating) === starFilter);
  }, [feedbacks, starFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = customerName
      .trim()
      .slice(0, BLUEPRINT_CONSTRAINTS.CUSTOMER_NAME_MAX);
    const trimmedComment = comment
      .trim()
      .slice(0, BLUEPRINT_CONSTRAINTS.COMMENT_MAX);
    const trimmedItem = favoriteItem
      .trim()
      .slice(0, BLUEPRINT_CONSTRAINTS.ITEM_NAME_MAX);

    if (!trimmedName) {
      setErrorMessage('Please enter your name before submitting.');
      return;
    }
    if (!trimmedComment) {
      setErrorMessage('Please share a short note about your ice cream experience.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setErrorMessage('Please choose a star rating between 1 and 5.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitFeedback({
        customerName: trimmedName,
        favoriteItem: trimmedItem,
        rating,
        comment: trimmedComment,
      });
      setComment('');
      setRating(5);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not save feedback right now. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="customer-feedback"
      className="py-16 px-6 max-w-[1200px] mx-auto border-t border-[#E5E0D5]"
    >
      {/* Header & Quantitative Rating Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-[#E5E0D5]">
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs text-[#78716C] flex items-center gap-2">
            <span>Customer Taste Log</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {stats.total} Verified Parlour Ratings
            </span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-semibold text-[#18181B] tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            Customer Feedback & Star Ratings
          </h2>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Honest ratings from guests enjoying our ₹10 fruit sticks, ₹12 cups, ₹20 bars, ₹30 scoops, and ₹50 crunchy cones.
          </p>

          {/* Aggregate Star Score */}
          <div className="pt-2 flex items-baseline gap-4">
            <span className="text-4xl font-mono tabular-nums font-semibold text-[#18181B]">
              {stats.average}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-1" aria-label={`Average rating ${stats.average} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(Number(stats.average))
                        ? 'fill-[#D97706] text-[#D97706]'
                        : 'text-[#D6D0C4]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#78716C] font-mono tabular-nums">
                Out of 5.0 stars across {stats.total} reviews
              </p>
            </div>
          </div>

          {/* 5-Star Distribution Bars */}
          <div className="space-y-1.5 pt-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.counts[star] || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-mono tabular-nums text-[#57534E]">
                    {star} star
                  </span>
                  <div className="flex-1 h-2 bg-[#EBE6DC] rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-[#D97706] transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono tabular-nums text-[#78716C]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Submit Customer Feedback Form */}
        <div className="lg:col-span-7 bg-[#F5F1E8] border border-[#E5E0D5] rounded-xl p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold text-[#18181B]">
              Rate Your Cheran Foods Ice Cream
            </h3>
            <span className="text-xs text-[#78716C] font-mono tabular-nums">
              1 to 5 Stars
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star Picker */}
            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1.5">
                Your Star Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="w-10 h-10 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] flex items-center justify-center hover:border-[#D97706] transition-colors cursor-pointer"
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          active
                            ? 'fill-[#D97706] text-[#D97706]'
                            : 'text-[#A8A29E]'
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs font-mono tabular-nums text-[#57534E]">
                  {rating} / 5 Stars
                  {rating === 5
                    ? ' · Excellent'
                    : rating === 4
                    ? ' · Very Good'
                    : rating === 3
                    ? ' · Good'
                    : rating === 2
                    ? ' · Fair'
                    : ' · Needs Improvement'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="feedback-customer-name"
                  className="block text-xs font-medium text-[#57534E] mb-1"
                >
                  Your Name
                </label>
                <input
                  id="feedback-customer-name"
                  type="text"
                  required
                  maxLength={BLUEPRINT_CONSTRAINTS.CUSTOMER_NAME_MAX}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Anitha Krishnan"
                  className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm text-[#18181B] focus:outline-none focus:border-[#C2410C]"
                />
              </div>

              <div>
                <label
                  htmlFor="feedback-favorite-item"
                  className="block text-xs font-medium text-[#57534E] mb-1"
                >
                  Ice Cream Tasted
                </label>
                <select
                  id="feedback-favorite-item"
                  value={favoriteItem}
                  onChange={(e) => setFavoriteItem(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm text-[#18181B] focus:outline-none focus:border-[#C2410C]"
                >
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name} (₹{item.priceInr})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="feedback-comment"
                  className="block text-xs font-medium text-[#57534E]"
                >
                  Your Feedback
                </label>
                <span className="text-xs font-mono tabular-nums text-[#78716C]">
                  {comment.length}/{BLUEPRINT_CONSTRAINTS.COMMENT_MAX}
                </span>
              </div>
              <textarea
                id="feedback-comment"
                rows={3}
                required
                maxLength={BLUEPRINT_CONSTRAINTS.COMMENT_MAX}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us what you loved about the flavour, freshness, or price..."
                className="w-full p-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-sm text-[#18181B] focus:outline-none focus:border-[#C2410C]"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-[#DC2626] font-medium">{errorMessage}</p>
            )}

            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-xs text-[#78716C]">
                {currentUserUid
                  ? 'Signed in · Review syncs to live parlor database'
                  : 'Instant review submission active'}
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 rounded-lg bg-[#C2410C] text-white text-sm font-medium hover:bg-[#9A3412] disabled:opacity-50 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
              >
                {submitSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Thank You! Rating Saved</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmitting ? 'Posting Review...' : 'Submit Star Rating'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Filter Controls & Reviews List */}
      <div className="pt-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-[#18181B]">
            Recent Customer Reviews ({filteredFeedbacks.length})
          </h3>

          {/* Interactive Filter Controls */}
          <div className="flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setStarFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                starFilter === 'ALL'
                  ? 'bg-[#FAF8F5] text-[#18181B] shadow-xs'
                  : 'text-[#57534E] hover:text-[#18181B]'
              }`}
            >
              All ({feedbacks.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setStarFilter(star)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap font-mono tabular-nums transition-colors cursor-pointer ${
                  starFilter === star
                    ? 'bg-[#FAF8F5] text-[#18181B] shadow-xs'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                {star} ★ ({stats.counts[star] || 0})
              </button>
            ))}
          </div>
        </div>

        {filteredFeedbacks.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#D6D0C4] rounded-xl">
            <p className="text-sm text-[#57534E]">
              No reviews match the selected star filter yet.
            </p>
            <button
              type="button"
              onClick={() => setStarFilter('ALL')}
              className="mt-3 text-xs font-medium text-[#C2410C] hover:underline cursor-pointer"
            >
              Show all customer reviews
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFeedbacks.map((fb) => {
              const canDelete =
                isAdmin || (currentUserUid && fb.authorUid === currentUserUid);
              return (
                <article
                  key={fb.id}
                  className="p-6 rounded-xl border border-[#E5E0D5] bg-[#FAF8F5] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex items-center gap-1"
                        aria-label={`Rated ${fb.rating} out of 5 stars`}
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= fb.rating
                                ? 'fill-[#D97706] text-[#D97706]'
                                : 'text-[#D6D0C4]'
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 text-xs font-mono tabular-nums font-semibold text-[#18181B]">
                          {fb.rating}.0
                        </span>
                      </div>

                      {canDelete && onDeleteFeedback && (
                        <button
                          type="button"
                          onClick={() => onDeleteFeedback(fb.id)}
                          className="text-xs text-[#78716C] hover:text-[#DC2626] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Delete feedback"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-[#18181B] leading-relaxed">
                      “{fb.comment}”
                    </p>
                  </div>

                  {/* Clean Unboxed Metadata (Zero-Pill Discipline) */}
                  <div className="pt-3 border-t border-[#EFECE6] flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
                    <span className="font-semibold text-[#18181B]">
                      {fb.customerName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Tasted {fb.favoriteItem}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {fb.createdAtLabel}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
