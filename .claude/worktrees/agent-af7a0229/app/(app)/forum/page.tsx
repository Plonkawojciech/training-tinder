'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import { PostCard } from '@/components/forum/post-card';

const CATEGORIES = [
  { value: 'all', label: 'Wszystko' },
  { value: 'training', label: 'Trening' },
  { value: 'nutrition', label: 'Żywienie' },
  { value: 'gear', label: 'Sprzęt' },
  { value: 'race-report', label: 'Race Reports' },
  { value: 'question', label: 'Pytania' },
];

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Ogólne' },
  { value: 'training', label: 'Trening' },
  { value: 'nutrition', label: 'Żywienie' },
  { value: 'gear', label: 'Sprzęt' },
  { value: 'race-report', label: 'Race Report' },
  { value: 'question', label: 'Pytanie' },
];

interface Post {
  id: number;
  userId: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export default function ForumPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New post form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const LIMIT = 20;
  const offset = useRef(0);

  const fetchPosts = useCallback(async (cat: string, reset: boolean) => {
    if (reset) {
      setLoading(true);
      offset.current = 0;
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        category: cat,
        limit: String(LIMIT),
        offset: String(offset.current),
      });
      const res = await fetch(`/api/forum/posts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      if (reset) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }
      setTotal(data.total);
      offset.current += data.posts.length;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(activeCategory, true);
  }, [activeCategory, fetchPosts]);

  const filteredPosts = searchQuery
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (newTitle.trim().length < 3) {
      setFormError('Tytuł musi mieć co najmniej 3 znaki');
      return;
    }
    if (newContent.trim().length < 10) {
      setFormError('Treść musi mieć co najmniej 10 znaków');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent, category: newCategory }),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? 'Wystąpił błąd');
        return;
      }

      // Reset form and close modal
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      setShowModal(false);
      // Refresh posts
      fetchPosts(activeCategory, true);
    } catch {
      setFormError('Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  }

  const hasMore = !searchQuery && posts.length < total;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-white">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest">Forum</h1>
            <p className="text-xs text-[#555555] mt-0.5">Społeczność treningowa</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] text-white text-xs font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all"
          >
            <Plus className="w-4 h-4" />
            Nowy post
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj postów..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white placeholder-[#555555] pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#7C3AED]/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border ${
                activeCategory === cat.value
                  ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                  : 'border-[var(--border)] text-[#555555] hover:border-[#444] hover:text-[#888]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[#444444] text-sm">Brak postów</p>
            <p className="text-[#333333] text-xs mt-1">Bądź pierwszy i dodaj wpis!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => fetchPosts(activeCategory, false)}
              disabled={loadingMore}
              className="px-6 py-3 border border-[var(--border)] text-[#888888] text-xs font-bold uppercase tracking-wider hover:border-[#7C3AED] hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              Załaduj więcej
            </button>
          </div>
        )}
      </div>

      {/* Create post modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black uppercase tracking-widest">Nowy post</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#555] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#555555] mb-1.5">
                  Tytuł
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="O czym chcesz napisać?"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white placeholder-[#444] px-4 py-3 text-sm focus:outline-none focus:border-[#7C3AED]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#555555] mb-1.5">
                  Kategoria
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#7C3AED]/50 transition-colors"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#555555] mb-1.5">
                  Treść
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Podziel się swoją wiedzą, doświadczeniem lub pytaniem..."
                  rows={6}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white placeholder-[#444] px-4 py-3 text-sm focus:outline-none focus:border-[#7C3AED]/50 transition-colors resize-none"
                />
                <p className="text-xs text-[#444] mt-1">{newContent.length} / min. 10 znaków</p>
              </div>

              {formError && (
                <p className="text-sm text-red-500 border border-red-900/50 bg-red-950/30 px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-[var(--border)] text-[#888888] text-xs font-bold uppercase tracking-wider hover:border-[#444] transition-all"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#7C3AED] text-white text-xs font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Opublikuj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
