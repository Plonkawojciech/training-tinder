'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserPlus, Check, X, Users, Search, UserCheck, MessageSquare } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useLang } from '@/lib/lang';
import { useSafeUser } from '@/lib/auth';

interface FriendRelation {
  id: number;
  requesterId: string;
  receiverId: string;
  status: string;
  otherUser: { clerkId: string; username: string | null; avatarUrl: string | null; city: string | null } | undefined;
}

export default function FriendsPage() {
  const { lang } = useLang();
  const { id: currentUserId } = useSafeUser();
  const [relations, setRelations] = useState<FriendRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ username: string | null } | null>(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => { fetchFriends(); }, []);

  async function fetchFriends() {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setRelations(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQ.trim()) return;
    setSearching(true); setSearchError(''); setSearchResult(null);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQ.trim() }),
      });
      const data = await res.json() as { ok?: boolean; targetUser?: { username: string | null }; error?: string };
      if (res.ok) { setSearchResult(data.targetUser ?? null); setSearchQ(''); fetchFriends(); }
      else setSearchError(data.error ?? 'Błąd');
    } finally { setSearching(false); }
  }

  async function handleAction(id: number, action: 'accept' | 'reject') {
    await fetch(`/api/friends/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    fetchFriends();
  }

  async function handleRemove(id: number) {
    await fetch(`/api/friends/${id}`, { method: 'DELETE' });
    fetchFriends();
  }

  const accepted = relations.filter(r => r.status === 'accepted');
  const pendingReceived = relations.filter(r => r.status === 'pending' && r.receiverId === currentUserId);
  const pendingSent = relations.filter(r => r.status === 'pending' && r.requesterId === currentUserId);

  const card = {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    padding: 20, marginBottom: 16,
  };
  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 0', borderBottom: '1px solid var(--border)',
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 0', paddingBottom: 'var(--page-pb)' }}>
      <h1 style={{ color: 'var(--text)', fontWeight: 800, fontSize: 24, marginBottom: 6 }}>
        {lang === 'pl' ? 'Znajomi' : 'Friends'}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        {lang === 'pl' ? 'Dodaj znajomych po nicku i śledź ich aktywności.' : 'Add friends by username and follow their activities.'}
      </p>

      {/* Add friend */}
      <div style={card}>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus style={{ width: 18, height: 18, color: '#6366F1' }} />
          {lang === 'pl' ? 'Dodaj znajomego' : 'Add a friend'}
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <input
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder={lang === 'pl' ? 'Wpisz nick...' : 'Enter username...'}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              borderRadius: 18, padding: '10px 14px',
              color: 'var(--text)', fontSize: 14, outline: 'none',
            }}
          />
          <button type="submit" disabled={searching || !searchQ.trim()} style={{
            padding: '10px 18px', borderRadius: 18,
            background: searchQ.trim() ? '#6366F1' : 'rgba(255,255,255,0.08)',
            border: 'none', color: 'white', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
          }}>
            <Search style={{ width: 15, height: 15 }} />
            {searching ? '...' : (lang === 'pl' ? 'Zaproś' : 'Invite')}
          </button>
        </form>
        {searchError && <p style={{ color: '#ff6b6b', fontSize: 13, marginTop: 8 }}>{searchError}</p>}
        {searchResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,230,118,0.08)', borderRadius: 18, border: '1px solid rgba(0,230,118,0.2)', color: '#00E676', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check style={{ width: 14, height: 14 }} />
            {lang === 'pl' ? `Zaproszenie wysłane do ${searchResult.username}` : `Invitation sent to ${searchResult.username}`}
          </div>
        )}
      </div>

      {/* Pending received */}
      {pendingReceived.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#6366F1', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>{pendingReceived.length}</span>
            {lang === 'pl' ? 'Zaproszenia' : 'Requests'}
          </div>
          {pendingReceived.map(r => (
            <div key={r.id} style={rowStyle}>
              <Avatar src={r.otherUser?.avatarUrl} fallback={r.otherUser?.username ?? '?'} size="sm" />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{r.otherUser?.username ?? 'Sportowiec'}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.otherUser?.city ?? ''}</div>
              </div>
              <button onClick={() => handleAction(r.id, 'accept')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check style={{ width: 15, height: 15, color: '#00E676' }} />
              </button>
              <button onClick={() => handleAction(r.id, 'reject')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 15, height: 15, color: '#ff6b6b' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friends list */}
      <div style={card}>
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users style={{ width: 18, height: 18, color: '#6366F1' }} />
          {lang === 'pl' ? `Znajomi (${accepted.length})` : `Friends (${accepted.length})`}
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {lang === 'pl' ? 'Ładowanie...' : 'Loading...'}
          </p>
        ) : accepted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            <UserCheck style={{ width: 32, height: 32, margin: '0 auto 10px', opacity: 0.3 }} />
            {lang === 'pl' ? 'Brak znajomych. Zaproś kogoś!' : 'No friends yet. Invite someone!'}
          </div>
        ) : (
          accepted.map(r => (
            <div key={r.id} style={rowStyle}>
              <Link href={`/profile/${r.otherUser?.clerkId}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <Avatar src={r.otherUser?.avatarUrl} fallback={r.otherUser?.username ?? '?'} size="sm" />
              </Link>
              <div style={{ flex: 1 }}>
                <Link href={`/profile/${r.otherUser?.clerkId}`} style={{ textDecoration: 'none' }}>
                  <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{r.otherUser?.username ?? 'Sportowiec'}</div>
                </Link>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.otherUser?.city ?? ''}</div>
              </div>
              <Link
                href={`/messages?partner=${r.otherUser?.clerkId}&name=${encodeURIComponent(r.otherUser?.username ?? '')}`}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <MessageSquare style={{ width: 14, height: 14, color: '#6366F1' }} />
              </Link>
              <button onClick={() => handleRemove(r.id)} style={{ padding: '4px 10px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                {lang === 'pl' ? 'Usuń' : 'Remove'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Sent pending */}
      {pendingSent.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 12, fontSize: 14 }}>
            {lang === 'pl' ? 'Wysłane zaproszenia' : 'Sent invitations'}
          </div>
          {pendingSent.map(r => (
            <div key={r.id} style={rowStyle}>
              <Avatar src={r.otherUser?.avatarUrl} fallback={r.otherUser?.username ?? '?'} size="sm" />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{r.otherUser?.username ?? 'Sportowiec'}</div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                {lang === 'pl' ? 'Oczekuje' : 'Pending'}
              </span>
              <button onClick={() => handleRemove(r.id)} style={{ padding: '4px 10px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                {lang === 'pl' ? 'Anuluj' : 'Cancel'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
