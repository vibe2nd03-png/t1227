import React from "react";

const NAV_ITEMS = [
  { id: "map", icon: "🗺️", label: "지도" },
  { id: "info", icon: "🌡️", label: "온도" },
  { id: "chart", icon: "📊", label: "10년비교" },
  { id: "ootd", icon: "👕", label: "옷추천" },
  { id: "report", icon: "📝", label: "체감제보" },
];

function MobileBottomNav({
  activeTab,
  onTabChange,
  selectedRegion: _selectedRegion,
}) {
  const handleClick = (itemId) => {
    onTabChange(itemId);
  };

  return (
    <nav className="mobile-bottom-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-item ${activeTab === item.id ? "active" : ""}`}
          onClick={() => handleClick(item.id)}
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
