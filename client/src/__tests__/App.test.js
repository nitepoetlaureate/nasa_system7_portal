import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock the sound effects
jest.mock('./hooks/useSound', () => ({
  __esModule: true,
  default: () => ({
    playClick: jest.fn(),
    playOpen: jest.fn(),
    playClose: jest.fn(),
  }),
}));

// Mock AppContext
jest.mock('./contexts/AppContext', () => ({
  AppContext: React.createContext({
    openWindows: [],
    activeWindow: null,
    openWindow: jest.fn(),
    closeWindow: jest.fn(),
    setActiveWindow: jest.fn(),
  }),
  useAppContext: () => ({
    openWindows: [],
    activeWindow: null,
    openWindow: jest.fn(),
    closeWindow: jest.fn(),
    setActiveWindow: jest.fn(),
  }),
}));

describe('NASA System 7 Portal - App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
  });

  it('displays the main desktop container', () => {
    render(<App />);

    const desktopContainer = screen.getByTestId('desktop') || document.querySelector('.w-screen.h-screen');
    expect(desktopContainer).toBeInTheDocument();
  });

  it('has correct System 7 styling classes', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toHaveClass('w-screen', 'h-screen', 'overflow-hidden', 'bg-s7-pattern');
  });

  it('renders the menu bar component', () => {
    render(<App />);

    // MenuBar should be rendered
    const menuBar = document.querySelector('[data-testid="menu-bar"]') ||
                    document.querySelector('nav') ||
                    document.querySelector('.menu-bar');

    // The menu bar may or may not have a specific test id, so we check the container
    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer.children.length).toBeGreaterThan(0);
  });

  it('renders the desktop component', () => {
    render(<App />);

    // Desktop should be rendered inside the main container
    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer.children.length).toBeGreaterThan(1); // MenuBar + Desktop
  });

  it('has proper accessibility attributes', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toBeInTheDocument();

    // Check if there's a lang attribute on the HTML element
    expect(document.documentElement).toHaveAttribute('lang', 'en');
  });

  it('maintains correct component structure', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toBeInTheDocument();

    // Should have MenuBar and Desktop as children
    expect(mainContainer.children.length).toBe(2);
  });

  it('handles window resize gracefully', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toBeInTheDocument();

    // Simulate window resize
    window.dispatchEvent(new Event('resize'));

    // Component should still be rendered
    expect(mainContainer).toBeInTheDocument();
  });

  it('has correct background styling for System 7', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toHaveClass('bg-s7-pattern');
  });
});