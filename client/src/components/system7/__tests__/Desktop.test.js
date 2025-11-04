import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Desktop from '../Desktop';

// Mock the sound hook
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
    openWindows: [],
    activeWindow: null,
    openWindow: jest.fn(),
    closeWindow: jest.fn(),
    setActiveWindow: jest.fn(),
  }),
}));

// Wrap component with BrowserRouter for routing
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('System 7 Desktop Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Desktop Rendering', () => {
    it('should render the desktop container', () => {
      renderWithRouter(<Desktop />);

      const desktop = screen.getByTestId('desktop');
      expect(desktop).toBeInTheDocument();
      expect(desktop).toHaveClass('w-full', 'h-full', 'relative', 'overflow-hidden');
    });

    it('should render all desktop icons', () => {
      renderWithRouter(<Desktop />);

      // Check for System 7 application icons
      expect(screen.getByTestId('desktop-icon-apod')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-icon-neows')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-icon-navigator')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-image-viewer')).toBeInTheDocument();
    });

    it('should have proper System 7 styling', () => {
      renderWithRouter(<Desktop />);

      const desktop = screen.getByTestId('desktop');
      expect(desktop).toHaveStyle('background-color: #808080');
    });
  });

  describe('Desktop Icon Interactions', () => {
    it('should handle double-click on desktop icons', async () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      fireEvent.doubleClick(apodIcon);

      await waitFor(() => {
        expect(screen.getByTestId('window-apod')).toBeInTheDocument();
      });
    });

    it('should play sound when icon is clicked', () => {
      const mockPlayClick = jest.fn();
      jest.doMock('../../hooks/useSound', () => ({
        default: () => ({
          playClick: mockPlayClick,
          playOpen: jest.fn(),
          playClose: jest.fn(),
        }),
      }));

      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      fireEvent.click(apodIcon);

      expect(mockPlayClick).toHaveBeenCalled();
    });

    it('should show icon selection state on click', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      fireEvent.click(apodIcon);
      expect(apodIcon).toHaveClass('selected');

      fireEvent.click(document.body); // Click elsewhere to deselect
      expect(apodIcon).not.toHaveClass('selected');
    });
  });

  describe('Window Management', () => {
    it('should open window when icon is double-clicked', async () => {
      const mockOpenWindow = jest.fn();
      jest.doMock('../../contexts/AppContext', () => ({
        useAppContext: () => ({
          openWindows: [],
          activeWindow: null,
          openWindow: mockOpenWindow,
          closeWindow: jest.fn(),
          setActiveWindow: jest.fn(),
        }),
      }));

      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      fireEvent.doubleClick(apodIcon);

      await waitFor(() => {
        expect(mockOpenWindow).toHaveBeenCalledWith('apod', 'APOD');
      });
    });

    it('should handle multiple open windows', async () => {
      const mockOpenWindow = jest.fn();
      jest.doMock('../../contexts/AppContext', () => ({
        useAppContext: () => ({
          openWindows: ['apod', 'neows'],
          activeWindow: 'apod',
          openWindow: mockOpenWindow,
          closeWindow: jest.fn(),
          setActiveWindow: jest.fn(),
        }),
      }));

      renderWithRouter(<Desktop />);

      // Verify both windows are rendered
      await waitFor(() => {
        expect(screen.getByTestId('window-apod')).toBeInTheDocument();
        expect(screen.getByTestId('window-neows')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate icons with keyboard', () => {
      renderWithRouter(<Desktop />);

      const desktop = screen.getByTestId('desktop');

      // Tab to focus first icon
      fireEvent.focus(desktop);
      fireEvent.keyDown(desktop, { key: 'Tab' });

      const firstIcon = screen.getByTestId('desktop-icon-apod');
      expect(firstIcon).toHaveFocus();

      // Navigate to next icon
      fireEvent.keyDown(firstIcon, { key: 'ArrowDown' });

      const nextIcon = screen.getByTestId('desktop-icon-neows');
      expect(nextIcon).toHaveFocus();
    });

    it('should open window with Enter key on focused icon', async () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      apodIcon.focus();

      fireEvent.keyDown(apodIcon, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByTestId('window-apod')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      expect(apodIcon).toHaveAttribute('aria-label', 'APOD - Astronomy Picture of the Day');
      expect(apodIcon).toHaveAttribute('role', 'button');
      expect(apodIcon).toHaveAttribute('tabIndex', '0');
    });

    it('should support screen reader announcements', () => {
      renderWithRouter(<Desktop />);

      const announcements = screen.getByTestId('screen-reader-announcements');
      expect(announcements).toBeInTheDocument();
      expect(announcements).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance', () => {
    it('should render within performance threshold', () => {
      const startTime = performance.now();

      renderWithRouter(<Desktop />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle large number of windows efficiently', async () => {
      // Mock many open windows
      const manyWindows = Array(20).fill().map((_, i) => `window-${i}`);

      jest.doMock('../../contexts/AppContext', () => ({
        useAppContext: () => ({
          openWindows: manyWindows,
          activeWindow: 'window-0',
          openWindow: jest.fn(),
          closeWindow: jest.fn(),
          setActiveWindow: jest.fn(),
        }),
      }));

      const startTime = performance.now();

      renderWithRouter(<Desktop />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should still render efficiently with many windows
      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle icon click errors gracefully', () => {
      const mockOpenWindow = jest.fn().mockImplementation(() => {
        throw new Error('Window opening failed');
      });

      jest.doMock('../../contexts/AppContext', () => ({
        useAppContext: () => ({
          openWindows: [],
          activeWindow: null,
          openWindow: mockOpenWindow,
          closeWindow: jest.fn(),
          setActiveWindow: jest.fn(),
        }),
      }));

      // Suppress console errors for this test
      const originalError = console.error;
      console.error = jest.fn();

      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      fireEvent.doubleClick(apodIcon);

      // Should show error message
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to open application');

      console.error = originalError;
    });
  });
});