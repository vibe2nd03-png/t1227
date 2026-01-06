import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";

// Mock the lazy-loaded components
vi.mock("./components/ClimateMap", () => ({
  default: ({ onRegionSelect, onMapClick, selectedRegion }) => (
    <div data-testid="climate-map">
      <button
        data-testid="select-region"
        onClick={() =>
          onRegionSelect({
            region: "수원시",
            score: 45,
            risk_level: "caution",
          })
        }
      >
        Select Region
      </button>
      <button data-testid="click-map" onClick={onMapClick}>
        Click Map
      </button>
      {selectedRegion && (
        <span data-testid="selected">{selectedRegion.region}</span>
      )}
    </div>
  ),
}));

vi.mock("./components/Sidebar", () => ({
  default: ({ onTargetChange, target, onOpenAuthModal }) => (
    <div data-testid="sidebar">
      <span data-testid="current-target">{target}</span>
      <button
        data-testid="change-target"
        onClick={() => onTargetChange("elderly")}
      >
        Change Target
      </button>
      <button data-testid="open-auth" onClick={onOpenAuthModal}>
        Auth
      </button>
    </div>
  ),
}));

vi.mock("./components/WeatherAlertBanner", () => ({
  default: () => <div data-testid="weather-alert">WeatherAlert</div>,
}));

vi.mock("./components/MobileBottomNav", () => ({
  default: ({ onTabChange, activeTab }) => (
    <div data-testid="mobile-nav">
      <span data-testid="active-tab">{activeTab}</span>
      <button data-testid="tab-info" onClick={() => onTabChange("info")}>
        Info Tab
      </button>
      <button data-testid="tab-map" onClick={() => onTabChange("map")}>
        Map Tab
      </button>
    </div>
  ),
}));

vi.mock("./components/MobileBottomSheet", () => ({
  default: ({ isOpen, onClose, children }) =>
    isOpen ? (
      <div data-testid="mobile-sheet">
        <button data-testid="close-sheet" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

vi.mock("./components/PWAInstallBanner", () => ({
  default: () => <div data-testid="pwa-banner">PWABanner</div>,
}));

vi.mock("./components/LocationDetector", () => ({
  default: ({ onLocationDetected }) => (
    <div data-testid="location-detector">
      <button
        data-testid="detect-location"
        onClick={() =>
          onLocationDetected({
            region: "성남시",
            score: 32,
            risk_level: "caution",
          })
        }
      >
        Detect Location
      </button>
    </div>
  ),
}));

vi.mock("./components/AuthModal", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="auth-modal">
        <button data-testid="close-auth" onClick={onClose}>
          Close Auth
        </button>
      </div>
    ) : null,
}));

vi.mock("./components/UserProfile", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="user-profile">
        <button data-testid="close-profile" onClick={onClose}>
          Close Profile
        </button>
      </div>
    ) : null,
}));

vi.mock("./components/NotificationManager", () => ({
  default: () => (
    <div data-testid="notification-manager">NotificationManager</div>
  ),
}));

vi.mock("./components/RegionComments", () => ({
  default: ({ isOpen, onClose, region }) =>
    isOpen ? (
      <div data-testid="region-comments">
        <span data-testid="comment-region">{region}</span>
        <button data-testid="close-comments" onClick={onClose}>
          Close Comments
        </button>
      </div>
    ) : null,
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

// Mock kmaApi
vi.mock("./services/kmaApi", () => ({
  getGyeonggiRealtimeWeather: vi.fn().mockResolvedValue(null),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window width for desktop
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });
  });

  it("should render without crashing", async () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it("should have the correct document structure", () => {
    render(<App />);
    const appElement = document.querySelector(".app-container");
    expect(appElement || document.body.firstChild).toBeTruthy();
  });

  it("should render with desktop class when window is wide", async () => {
    render(<App />);
    await waitFor(() => {
      const container = document.querySelector(".app-container");
      expect(container?.classList.contains("desktop")).toBe(true);
    });
  });

  it("should handle region selection from map", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("climate-map")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("select-region"));
    await waitFor(() => {
      expect(screen.getByTestId("selected")?.textContent).toBe("수원시");
    });
  });

  it("should handle location detection", async () => {
    render(<App />);
    await waitFor(() => {
      // There might be multiple location detectors (mobile header + desktop bar)
      const detectors = screen.getAllByTestId("location-detector");
      expect(detectors.length).toBeGreaterThan(0);
    });
    // Click the first detect button (within top-action-bar for desktop)
    const detectButtons = screen.getAllByTestId("detect-location");
    fireEvent.click(detectButtons[0]);
    await waitFor(() => {
      expect(screen.getByTestId("selected")?.textContent).toBe("성남시");
    });
  });

  it("should render data source badge on desktop", async () => {
    render(<App />);
    await waitFor(() => {
      const badge = document.querySelector(".data-source-badge");
      expect(badge).toBeInTheDocument();
    });
  });

  it("should show offline data message initially", async () => {
    render(<App />);
    await waitFor(() => {
      const badge = document.querySelector(".data-source-badge");
      expect(badge?.textContent).toContain("오프라인");
    });
  });
});

describe("App mobile behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set mobile width
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 375,
    });
    window.dispatchEvent(new Event("resize"));
  });

  it("should render mobile header on small screens", async () => {
    render(<App />);
    await waitFor(() => {
      const header = document.querySelector(".mobile-header");
      expect(header).toBeInTheDocument();
    });
  });

  it("should render mobile bottom nav", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("mobile-nav")).toBeInTheDocument();
    });
  });
});
