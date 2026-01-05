import React from "react";

const NAV_ITEMS = [
  { id: "map", icon: "🗺️", label: "지도" },
  { id: "info", icon: "🌡️", label: "기후" },
  { id: "ootd", icon: "👔", label: "옷차림" },
  { id: "report", icon: "📢", label: "제보" },
  { id: "more", icon: "☰", label: "더보기" },
];

function MobileBottomNav({ activeTab, onTabChange, selectedRegion }) {
  return (
    <nav className="mobile-bottom-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeTab === item.id ? "active" : ""} ${
            item.id !== "map" && !selectedRegion ? "disabled" : ""
          }`}
          onClick={() => {
            if (item.id === "map" || selectedRegion) {
              onTabChange(item.id);
            }
          }}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          {activeTab === item.id && <span className="nav-indicator" />}
        </button>
      ))}
    </nav>
  );
}

export default MobileBottomNav;
