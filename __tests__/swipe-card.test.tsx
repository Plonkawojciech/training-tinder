// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock @/lib/lang
vi.mock('@/lib/lang', () => ({
  useLang: () => ({
    t: (key: string, _vars?: Record<string, string>) => key,
    lang: 'pl',
  }),
}));

// Mock lucide-react icons as simple spans with data-testid
vi.mock('lucide-react', () => ({
  MapPin: (props: Record<string, unknown>) => <span data-testid="icon-map-pin" {...props} />,
  Zap: (props: Record<string, unknown>) => <span data-testid="icon-zap" {...props} />,
  Route: (props: Record<string, unknown>) => <span data-testid="icon-route" {...props} />,
  CheckCircle: (props: Record<string, unknown>) => <span data-testid="icon-check-circle" {...props} />,
  X: (props: Record<string, unknown>) => <span data-testid="icon-x" {...props} />,
  Heart: (props: Record<string, unknown>) => <span data-testid="icon-heart" {...props} />,
  Star: (props: Record<string, unknown>) => <span data-testid="icon-star" {...props} />,
}));

import { SwipeCard, SwipeCardAthlete, SwipeCardProps } from '@/components/discover/swipe-card';

function createMockAthlete(overrides: Partial<SwipeCardAthlete> = {}): SwipeCardAthlete {
  return {
    authEmail: 'test@example.com',
    username: 'jan_kowalski',
    avatarUrl: 'https://example.com/avatar.jpg',
    bio: 'Passionate cyclist and runner from Warsaw',
    sportTypes: ['cycling', 'running'],
    pacePerKm: 300,
    weeklyKm: 120,
    city: 'Warszawa',
    stravaVerified: false,
    profileSongUrl: null,
    ftpWatts: 280,
    ...overrides,
  };
}

function createMockProps(overrides: Partial<SwipeCardProps> = {}): SwipeCardProps {
  return {
    athlete: createMockAthlete(),
    score: 85,
    distanceKm: 5.2,
    onLike: vi.fn(),
    onPass: vi.fn(),
    onSuperLike: vi.fn(),
    isTop: true,
    ...overrides,
  };
}

describe('SwipeCard', () => {
  it('renders athlete name/username', () => {
    const props = createMockProps();
    render(<SwipeCard {...props} />);

    expect(screen.getByText('jan_kowalski')).toBeInTheDocument();
  });

  it('renders sport type badges', () => {
    const props = createMockProps({
      athlete: createMockAthlete({ sportTypes: ['cycling', 'running', 'swimming'] }),
    });
    render(<SwipeCard {...props} />);

    // getSportLabel defaults to Polish labels
    expect(screen.getByText('Kolarstwo')).toBeInTheDocument();
    expect(screen.getByText('Bieganie')).toBeInTheDocument();
    expect(screen.getByText('Pływanie')).toBeInTheDocument();
  });

  it('renders match score percentage', () => {
    const props = createMockProps({ score: 92 });
    render(<SwipeCard {...props} />);

    // The score is rendered as "{score}% {t('discover_match_pct')}"
    expect(screen.getByText('92% discover_match_pct')).toBeInTheDocument();
  });

  it('renders bio if provided', () => {
    const props = createMockProps({
      athlete: createMockAthlete({ bio: 'Love trail running in the mountains' }),
    });
    render(<SwipeCard {...props} />);

    expect(screen.getByText('Love trail running in the mountains')).toBeInTheDocument();
  });

  it('renders city/location', () => {
    const props = createMockProps({
      athlete: createMockAthlete({ city: 'Krakow' }),
    });
    render(<SwipeCard {...props} />);

    expect(screen.getByText(/Krakow/)).toBeInTheDocument();
  });

  it('renders Strava verified badge when stravaVerified is true', () => {
    const props = createMockProps({
      athlete: createMockAthlete({ stravaVerified: true }),
    });
    render(<SwipeCard {...props} />);

    expect(screen.getByText('Strava')).toBeInTheDocument();
    expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
  });

  it('does not render Strava badge when not verified', () => {
    const props = createMockProps({
      athlete: createMockAthlete({ stravaVerified: false }),
    });
    render(<SwipeCard {...props} />);

    expect(screen.queryByText('Strava')).not.toBeInTheDocument();
  });

  it('renders avatar/photo image when avatarUrl is provided', () => {
    const props = createMockProps({
      athlete: createMockAthlete({ avatarUrl: 'https://example.com/photo.jpg' }),
    });
    render(<SwipeCard {...props} />);

    const img = screen.getByAltText('jan_kowalski');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('has correct aria-label for accessibility', () => {
    const props = createMockProps({
      athlete: createMockAthlete({
        username: 'anna_biegacz',
        sportTypes: ['running', 'trail_running'],
      }),
    });
    render(<SwipeCard {...props} />);

    // aria-label format: "Profil: {username}, {sportLabels joined}"
    const card = screen.getByLabelText(/Profil: anna_biegacz/);
    expect(card).toBeInTheDocument();
    // The aria-label should include sport labels (Polish defaults from getSportLabel)
    expect(card.getAttribute('aria-label')).toContain('Bieganie');
    expect(card.getAttribute('aria-label')).toContain('Trail Running');
  });

  it('renders stats info (FTP, pace, weekly km)', () => {
    const props = createMockProps({
      athlete: createMockAthlete({
        sportTypes: ['cycling'],
        ftpWatts: 310,
        weeklyKm: 250,
      }),
    });
    render(<SwipeCard {...props} />);

    // FTP is shown for cycling sports
    expect(screen.getByText('310 W FTP')).toBeInTheDocument();
    // Weekly km is rendered as "{weeklyKm} km/wk"
    expect(screen.getByText('250 km/wk')).toBeInTheDocument();
  });
});
