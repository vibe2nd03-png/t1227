import React, { useState, useRef, useEffect } from "react";

function MobileBottomSheet({
  isOpen,
  onClose,
  snapPoints = ["90%", "50%", "0%"],
  initialSnap = 1,
  children,
  title,
  showHandle = true,
}) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef(null);

  // 스냅 포인트를 픽셀로 변환
  const getSnapHeight = (snapIndex) => {
    const point = snapPoints[snapIndex];
    if (point.endsWith("%")) {
      return (parseFloat(point) / 100) * window.innerHeight;
    }
    return parseFloat(point);
  };

  const handleTouchStart = (e) => {
    if (!e.target.closest(".sheet-handle-area")) return;
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(0);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    setCurrentY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // 드래그 방향과 거리에 따라 스냅 포인트 결정
    const threshold = 50;
    if (currentY > threshold && currentSnap < snapPoints.length - 1) {
      // 아래로 드래그 - 더 작은 높이로
      if (currentSnap === snapPoints.length - 2) {
        onClose();
      } else {
        setCurrentSnap(currentSnap + 1);
      }
    } else if (currentY < -threshold && currentSnap > 0) {
      // 위로 드래그 - 더 큰 높이로
      setCurrentSnap(currentSnap - 1);
    }
    setCurrentY(0);
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentSnap(initialSnap);
    }
  }, [isOpen, initialSnap]);

  if (!isOpen) return null;

  const baseHeight = getSnapHeight(currentSnap);
  const adjustedHeight = isDragging ? baseHeight - currentY : baseHeight;

  return (
    <>
      {/* 백드롭 */}
      <div
        className={`sheet-backdrop ${currentSnap === 0 ? "visible" : ""}`}
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div
        ref={sheetRef}
        className={`mobile-bottom-sheet ${isDragging ? "dragging" : ""}`}
        style={{
          height: `${Math.max(0, adjustedHeight)}px`,
          transition: isDragging
            ? "none"
            : "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 핸들 영역 */}
        <div className="sheet-handle-area">
          {showHandle && <div className="sheet-handle" />}
          {title && <h3 className="sheet-title">{title}</h3>}
        </div>

        {/* 콘텐츠 */}
        <div className="sheet-content">{children}</div>
      </div>
    </>
  );
}

export default MobileBottomSheet;
