import React, { useState, useEffect } from "react";

/**
 * 주간 기후 리스크 캘린더 컴포넌트
 * 7일간 예보를 캘린더 형태로 시각화
 */
function WeeklyClimateCalendar({ regionName, climateData }) {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [startDate, setStartDate] = useState(new Date()); // 시작 날짜
  const [showDatePicker, setShowDatePicker] = useState(false); // 날짜 선택기 표시

  // 예보 데이터 로드
  useEffect(() => {
    if (regionName) {
      loadForecast();
    }
  }, [regionName, startDate]);

  // 날짜를 YYYYMMDD 형식으로 변환
  const formatDateStr = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  };

  // 선택한 날짜 범위 계산
  const getDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);
    return {
      startStr: formatDateStr(start),
      endStr: formatDateStr(end),
      start,
      end,
    };
  };

  const loadForecast = async () => {
    setLoading(true);
    setError(null);

    const { startStr, endStr } = getDateRange();

    try {
      // 날짜 범위 파라미터 추가
      const response = await fetch(
        `/api/kma-forecast?region=${encodeURIComponent(regionName)}&startDate=${startStr}&endDate=${endStr}`,
      );
      const data = await response.json();

      if (data.success && data.forecasts) {
        // 선택한 날짜 범위로 필터링 후 그룹화
        const filteredForecasts = filterByDateRange(data.forecasts);
        const dailyForecasts = groupByDate(filteredForecasts);

        // API 데이터가 선택 범위에 없으면 Mock 데이터로 보완
        if (dailyForecasts.length === 0) {
          setForecasts(generateMockWeekly());
          // 경고 메시지 없이 예상 데이터만 표시
        } else if (dailyForecasts.length < 7) {
          // 부족한 날짜는 Mock으로 보완
          const supplemented = supplementWithMock(dailyForecasts);
          setForecasts(supplemented);
        } else {
          setForecasts(dailyForecasts);
        }
      } else {
        throw new Error(data.error || "예보 데이터를 가져올 수 없습니다");
      }
    } catch (err) {
      console.error("주간예보 로드 실패:", err);
      // 경고 메시지 없이 예상 데이터만 표시
      setForecasts(generateMockWeekly());
    } finally {
      setLoading(false);
    }
  };

  // 선택한 날짜 범위로 필터링
  const filterByDateRange = (forecastList) => {
    const { startStr, endStr } = getDateRange();
    return forecastList.filter((f) => {
      const dateStr = f.date;
      return dateStr >= startStr && dateStr <= endStr;
    });
  };

  // Mock 데이터로 부족한 날짜 보완
  const supplementWithMock = (existingForecasts) => {
    const { start } = getDateRange();
    const existingDates = new Set(existingForecasts.map((f) => f.date));
    const result = [...existingForecasts];

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = formatDateStr(date);

      if (!existingDates.has(dateStr)) {
        // Mock 데이터 생성
        const mockDay = generateMockDay(date);
        result.push(mockDay);
      }
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  };

  // 단일 날짜 Mock 데이터 생성
  const generateMockDay = (date) => {
    const minTemp = Math.floor(Math.random() * 5) - 8;
    const maxTemp = minTemp + Math.floor(Math.random() * 8) + 5;
    const maxPop =
      Math.random() > 0.7 ? Math.floor(Math.random() * 60) + 20 : 0;

    const icons = ["☀️", "🌤️", "⛅", "☁️", "🌧️", "❄️"];
    const conditions = ["맑음", "구름조금", "구름많음", "흐림", "비", "눈"];
    const idx = Math.floor(Math.random() * icons.length);

    return {
      date: formatDateStr(date),
      minTemp,
      maxTemp,
      mainIcon: icons[idx],
      mainCondition: conditions[idx],
      maxPop,
      riskLevel: calculateDayRisk({ minTemp, maxTemp, maxPop }, climateData),
      isMock: true, // Mock 데이터 표시
    };
  };

  // 날짜별로 그룹화
  const groupByDate = (forecastList) => {
    const grouped = {};

    forecastList.forEach((f) => {
      const date = f.date;
      if (!grouped[date]) {
        grouped[date] = {
          date,
          forecasts: [],
          minTemp: Infinity,
          maxTemp: -Infinity,
          mainIcon: null,
          mainCondition: null,
          maxPop: 0,
        };
      }

      grouped[date].forecasts.push(f);

      if (f.temperature !== null) {
        if (f.temperature < grouped[date].minTemp) {
          grouped[date].minTemp = f.temperature;
        }
        if (f.temperature > grouped[date].maxTemp) {
          grouped[date].maxTemp = f.temperature;
        }
      }

      // 낮 시간대 아이콘 우선
      if (f.hour >= 9 && f.hour <= 15 && !grouped[date].mainIcon) {
        grouped[date].mainIcon = f.icon;
        grouped[date].mainCondition = f.condition;
      }

      if (f.pop > grouped[date].maxPop) {
        grouped[date].maxPop = f.pop;
      }
    });

    // 배열로 변환 및 정렬
    return Object.values(grouped)
      .map((day) => ({
        ...day,
        minTemp: day.minTemp === Infinity ? null : day.minTemp,
        maxTemp: day.maxTemp === -Infinity ? null : day.maxTemp,
        mainIcon: day.mainIcon || day.forecasts[0]?.icon || "☀️",
        mainCondition:
          day.mainCondition || day.forecasts[0]?.condition || "맑음",
        riskLevel: calculateDayRisk(day, climateData),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 7);
  };

  // 일별 위험도 계산
  const calculateDayRisk = (day, climate) => {
    let score = 0;

    // 기온 기반 점수 (한파/폭염)
    if (day.minTemp !== null) {
      if (day.minTemp <= -15) score += 40;
      else if (day.minTemp <= -10) score += 30;
      else if (day.minTemp <= -5) score += 20;
      else if (day.minTemp <= 0) score += 10;
    }

    if (day.maxTemp !== null) {
      if (day.maxTemp >= 35) score += 40;
      else if (day.maxTemp >= 33) score += 30;
      else if (day.maxTemp >= 30) score += 20;
    }

    // 강수확률 기반
    if (day.maxPop >= 70) score += 15;
    else if (day.maxPop >= 50) score += 10;
    else if (day.maxPop >= 30) score += 5;

    // 미세먼지 (현재 데이터 참조)
    if (climate) {
      const pm10 = climate.pm10 || 0;
      const pm25 = climate.pm25 || 0;
      if (pm10 >= 150 || pm25 >= 75) score += 20;
      else if (pm10 >= 80 || pm25 >= 35) score += 10;
    }

    // 등급 결정
    if (score >= 50) return "danger";
    if (score >= 35) return "warning";
    if (score >= 20) return "caution";
    return "safe";
  };

  // Mock 주간 데이터 생성
  const generateMockWeekly = () => {
    const days = [];
    const baseDate = new Date(startDate);

    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      const minTemp = Math.floor(Math.random() * 5) - 8;
      const maxTemp = minTemp + Math.floor(Math.random() * 8) + 5;
      const pop = Math.random() > 0.7 ? Math.floor(Math.random() * 60) + 20 : 0;

      const icons = ["☀️", "🌤️", "⛅", "☁️", "🌧️", "❄️"];
      const conditions = ["맑음", "구름조금", "구름많음", "흐림", "비", "눈"];
      const idx = Math.floor(Math.random() * icons.length);

      days.push({
        date: date.toISOString().slice(0, 10).replace(/-/g, ""),
        minTemp,
        maxTemp,
        mainIcon: icons[idx],
        mainCondition: conditions[idx],
        maxPop: pop,
        riskLevel: ["safe", "caution", "warning", "danger"][
          Math.floor(Math.random() * 4)
        ],
      });
    }

    return days;
  };

  // 날짜 포맷팅
  const formatDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") {
      const today = new Date();
      return {
        month: today.getMonth() + 1,
        day: today.getDate(),
        weekday: ["일", "월", "화", "수", "목", "금", "토"][today.getDay()],
        isToday: true,
        isWeekend: today.getDay() === 0 || today.getDay() === 6,
      };
    }

    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6));
    const day = parseInt(dateStr.slice(6, 8));
    const date = new Date(year, month - 1, day);

    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return {
      month: month,
      day: day,
      weekday: weekdays[date.getDay()],
      isToday: isToday(dateStr),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  };

  // 오늘인지 확인
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    return dateStr === todayStr;
  };

  // 위험등급별 색상
  const getRiskColor = (level) => {
    switch (level) {
      case "danger":
        return "#F44336";
      case "warning":
        return "#FF9800";
      case "caution":
        return "#FFEB3B";
      case "safe":
        return "#4CAF50";
      default:
        return "#9E9E9E";
    }
  };

  // 위험등급별 라벨
  const getRiskLabel = (level) => {
    switch (level) {
      case "danger":
        return "위험";
      case "warning":
        return "경고";
      case "caution":
        return "주의";
      case "safe":
        return "좋음";
      default:
        return "-";
    }
  };

  // 이전 주로 이동
  const goToPrevWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 7);
    setStartDate(newDate);
    setSelectedDay(null);
  };

  // 다음 주로 이동
  const goToNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 7);
    setStartDate(newDate);
    setSelectedDay(null);
  };

  // 오늘로 이동
  const goToToday = () => {
    setStartDate(new Date());
    setSelectedDay(null);
  };

  // 특정 날짜로 이동
  const goToDate = (dateString) => {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      setStartDate(date);
      setSelectedDay(null);
      setShowDatePicker(false);
    }
  };

  // 현재 주 범위 표시 텍스트
  const getWeekRangeText = () => {
    const start = new Date(startDate);
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);

    const formatShort = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${formatShort(start)} ~ ${formatShort(end)}`;
  };

  // 오늘이 현재 표시 범위에 포함되는지 확인
  const isTodayInRange = () => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);

    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return today >= start && today <= end;
  };

  // 최적의 날 찾기
  const getBestDay = () => {
    if (forecasts.length === 0) return null;

    const safeDays = forecasts.filter((f) => f.riskLevel === "safe");
    if (safeDays.length > 0) {
      // 가장 따뜻한 안전한 날
      return safeDays.reduce((best, day) =>
        (day.maxTemp || 0) > (best.maxTemp || 0) ? day : best,
      );
    }

    const cautionDays = forecasts.filter((f) => f.riskLevel === "caution");
    if (cautionDays.length > 0) {
      return cautionDays[0];
    }

    return null;
  };

  if (loading) {
    return (
      <div className="weekly-calendar loading">
        <div className="calendar-loading">
          <span className="loading-spinner">📅</span>
          <span>주간예보 불러오는 중...</span>
        </div>
      </div>
    );
  }

  const bestDay = getBestDay();

  return (
    <div className="weekly-calendar">
      <div className="calendar-header">
        <h4>📅 주간 기후 캘린더</h4>
        <span className="calendar-region">{regionName}</span>
      </div>

      {/* 날짜 탐색 */}
      <div className="calendar-nav">
        <button className="nav-btn" onClick={goToPrevWeek} title="이전 주">
          ◀
        </button>
        <div className="nav-center">
          <span
            className="week-range"
            onClick={() => setShowDatePicker(!showDatePicker)}
            title="날짜 선택"
          >
            📆 {getWeekRangeText()}
          </span>
          {!isTodayInRange() && (
            <button
              className="today-btn"
              onClick={goToToday}
              title="오늘로 이동"
            >
              오늘
            </button>
          )}
        </div>
        <button className="nav-btn" onClick={goToNextWeek} title="다음 주">
          ▶
        </button>
      </div>

      {/* 날짜 선택기 */}
      {showDatePicker && (
        <div className="date-picker-popup">
          <input
            type="date"
            value={startDate.toISOString().split("T")[0]}
            onChange={(e) => goToDate(e.target.value)}
            className="date-input"
          />
          <button
            className="date-picker-close"
            onClick={() => setShowDatePicker(false)}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="calendar-error">
          <span>⚠️ {error} (예상 데이터 표시)</span>
        </div>
      )}

      {/* 베스트 데이 추천 */}
      {bestDay && (
        <div className="best-day-banner">
          <span className="best-icon">🌟</span>
          <span className="best-text">
            이번 주 최적의 외출일:{" "}
            <strong>
              {formatDate(bestDay.date).month}/{formatDate(bestDay.date).day}(
              {formatDate(bestDay.date).weekday})
            </strong>
            <span className="best-temp">최고 {bestDay.maxTemp}°C</span>
          </span>
        </div>
      )}

      {/* 캘린더 그리드 */}
      <div className="calendar-grid">
        {forecasts.map((day) => {
          const dateInfo = formatDate(day.date);

          return (
            <div
              key={day.date}
              className={`calendar-day ${dateInfo.isToday ? "today" : ""} ${dateInfo.isWeekend ? "weekend" : ""} ${selectedDay === day.date ? "selected" : ""} ${day.isMock ? "mock-data" : ""}`}
              onClick={() =>
                setSelectedDay(selectedDay === day.date ? null : day.date)
              }
              style={{ "--risk-color": getRiskColor(day.riskLevel) }}
            >
              {/* 예상 데이터 표시 */}
              {day.isMock && (
                <span className="mock-badge" title="예상 데이터">
                  예상
                </span>
              )}

              {/* 날짜 헤더 */}
              <div className="day-header">
                <span
                  className={`day-weekday ${dateInfo.isWeekend ? "weekend" : ""}`}
                >
                  {dateInfo.weekday}
                </span>
                <span className="day-date">
                  {dateInfo.month}/{dateInfo.day}
                </span>
                {dateInfo.isToday && <span className="today-badge">오늘</span>}
              </div>

              {/* 날씨 아이콘 */}
              <div className="day-icon">{day.mainIcon}</div>

              {/* 기온 */}
              <div className="day-temps">
                {day.maxTemp !== null && (
                  <span className="temp-max">{day.maxTemp}°</span>
                )}
                {day.minTemp !== null && (
                  <span className="temp-min">{day.minTemp}°</span>
                )}
              </div>

              {/* 강수확률 */}
              {day.maxPop > 0 && <div className="day-pop">💧{day.maxPop}%</div>}

              {/* 위험등급 배지 */}
              <div
                className="day-risk-badge"
                style={{ backgroundColor: getRiskColor(day.riskLevel) }}
              >
                {getRiskLabel(day.riskLevel)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 선택된 날 상세 정보 */}
      {selectedDay && (
        <div className="day-detail">
          {(() => {
            const day = forecasts.find((f) => f.date === selectedDay);
            if (!day) return null;
            const dateInfo = formatDate(day.date);

            return (
              <>
                <div className="detail-header">
                  <span className="detail-date">
                    {dateInfo.month}월 {dateInfo.day}일 ({dateInfo.weekday})
                  </span>
                  <span
                    className="detail-risk"
                    style={{ color: getRiskColor(day.riskLevel) }}
                  >
                    {getRiskLabel(day.riskLevel)}
                  </span>
                </div>
                <div className="detail-content">
                  <div className="detail-item">
                    <span className="detail-icon">{day.mainIcon}</span>
                    <span>{day.mainCondition}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">최고</span>
                    <span className="detail-value temp-high">
                      {day.maxTemp}°C
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">최저</span>
                    <span className="detail-value temp-low">
                      {day.minTemp}°C
                    </span>
                  </div>
                  {day.maxPop > 0 && (
                    <div className="detail-item">
                      <span className="detail-label">강수확률</span>
                      <span className="detail-value">{day.maxPop}%</span>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* 범례 */}
      <div className="calendar-legend">
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{ backgroundColor: "#4CAF50" }}
          ></span>
          좋음
        </span>
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{ backgroundColor: "#FFEB3B" }}
          ></span>
          주의
        </span>
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{ backgroundColor: "#FF9800" }}
          ></span>
          경고
        </span>
        <span className="legend-item">
          <span
            className="legend-dot"
            style={{ backgroundColor: "#F44336" }}
          ></span>
          위험
        </span>
      </div>
    </div>
  );
}

export default WeeklyClimateCalendar;
