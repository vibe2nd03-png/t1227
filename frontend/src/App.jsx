import React, { useState, useEffect } from 'react';
import ClimateMap from './components/ClimateMap';
import Sidebar from './components/Sidebar';
import WeatherAlertBanner from './components/WeatherAlertBanner';
import { getGyeonggiRealtimeWeather } from './services/kmaApi';
import {
  TARGET_MULTIPLIERS,
  TARGET_LABELS,
  calculateRiskLevel,
  getTargetLabel,
} from './constants/climate';
import { createLogger } from './utils/logger';

const log = createLogger('App');

function App() {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [target, setTarget] = useState('general');
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('loading');
  const [lastUpdated, setLastUpdated] = useState(null);

  // 초기 데이터 로드
  useEffect(() => {
    loadAllRegions();
  }, [target]);

  // 데이터 로드 (기상청 API 우선, 10초 타임아웃)
  const loadAllRegions = async () => {
    setLoading(true);

    try {
      // 기상청 API 호출 (10초 타임아웃)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const kmaData = await getGyeonggiRealtimeWeather();
      clearTimeout(timeoutId);

      log.debug('KMA API 응답 수신', { regions: kmaData?.regions?.length || 0 });

      if (kmaData && kmaData.regions && kmaData.regions.length > 0) {
        const formattedRegions = kmaData.regions.map(region => {
          const baseScore = region.score || 0;
          const multiplier = TARGET_MULTIPLIERS[target] || 1.0;
          const adjustedScore = Math.min(100, Math.round(baseScore * multiplier));
          const risk = calculateRiskLevel(adjustedScore);
          return { ...region, adjusted_score: adjustedScore, risk_level: risk.level, risk_label: risk.label, risk_color: risk.color };
        });
        setRegions(formattedRegions);
        setDataSource('kma');
        setLastUpdated(kmaData.datetime);
        setLoading(false);
        log.info('기상청 데이터 로드 완료', { regionCount: formattedRegions.length });
        return;
      }
    } catch (e) {
      log.warn('KMA API 실패', { error: e.message });
    }

    // 실패 시 즉시 Mock 데이터 표시
    log.info('Mock 데이터 사용');
    loadMockData();
    setDataSource('mock');
    setLoading(false);
  };

  // Mock 데이터 (백엔드 없이 테스트용)
  const loadMockData = () => {
    const mockRegions = [
      { region: '수원시', lat: 37.2636, lng: 127.0286, score: 65, risk_level: 'warning', risk_label: '경고', risk_color: '#FF9800', climate_data: { temperature: 32, apparent_temperature: 35, humidity: 70, pm10: 45, pm25: 22, uv_index: 8, surface_temperature: 42 }},
      { region: '성남시', lat: 37.4449, lng: 127.1389, score: 45, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 30, apparent_temperature: 32, humidity: 65, pm10: 38, pm25: 18, uv_index: 7, surface_temperature: 38 }},
      { region: '고양시', lat: 37.6584, lng: 126.8320, score: 78, risk_level: 'danger', risk_label: '위험', risk_color: '#F44336', climate_data: { temperature: 34, apparent_temperature: 38, humidity: 75, pm10: 55, pm25: 28, uv_index: 9, surface_temperature: 45 }},
      { region: '용인시', lat: 37.2411, lng: 127.1776, score: 52, risk_level: 'warning', risk_label: '경고', risk_color: '#FF9800', climate_data: { temperature: 31, apparent_temperature: 33, humidity: 68, pm10: 42, pm25: 20, uv_index: 7, surface_temperature: 40 }},
      { region: '부천시', lat: 37.5034, lng: 126.7660, score: 25, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 27, apparent_temperature: 28, humidity: 55, pm10: 28, pm25: 12, uv_index: 5, surface_temperature: 32 }},
      { region: '안산시', lat: 37.3219, lng: 126.8309, score: 72, risk_level: 'warning', risk_label: '경고', risk_color: '#FF9800', climate_data: { temperature: 33, apparent_temperature: 36, humidity: 72, pm10: 48, pm25: 24, uv_index: 8, surface_temperature: 43 }},
      { region: '안양시', lat: 37.3943, lng: 126.9568, score: 38, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 29, apparent_temperature: 31, humidity: 62, pm10: 35, pm25: 16, uv_index: 6, surface_temperature: 36 }},
      { region: '남양주시', lat: 37.6360, lng: 127.2165, score: 55, risk_level: 'warning', risk_label: '경고', risk_color: '#FF9800', climate_data: { temperature: 31, apparent_temperature: 34, humidity: 70, pm10: 40, pm25: 19, uv_index: 7, surface_temperature: 39 }},
      { region: '화성시', lat: 37.1996, lng: 126.8312, score: 82, risk_level: 'danger', risk_label: '위험', risk_color: '#F44336', climate_data: { temperature: 35, apparent_temperature: 39, humidity: 78, pm10: 60, pm25: 30, uv_index: 10, surface_temperature: 48 }},
      { region: '평택시', lat: 36.9921, lng: 127.1127, score: 68, risk_level: 'warning', risk_label: '경고', risk_color: '#FF9800', climate_data: { temperature: 33, apparent_temperature: 35, humidity: 69, pm10: 50, pm25: 25, uv_index: 8, surface_temperature: 42 }},
      { region: '의정부시', lat: 37.7381, lng: 127.0337, score: 42, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 29, apparent_temperature: 31, humidity: 60, pm10: 33, pm25: 15, uv_index: 6, surface_temperature: 35 }},
      { region: '시흥시', lat: 37.3800, lng: 126.8029, score: 58, risk_level: 'warning', risk_label: '경고', risk_color: '#FF9800', climate_data: { temperature: 32, apparent_temperature: 34, humidity: 67, pm10: 44, pm25: 21, uv_index: 7, surface_temperature: 40 }},
      { region: '파주시', lat: 37.7600, lng: 126.7800, score: 35, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 28, apparent_temperature: 30, humidity: 58, pm10: 30, pm25: 14, uv_index: 5, surface_temperature: 34 }},
      { region: '김포시', lat: 37.6152, lng: 126.7156, score: 48, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 30, apparent_temperature: 32, humidity: 64, pm10: 38, pm25: 18, uv_index: 6, surface_temperature: 37 }},
      { region: '광명시', lat: 37.4786, lng: 126.8644, score: 22, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 26, apparent_temperature: 27, humidity: 52, pm10: 25, pm25: 11, uv_index: 4, surface_temperature: 30 }},
      { region: '광주시', lat: 37.4095, lng: 127.2550, score: 62, risk_level: 'warning', risk_label: '경고', risk_color: '#FF9800', climate_data: { temperature: 32, apparent_temperature: 35, humidity: 71, pm10: 46, pm25: 23, uv_index: 8, surface_temperature: 41 }},
      { region: '군포시', lat: 37.3617, lng: 126.9352, score: 28, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 27, apparent_temperature: 28, humidity: 54, pm10: 27, pm25: 12, uv_index: 5, surface_temperature: 32 }},
      { region: '하남시', lat: 37.5393, lng: 127.2148, score: 50, risk_level: 'warning', risk_label: '경고', risk_color: '#FF9800', climate_data: { temperature: 31, apparent_temperature: 33, humidity: 66, pm10: 41, pm25: 20, uv_index: 7, surface_temperature: 39 }},
      { region: '오산시', lat: 37.1498, lng: 127.0775, score: 75, risk_level: 'danger', risk_label: '위험', risk_color: '#F44336', climate_data: { temperature: 34, apparent_temperature: 37, humidity: 74, pm10: 52, pm25: 26, uv_index: 9, surface_temperature: 44 }},
      { region: '이천시', lat: 37.2720, lng: 127.4350, score: 32, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 28, apparent_temperature: 29, humidity: 56, pm10: 29, pm25: 13, uv_index: 5, surface_temperature: 33 }},
      { region: '안성시', lat: 37.0080, lng: 127.2797, score: 44, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 29, apparent_temperature: 31, humidity: 61, pm10: 34, pm25: 16, uv_index: 6, surface_temperature: 36 }},
      { region: '의왕시', lat: 37.3449, lng: 126.9683, score: 20, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 25, apparent_temperature: 26, humidity: 50, pm10: 22, pm25: 10, uv_index: 4, surface_temperature: 29 }},
      { region: '양주시', lat: 37.7853, lng: 127.0458, score: 40, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 29, apparent_temperature: 30, humidity: 59, pm10: 32, pm25: 15, uv_index: 6, surface_temperature: 35 }},
      { region: '포천시', lat: 37.8949, lng: 127.2002, score: 36, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 28, apparent_temperature: 29, humidity: 57, pm10: 30, pm25: 14, uv_index: 5, surface_temperature: 33 }},
      { region: '여주시', lat: 37.2983, lng: 127.6374, score: 30, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 27, apparent_temperature: 28, humidity: 55, pm10: 28, pm25: 13, uv_index: 5, surface_temperature: 32 }},
      { region: '동두천시', lat: 37.9035, lng: 127.0605, score: 18, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 24, apparent_temperature: 25, humidity: 48, pm10: 20, pm25: 9, uv_index: 4, surface_temperature: 28 }},
      { region: '과천시', lat: 37.4292, lng: 126.9876, score: 24, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 26, apparent_temperature: 27, humidity: 53, pm10: 26, pm25: 11, uv_index: 5, surface_temperature: 31 }},
      { region: '구리시', lat: 37.5943, lng: 127.1295, score: 46, risk_level: 'caution', risk_label: '주의', risk_color: '#FFEB3B', climate_data: { temperature: 30, apparent_temperature: 32, humidity: 63, pm10: 37, pm25: 17, uv_index: 6, surface_temperature: 37 }},
      { region: '연천군', lat: 38.0966, lng: 127.0750, score: 15, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 23, apparent_temperature: 24, humidity: 45, pm10: 18, pm25: 8, uv_index: 3, surface_temperature: 27 }},
      { region: '가평군', lat: 37.8315, lng: 127.5095, score: 12, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 22, apparent_temperature: 23, humidity: 42, pm10: 15, pm25: 7, uv_index: 3, surface_temperature: 25 }},
      { region: '양평군', lat: 37.4917, lng: 127.4872, score: 26, risk_level: 'safe', risk_label: '안전', risk_color: '#2196F3', climate_data: { temperature: 27, apparent_temperature: 28, humidity: 54, pm10: 26, pm25: 12, uv_index: 5, surface_temperature: 31 }},
    ];
    setRegions(mockRegions);
  };

  // 지역 선택 시
  const handleRegionSelect = (region) => {
    setSelectedRegion(region);
    setExplanation(generateMockExplanation(region, target));
  };

  // Mock 설명 생성
  const generateMockExplanation = (region, targetType) => {

    const temp = region.climate_data.apparent_temperature;
    let explanation = '';
    let guides = [];

    if (temp >= 35) {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 매우 무더운 날씨입니다. 실외 활동을 자제하고 시원한 실내에서 휴식하세요.`;
      guides = ['외출을 삼가세요', '냉방 시설을 이용하세요', '수분을 충분히 섭취하세요'];
    } else if (temp >= 31) {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 무더운 날씨입니다. 장시간 야외 활동은 피하고 충분한 수분을 섭취하세요.`;
      guides = ['장시간 야외 활동 자제', '그늘에서 휴식', '물을 자주 마시세요'];
    } else if (temp >= 27) {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 다소 더운 날씨입니다. 야외 활동 시 그늘에서 휴식을 취하세요.`;
      guides = ['모자나 양산 사용', '수분 섭취 늘리기', '무리한 운동 자제'];
    } else {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 쾌적한 날씨입니다. 야외 활동하기 좋은 날씨입니다.`;
      guides = ['야외 활동에 적합', '평소처럼 생활하세요', '수분 섭취 잊지 마세요'];
    }

    return {
      region: region.region,
      score: region.score,
      risk_level: region.risk_level,
      risk_label: region.risk_label,
      explanation,
      action_guides: guides,
      target: getTargetLabel(targetType),
    };
  };

  // 대상 변경 시
  const handleTargetChange = (newTarget) => {
    setTarget(newTarget);
    if (selectedRegion) {
      handleRegionSelect(selectedRegion);
    }
  };

  // 데이터 출처 포맷
  const formatDataSource = () => {
    if (dataSource === 'kma') {
      const time = lastUpdated ? `${lastUpdated.slice(8, 10)}:${lastUpdated.slice(10, 12)}` : '';
      return `경기기후플랫폼+기상청실시간 (${time} 관측)`;
    } else if (dataSource === 'supabase') {
      return 'Supabase DB';
    }
    return '오프라인 데이터';
  };

  if (loading && regions.length === 0) {
    return <div className="loading">기상청 API에서 실시간 데이터를 불러오는 중...</div>;
  }

  return (
    <div className="app-container">
      <WeatherAlertBanner />

      {/* 데이터 출처 배지 */}
      <div className="data-source-badge">
        <span className={`source-indicator ${dataSource}`}></span>
        <span>{formatDataSource()}</span>
      </div>

      <div className="main-content">
        <Sidebar
          selectedRegion={selectedRegion}
          explanation={explanation}
          target={target}
          onTargetChange={handleTargetChange}
          loading={false}
          allRegions={regions}
          onRegionSelect={handleRegionSelect}
        />
        <ClimateMap
          regions={regions}
          selectedRegion={selectedRegion}
          onRegionSelect={handleRegionSelect}
        />
      </div>
    </div>
  );
}

export default App;
