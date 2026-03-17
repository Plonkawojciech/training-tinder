'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import {
  Step1SportsBio,
  Step2LocationAvailability,
  Step3PhotoOnly,
  type OnboardingData,
} from '@/components/onboarding/steps';
import { Button } from '@/components/ui/button';

const STEPS = [
  { title: 'Podstawowe info', subtitle: 'Wybierz sporty i opowiedz o sobie' },
  { title: 'Twoja lokalizacja', subtitle: 'Gdzie i kiedy trenujesz' },
  { title: 'Zdjęcie', subtitle: 'Dodaj zdjęcie profilowe' },
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
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save profile');

      router.push('/dashboard');
    } catch {
      setError('Nie udało się zapisać profilu. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  }

  function getStepComponent() {
    if (step === 0) return <Step1SportsBio key={0} data={data} onChange={handleChange} />;
    if (step === 1) return <Step2LocationAvailability key={1} data={data} onChange={handleChange} />;
    return <Step3PhotoOnly key={2} data={data} onChange={handleChange} />;
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
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
          <h1 className="font-display" style={{ fontSize: '1.75rem', color: '#FFFFFF' }}>
            TRAINING<span style={{ color: '#7C3AED' }}>TINDER</span>
          </h1>
          <p style={{ color: '#666666', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Krok {step + 1} z {STEPS.length}
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
                    ? '#7C3AED'
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
            border: '1px solid #1E1E1E',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.25rem', color: '#FFFFFF' }}>
              {STEPS[step].title.toUpperCase()}
            </h2>
            <p style={{ color: '#666666', fontSize: '0.8rem', marginTop: '0.2rem' }}>
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
              borderTop: '1px solid #1E1E1E',
            }}
          >
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ChevronLeft className="w-4 h-4" />
              Wstecz
            </Button>

            {!isLastStep ? (
              <Button onClick={next} disabled={!canProceed()}>
                Dalej
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting}>
                Gotowe
                <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            color: '#444444',
            fontSize: '0.7rem',
            marginTop: '1.25rem',
          }}
        >
          Możesz to zawsze zaktualizować w ustawieniach profilu
        </p>
      </div>
    </div>
  );
}
