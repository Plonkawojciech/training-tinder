// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock @/lib/lang
vi.mock('@/lib/lang', () => ({
  useLang: () => ({ t: (key: string) => key, lang: 'pl' }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

// Mock next/link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/messages',
}));

// Mock pusher-js
vi.mock('pusher-js', () => {
  const channelBind = vi.fn();
  const subscribe = vi.fn(() => ({ bind: channelBind, trigger: vi.fn() }));
  const unsubscribe = vi.fn();
  const disconnect = vi.fn();
  const connectionBind = vi.fn();
  return {
    __esModule: true,
    default: vi.fn(() => ({ subscribe, unsubscribe, disconnect, connection: { bind: connectionBind } })),
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => <span data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return {
    Send: createIcon('Send'),
    ArrowLeft: createIcon('ArrowLeft'),
    MoreVertical: createIcon('MoreVertical'),
  };
});

// Mock @/components/ui/avatar
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ fallback, src }: { fallback?: string; src?: string | null; size?: string }) => (
    <div data-testid="avatar">{fallback ?? src ?? '?'}</div>
  ),
}));

// Mock @/lib/utils
vi.mock('@/lib/utils', () => ({
  formatRelativeTime: (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString();
  },
}));

// Mock fetch globally
const mockMessages = [
  {
    id: 1,
    senderId: 'user-1',
    receiverId: 'user-2',
    content: 'Hello there!',
    read: true,
    createdAt: '2026-03-19T10:00:00Z',
  },
  {
    id: 2,
    senderId: 'user-2',
    receiverId: 'user-1',
    content: 'Hi! How are you?',
    read: true,
    createdAt: '2026-03-19T10:01:00Z',
  },
  {
    id: 3,
    senderId: 'user-1',
    receiverId: 'user-2',
    content: 'Doing great, thanks!',
    read: false,
    createdAt: '2026-03-19T10:02:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockMessages),
    })
  ) as unknown as typeof fetch;
});

import { ChatWindow } from '@/components/messages/chat-window';

const defaultProps = {
  currentUserId: 'user-1',
  partnerId: 'user-2',
  partnerName: 'Jan Kowalski',
  partnerAvatar: '/avatars/jan.jpg',
};

describe('ChatWindow', () => {
  it('renders partner name', async () => {
    render(<ChatWindow {...defaultProps} />);

    // Partner name appears in the header (and possibly in avatar fallback)
    const elements = await screen.findAllByText('Jan Kowalski');
    expect(elements.length).toBeGreaterThanOrEqual(1);
    // The header element should have bold styling
    const headerName = elements.find(
      (el) => el.style.fontWeight === '700'
    );
    expect(headerName).toBeDefined();
  });

  it('renders message list', async () => {
    render(<ChatWindow {...defaultProps} />);

    expect(await screen.findByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByText('Hi! How are you?')).toBeInTheDocument();
    expect(screen.getByText('Doing great, thanks!')).toBeInTheDocument();
  });

  it('renders message input field', () => {
    render(<ChatWindow {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('renders send button', () => {
    render(<ChatWindow {...defaultProps} />);

    const sendButton = screen.getByLabelText('chat_send_aria');
    expect(sendButton).toBeInTheDocument();
    expect(sendButton).toHaveAttribute('type', 'submit');
  });

  it('shows empty state when no messages', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as unknown as typeof fetch;

    render(<ChatWindow {...defaultProps} />);

    expect(await screen.findByText('chat_empty')).toBeInTheDocument();
  });

  it('displays sent messages on the right side (row-reverse flex direction)', async () => {
    render(<ChatWindow {...defaultProps} />);

    // Wait for messages to load
    const sentMessage = await screen.findByText('Hello there!');
    // The parent container of a sent message (senderId === currentUserId) uses flexDirection: 'row-reverse'
    const messageRow = sentMessage.closest('[style*="row-reverse"]');
    expect(messageRow).not.toBeNull();
  });

  it('displays received messages on the left side (row flex direction)', async () => {
    render(<ChatWindow {...defaultProps} />);

    // Wait for messages to load
    const receivedMessage = await screen.findByText('Hi! How are you?');
    // The parent container of a received message uses flexDirection: 'row'
    // but NOT 'row-reverse'
    const messageRow = receivedMessage.parentElement?.parentElement;
    expect(messageRow).toBeDefined();
    expect(messageRow?.style.flexDirection).toBe('row');
  });

  it('renders timestamps on messages', async () => {
    render(<ChatWindow {...defaultProps} />);

    // Wait for messages to render; timestamps are rendered via formatRelativeTime
    await screen.findByText('Hello there!');
    // The mock formatRelativeTime returns toLocaleTimeString() — check that at least one timestamp span exists
    const timestampElements = document.querySelectorAll('span[style*="font-size: 10"]');
    expect(timestampElements.length).toBeGreaterThan(0);
  });

  it('has aria-live region for new messages', () => {
    render(<ChatWindow {...defaultProps} />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('input has placeholder text', () => {
    render(<ChatWindow {...defaultProps} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'chat_placeholder');
  });
});
