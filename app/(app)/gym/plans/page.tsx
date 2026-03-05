'use client';

import { useState, useEffect } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { PlanCard } from '@/components/gym/plan-card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { SPORTS, getSportColor } from '@/lib/utils';
import { X } from 'lucide-react';

interface Plan {
  id: number;
  title: string;
  description: string | null;
  sportType: string;
  difficulty: string;
  durationWeeks: number;
  creatorId: string;
  creator: { username: string | null; avatarUrl: string | null } | null;
}

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'elite'];
const GYM_SPORTS = SPORTS.filter((s) =>
  ['gym', 'powerlifting', 'crossfit', 'calisthenics', 'olympic_weightlifting', 'bodybuilding', 'hiit'].includes(s.value)
);

export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'mine'>('browse');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    sportType: '',
    difficulty: 'intermediate',
    durationWeeks: '8',
    isPublic: true,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPlans();
  }, [activeTab, sportFilter, difficultyFilter]);

  async function loadPlans() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'mine') params.set('mine', 'true');
      if (sportFilter) params.set('sport', sportFilter);
      if (difficultyFilter) params.set('difficulty', difficultyFilter);

      const res = await fetch(`/api/plans?${params}`);
      if (res.ok) setPlans(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.title || !form.sportType || !form.difficulty) return;
    setCreating(true);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          sportType: form.sportType,
          difficulty: form.difficulty,
          durationWeeks: parseInt(form.durationWeeks),
          isPublic: form.isPublic,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ title: '', description: '', sportType: '', difficulty: 'intermediate', durationWeeks: '8', isPublic: true });
        setActiveTab('mine');
        loadPlans();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wider">TRAINING PLANS</h1>
          <p className="text-[#888888] text-sm mt-1">Browse and share structured training programs</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Create Plan
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A2A2A] mb-4">
        {(['browse', 'mine'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-medium uppercase tracking-wider border-b-2 transition-all"
            style={
              activeTab === tab
                ? { borderColor: '#FF4500', color: '#FF4500' }
                : { borderColor: 'transparent', color: '#888888' }
            }
          >
            {tab === 'browse' ? 'Browse Plans' : 'My Plans'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-[#555555] uppercase tracking-wider">Filter:</span>
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="bg-[#111111] border border-[#2A2A2A] text-sm text-[#888888] px-2 py-1 focus:border-[#FF4500] focus:outline-none"
        >
          <option value="">All Sports</option>
          {SPORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="bg-[#111111] border border-[#2A2A2A] text-sm text-[#888888] px-2 py-1 focus:border-[#FF4500] focus:outline-none"
        >
          <option value="">All Levels</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
        {(sportFilter || difficultyFilter) && (
          <button
            onClick={() => { setSportFilter(''); setDifficultyFilter(''); }}
            className="text-xs text-[#FF4500] flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Plan grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 skeleton" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <BookOpen className="w-12 h-12 text-[#2A2A2A]" />
          <h3 className="font-display text-xl text-[#888888]">
            {activeTab === 'mine' ? 'NO PLANS CREATED' : 'NO PLANS FOUND'}
          </h3>
          <p className="text-[#888888] text-sm text-center max-w-sm">
            {activeTab === 'mine'
              ? 'Create your first training plan to share with the community'
              : 'No plans match your filters. Try changing the filters or create one!'}
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} {...plan} />
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#111111] border border-[#2A2A2A] w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-white tracking-wider">CREATE PLAN</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#888888] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label="Title *"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. 12-Week Powerlifting Program"
              />

              <Textarea
                label="Description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe the program goals, who it's for, what equipment is needed..."
              />

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                  Sport Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SPORTS.slice(8).map((sport) => {
                    const color = getSportColor(sport.value);
                    const isSelected = form.sportType === sport.value;
                    return (
                      <button
                        key={sport.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, sportType: sport.value }))}
                        className="p-2 border text-xs font-medium transition-all"
                        style={
                          isSelected
                            ? { borderColor: color, background: `${color}20`, color }
                            : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                        }
                      >
                        {sport.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#888888] block mb-2">
                  Difficulty *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DIFFICULTIES.map((d) => {
                    const colors: Record<string, string> = {
                      beginner: '#00CC44', intermediate: '#FFD700',
                      advanced: '#FF8800', elite: '#FF4500',
                    };
                    const color = colors[d];
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, difficulty: d }))}
                        className="p-2 border text-xs font-medium capitalize transition-all"
                        style={
                          form.difficulty === d
                            ? { borderColor: color, background: `${color}20`, color }
                            : { borderColor: '#2A2A2A', background: 'transparent', color: '#888888' }
                        }
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Input
                label="Duration (weeks)"
                type="number"
                min="1"
                max="52"
                value={form.durationWeeks}
                onChange={(e) => setForm((p) => ({ ...p, durationWeeks: e.target.value }))}
              />

              <div className="flex items-center justify-between p-3 border border-[#2A2A2A]">
                <span className="text-sm text-[#888888]">Make plan public</span>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isPublic: !p.isPublic }))}
                  className="w-10 h-5 transition-all relative"
                  style={{ background: form.isPublic ? '#FF4500' : '#2A2A2A' }}
                >
                  <div
                    className="w-4 h-4 bg-white absolute top-0.5 transition-all"
                    style={{ left: form.isPublic ? '22px' : '2px' }}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={creating} className="flex-1">
                <Plus className="w-4 h-4" />
                Create Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
