// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/discover',
}));

// Mock next/link — render as a plain <a>
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock @/lib/lang
vi.mock('@/lib/lang', () => ({
  useLang: () => ({ t: (key: string) => key, lang: 'pl' }),
}));

// Mock lucide-react icons as simple spans with data-testid
vi.mock('lucide-react', () => {
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => <span data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return {
    Compass: createIcon('Compass'),
    Dumbbell: createIcon('Dumbbell'),
    MessageSquare: createIcon('MessageSquare'),
    User: createIcon('User'),
    UserPlus: createIcon('UserPlus'),
    Newspaper: createIcon('Newspaper'),
    Trophy: createIcon('Trophy'),
    Users: createIcon('Users'),
    X: createIcon('X'),
    Plus: createIcon('Plus'),
    MoreHorizontal: createIcon('MoreHorizontal'),
    Settings: createIcon('Settings'),
    Activity: createIcon('Activity'),
    BarChart2: createIcon('BarChart2'),
    TrendingUp: createIcon('TrendingUp'),
    Calendar: createIcon('Calendar'),
    Zap: createIcon('Zap'),
  };
});

// Mock LangToggle and ThemeToggle since they're used in the more drawer
vi.mock('@/components/lang-toggle', () => ({
  LangToggle: () => <div data-testid="lang-toggle" />,
}));

vi.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

describe('MobileBottomNav', () => {
  it('renders 5 navigation items', () => {
    render(<MobileBottomNav />);

    const nav = screen.getByRole('navigation');
    // 4 MAIN_ITEMS links + 1 "More" button = 5 navigation items in the bottom bar
    const links = nav.querySelectorAll('a');
    const buttons = nav.querySelectorAll('button');
    expect(links.length + buttons.length).toBe(5);
  });

  it('renders correct href links (discover, sessions, messages, leaderboard + more button)', () => {
    render(<MobileBottomNav />);

    const nav = screen.getByRole('navigation');
    const links = nav.querySelectorAll('a');

    const hrefs = Array.from(links).map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/discover');
    expect(hrefs).toContain('/sessions');
    expect(hrefs).toContain('/messages');
    expect(hrefs).toContain('/leaderboard');
  });

  it('highlights the active tab based on pathname', () => {
    // pathname is mocked to '/discover'
    render(<MobileBottomNav />);

    const activeLink = screen.getByLabelText('mob_discover');
    // Active tab should have color set to the indigo accent
    expect(activeLink).toHaveStyle({ color: '#6366F1' });
  });

  it('renders navigation landmark (role="navigation")', () => {
    render(<MobileBottomNav />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });

  it('has aria-label on navigation', () => {
    render(<MobileBottomNav />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'nav_main_aria');
  });

  it('renders aria-current="page" on active item', () => {
    // pathname is mocked to '/discover'
    render(<MobileBottomNav />);

    const activeLink = screen.getByLabelText('mob_discover');
    expect(activeLink).toHaveAttribute('aria-current', 'page');

    // Non-active links should NOT have aria-current
    const sessionsLink = screen.getByLabelText('mob_sessions');
    expect(sessionsLink).not.toHaveAttribute('aria-current');
  });
});
