import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { getHistorical10YearAverage, GYEONGGI_STATIONS } from '../services/kmaApi';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// 과거 10년 평균 기본 데이터 (API 로딩 전 또는 실패 시 사용)
const DEFAULT_HISTORICAL_DATA = {
  // 월별 평균 데이터 (1월~12월) - 경기도 평균
  temperature: [-2.1, 0.5, 6.2, 12.8, 18.2, 22.8, 25.6, 26.1, 21.2, 14.5, 6.8, 0.1],
  humidity: [58, 54, 52, 53, 62, 72, 82, 80, 72, 66, 62, 60],
  pm10: [52, 58, 62, 55, 48, 42, 38, 35, 40, 45, 50, 55],
  pm25: [28, 32, 35, 30, 25, 22, 20, 18, 21, 24, 27, 30],
  uv_index: [2.5, 3.2, 4.8, 6.2, 7.5, 8.8, 9.2, 8.5, 6.8, 4.5, 2.8, 2.2],
};

// 지역별 보정 계수 (지형, 도시화 정도 등 반영)
const REGION_ADJUSTMENTS = {
  '수원시': { temp: 1.02, humidity: 1.0, pm: 1.05 },
  '고양시': { temp: 1.05, humidity: 1.02, pm: 1.1 },
  '화성시': { temp: 1.08, humidity: 1.0, pm: 1.15 },
  '용인시': { temp: 1.0, humidity: 1.0, pm: 1.0 },
  '성남시': { temp: 1.01, humidity: 1.0, pm: 1.03 },
  '부천시': { temp: 0.98, humidity: 1.02, pm: 1.08 },
  '안산시': { temp: 1.03, humidity: 1.05, pm: 1.12 },
  '남양주시': { temp: 0.97, humidity: 0.98, pm: 0.95 },
  '안양시': { temp: 1.0, humidity: 1.0, pm: 1.02 },
  '평택시': { temp: 1.04, humidity: 1.0, pm: 1.05 },
  '시흥시': { temp: 1.02, humidity: 1.03, pm: 1.1 },
  '파주시': { temp: 0.95, humidity: 0.98, pm: 0.92 },
  '김포시': { temp: 0.98, humidity: 1.02, pm: 1.0 },
  '의정부시': { temp: 0.96, humidity: 0.99, pm: 0.98 },
  '광주시': { temp: 1.0, humidity: 1.0, pm: 0.98 },
  '하남시': { temp: 1.01, humidity: 1.0, pm: 1.02 },
  '오산시': { temp: 1.06, humidity: 1.0, pm: 1.08 },
  '이천시': { temp: 0.98, humidity: 0.98, pm: 0.9 },
  '안성시': { temp: 0.99, humidity: 0.99, pm: 0.92 },
  '군포시': { temp: 0.99, humidity: 1.0, pm: 1.0 },
  '의왕시': { temp: 0.97, humidity: 0.99, pm: 0.95 },
  '양주시': { temp: 0.94, humidity: 0.98, pm: 0.9 },
  '포천시': { temp: 0.92, humidity: 0.97, pm: 0.85 },
  '여주시': { temp: 0.96, humidity: 0.98, pm: 0.88 },
  '동두천시': { temp: 0.9, humidity: 0.96, pm: 0.82 },
  '과천시': { temp: 0.98, humidity: 1.0, pm: 0.98 },
  '구리시': { temp: 1.0, humidity: 1.0, pm: 1.02 },
  '연천군': { temp: 0.88, humidity: 0.95, pm: 0.78 },
  '가평군': { temp: 0.85, humidity: 0.94, pm: 0.72 },
  '양평군': { temp: 0.93, humidity: 0.97, pm: 0.8 },
  '광명시': { temp: 0.99, humidity: 1.01, pm: 1.05 },
};

// 차트 유형
const CHART_TYPES = [
  { id: 'temperature', label: '온도', unit: '°C', color: '#FF6384' },
  { id: 'humidity', label: '습도', unit: '%', color: '#36A2EB' },
  { id: 'pm', label: '미세먼지', unit: 'μg/m³', color: '#FFCE56' },
  { id: 'uv', label: '자외선', unit: 'UV', color: '#9966FF' },
];

