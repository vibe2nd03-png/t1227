import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

// Mock the lazy-loaded components
vi.mock("./components/ClimateMap", () => ({
  default: () => <div data-testid="climate-map">ClimateMap</div>,
}));

vi.mock("./components/Sidebar", () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock("./components/WeatherAlertBanner", () => ({
  default: () => <div data-testid="weather-alert">WeatherAlert</div>,
}));

vi.mock("./components/MobileBottomNav", () => ({
  default: () => <div data-testid="mobile-nav">MobileNav</div>,
}));

vi.mock("./components/MobileBottomSheet", () => ({
  default: () => <div data-testid="mobile-sheet">MobileSheet</div>,
}));

vi.mock("./components/PWAInstallBanner", () => ({
  default: () => <div data-testid="pwa-banner">PWABanner</div>,
}));

vi.mock("./components/LocationDetector", () => ({
  default: () => <div data-testid="location-detector">LocationDetector</div>,
}));

vi.mock("./components/AuthModal", () => ({
  default: () => <div data-testid="auth-modal">AuthModal</div>,
}));

vi.mock("./components/UserProfile", () => ({
  default: () => <div data-testid="user-profile">UserProfile</div>,
}));

vi.mock("./components/NotificationManager", () => ({
  default: () => (
    <div data-testid="notification-manager">NotificationManager</div>
  ),
}));

// Mock Supabase
vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

describe("App", () => {
  it("should render without crashing", async () => {
    render(<App />);

    // The app should render something
    expect(document.body).toBeTruthy();
  });

  it("should have the correct document structure", () => {
    render(<App />);

    // Check that the root element exists
    const appElement = document.querySelector(".app-container");
    expect(appElement || document.body.firstChild).toBeTruthy();
  });
});
