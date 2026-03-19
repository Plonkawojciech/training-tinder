// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
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

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const createIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => <span data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return {
    X: createIcon('X'),
    ImagePlus: createIcon('ImagePlus'),
    Loader2: createIcon('Loader2'),
  };
});

import { PhotoGallery } from '@/components/profile/photo-gallery';

const samplePhotos = [
  'https://example.com/photo1.jpg',
  'https://example.com/photo2.jpg',
  'https://example.com/photo3.jpg',
];

const noop = vi.fn();

describe('PhotoGallery', () => {
  it('renders photos when provided', () => {
    const { container } = render(<PhotoGallery photos={samplePhotos} onPhotosChange={noop} />);

    // Images have alt="" so they are role="presentation" — query by tag
    const images = container.querySelectorAll('img');
    expect(images.length).toBe(samplePhotos.length);
  });

  it('shows empty state when no photos', () => {
    render(<PhotoGallery photos={[]} onPhotosChange={noop} />);

    expect(screen.getByText('photo_empty')).toBeInTheDocument();
  });

  it('renders upload button when editable (photos < 20)', () => {
    const { container } = render(<PhotoGallery photos={samplePhotos} onPhotosChange={noop} />);

    // The upload label has aria-label="photo_add"
    const uploadLabel = container.querySelector('label[aria-label="photo_add"]');
    expect(uploadLabel).toBeInTheDocument();
  });

  it('does not render upload button when not editable (photos at max 20)', () => {
    const maxPhotos = Array.from({ length: 20 }, (_, i) => `https://example.com/photo${i}.jpg`);
    const { container } = render(<PhotoGallery photos={maxPhotos} onPhotosChange={noop} />);

    // When photos.length >= 20, the upload label is not rendered
    const uploadLabel = container.querySelector('label[aria-label="photo_add"]');
    expect(uploadLabel).not.toBeInTheDocument();
  });

  it('renders delete button on photos when editable', () => {
    render(<PhotoGallery photos={samplePhotos} onPhotosChange={noop} />);

    // Each photo has a delete button with aria-label="gen_delete"
    const deleteButtons = screen.getAllByLabelText('gen_delete');
    expect(deleteButtons.length).toBe(samplePhotos.length);
  });

  it('does not render delete buttons when not editable (no photos)', () => {
    render(<PhotoGallery photos={[]} onPhotosChange={noop} />);

    // No photos means no delete buttons
    const deleteButtons = screen.queryAllByLabelText('gen_delete');
    expect(deleteButtons.length).toBe(0);
  });

  it('renders correct number of images', () => {
    const fivePhotos = [
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
      'https://example.com/c.jpg',
      'https://example.com/d.jpg',
      'https://example.com/e.jpg',
    ];
    const { container } = render(<PhotoGallery photos={fivePhotos} onPhotosChange={noop} />);

    const images = container.querySelectorAll('img');
    expect(images.length).toBe(5);
  });

  it('has aria-labels on interactive elements', () => {
    const { container } = render(<PhotoGallery photos={samplePhotos} onPhotosChange={noop} />);

    // Upload label has aria-label
    const uploadLabel = container.querySelector('label[aria-label="photo_add"]');
    expect(uploadLabel).toHaveAttribute('aria-label', 'photo_add');

    // Delete buttons have aria-label
    const deleteButtons = screen.getAllByLabelText('gen_delete');
    deleteButtons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-label', 'gen_delete');
    });
  });
});
