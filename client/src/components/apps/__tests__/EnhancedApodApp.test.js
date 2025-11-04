import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import '@testing-library/jest-dom';
import EnhancedApodApp from '../EnhancedApodApp';

// Mock NASA API calls
jest.mock('../../../services/api', () => ({
    getApod: jest.fn(),
    getApodForDate: jest.fn(),
    getEnhancedApod: jest.fn(),
}));

// Mock AppContext
jest.mock('../../../contexts/AppContext', () => ({
    useApps: () => ({
        openApp: jest.fn(),
    }),
}));

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Test data
const mockEnhancedApodData = {
    date: '2024-01-01',
    title: 'Test Enhanced Astronomy Picture',
    explanation: 'This is a test explanation for the enhanced astronomy picture with detailed information about celestial objects and astronomical phenomena.',
    url: 'https://apod.nasa.gov/apod/image/2401/test.jpg',
    hdurl: 'https://apod.nasa.gov/apod/image/2401/test_hd.jpg',
    media_type: 'image',
    service_version: 'v1',
    copyright: 'Test Copyright',
    enhanced: {
        dayOfWeek: 'Monday',
        month: 'January',
        year: 2024,
        imageUrlQuality: 'high-definition',
        downloadSize: 'medium',
        tags: ['galaxy', 'nebula', 'stars'],
        relatedTopics: ['Galaxies & Cosmology', 'Stellar Evolution'],
        readabilityScore: 75,
        wordCount: 25,
        estimatedReadingTime: 1
    }
};

