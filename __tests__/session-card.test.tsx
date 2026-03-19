// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/link as a simple <a> tag
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useLang to return translation keys as-is
vi.mock('@/lib/lang', () => ({
  useLang: () => ({ t: (key: string) => key, lang: 'pl' }),
}));

// Mock lucide-react icons as simple divs with data-testid
vi.mock('lucide-react', () => ({
  Calendar: (props: Record<string, unknown>) => <div data-testid="icon-calendar" {...props} />,
  MapPin: (props: Record<string, unknown>) => <div data-testid="icon-mappin" {...props} />,
  Users: (props: Record<string, unknown>) => <div data-testid="icon-users" {...props} />,
  Clock: (props: Record<string, unknown>) => <div data-testid="icon-clock" {...props} />,
}));

import { SessionCard } from '@/components/sessions/session-card';

const defaultProps = {
  id: 42,
  title: 'Morning Run in the Park',
  sportType: 'running',
  date: '2026-04-01',
  time: '07:00',
  location: 'Central Park, Warsaw',
  maxParticipants: 10,
  participantCount: 6,
  status: 'active',
};

describe('SessionCard', () => {
  it('renders session title', () => {
    render(<SessionCard {...defaultProps} />);
    expect(screen.getByText('Morning Run in the Park')).toBeInTheDocument();
  });

  it('renders sport type badge/text', () => {
    render(<SessionCard {...defaultProps} />);
    // getSportLabel('running', 'pl') returns 'Bieganie'
    expect(screen.getByText('Bieganie')).toBeInTheDocument();
  });

  it('renders date and time', () => {
    render(<SessionCard {...defaultProps} />);
    expect(screen.getByText('2026-04-01')).toBeInTheDocument();
    expect(screen.getByText('07:00')).toBeInTheDocument();
  });

  it('renders location when provided', () => {
    render(<SessionCard {...defaultProps} />);
    expect(screen.getByText('Central Park, Warsaw')).toBeInTheDocument();
  });

  it('renders participant count', () => {
    render(<SessionCard {...defaultProps} />);
    expect(screen.getByText('6/10')).toBeInTheDocument();
  });

  it('shows "full" indicator when at max participants', () => {
    render(
      <SessionCard
        {...defaultProps}
        participantCount={10}
        maxParticipants={10}
      />
    );
    // The component renders t('sess_full') which our mock returns as 'sess_full'.
    // It appears twice: once as a badge/tag and once in the spots-left area.
    const fullIndicators = screen.getAllByText('sess_full');
    expect(fullIndicators.length).toBeGreaterThanOrEqual(1);
  });

  it('shows spots left count', () => {
    render(<SessionCard {...defaultProps} />);
    // spotsLeft = 10 - 6 = 4, rendered as "4 sess_spots_left"
    expect(screen.getByText('4 sess_spots_left')).toBeInTheDocument();
  });

  it('renders as a link to session detail page', () => {
    render(<SessionCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/sessions/42');
  });
});
