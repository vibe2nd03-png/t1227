import React, { useState, useMemo } from "react";

// 경기도 지역별 추천 장소 데이터
const OUTDOOR_SPOTS = {
  가평군: [
    { name: "자라섬", type: "park", description: "캠핑과 피크닉의 성지" },
    {
      name: "아침고요수목원",
      type: "park",
      description: "사계절 아름다운 정원",
    },
    { name: "남이섬", type: "park", description: "가족 나들이 명소" },
  ],
  양평군: [
    {
      name: "두물머리",
      type: "park",
      description: "한강과 북한강이 만나는 곳",
    },
    { name: "세미원", type: "park", description: "연꽃 테마 수생식물원" },
  ],
  연천군: [
    { name: "재인폭포", type: "nature", description: "시원한 폭포 트레킹" },
    { name: "한탄강 주상절리", type: "nature", description: "지질학적 명소" },
  ],
  포천시: [
    { name: "산정호수", type: "park", description: "호수 둘레길 산책" },
    { name: "허브아일랜드", type: "park", description: "허브 테마파크" },
  ],
  파주시: [
    {
      name: "헤이리 예술마을",
      type: "culture",
      description: "예술과 카페의 거리",
    },
    { name: "임진각", type: "culture", description: "평화와 역사의 공간" },
  ],
};

// 실내 대안 장소
const INDOOR_ALTERNATIVES = {
  키즈카페: [
    { name: "플레이타임", regions: ["수원시", "성남시", "용인시"] },
    { name: "챔피언키즈", regions: ["고양시", "부천시", "안양시"] },
    { name: "뽀로로파크", regions: ["수원시", "고양시"] },
  ],
  실내체험: [
    {
      name: "경기도어린이박물관",
      region: "용인시",
      description: "체험형 어린이 박물관",
    },
    { name: "국립과천과학관", region: "과천시", description: "과학 체험 전시" },
    {
      name: "롯데월드 아쿠아리움",
      region: "수원시",
      description: "해양생물 관람",
    },
  ],
  쇼핑몰: [
    { name: "스타필드", regions: ["고양시", "하남시"] },
    { name: "현대백화점", regions: ["성남시", "수원시", "고양시"] },
  ],
};

// 드라이브 코스 데이터
const DRIVE_COURSES = [
  {
    name: "북한강 드라이브",
    description: "청평댐 → 남이섬 → 춘천 방향",
    regions: ["가평군", "양평군"],
    distance: "약 50km",
    time: "1시간 30분",
    highlight: "강변 드라이브, 카페거리",
  },
  {
    name: "DMZ 평화 드라이브",
    description: "파주 → 연천 → 철원 방향",
    regions: ["파주시", "연천군"],
    distance: "약 60km",
    time: "2시간",
    highlight: "평화로운 시골 풍경",
  },
  {
    name: "포천 산악 드라이브",
    description: "의정부 → 포천 → 산정호수",
    regions: ["의정부시", "포천시"],
    distance: "약 40km",
    time: "1시간",
    highlight: "산악 경관, 맑은 공기",
  },
  {
    name: "양평 힐링 드라이브",
    description: "팔당댐 → 양평 → 용문사",
    regions: ["하남시", "양평군"],
    distance: "약 45km",
    time: "1시간 20분",
    highlight: "한강 상류 풍경",
  },
];

// 미세먼지 등급 판정
const getAirQualityGrade = (pm10, pm25) => {
  const pm10Grade =
    pm10 <= 30
      ? "good"
      : pm10 <= 50
        ? "normal"
        : pm10 <= 100
          ? "bad"
          : "veryBad";
  const pm25Grade =
    pm25 <= 15
      ? "good"
      : pm25 <= 25
        ? "normal"
        : pm25 <= 50
          ? "bad"
          : "veryBad";

  const grades = { good: 1, normal: 2, bad: 3, veryBad: 4 };
  return grades[pm10Grade] > grades[pm25Grade] ? pm10Grade : pm25Grade;
};

const gradeLabels = {
  good: { label: "좋음", color: "#4CAF50", emoji: "😊" },
  normal: { label: "보통", color: "#FFC107", emoji: "😐" },
  bad: { label: "나쁨", color: "#FF9800", emoji: "😷" },
  veryBad: { label: "매우나쁨", color: "#F44336", emoji: "🤢" },
};