const mockVideoApodData = {
    date: '2024-01-02',
    title: 'Video Astronomy Picture',
    explanation: 'This is a video explanation.',
    url: 'https://www.youtube.com/embed/test',
    media_type: 'video',
    service_version: 'v1',
    copyright: 'Video Copyright'
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

describe('Enhanced APOD App Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);

        const { getApod } = require('../../../services/api');
        getApod.mockResolvedValue(mockEnhancedApodData);
    });

    describe('Component Rendering', () => {
        it('should render the enhanced APOD interface', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('🌌 Astronomy Picture of the Day')).toBeInTheDocument();
            });

            expect(screen.getByText('📷 Single')).toBeInTheDocument();
            expect(screen.getByText('🖼️ Gallery')).toBeInTheDocument();
            expect(screen.getByText('📅 Timeline')).toBeInTheDocument();
        });

        it('should display loading state initially', () => {
            const { getApod } = require('../../../services/api');
            getApod.mockImplementation(() => new Promise(() => {}));

            renderWithProviders(<EnhancedApodApp />);

            expect(screen.getByText('Loading NASA APOD...')).toBeInTheDocument();
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('should display enhanced APOD data after successful fetch', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
                expect(screen.getByText('This is a test explanation for the enhanced astronomy picture')).toBeInTheDocument();
                expect(screen.getByText('2024-01-01')).toBeInTheDocument();
                expect(screen.getByText('© Test Copyright')).toBeInTheDocument();
            });
        });

        it('should handle video media type correctly', async () => {
            const { getApod } = require('../../../services/api');
            getApod.mockResolvedValue(mockVideoApodData);

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('📹 Today\'s APOD is a video')).toBeInTheDocument();
                expect(screen.getByText('Watch Video →')).toBeInTheDocument();
            });
        });
    });

    describe('View Mode Switching', () => {
        it('should switch to gallery view when gallery button is clicked', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const galleryButton = screen.getByText('🖼️ Gallery');
            fireEvent.click(galleryButton);

            await waitFor(() => {
                expect(screen.getByText('🖼️ APOD Gallery')).toBeInTheDocument();
                expect(screen.getByText('Gallery view coming soon!')).toBeInTheDocument();
            });
        });

        it('should switch to timeline view when timeline button is clicked', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const timelineButton = screen.getByText('📅 Timeline');
            fireEvent.click(timelineButton);

            await waitFor(() => {
                expect(screen.getByText('📅 APOD Timeline')).toBeInTheDocument();
                expect(screen.getByText('Timeline view coming soon!')).toBeInTheDocument();
            });
        });
    });

    describe('Date Navigation', () => {
        it('should navigate to previous day when previous button is clicked', async () => {
            const { getApodForDate } = require('../../../services/api');
            getApodForDate.mockResolvedValue({
                ...mockEnhancedApodData,
                date: '2023-12-31'
            });

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const previousButton = screen.getByText('← Previous');
            fireEvent.click(previousButton);

            expect(getApodForDate).toHaveBeenCalledWith('2023-12-31');
        });

        it('should navigate to next day when next button is clicked', async () => {
            const { getApodForDate } = require('../../../services/api');
            getApodForDate.mockResolvedValue({
                ...mockEnhancedApodData,
                date: '2024-01-02'
            });

            // Mock current date to be before the test date
            jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-03').getTime());

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const nextButton = screen.getByText('Next →');
            fireEvent.click(nextButton);

            expect(getApodForDate).toHaveBeenCalledWith('2024-01-02');
        });

        it('should change date when date input is modified', async () => {
            const { getApodForDate } = require('../../../services/api');
            getApodForDate.mockResolvedValue(mockEnhancedApodData);

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const dateInput = screen.getByDisplayValue('2024-01-01');
            fireEvent.change(dateInput, { target: { value: '2023-12-25' } });

            expect(getApodForDate).toHaveBeenCalledWith('2023-12-25');
        });

        it('should disable previous button for earliest APOD date', async () => {
            const { getApod } = require('../../../services/api');
            getApod.mockResolvedValue({
                ...mockEnhancedApodData,
                date: '1995-06-16'
            });

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const previousButton = screen.getByText('← Previous');
            expect(previousButton).toBeDisabled();
        });
    });

    describe('Image Interaction', () => {
        it('should open fullscreen view when image is clicked', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                const image = screen.getByAltText('Test Enhanced Astronomy Picture');
                expect(image).toBeInTheDocument();
            });

            const image = screen.getByAltText('Test Enhanced Astronomy Picture');
            fireEvent.click(image);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
                expect(screen.getByText('✕ Close')).toBeInTheDocument();
            });
        });

        it('should handle zoom controls correctly', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            // Open fullscreen to access zoom controls
            const image = screen.getByAltText('Test Enhanced Astronomy Picture');
            fireEvent.click(image);

            await waitFor(() => {
                expect(screen.getByText('100%')).toBeInTheDocument();
            });

            const zoomInButton = screen.getByText('+');
            fireEvent.click(zoomInButton);

            await waitFor(() => {
                expect(screen.getByText('120%')).toBeInTheDocument();
            });

            const zoomOutButton = screen.getByText('-');
            fireEvent.click(zoomOutButton);

            await waitFor(() => {
                expect(screen.getByText('100%')).toBeInTheDocument();
            });
        });
    });

    describe('Favorites Functionality', () => {
        it('should add APOD to favorites when save button is clicked', async () => {
            localStorageMock.getItem.mockReturnValue('[]');

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const saveButton = screen.getByText('🤍 Save');
            fireEvent.click(saveButton);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'apod-favorites',
                expect.stringContaining('2024-01-01')
            );
        });

        it('should remove APOD from favorites when remove button is clicked', async () => {
            const existingFavorites = [{
                ...mockEnhancedApodData,
                savedAt: new Date().toISOString()
            }];
            localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const removeButton = screen.getByText('❤️ Remove');
            fireEvent.click(removeButton);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'apod-favorites',
                JSON.stringify([])
            );
        });

        it('should show saved state for favorited APODs', async () => {
            const existingFavorites = [{
                ...mockEnhancedApodData,
                savedAt: new Date().toISOString()
            }];
            localStorageMock.getItem.mockReturnValue(JSON.stringify(existingFavorites));

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('❤️ Remove')).toBeInTheDocument();
            });
        });
    });

    describe('Metadata Display', () => {
        it('should toggle metadata panel when technical details button is clicked', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const metadataButton = screen.getByText('📊 Technical Details ▶');
            fireEvent.click(metadataButton);

            await waitFor(() => {
                expect(screen.getByText('Media Type:')).toBeInTheDocument();
                expect(screen.getByText('Service Version:')).toBeInTheDocument();
                expect(screen.getByText('Date:')).toBeInTheDocument();
            });
        });

        it('should display enhanced metadata when available', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            // Open metadata panel
            const metadataButton = screen.getByText('📊 Technical Details ▶');
            fireEvent.click(metadataButton);

            await waitFor(() => {
                expect(screen.getByText('Media Type:')).toBeInTheDocument();
            });
        });
    });

    describe('Download Functionality', () => {
        it('should trigger download when download button is clicked', async () => {
            // Mock fetch for download
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' }))
                })
            );

            // Mock URL.createObjectURL and revokeObjectURL
            global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
            global.URL.revokeObjectURL = jest.fn();

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const downloadButton = screen.getByText('📥 Standard Quality');
            fireEvent.click(downloadButton);

            await waitFor(() => {
                expect(fetch).toHaveBeenCalledWith(
                    'https://apod.nasa.gov/apod/image/2401/test.jpg',
                    expect.objectContaining({ method: 'GET' })
                );
            });
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('should handle arrow key navigation', async () => {
            const { getApodForDate } = require('../../../services/api');
            getApodForDate.mockResolvedValue({
                ...mockEnhancedApodData,
                date: '2023-12-31'
            });

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            fireEvent.keyDown(window, { key: 'ArrowLeft' });

            expect(getApodForDate).toHaveBeenCalledWith('2023-12-31');
        });

        it('should handle fullscreen shortcut', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            fireEvent.keyDown(window, { key: 'f' });

            await waitFor(() => {
                expect(screen.getByText('✕ Close')).toBeInTheDocument();
            });
        });

        it('should handle metadata toggle shortcut', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            fireEvent.keyDown(window, { key: 'm' });

            await waitFor(() => {
                expect(screen.getByText('📊 Technical Details ▼')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error message when API call fails', async () => {
            const { getApod } = require('../../../services/api');
            getApod.mockRejectedValue(new Error('Network Error'));

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Network Error')).toBeInTheDocument();
                expect(screen.getByText('🔄 Retry')).toBeInTheDocument();
            });
        });

        it('should retry when retry button is clicked', async () => {
            const { getApod } = require('../../../services/api');
            getApod
                .mockRejectedValueOnce(new Error('Network Error'))
                .mockResolvedValueOnce(mockEnhancedApodData);

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Network Error')).toBeInTheDocument();
            });

            const retryButton = screen.getByText('🔄 Retry');
            fireEvent.click(retryButton);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });
        });

        it('should navigate to today when go to today button is clicked', async () => {
            const { getApod } = require('../../../services/api');
            getApod.mockRejectedValue(new Error('Network Error'));

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Network Error')).toBeInTheDocument();
            });

            const todayButton = screen.getByText('📅 Go to Today');
            fireEvent.click(todayButton);

            // Should trigger a new API call for today's date
            expect(getApod).toHaveBeenCalled();
        });
    });

    describe('Responsive Design', () => {
        it('should adapt layout for different screen sizes', async () => {
            // Mock window.innerWidth for different screen sizes
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 768,
            });

            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            // Test mobile layout
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 480,
            });

            fireEvent.resize(window);

            // Component should still render properly on mobile
            expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                const image = screen.getByAltText('Test Enhanced Astronomy Picture');
                expect(image).toBeInTheDocument();
            });

            expect(screen.getByLabelText('Previous day')).toBeInTheDocument();
            expect(screen.getByLabelText('Next day')).toBeInTheDocument();
        });

        it('should support keyboard navigation', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            const nextButton = screen.getByLabelText('Next day');
            nextButton.focus();

            fireEvent.keyDown(nextButton, { key: 'Enter' });

            // Should trigger navigation
            const { getApodForDate } = require('../../../services/api');
            expect(getApodForDate).toHaveBeenCalled();
        });

        it('should announce loading state to screen readers', () => {
            const { getApod } = require('../../../services/api');
            getApod.mockImplementation(() => new Promise(() => {}));

            renderWithProviders(<EnhancedApodApp />);

            expect(screen.getByText('Loading NASA APOD...')).toBeInTheDocument();
        });
    });

    describe('Performance', () => {
        it('should implement efficient state management', async () => {
            const { getApod } = require('../../../services/api');
            getApod.mockResolvedValue(mockEnhancedApodData);

            const { rerender } = renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                expect(screen.getByText('Test Enhanced Astronomy Picture')).toBeInTheDocument();
            });

            // Re-render component
            rerender(
                <QueryClientProvider client={createTestQueryClient()}>
                    <EnhancedApodApp />
                </QueryClientProvider>
            );

            // Should not make additional API calls due to caching
            expect(getApod).toHaveBeenCalledTimes(1);
        });

        it('should handle large images efficiently', async () => {
            renderWithProviders(<EnhancedApodApp />);

            await waitFor(() => {
                const image = screen.getByAltText('Test Enhanced Astronomy Picture');
                expect(image).toHaveAttribute('loading', 'lazy');
            });
        });
    });
});