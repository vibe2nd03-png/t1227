import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { getSurfaceDataPeriod, GYEONGGI_STATIONS } from "../services/kmaApi";

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// 차트 유형
const CHART_TYPES = [
  { id: "temperature", label: "온도", unit: "°C", color: "#FF6384" },
  { id: "humidity", label: "습도", unit: "%", color: "#36A2EB" },
  { id: "pm", label: "미세먼지", unit: "μg/m³", color: "#FFCE56" },
  { id: "uv", label: "자외선", unit: "UV", color: "#9966FF" },
];

// 날짜 값을 컴포넌트 외부에서 한 번만 계산 (리렌더링 방지)
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_MONTH = TODAY.getMonth() + 1;
const CURRENT_DATE = TODAY.getDate();
const MONTH_DAY = `${String(CURRENT_MONTH).padStart(2, "0")}${String(CURRENT_DATE).padStart(2, "0")}`;
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 9 + i);

function WeatherComparisonChart({ region, climateData }) {
  const [activeChart, setActiveChart] = useState("temperature");
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  // 연도별 오늘 날짜 데이터 로드
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!region || !GYEONGGI_STATIONS[region]) return;

      setIsLoading(true);
      setError(null);

      const station = GYEONGGI_STATIONS[region];

      try {
        // 각 연도의 오늘 날짜 데이터 조회 (병렬)
        const promises = YEARS.map(async (year) => {
          const startTime = `${year}${MONTH_DAY}0000`;
          const endTime = `${year}${MONTH_DAY}2300`;

          try {
            const data = await getSurfaceDataPeriod(
              startTime,
              endTime,
              station.stn,
            );
            if (data && data.length > 0) {
              // 12시 데이터 또는 가장 가까운 데이터 선택
              const noonData =
                data.find((d) => String(d.TM).includes("1200")) ||
                data[Math.floor(data.length / 2)];
              return {
                year,
                temperature: noonData.TA,
                humidity: noonData.HM,
                visibility: noonData.VS,
                windSpeed: noonData.WS,
                pressure: noonData.PS,
              };
            }
          } catch (e) {
            console.warn(`${year}년 데이터 조회 실패:`, e);
          }
          return { year, temperature: null, humidity: null, visibility: null };
        });

        const allResults = await Promise.all(promises);
        setHistoricalData(allResults.filter((r) => r.temperature !== null));
      } catch (err) {
        console.error("과거 데이터 로드 실패:", err);
        setError("데이터를 불러오지 못했습니다");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistoricalData();
  }, [region]);

  // 시정으로 미세먼지 추정
  const estimatePM = (visibility) => {
    if (visibility === null) return { pm10: null, pm25: null };
    if (visibility <= 100) return { pm10: 150, pm25: 80 };
    if (visibility <= 200) return { pm10: 100, pm25: 50 };
    if (visibility <= 500) return { pm10: 70, pm25: 35 };
    if (visibility <= 1000) return { pm10: 50, pm25: 25 };
    if (visibility <= 2000) return { pm10: 40, pm25: 20 };
    return { pm10: 30, pm25: 15 };
  };

  // UV 지수 추정 (12월 기준)
  const estimateUV = (month) => {
    const uvByMonth = [
      2.5, 3.2, 4.8, 6.2, 7.5, 8.8, 9.2, 8.5, 6.8, 4.5, 2.8, 2.2,
    ];
    return uvByMonth[month] || 3;
  };

  // 차트 데이터 생성 (안정적인 의존성만 사용)
  const chartData = useMemo(() => {
    if (historicalData.length === 0) return null;

    // 올해 데이터 추가 (현재 기상 데이터)
    const allData = [...historicalData];
    if (climateData && !allData.find((d) => d.year === CURRENT_YEAR)) {
      allData.push({
        year: CURRENT_YEAR,
        temperature: climateData.temperature,
        humidity: climateData.humidity,
        visibility: climateData.visibility,
      });
    }

    const sortedData = allData.sort((a, b) => a.year - b.year);
    const finalLabels = sortedData.map((d) => `${d.year}년`);

    return {
      temperature: {
        labels: finalLabels,
        datasets: [
          {
            label: `${CURRENT_MONTH}월 ${CURRENT_DATE}일 온도`,
            data: sortedData.map((d) => d.temperature),
            borderColor: "#FF6384",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            fill: true,
            tension: 0.3,
            pointRadius: 6,
            pointBackgroundColor: sortedData.map((d) =>
              d.year === CURRENT_YEAR ? "#FF6384" : "rgba(255, 99, 132, 0.6)",
            ),
            pointBorderWidth: sortedData.map((d) =>
              d.year === CURRENT_YEAR ? 3 : 1,
            ),
          },
        ],
      },
      humidity: {
        labels: finalLabels,
        datasets: [
          {
            label: `${CURRENT_MONTH}월 ${CURRENT_DATE}일 습도`,
            data: sortedData.map((d) => d.humidity),
            borderColor: "#36A2EB",
            backgroundColor: "rgba(54, 162, 235, 0.2)",
            fill: true,
            tension: 0.3,
            pointRadius: 6,
            pointBackgroundColor: sortedData.map((d) =>
              d.year === CURRENT_YEAR ? "#36A2EB" : "rgba(54, 162, 235, 0.6)",
            ),
            pointBorderWidth: sortedData.map((d) =>
              d.year === CURRENT_YEAR ? 3 : 1,
            ),
          },
        ],
      },
      pm: {
        labels: finalLabels,
        datasets: [
          {
            label: "PM10 (추정)",
            data: sortedData.map((d) => estimatePM(d.visibility).pm10),
            borderColor: "#FFCE56",
            backgroundColor: "rgba(255, 206, 86, 0.2)",
            fill: true,
            tension: 0.3,
            pointRadius: 6,
          },
          {
            label: "PM2.5 (추정)",
            data: sortedData.map((d) => estimatePM(d.visibility).pm25),
            borderColor: "#FF9F40",
            backgroundColor: "rgba(255, 159, 64, 0.2)",
            fill: true,
            tension: 0.3,
            pointRadius: 6,
          },
        ],
      },
      uv: {
        labels: finalLabels,
        datasets: [
          {
            label: `${CURRENT_MONTH}월 자외선지수 (추정)`,
            data: sortedData.map(() => estimateUV(CURRENT_MONTH - 1)),
            borderColor: "#9966FF",
            backgroundColor: "rgba(153, 102, 255, 0.2)",
            fill: true,
            tension: 0.3,
            pointRadius: 6,
          },
        ],
      },
    };
  }, [historicalData, climateData]);

  // 통계 계산
  const stats = useMemo(() => {
    if (historicalData.length === 0) return null;

    const temps = historicalData
      .map((d) => d.temperature)
      .filter((t) => t !== null);
    const humids = historicalData
      .map((d) => d.humidity)
      .filter((h) => h !== null);

    const avg = (arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr) => (arr.length > 0 ? Math.max(...arr) : 0);
    const min = (arr) => (arr.length > 0 ? Math.min(...arr) : 0);

    const currentTemp = climateData?.temperature || 0;
    const currentHumid = climateData?.humidity || 0;

    return {
      temperature: {
        avg: avg(temps),
        max: max(temps),
        min: min(temps),
        current: currentTemp,
        diff: currentTemp - avg(temps),
      },
      humidity: {
        avg: avg(humids),
        max: max(humids),
        min: min(humids),
        current: currentHumid,
        diff: currentHumid - avg(humids),
      },
    };
  }, [historicalData, climateData]);

  // chartOptions를 useMemo로 메모이제이션 (무한 리렌더링 방지)
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 200,
      plugins: {
        legend: {
          position: "top",
          labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed.y;
              if (value === null) return null;
              let unit = "";
              if (activeChart === "temperature") unit = "°C";
              else if (activeChart === "humidity") unit = "%";
              else if (activeChart === "pm") unit = "μg/m³";
              return `${context.dataset.label}: ${value}${unit}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: activeChart !== "temperature",
          grid: { color: "rgba(0, 0, 0, 0.05)" },
        },
        x: { grid: { display: false } },
      },
      animation: false, // 애니메이션 비활성화로 리사이즈 문제 방지
    }),
    [activeChart],
  );

  if (!region || !climateData) {
    return (
      <div className="weather-chart-placeholder">
        <div className="placeholder-icon">📊</div>
        <p>
          지역을 선택하면 연도별
          <br />
          오늘 날씨를 비교할 수 있습니다
        </p>
      </div>
    );
  }

  return (
    <div className="weather-comparison-chart">
      <div className="chart-header">
        <h3>📊 {region} 10년 비교</h3>
        <span className="chart-date">
          {CURRENT_MONTH}월 {CURRENT_DATE}일 기준
        </span>
      </div>

      {/* 차트 타입 선택 */}
      <div className="chart-type-tabs">
        {CHART_TYPES.map((type) => (
          <button
            key={type.id}
            className={`chart-tab ${activeChart === type.id ? "active" : ""}`}
            onClick={() => setActiveChart(type.id)}
            style={{ "--tab-color": type.color }}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* 차트 영역 - 고정 높이로 무한 확장 방지 */}
      <div
        className="chart-container"
        style={{
          height: "250px",
          maxHeight: "250px",
          minHeight: "250px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div className="chart-loading">
            <span>🔄 과거 10년 데이터 로딩 중...</span>
          </div>
        ) : error ? (
          <div className="chart-error">
            <span>⚠️ {error}</span>
          </div>
        ) : chartData ? (
          <Line
            ref={chartRef}
            key={`chart-${activeChart}-${region}`}
            data={chartData[activeChart]}
            options={chartOptions}
          />
        ) : (
          <div className="chart-loading">
            <span>데이터 없음</span>
          </div>
        )}
      </div>

      {/* 통계 요약 */}
      {stats && (
        <div className="comparison-summary">
          <div className="summary-card">
            <span className="summary-label">오늘 온도</span>
            <span
              className={`summary-value ${stats.temperature.diff > 0 ? "higher" : "lower"}`}
            >
              {stats.temperature.current.toFixed(1)}°C
            </span>
            <span className="summary-note">
              평균 대비 {stats.temperature.diff > 0 ? "+" : ""}
              {stats.temperature.diff.toFixed(1)}°C
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">10년 평균</span>
            <span className="summary-value neutral">
              {stats.temperature.avg.toFixed(1)}°C
            </span>
            <span className="summary-note">
              {stats.temperature.min.toFixed(1)} ~{" "}
              {stats.temperature.max.toFixed(1)}°C
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">오늘 습도</span>
            <span
              className={`summary-value ${stats.humidity.diff > 0 ? "higher" : "lower"}`}
            >
              {stats.humidity.current.toFixed(0)}%
            </span>
            <span className="summary-note">
              평균 대비 {stats.humidity.diff > 0 ? "+" : ""}
              {stats.humidity.diff.toFixed(0)}%
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">10년 평균</span>
            <span className="summary-value neutral">
              {stats.humidity.avg.toFixed(0)}%
            </span>
            <span className="summary-note">
              {stats.humidity.min.toFixed(0)} ~ {stats.humidity.max.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* 데이터 출처 */}
      <div className="data-source-note">
        <span>
          📌 기상청 API 허브 - 연도별 {CURRENT_MONTH}월 {CURRENT_DATE}일 12시
          관측자료
        </span>
        <a
          href="https://apihub.kma.go.kr"
          target="_blank"
          rel="noopener noreferrer"
        >
          기상청 API
        </a>
      </div>

      {/* 관측소 정보 */}
      {GYEONGGI_STATIONS[region]?.note && (
        <div className="station-info-note">
          ℹ️ {GYEONGGI_STATIONS[region].note}
        </div>
      )}
    </div>
  );
}

export default WeatherComparisonChart;