function AirQualityNav({ climateData, onRegionSelect, isModal = false }) {
  const [activeTab, setActiveTab] = useState("clean"); // clean, drive, alternative
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false); // 토글 버튼용 (모달 아닐 때만 사용)

  // 청정 구역 랭킹 계산
  const cleanZoneRanking = useMemo(() => {
    if (!climateData || climateData.length === 0) return [];

    return climateData
      .map((region) => ({
        ...region,
        airScore:
          (region.climate_data?.pm10 || 50) +
          (region.climate_data?.pm25 || 25) * 2,
        grade: getAirQualityGrade(
          region.climate_data?.pm10 || 50,
          region.climate_data?.pm25 || 25,
        ),
      }))
      .sort((a, b) => a.airScore - b.airScore);
  }, [climateData]);

  // 최고 청정 지역
  const cleanestZone = cleanZoneRanking[0];

  // 추천 드라이브 코스 (청정 구역 기반)
  const recommendedCourses = useMemo(() => {
    if (cleanZoneRanking.length === 0) return DRIVE_COURSES;

    const cleanRegions = cleanZoneRanking
      .filter((r) => r.grade === "good" || r.grade === "normal")
      .map((r) => r.region);

    return DRIVE_COURSES.map((course) => {
      const cleanCount = course.regions.filter((r) =>
        cleanRegions.includes(r),
      ).length;
      const avgAirScore =
        course.regions.reduce((sum, r) => {
          const regionData = cleanZoneRanking.find((cr) => cr.region === r);
          return sum + (regionData?.airScore || 100);
        }, 0) / course.regions.length;

      return {
        ...course,
        cleanCount,
        avgAirScore,
        recommended: cleanCount === course.regions.length,
      };
    }).sort((a, b) => a.avgAirScore - b.avgAirScore);
  }, [cleanZoneRanking]);

  // 야외활동 가능 여부 체크 (향후 사용 예정)
  const _getOutdoorAdvice = (region) => {
    const regionData = cleanZoneRanking.find((r) => r.region === region);
    if (!regionData) return null;

    const { grade } = regionData;

    if (grade === "good") {
      return {
        safe: true,
        message: "야외활동 최적! 마음껏 뛰어놀아도 좋아요",
        emoji: "🌳",
        spots: OUTDOOR_SPOTS[region] || [],
      };
    } else if (grade === "normal") {
      return {
        safe: true,
        message: "야외활동 가능, 민감군은 주의",
        emoji: "⚠️",
        spots: OUTDOOR_SPOTS[region] || [],
      };
    } else {
      return {
        safe: false,
        message: `미세먼지 ${gradeLabels[grade].label}! 실내 활동을 권장합니다`,
        emoji: "🏠",
        alternatives: INDOOR_ALTERNATIVES,
      };
    }
  };

  // 데이터 없으면 숨김 (모달이 아닐 때만)
  if (!isModal && (!climateData || climateData.length === 0)) return null;

  // 패널을 보여줄지 결정: 모달이면 항상 보여줌, 아니면 isExpanded 체크
  const showPanel = isModal || isExpanded;

  return (
    <div className={`air-quality-nav ${isModal ? "modal-mode" : ""}`}>
      {/* 토글 버튼 - 모달이 아닐 때만 표시 */}
      {!isModal && (
        <button
          className={`nav-toggle-btn ${isExpanded ? "active" : ""}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="toggle-icon">🌬️</span>
          <span>호흡기 안전 네비</span>
          {cleanestZone && (
            <span className="clean-badge">
              {gradeLabels[cleanestZone.grade]?.emoji}
            </span>
          )}
        </button>
      )}

      {/* 데이터 로딩 중 또는 없음 - 모달일 때만 표시 */}
      {isModal && (!climateData || climateData.length === 0) && (
        <div className="nav-loading">
          <span className="loading-emoji">🌬️</span>
          <p>기후 데이터를 불러오는 중...</p>
        </div>
      )}

      {/* 패널 내용 - 모달이면 항상, 아니면 확장됐을 때 */}
      {showPanel && climateData && climateData.length > 0 && (
        <div className="nav-panel-content">
          {/* 헤더: 오늘의 청정 지역 */}
          <div className="nav-header">
            {cleanestZone ? (
              <div className="clean-zone-highlight">
                <span className="highlight-emoji">🏆</span>
                <div className="highlight-text">
                  <p className="highlight-label">
                    지금 경기도에서 폐가 가장 깨끗해지는 곳
                  </p>
                  <h3
                    className="highlight-region"
                    onClick={() => onRegionSelect?.(cleanestZone)}
                  >
                    {cleanestZone.region}
                    <span className="region-score">
                      PM10: {cleanestZone.climate_data?.pm10 ?? "-"}㎍/㎥ |
                      PM2.5: {cleanestZone.climate_data?.pm25 ?? "-"}㎍/㎥
                    </span>
                  </h3>
                </div>
              </div>
            ) : (
              <div className="clean-zone-highlight">
                <span className="highlight-emoji">⏳</span>
                <div className="highlight-text">
                  <p className="highlight-label">
                    청정 지역 정보를 불러오는 중...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 탭 메뉴 */}
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === "clean" ? "active" : ""}`}
              onClick={() => setActiveTab("clean")}
            >
              🌿 청정 구역
            </button>
            <button
              className={`nav-tab ${activeTab === "drive" ? "active" : ""}`}
              onClick={() => setActiveTab("drive")}
            >
              🚗 드라이브
            </button>
            <button
              className={`nav-tab ${activeTab === "alternative" ? "active" : ""}`}
              onClick={() => setActiveTab("alternative")}
            >
              🏠 실내 대안
            </button>
          </div>

          {/* 청정 구역 탭 */}
          {activeTab === "clean" && (
            <div className="tab-content clean-zones">
              <h4>🌳 오늘의 청정 구역 TOP 5</h4>
              <div className="zone-list">
                {(cleanZoneRanking || []).slice(0, 5).map((zone, idx) => (
                  <div
                    key={zone.region}
                    className={`zone-item ${zone.grade || "normal"}`}
                    onClick={() => onRegionSelect?.(zone)}
                  >
                    <span className="zone-rank">#{idx + 1}</span>
                    <div className="zone-info">
                      <span className="zone-name">{zone.region}</span>
                      <span className="zone-data">
                        PM10: {zone.climate_data?.pm10 ?? "-"} | PM2.5:{" "}
                        {zone.climate_data?.pm25 ?? "-"}
                      </span>
                    </div>
                    <span className={`zone-badge ${zone.grade || "normal"}`}>
                      {gradeLabels[zone.grade]?.emoji || "😐"}{" "}
                      {gradeLabels[zone.grade]?.label || "보통"}
                    </span>
                  </div>
                ))}
              </div>

              {/* 피해야 할 지역 */}
              <h4 className="avoid-title">⚠️ 오늘은 피하세요</h4>
              <div className="zone-list avoid">
                {(cleanZoneRanking || [])
                  .filter((z) => z.grade === "bad" || z.grade === "veryBad")
                  .slice(0, 3)
                  .map((zone) => (
                    <div
                      key={zone.region}
                      className={`zone-item ${zone.grade || "bad"}`}
                    >
                      <span className="zone-name">{zone.region}</span>
                      <span className={`zone-badge ${zone.grade || "bad"}`}>
                        {gradeLabels[zone.grade]?.emoji || "😷"}{" "}
                        {gradeLabels[zone.grade]?.label || "나쁨"}
                      </span>
                    </div>
                  ))}
                {cleanZoneRanking.filter(
                  (z) => z.grade === "bad" || z.grade === "veryBad",
                ).length === 0 && (
                  <p className="no-avoid">오늘은 모든 지역이 양호합니다! 🎉</p>
                )}
              </div>
            </div>
          )}

          {/* 드라이브 코스 탭 */}
          {activeTab === "drive" && (
            <div className="tab-content drive-courses">
              <h4>🚗 청정 드라이브 코스 추천</h4>
              <div className="course-list">
                {recommendedCourses.map((course, idx) => (
                  <div
                    key={course.name}
                    className={`course-item ${course.recommended ? "recommended" : ""}`}
                    onClick={() =>
                      setSelectedCourse(selectedCourse === idx ? null : idx)
                    }
                  >
                    <div className="course-header">
                      {course.recommended && (
                        <span className="rec-badge">추천</span>
                      )}
                      <h5>{course.name}</h5>
                      <span className="course-meta">
                        {course.distance} · {course.time}
                      </span>
                    </div>

                    {selectedCourse === idx && (
                      <div className="course-detail">
                        <p className="course-route">{course.description}</p>
                        <p className="course-highlight">
                          ✨ {course.highlight}
                        </p>
                        <div className="course-regions">
                          {course.regions.map((region) => {
                            const regionData = cleanZoneRanking.find(
                              (r) => r.region === region,
                            );
                            const grade = regionData?.grade || "normal";
                            return (
                              <span
                                key={region}
                                className={`region-chip ${grade}`}
                              >
                                {region} {gradeLabels[grade]?.emoji}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 실내 대안 탭 */}
          {activeTab === "alternative" && (
            <div className="tab-content alternatives">
              <h4>🏠 미세먼지 나쁜 날 실내 대안</h4>

              <div className="alt-category">
                <h5>👶 키즈카페</h5>
                <div className="alt-list">
                  {INDOOR_ALTERNATIVES["키즈카페"].map((place) => (
                    <div key={place.name} className="alt-item">
                      <span className="alt-name">{place.name}</span>
                      <span className="alt-regions">
                        {place.regions.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="alt-category">
                <h5>🔬 실내 체험</h5>
                <div className="alt-list">
                  {INDOOR_ALTERNATIVES["실내체험"].map((place) => (
                    <div key={place.name} className="alt-item">
                      <span className="alt-name">{place.name}</span>
                      <span className="alt-desc">{place.description}</span>
                      <span className="alt-region">{place.region}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="alt-category">
                <h5>🛍️ 쇼핑몰</h5>
                <div className="alt-list">
                  {INDOOR_ALTERNATIVES["쇼핑몰"].map((place) => (
                    <div key={place.name} className="alt-item">
                      <span className="alt-name">{place.name}</span>
                      <span className="alt-regions">
                        {place.regions.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="alt-tip">
                <span className="tip-icon">💡</span>
                <p>
                  미세먼지가 심한 날에는 실내 활동이 안전합니다.
                  <br />
                  외출 시에는 KF94 마스크를 착용하세요!
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AirQualityNav;
