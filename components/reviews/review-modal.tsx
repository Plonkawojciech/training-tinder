'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/lang';

interface ReviewModalProps {
  sessionId: number;
  sessionTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function ReviewModal({ sessionId, sessionTitle, isOpen, onClose, onSubmit }: ReviewModalProps) {
  const { t } = useLang();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit() {
    if (rating === 0) {
      setError(t('review_rating_required'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });

      if (res.ok) {
        // Simple inline toast via state
        onSubmit();
        onClose();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? t('review_submit_error'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl w-full max-w-md p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888888] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-display text-xl text-white tracking-wider mb-1">{t('review_rate_session')}</h2>
        <p className="text-[#888888] text-sm mb-6 truncate">{sessionTitle}</p>

        {/* Stars */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className="w-8 h-8 transition-colors"
                fill={(hovered || rating) >= star ? '#6366F1' : 'transparent'}
                stroke={(hovered || rating) >= star ? '#6366F1' : '#555555'}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="text-sm text-[#888888] ml-2">
              {rating === 1 && t('review_poor')}
              {rating === 2 && t('review_average')}
              {rating === 3 && t('review_ok')}
              {rating === 4 && t('review_very_good')}
              {rating === 5 && t('review_great')}
            </span>
          )}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('review_comment_placeholder')}
          rows={3}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-3xl px-3 py-2 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-[#6366F1] transition-colors resize-none mb-4"
        />

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={submitting}
          >
            {t('review_cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={rating === 0 || submitting}
            className="flex-1"
          >
            {t('review_submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