function WeatherComparisonChart({ region, climateData }) {
  const [activeChart, setActiveChart] = useState('temperature');
  const [viewMode, setViewMode] = useState('comparison'); // comparison, trend, bar
  const [historicalData, setHistoricalData] = useState(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [stationInfo, setStationInfo] = useState(null);

  const currentMonth = new Date().getMonth(); // 0-11

  // 기상청 API에서 과거 10년 데이터 로드
  const loadHistoricalFromApi = useCallback(async () => {
    if (!region || !GYEONGGI_STATIONS[region]) return;

    setIsLoadingApi(true);
    setApiError(null);
    setStationInfo(GYEONGGI_STATIONS[region]);

    try {
      // 현재 월의 10년 평균 데이터 조회
      const monthData = await getHistorical10YearAverage(region, currentMonth + 1);

      if (monthData) {
        setHistoricalData(prevData => ({
          ...(prevData || {}),
          apiData: monthData,
          hasApiData: true,
        }));
      }
    } catch (error) {
      console.error('기상청 API 로드 실패:', error);
      setApiError('기상청 데이터를 불러오지 못했습니다');
    } finally {
      setIsLoadingApi(false);
    }
  }, [region, currentMonth]);

  // 지역 변경 시 API 데이터 로드
  useEffect(() => {
    loadHistoricalFromApi();
  }, [loadHistoricalFromApi]);

  // 지역별 보정된 과거 데이터 계산
  const getHistoricalDataMemo = useMemo(() => {
    const adjustment = REGION_ADJUSTMENTS[region] || { temp: 1, humidity: 1, pm: 1 };

    // API 데이터가 있으면 해당 월 데이터 업데이트
    const baseData = {
      temperature: DEFAULT_HISTORICAL_DATA.temperature.map(v => +(v * adjustment.temp).toFixed(1)),
      humidity: DEFAULT_HISTORICAL_DATA.humidity.map(v => +(v * adjustment.humidity).toFixed(0)),
      pm10: DEFAULT_HISTORICAL_DATA.pm10.map(v => +(v * adjustment.pm).toFixed(0)),
      pm25: DEFAULT_HISTORICAL_DATA.pm25.map(v => +(v * adjustment.pm).toFixed(0)),
      uv_index: DEFAULT_HISTORICAL_DATA.uv_index.map(v => +v.toFixed(1)),
    };

    // API에서 가져온 실제 데이터로 현재 월 업데이트
    if (historicalData?.apiData) {
      const api = historicalData.apiData;
      if (api.temperature_avg !== null) {
        baseData.temperature[currentMonth] = +api.temperature_avg.toFixed(1);
      }
      if (api.humidity_avg !== null) {
        baseData.humidity[currentMonth] = +api.humidity_avg.toFixed(0);
      }
    }

    return baseData;
  }, [region, historicalData, currentMonth]);

  // 현재 데이터와 과거 평균 비교
  const comparisonData = useMemo(() => {
    if (!climateData) return null;

    const historicalAvg = getHistoricalDataMemo;
    const monthLabels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    // 현재 월 기준 과거 평균
    const currentMonthHistorical = {
      temperature: historicalAvg.temperature[currentMonth],
      humidity: historicalAvg.humidity[currentMonth],
      pm10: historicalAvg.pm10[currentMonth],
      pm25: historicalAvg.pm25[currentMonth],
      uv_index: historicalAvg.uv_index[currentMonth],
    };

    // 차이 계산
    const differences = {
      temperature: climateData.apparent_temperature - currentMonthHistorical.temperature,
      humidity: climateData.humidity - currentMonthHistorical.humidity,
      pm10: climateData.pm10 - currentMonthHistorical.pm10,
      pm25: climateData.pm25 - currentMonthHistorical.pm25,
      uv_index: climateData.uv_index - currentMonthHistorical.uv_index,
    };

    return {
      labels: monthLabels,
      historical: historicalAvg,
      current: climateData,
      currentMonthHistorical,
      differences,
      currentMonth,
    };
  }, [climateData, getHistoricalDataMemo, currentMonth]);

  // 온도 차트 데이터
  const temperatureChartData = useMemo(() => {
    if (!comparisonData) return null;

    const currentData = Array(12).fill(null);
    currentData[currentMonth] = climateData.apparent_temperature;

    return {
      labels: comparisonData.labels,
      datasets: [
        {
          label: '10년 평균 체감온도',
          data: comparisonData.historical.temperature,
          borderColor: 'rgba(54, 162, 235, 0.8)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: '오늘',
          data: currentData,
          borderColor: '#FF6384',
          backgroundColor: '#FF6384',
          pointRadius: 10,
          pointHoverRadius: 12,
          showLine: false,
        },
      ],
    };
  }, [comparisonData, climateData, currentMonth]);

  // 습도 차트 데이터
  const humidityChartData = useMemo(() => {
    if (!comparisonData) return null;

    const currentData = Array(12).fill(null);
    currentData[currentMonth] = climateData.humidity;

    return {
      labels: comparisonData.labels,
      datasets: [
        {
          label: '10년 평균 습도',
          data: comparisonData.historical.humidity,
          borderColor: 'rgba(75, 192, 192, 0.8)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: '오늘',
          data: currentData,
          borderColor: '#36A2EB',
          backgroundColor: '#36A2EB',
          pointRadius: 10,
          pointHoverRadius: 12,
          showLine: false,
        },
      ],
    };
  }, [comparisonData, climateData, currentMonth]);

  // 미세먼지 차트 데이터
  const pmChartData = useMemo(() => {
    if (!comparisonData) return null;

    return {
      labels: comparisonData.labels,
      datasets: [
        {
          label: '10년 평균 PM10',
          data: comparisonData.historical.pm10,
          borderColor: 'rgba(255, 206, 86, 0.8)',
          backgroundColor: 'rgba(255, 206, 86, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: '10년 평균 PM2.5',
          data: comparisonData.historical.pm25,
          borderColor: 'rgba(255, 159, 64, 0.8)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: '오늘 PM10',
          data: Array(12).fill(null).map((_, i) => i === currentMonth ? climateData.pm10 : null),
          borderColor: '#FFCE56',
          backgroundColor: '#FFCE56',
          pointRadius: 10,
          pointHoverRadius: 12,
          showLine: false,
        },
        {
          label: '오늘 PM2.5',
          data: Array(12).fill(null).map((_, i) => i === currentMonth ? climateData.pm25 : null),
          borderColor: '#FF9F40',
          backgroundColor: '#FF9F40',
          pointRadius: 10,
          pointHoverRadius: 12,
          showLine: false,
        },
      ],
    };
  }, [comparisonData, climateData, currentMonth]);

  // UV 차트 데이터
  const uvChartData = useMemo(() => {
    if (!comparisonData) return null;

    const currentData = Array(12).fill(null);
    currentData[currentMonth] = climateData.uv_index;

    return {
      labels: comparisonData.labels,
      datasets: [
        {
          label: '10년 평균 자외선지수',
          data: comparisonData.historical.uv_index,
          borderColor: 'rgba(153, 102, 255, 0.8)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: '오늘',
          data: currentData,
          borderColor: '#9966FF',
          backgroundColor: '#9966FF',
          pointRadius: 10,
          pointHoverRadius: 12,
          showLine: false,
        },
      ],
    };
  }, [comparisonData, climateData, currentMonth]);

  // 막대 차트 데이터 (오늘 vs 평균 비교)
  const barChartData = useMemo(() => {
    if (!comparisonData) return null;

    return {
      labels: ['체감온도', '습도', 'PM10', 'PM2.5', 'UV지수'],
      datasets: [
        {
          label: '10년 평균',
          data: [
            comparisonData.currentMonthHistorical.temperature,
            comparisonData.currentMonthHistorical.humidity,
            comparisonData.currentMonthHistorical.pm10,
            comparisonData.currentMonthHistorical.pm25,
            comparisonData.currentMonthHistorical.uv_index,
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: '오늘',
          data: [
            climateData.apparent_temperature,
            climateData.humidity,
            climateData.pm10,
            climateData.pm25,
            climateData.uv_index,
          ],
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [comparisonData, climateData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (value === null) return null;

            let unit = '';
            if (activeChart === 'temperature') unit = '°C';
            else if (activeChart === 'humidity') unit = '%';
            else if (activeChart === 'pm') unit = 'μg/m³';
            else if (activeChart === 'uv') unit = '';

            return `${label}: ${value}${unit}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: activeChart !== 'temperature',
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
      y: { grid: { display: false } },
    },
  };

  // 현재 차트 데이터 선택
  const getCurrentChartData = () => {
    switch (activeChart) {
      case 'temperature': return temperatureChartData;
      case 'humidity': return humidityChartData;
      case 'pm': return pmChartData;
      case 'uv': return uvChartData;
      default: return temperatureChartData;
    }
  };

  if (!region || !climateData) {
    return (
      <div className="weather-chart-placeholder">
        <div className="placeholder-icon">📊</div>
        <p>지역을 선택하면 과거 10년 데이터와<br />오늘의 날씨를 비교할 수 있습니다</p>
      </div>
    );
  }

  return (
    <div className="weather-comparison-chart">
      <div className="chart-header">
        <h3>📊 {region} 기후 비교</h3>
        <div className="view-mode-toggle">
          <button
            className={viewMode === 'comparison' ? 'active' : ''}
            onClick={() => setViewMode('comparison')}
          >
            연간추이
          </button>
          <button
            className={viewMode === 'bar' ? 'active' : ''}
            onClick={() => setViewMode('bar')}
          >
            오늘비교
          </button>
        </div>
      </div>

      {/* 차트 타입 선택 (연간추이 모드에서만) */}
      {viewMode === 'comparison' && (
        <div className="chart-type-tabs">
          {CHART_TYPES.map((type) => (
            <button
              key={type.id}
              className={`chart-tab ${activeChart === type.id ? 'active' : ''}`}
              onClick={() => setActiveChart(type.id)}
              style={{ '--tab-color': type.color }}
            >
              {type.label}
            </button>
          ))}
        </div>
      )}

      {/* 차트 영역 */}
      <div className="chart-container">
        {viewMode === 'comparison' ? (
          <Line data={getCurrentChartData()} options={chartOptions} />
        ) : (
          <Bar data={barChartData} options={barChartOptions} />
        )}
      </div>

      {/* 비교 요약 카드 */}
      {comparisonData && (
        <div className="comparison-summary">
          <div className="summary-card">
            <span className="summary-label">체감온도</span>
            <span className={`summary-value ${comparisonData.differences.temperature > 0 ? 'higher' : 'lower'}`}>
              {comparisonData.differences.temperature > 0 ? '+' : ''}
              {comparisonData.differences.temperature.toFixed(1)}°C
            </span>
            <span className="summary-note">평균 대비</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">습도</span>
            <span className={`summary-value ${comparisonData.differences.humidity > 0 ? 'higher' : 'lower'}`}>
              {comparisonData.differences.humidity > 0 ? '+' : ''}
              {comparisonData.differences.humidity.toFixed(0)}%
            </span>
            <span className="summary-note">평균 대비</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">PM2.5</span>
            <span className={`summary-value ${comparisonData.differences.pm25 > 0 ? 'higher' : 'lower'}`}>
              {comparisonData.differences.pm25 > 0 ? '+' : ''}
              {comparisonData.differences.pm25.toFixed(0)}
            </span>
            <span className="summary-note">μg/m³</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">UV</span>
            <span className={`summary-value ${comparisonData.differences.uv_index > 0 ? 'higher' : 'lower'}`}>
              {comparisonData.differences.uv_index > 0 ? '+' : ''}
              {comparisonData.differences.uv_index.toFixed(1)}
            </span>
            <span className="summary-note">지수</span>
          </div>
        </div>
      )}

      {/* 데이터 출처 안내 */}
      <div className="data-source-note">
        {isLoadingApi ? (
          <span>🔄 기상청 API 데이터 로딩 중...</span>
        ) : historicalData?.hasApiData ? (
          <span>✅ 기상청 {stationInfo?.name || ''} 관측소 10년 평균</span>
        ) : (
          <span>📌 과거 데이터: 기상청 10년 평균 (추정)</span>
        )}
        <a href="https://apihub.kma.go.kr" target="_blank" rel="noopener noreferrer">
          기상청 API 허브
        </a>
      </div>

      {/* 관측소 정보 */}
      {stationInfo?.note && (
        <div className="station-info-note">
          ℹ️ {stationInfo.note}
        </div>
      )}
    </div>
  );
}

export default WeatherComparisonChart;
