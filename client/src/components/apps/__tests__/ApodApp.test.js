import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';
import ApodApp from '../ApodApp';

// Mock NASA API calls
jest.mock('../../services/nasaApi', () => ({
  fetchApod: jest.fn(),
  fetchApodForDate: jest.fn(),
}));

// Mock useSound hook
jest.mock('../../hooks/useSound', () => ({
  __esModule: true,
  default: () => ({
    playClick: jest.fn(),
    playOpen: jest.fn(),
    playClose: jest.fn(),
  }),
}));

// Mock AppContext
jest.mock('../../contexts/AppContext', () => ({
  useAppContext: () => ({
    closeWindow: jest.fn(),
    activeWindow: 'apod',
  }),
}));

// Test data
const mockApodData = {
  date: '2024-01-01',
  title: 'Test Astronomy Picture',
  explanation: 'This is a test explanation for the astronomy picture.',
  url: 'https://apod.nasa.gov/apod/image/2401/test.jpg',
  hdurl: 'https://apod.nasa.gov/apod/image/2401/test_hd.jpg',
  media_type: 'image',
  service_version: 'v1',
  copyright: 'Test Copyright',
};

// Create a test QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Helper function to render component with providers
const renderWithProviders = (component) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('APOD App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock successful API response
    const { fetchApod } = require('../../services/nasaApi');
    fetchApod.mockResolvedValue(mockApodData);
  });

  describe('Component Rendering', () => {
    it('should render the APOD window', () => {
      renderWithProviders(<ApodApp />);

      expect(screen.getByTestId('window-apod')).toBeInTheDocument();
      expect(screen.getByTestId('window-title-apod')).toBeInTheDocument();
      expect(screen.getByText('APOD - Astronomy Picture of the Day')).toBeInTheDocument();
    });

    it('should display loading state initially', () => {
      const { fetchApod } = require('../../services/nasaApi');
      fetchApod.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<ApodApp />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading today\'s Astronomy Picture...')).toBeInTheDocument();
    });

    it('should display APOD data after successful fetch', async () => {
      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('apod-image')).toBeInTheDocument();
        expect(screen.getByTestId('apod-title')).toBeInTheDocument();
        expect(screen.getByTestId('apod-date')).toBeInTheDocument();
        expect(screen.getByTestId('apod-explanation')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Astronomy Picture')).toBeInTheDocument();
      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
      expect(screen.getByText('This is a test explanation for the astronomy picture.')).toBeInTheDocument();
    });

    it('should display copyright information when available', async () => {
      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('apod-copyright')).toBeInTheDocument();
        expect(screen.getByText('Image Credit: Test Copyright')).toBeInTheDocument();
      });
    });
  });

  describe('Image Display', () => {
    it('should display APOD image with correct attributes', async () => {
      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        const image = screen.getByTestId('apod-image');
        expect(image).toHaveAttribute('src', 'https://apod.nasa.gov/apod/image/2401/test.jpg');
        expect(image).toHaveAttribute('alt', 'Test Astronomy Picture');
        expect(image).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should handle HD image toggle', async () => {
      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('apod-image')).toBeInTheDocument();
      });

      const hdToggle = screen.getByTestId('hd-toggle');
      fireEvent.click(hdToggle);

      await waitFor(() => {
        const image = screen.getByTestId('apod-image');
        expect(image).toHaveAttribute('src', 'https://apod.nasa.gov/apod/image/2401/test_hd.jpg');
      });
    });

    it('should display fallback for non-image media type', async () => {
      const videoApodData = {
        ...mockApodData,
        media_type: 'video',
        url: 'https://www.youtube.com/embed/test',
      };

      const { fetchApod } = require('../../services/nasaApi');
      fetchApod.mockResolvedValue(videoApodData);

      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('apod-video')).toBeInTheDocument();
        expect(screen.getByTestId('apod-video')).toHaveAttribute('src', 'https://www.youtube.com/embed/test');
      });
    });
  });

  describe('Date Navigation', () => {
    it('should navigate to previous day\'s APOD', async () => {
      const { fetchApodForDate } = require('../../services/nasaApi');
      fetchApodForDate.mockResolvedValue({
        ...mockApodData,
        date: '2023-12-31',
      });

      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('apod-image')).toBeInTheDocument();
      });

      const previousButton = screen.getByTestId('previous-day');
      fireEvent.click(previousButton);

      expect(fetchApodForDate).toHaveBeenCalledWith('2023-12-31');
    });

    it('should navigate to next day\'s APOD', async () => {
      const { fetchApodForDate } = require('../../services/nasaApi');
      fetchApodForDate.mockResolvedValue({
        ...mockApodData,
        date: '2024-01-02',
      });

      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('apod-image')).toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('next-day');
      fireEvent.click(nextButton);

      expect(fetchApodForDate).toHaveBeenCalledWith('2024-01-02');
    });

    it('should disable previous button for earliest available date', async () => {
      const { fetchApod } = require('../../services/nasaApi');
      fetchApod.mockResolvedValue({
        ...mockApodData,
        date: '1995-06-16', // First APOD date
      });

      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('previous-day')).toBeDisabled();
      });
    });

    it('should disable next button for future dates', async () => {
      const { fetchApod } = require('../../services/nasaApi');
      fetchApod.mockResolvedValue({
        ...mockApodData,
        date: new Date().toISOString().split('T')[0], // Today
      });

      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('next-day')).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      const { fetchApod } = require('../../services/nasaApi');
      fetchApod.mockRejectedValue(new Error('API Error'));

      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Failed to load APOD data. Please try again later.')).toBeInTheDocument();
      });
    });

    it('should provide retry functionality on error', async () => {
      const { fetchApod } = require('../../services/nasaApi');
      fetchApod
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockApodData);

      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('apod-image')).toBeInTheDocument();
      });

      expect(fetchApod).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors gracefully', async () => {
      const { fetchApod } = require('../../services/nasaApi');
      fetchApod.mockRejectedValue(new Error('Network Error'));

      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('network');
      });
    });
  });

  describe('Window Controls', () => {
    it('should close window when close button is clicked', () => {
      const mockCloseWindow = jest.fn();
      jest.doMock('../../contexts/AppContext', () => ({
        useAppContext: () => ({
          closeWindow: mockCloseWindow,
          activeWindow: 'apod',
        }),
      }));

      renderWithProviders(<ApodApp />);

      const closeButton = screen.getByTestId('close-button-apod');
      fireEvent.click(closeButton);

      expect(mockCloseWindow).toHaveBeenCalledWith('apod');
    });

    it('should minimize window when minimize button is clicked', () => {
      renderWithProviders(<ApodApp />);

      const minimizeButton = screen.getByTestId('minimize-button-apod');
      fireEvent.click(minimizeButton);

      // Should minimize the window (implementation specific)
      expect(screen.getByTestId('window-apod')).toHaveClass('minimized');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        const image = screen.getByTestId('apod-image');
        expect(image).toHaveAttribute('alt', 'Test Astronomy Picture');
        expect(screen.getByTestId('previous-day')).toHaveAttribute('aria-label', 'Previous day');
        expect(screen.getByTestId('next-day')).toHaveAttribute('aria-label', 'Next day');
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('apod-image')).toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('next-day');
      nextButton.focus();

      fireEvent.keyDown(nextButton, { key: 'Enter' });

      // Should trigger navigation
      const { fetchApodForDate } = require('../../services/nasaApi');
      expect(fetchApodForDate).toHaveBeenCalled();
    });

    it('should announce loading state to screen readers', () => {
      const { fetchApod } = require('../../services/nasaApi');
      fetchApod.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<ApodApp />);

      expect(screen.getByTestId('loading-announcer')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance', () => {
    it('should implement lazy loading for images', async () => {
      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        const image = screen.getByTestId('apod-image');
        expect(image).toHaveAttribute('loading', 'lazy');
      });
    });

    it('should cache API responses', async () => {
      renderWithProviders(<ApodApp />);

      await waitFor(() => {
        expect(screen.getByTestId('apod-image')).toBeInTheDocument();
      });

      // Re-render component
      renderWithProviders(<ApodApp />);

      // Should not make additional API call due to caching
      const { fetchApod } = require('../../services/nasaApi');
      expect(fetchApod).toHaveBeenCalledTimes(1);
    });
  });
});