'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import {
  Step1SportsBio,
  Step2Performance,
  Step3Location,
  Step4Photo,
  type OnboardingData,
} from '@/components/onboarding/steps';
import { Button } from '@/components/ui/button';

const STEPS = [
  { title: 'Sports & Bio', subtitle: 'Tell us about your athletic identity' },
  { title: 'Performance', subtitle: 'Your pace and training volume' },
  { title: 'Location & Time', subtitle: 'Where and when you train' },
  { title: 'Photo', subtitle: 'Put a face to your athlete profile' },
];

const initialData: OnboardingData = {
  username: '',
  bio: '',
  sportTypes: [],
  pacePerKm: '',
  weeklyKm: '',
  city: '',
  lat: '',
  lon: '',
  availability: [],
  avatarUrl: '',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleChange(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function canProceed(): boolean {
    if (step === 0) {
      return data.sportTypes.length > 0 && data.username.trim().length > 0;
    }
    return true;
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        username: data.username,
        bio: data.bio,
        sportTypes: data.sportTypes,
        pacePerKm: data.pacePerKm ? parseInt(data.pacePerKm) : null,
        weeklyKm: data.weeklyKm ? parseInt(data.weeklyKm) : null,
        city: data.city,
        lat: data.lat ? parseFloat(data.lat) : null,
        lon: data.lon ? parseFloat(data.lon) : null,
        availability: data.availability,
        avatarUrl: data.avatarUrl || null,
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save profile');

      router.push('/dashboard');
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const stepComponents = [
    <Step1SportsBio key="1" data={data} onChange={handleChange} />,
    <Step2Performance key="2" data={data} onChange={handleChange} />,
    <Step3Location key="3" data={data} onChange={handleChange} />,
    <Step4Photo key="4" data={data} onChange={handleChange} />,
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="font-display" style={{ fontSize: '2rem', color: 'var(--text)' }}>
            TRAINING<span style={{ color: 'var(--accent)' }}>TINDER</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Set up your athlete profile
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2rem' }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: i < step ? 'rgba(255,69,0,0.3)' : i === step ? '#FF4500' : '#1A1A1A',
                  border: i <= step ? '1px solid #FF4500' : '1px solid #2A2A2A',
                  transition: 'all 0.2s',
                }}
              >
                {i < step ? (
                  <Check style={{ width: '14px', height: '14px', color: '#FF4500' }} />
                ) : (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: i === step ? 'white' : '#888888',
                    }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    background: i < step ? '#FF4500' : '#2A2A2A',
                    transition: 'background 0.2s',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step card */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: '2rem',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
              {STEPS[step].title.toUpperCase()}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {STEPS[step].subtitle}
            </p>
          </div>

          {stepComponents[step]}

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '1rem' }}>{error}</p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <Button
              variant="ghost"
              onClick={back}
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}>
                Complete Setup
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            marginTop: '1.5rem',
          }}
        >
          Step {step + 1} of {STEPS.length} — You can always update this in your profile
        </p>
      </div>
    </div>
  );
}
