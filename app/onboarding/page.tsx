'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import {
  Step1SportsBio,
  Step2Performance,
  Step2LocationAvailability,
  Step3PhotoOnly,
  type OnboardingData,
} from '@/components/onboarding/steps';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/lang';

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
  gymName: '',
  strengthLevel: '',
  trainingSplits: [],
  goals: [],
  athleteLevel: '',
  ftpWatts: '',
  vo2max: '',
  restingHr: '',
  maxHr: '',
  sportProfiles: {},
  age: '',
  gender: '',
  weightKg: '',
};

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLang();

  const STEPS = [
    { title: t('onboarding_basic_info'), subtitle: t('onboarding_basic_sub') },
    { title: t('onboarding_level'), subtitle: t('onboarding_level_sub') },
    { title: t('onboarding_location'), subtitle: t('onboarding_location_sub') },
    { title: t('onboarding_photo'), subtitle: t('onboarding_photo_sub') },
  ];

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
        city: data.city,
        availability: data.availability,
        avatarUrl: data.avatarUrl || null,
        goals: data.goals,
        age: data.age ? parseInt(data.age) : null,
        gender: data.gender || null,
        weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
        athleteLevel: data.athleteLevel || null,
        sportProfiles: Object.keys(data.sportProfiles).length > 0 ? data.sportProfiles : null,
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save profile');

      router.push('/dashboard');
    } catch {
      setError(t('onboarding_save_error'));
    } finally {
      setSubmitting(false);
    }
  }

  function getStepComponent() {
    if (step === 0) return <Step1SportsBio key={0} data={data} onChange={handleChange} />;
    if (step === 1) return <Step2Performance key={1} data={data} onChange={handleChange} />;
    if (step === 2) return <Step2LocationAvailability key={2} data={data} onChange={handleChange} />;
    return <Step3PhotoOnly key={3} data={data} onChange={handleChange} />;
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 className="font-display" style={{ fontSize: '1.75rem', color: 'var(--text)' }}>
            TRAIN<span style={{ color: '#6366F1' }}>MATE</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {t('onboarding_step')} {step + 1} {t('onboarding_of')} {STEPS.length}
          </p>
        </div>

        {/* Dot step indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '1.75rem',
          }}
        >
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? '24px' : '10px',
                height: '10px',
                borderRadius: '999px',
                background:
                  i === step
                    ? '#6366F1'
                    : i < step
                    ? '#FFFFFF'
                    : '#333333',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* Step card */}
        <div
          style={{
            background: 'rgba(18,18,18,0.95)',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: 'var(--text)' }}>
              {STEPS[step].title.toUpperCase()}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              {STEPS[step].subtitle}
            </p>
          </div>

          {getStepComponent()}

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '1rem' }}>{error}</p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4" />
              {t('onboarding_back')}
            </Button>

            {!isLastStep ? (
              <Button onClick={next} disabled={!canProceed()}>
                {t('onboarding_next')}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}>
                {t('onboarding_done')}
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: '0.7rem',
            marginTop: '1.25rem',
          }}
        >
          {t('onboarding_update_later')}
        </p>
      </div>
    </div>
  );
}
