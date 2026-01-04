/**
 * 기상청 API 허브 연동 서비스
 * https://apihub.kma.go.kr
 *
 * CORS 문제로 인해 Vercel Serverless Function 프록시 사용
 */

import { RISK_THRESHOLDS, RISK_LEVELS } from '../constants/climate';
import { createLogger } from '../utils/logger';

const log = createLogger('kmaApi');

// 프록시 API 엔드포인트 (Vercel Serverless Function)
const KMA_PROXY_API = '/api/kma';

// 직접 API (서버사이드 전용)
const KMA_API_BASE = 'https://apihub.kma.go.kr/api/typ01/url';
const AUTH_KEY = 'DbUh4_ekRRi1IeP3pPUYog';

// 캐시 설정 (메모리 캐시)
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30분

/**
 * 캐시에서 데이터 조회 또는 API 호출
 * @param {string} key - 캐시 키
 * @param {Function} fetchFn - 데이터 조회 함수
 */
const getCachedOrFetch = async (key, fetchFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetchFn();
  if (data !== null) {
    cache.set(key, { data, timestamp: Date.now() });
  }
  return data;
};

// 주변 도시 관측소 매핑 (지역명 -> 관측소 코드)
export const NEARBY_STATIONS = {
  '서울': { stn: 108, name: '서울', lat: 37.5665, lng: 126.9780 },
  '인천': { stn: 112, name: '인천', lat: 37.4563, lng: 126.7052 },
  '춘천': { stn: 101, name: '춘천', lat: 37.8813, lng: 127.7300 },
  '원주': { stn: 114, name: '원주', lat: 37.3422, lng: 127.9202 },
  '충주': { stn: 127, name: '충주', lat: 36.9910, lng: 127.9259 },
  '천안': { stn: 232, name: '천안', lat: 36.8151, lng: 127.1139 },
  '세종': { stn: 239, name: '세종', lat: 36.4800, lng: 127.2890 },
};

// 경기도 관측소 매핑 (지역명 -> 관측소 코드)
// 일부 지역은 가장 가까운 관측소 사용
export const GYEONGGI_STATIONS = {
  '수원시': { stn: 119, name: '수원' },
  '성남시': { stn: 119, name: '수원', note: '수원 관측소 사용' },
  '고양시': { stn: 99, name: '파주', note: '파주 관측소 사용' },
  '용인시': { stn: 203, name: '이천', note: '이천 관측소 사용' },
  '부천시': { stn: 112, name: '인천', note: '인천 관측소 사용' },
  '안산시': { stn: 112, name: '인천', note: '인천 관측소 사용' },
  '안양시': { stn: 119, name: '수원', note: '수원 관측소 사용' },
  '남양주시': { stn: 202, name: '양평', note: '양평 관측소 사용' },
  '화성시': { stn: 119, name: '수원', note: '수원 관측소 사용' },
  '평택시': { stn: 119, name: '수원', note: '수원 관측소 사용' },
  '의정부시': { stn: 98, name: '동두천', note: '동두천 관측소 사용' },
  '시흥시': { stn: 112, name: '인천', note: '인천 관측소 사용' },
  '파주시': { stn: 99, name: '파주' },
  '김포시': { stn: 112, name: '인천', note: '인천 관측소 사용' },
  '광명시': { stn: 112, name: '인천', note: '인천 관측소 사용' },
  '광주시': { stn: 203, name: '이천', note: '이천 관측소 사용' },
  '군포시': { stn: 119, name: '수원', note: '수원 관측소 사용' },
  '하남시': { stn: 108, name: '서울', note: '서울 관측소 사용' },
  '오산시': { stn: 119, name: '수원', note: '수원 관측소 사용' },
  '이천시': { stn: 203, name: '이천' },
  '안성시': { stn: 119, name: '수원', note: '수원 관측소 사용' },
  '의왕시': { stn: 119, name: '수원', note: '수원 관측소 사용' },
  '양주시': { stn: 98, name: '동두천', note: '동두천 관측소 사용' },
  '포천시': { stn: 98, name: '동두천', note: '동두천 관측소 사용' },
  '여주시': { stn: 203, name: '이천', note: '이천 관측소 사용' },
  '동두천시': { stn: 98, name: '동두천' },
  '과천시': { stn: 108, name: '서울', note: '서울 관측소 사용' },
  '구리시': { stn: 108, name: '서울', note: '서울 관측소 사용' },
  '연천군': { stn: 98, name: '동두천', note: '동두천 관측소 사용' },
  '가평군': { stn: 101, name: '춘천', note: '춘천 관측소 사용' },
  '양평군': { stn: 202, name: '양평' },
};

/**
 * 날짜 포맷 (YYYYMMDDHHMM)
 */
const formatDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  return `${year}${month}${day}${hour}00`;
};

/**
 * 날짜 포맷 (YYYYMMDD)
 */
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * API 응답 파싱 (공백 구분 텍스트 형식)
 */
const parseKmaResponse = (text, columns) => {
  const lines = text.split('\n').filter(line =>
    line.trim() && !line.startsWith('#') && !line.includes('END7777')
  );

  return lines.map(line => {
    const values = line.trim().split(/\s+/);
    const record = {};
    columns.forEach((col, idx) => {
      let value = values[idx];
      // 숫자로 변환 시도
      if (value && !isNaN(value) && value !== '-9' && value !== '-99.0' && value !== '-9.0') {
        record[col] = parseFloat(value);
      } else if (value === '-9' || value === '-99.0' || value === '-9.0') {
        record[col] = null; // 결측치
      } else {
        record[col] = value;
      }
    });
    return record;
  });
};

/**
 * 지상 시간 자료 조회 (현재/과거)
 * Vercel Serverless Function 프록시를 통해 CORS 우회
 * @param {string} datetime - YYYYMMDDHHMM 형식
 * @param {number} stn - 관측소 코드 (0: 전체)
 */
export const getSurfaceData = async (datetime, stn = 0) => {
  try {
    // 프록시 API 사용 (CORS 우회)
    const url = `${KMA_PROXY_API}?tm=${datetime}&stn=${stn}`;
    const response = await fetch(url);
    const json = await response.json();

    if (json.success && json.data) {
      return json.data;
    }

    log.error('기상청 프록시 API 오류', null, { error: json.error });
    return null;
  } catch (error) {
    log.error('기상청 API 오류', error);
    return null;
  }
};

/**
 * 지상 시간자료 기간 조회 (kma_sfctm3)
 * Vercel Serverless Function 프록시 사용 (CORS 우회)
 * @param {string} startDatetime - YYYYMMDDHHMM 형식 (시작)
 * @param {string} endDatetime - YYYYMMDDHHMM 형식 (끝)
 * @param {number} stn - 관측소 코드
 */
export const getSurfaceDataPeriod = async (startDatetime, endDatetime, stn) => {
  try {
    const url = `/api/kma-period?tm1=${startDatetime}&tm2=${endDatetime}&stn=${stn}`;
    const response = await fetch(url);
    const json = await response.json();

    if (json.success && json.data) {
      return json.data;
    }

    log.error('기상청 기간 조회 API 오류', null, { error: json.error });
    return null;
  } catch (error) {
    log.error('기상청 기간 조회 API 오류', error);
    return null;
  }
};

/**
 * 지상 일 자료 조회
 * @param {string} startDate - YYYYMMDD 형식
 * @param {string} endDate - YYYYMMDD 형식
 * @param {number} stn - 관측소 코드
 */
export const getDailyData = async (startDate, endDate, stn) => {
  try {
    const url = `${KMA_API_BASE}/kma_sfcdd.php?tm1=${startDate}&tm2=${endDate}&stn=${stn}&authKey=${AUTH_KEY}`;
    const response = await fetch(url);
    const text = await response.text();

    const columns = [
      'TM', 'STN', 'TA_AVG', 'TA_MAX', 'TA_MAX_TM', 'TA_MIN', 'TA_MIN_TM',
      'HM_AVG', 'HM_MIN', 'HM_MIN_TM', 'WS_AVG', 'WS_MAX', 'WS_MAX_TM',
      'WS_MAX_DIR', 'WS_INS', 'WS_INS_TM', 'WS_INS_DIR',
      'RN_DAY', 'RN_D99', 'RN_DUR', 'RN_60M', 'RN_60M_TM',
      'RN_10M', 'RN_10M_TM', 'SD_NEW', 'SD_NEW_TM', 'SD_MAX', 'SD_MAX_TM',
      'SS_DAY', 'SS_CMB', 'SI_DAY', 'SI_60M', 'SI_60M_TM',
      'TS_AVG', 'TS_MAX', 'TS_MAX_TM', 'TS_MIN', 'TS_MIN_TM',
      'TE_AVG', 'TE_MAX', 'TE_MAX_TM', 'TE_MIN', 'TE_MIN_TM',
      'EV_S', 'EV_L', 'CA_TOT', 'CA_MID'
    ];

    return parseKmaResponse(text, columns);
  } catch (error) {
    log.error('기상청 일별 API 오류', error);
    return null;
  }
};

/**
 * 지상 월 자료 조회 (캐시 적용)
 * @param {string} yearMonth - YYYYMM 형식
 * @param {number} stn - 관측소 코드
 */
export const getMonthlyData = async (yearMonth, stn) => {
  const cacheKey = `monthly_${yearMonth}_${stn}`;

  return getCachedOrFetch(cacheKey, async () => {
    try {
      const url = `${KMA_API_BASE}/kma_sfcmm.php?tm=${yearMonth}&stn=${stn}&authKey=${AUTH_KEY}`;
      const response = await fetch(url, { timeout: 10000 });
      const text = await response.text();

      const columns = [
        'TM', 'STN', 'TA_AVG', 'TA_AVG_MAX', 'TA_AVG_MIN',
        'TA_MAX', 'TA_MAX_TM', 'TA_MIN', 'TA_MIN_TM',
        'HM_AVG', 'WS_AVG', 'WS_MAX', 'WS_MAX_TM', 'WS_MAX_DIR',
        'RN_MON', 'RN_DAY_MAX', 'RN_DAY_MAX_TM', 'RN_1HR_MAX', 'RN_1HR_MAX_TM',
        'SD_NEW_MAX', 'SD_NEW_MAX_TM', 'SD_MAX', 'SD_MAX_TM',
        'SS_MON', 'SI_MON', 'CA_TOT', 'CA_MID'
      ];

      return parseKmaResponse(text, columns);
    } catch (error) {
      log.error('기상청 월별 API 오류', error);
      return null;
    }
  });
};

/**
 * 과거 10년 월별 평균 데이터 조회 (병렬 처리)
 * @param {string} regionName - 지역명 (예: '수원시')
 * @param {number} month - 월 (1-12)
 */
export const getHistorical10YearAverage = async (regionName, month) => {
  const station = GYEONGGI_STATIONS[regionName];
  if (!station) {
    log.warn(`${regionName}의 관측소 정보가 없습니다.`);
    return null;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 1 - i); // 작년부터 10년

  // 병렬로 모든 연도 데이터 조회
  const promises = years.map(async (year) => {
    const yearMonth = `${year}${String(month).padStart(2, '0')}`;
    try {
      const data = await getMonthlyData(yearMonth, station.stn);
      return data && data.length > 0 ? data[0] : null;
    } catch (e) {
      log.warn(`${yearMonth} 데이터 조회 실패`, { error: e.message });
      return null;
    }
  });

  const results = await Promise.all(promises);
  const monthlyData = results.filter(d => d !== null);

  if (monthlyData.length === 0) return null;

  // 평균 계산
  const avg = (arr, key) => {
    const validValues = arr.map(d => d[key]).filter(v => v !== null && !isNaN(v));
    return validValues.length > 0
      ? validValues.reduce((a, b) => a + b, 0) / validValues.length
      : null;
  };

  return {
    region: regionName,
    station: station.name,
    month,
    years: monthlyData.length,
    temperature_avg: avg(monthlyData, 'TA_AVG'),
    temperature_max: avg(monthlyData, 'TA_MAX'),
    temperature_min: avg(monthlyData, 'TA_MIN'),
    humidity_avg: avg(monthlyData, 'HM_AVG'),
    wind_speed_avg: avg(monthlyData, 'WS_AVG'),
    precipitation: avg(monthlyData, 'RN_MON'),
    sunshine: avg(monthlyData, 'SS_MON'),
  };
};

/**
 * 과거 10년 전체 월별 평균 데이터 조회 (1월~12월) - 병렬 처리
 * @param {string} regionName - 지역명
 */
export const getHistorical10YearMonthlyAverages = async (regionName) => {
  // 12개월 데이터 병렬 조회
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const promises = months.map(month => getHistorical10YearAverage(regionName, month));

  const results = await Promise.all(promises);
  return results.filter(data => data !== null);
};

/**
 * 특정 날짜의 관측 데이터 조회
 * @param {string} regionName - 지역명
 * @param {Date} date - 조회할 날짜
 */
export const getObservationData = async (regionName, date = new Date()) => {
  const station = GYEONGGI_STATIONS[regionName];
  if (!station) return null;

  // 가장 최근 정시 기준
  const hour = date.getHours();
  const datetime = formatDateTime(new Date(date.setHours(hour, 0, 0, 0)));

  const data = await getSurfaceData(datetime, station.stn);

  if (data && data.length > 0) {
    const obs = data.find(d => d.STN === station.stn) || data[0];
    return {
      region: regionName,
      station: station.name,
      datetime: obs.TM,
      temperature: obs.TA,
      humidity: obs.HM,
      wind_speed: obs.WS,
      wind_direction: obs.WD,
      pressure: obs.PS,
      precipitation: obs.RN_DAY,
      visibility: obs.VS,
      cloud_cover: obs.CA_TOT,
    };
  }

  return null;
};

/**
 * 한국 시간(KST) 가져오기
 */
const getKSTDate = () => {
  const now = new Date();
  // UTC 시간에 9시간 추가하여 KST 계산
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (9 * 60 * 60 * 1000));
};

/**
 * 경기도 31개 시군 실시간 기상 데이터 조회 (단일 API 호출)
 */
export const getGyeonggiRealtimeWeather = async () => {
  try {
    // 한국 시간 기준 1시간 전 정시
    const kst = getKSTDate();
    kst.setHours(kst.getHours() - 1, 0, 0, 0);

    const datetime = `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, '0')}${String(kst.getDate()).padStart(2, '0')}${String(kst.getHours()).padStart(2, '0')}00`;

    log.info('기상청 API 요청', { datetime, timezone: 'KST' });

    // 전체 관측소 한 번에 조회 (stn=0)
    const allData = await getSurfaceData(datetime, 0);

    if (allData && allData.length > 0) {
      const stationData = {};
      allData.forEach(obs => {
        if (obs.STN) stationData[obs.STN] = obs;
      });
      return processGyeonggiDataFromStations(stationData, datetime);
    }

    // 실패시 2시간 전 시도
    kst.setHours(kst.getHours() - 1);
    const prevDatetime = `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, '0')}${String(kst.getDate()).padStart(2, '0')}${String(kst.getHours()).padStart(2, '0')}00`;

    log.info('기상청 API 재시도', { datetime: prevDatetime, timezone: 'KST' });

    const prevData = await getSurfaceData(prevDatetime, 0);
    if (prevData && prevData.length > 0) {
      const stationData = {};
      prevData.forEach(obs => {
        if (obs.STN) stationData[obs.STN] = obs;
      });
      return processGyeonggiDataFromStations(stationData, prevDatetime);
    }

    return null;
  } catch (error) {
    log.error('기상청 API 오류', error);
    return null;
  }
};

/**
 * 기상청 데이터를 경기도 31개 시군 형식으로 변환 (관측소 데이터 직접 전달)
 */
const processGyeonggiDataFromStations = (stationData, datetime) => {
  // 경기도 31개 시군 좌표
  const GYEONGGI_COORDS = {
    '수원시': { lat: 37.2636, lng: 127.0286 },
    '성남시': { lat: 37.4449, lng: 127.1389 },
    '고양시': { lat: 37.6584, lng: 126.8320 },
    '용인시': { lat: 37.2411, lng: 127.1776 },
    '부천시': { lat: 37.5034, lng: 126.7660 },
    '안산시': { lat: 37.3219, lng: 126.8309 },
    '안양시': { lat: 37.3943, lng: 126.9568 },
    '남양주시': { lat: 37.6360, lng: 127.2165 },
    '화성시': { lat: 37.1996, lng: 126.8312 },
    '평택시': { lat: 36.9921, lng: 127.1127 },
    '의정부시': { lat: 37.7381, lng: 127.0337 },
    '시흥시': { lat: 37.3800, lng: 126.8029 },
    '파주시': { lat: 37.7600, lng: 126.7800 },
    '김포시': { lat: 37.6152, lng: 126.7156 },
    '광명시': { lat: 37.4786, lng: 126.8644 },
    '광주시': { lat: 37.4095, lng: 127.2550 },
    '군포시': { lat: 37.3617, lng: 126.9352 },
    '하남시': { lat: 37.5393, lng: 127.2148 },
    '오산시': { lat: 37.1498, lng: 127.0775 },
    '이천시': { lat: 37.2720, lng: 127.4350 },
    '안성시': { lat: 37.0080, lng: 127.2797 },
    '의왕시': { lat: 37.3449, lng: 126.9683 },
    '양주시': { lat: 37.7853, lng: 127.0458 },
    '포천시': { lat: 37.8949, lng: 127.2002 },
    '여주시': { lat: 37.2983, lng: 127.6374 },
    '동두천시': { lat: 37.9035, lng: 127.0605 },
    '과천시': { lat: 37.4292, lng: 126.9876 },
    '구리시': { lat: 37.5943, lng: 127.1295 },
    '연천군': { lat: 38.0966, lng: 127.0750 },
    '가평군': { lat: 37.8315, lng: 127.5095 },
    '양평군': { lat: 37.4917, lng: 127.4872 },
  };

  const results = [];

  for (const [regionName, coords] of Object.entries(GYEONGGI_COORDS)) {
    const station = GYEONGGI_STATIONS[regionName];
    if (!station) continue;

    const obs = stationData[station.stn];
    if (!obs) continue;

    // 기온과 습도로 체감온도 계산 (여름철 열지수 / 겨울철 풍속체감)
    const temp = obs.TA;
    const humidity = obs.HM;
    const windSpeed = obs.WS;
    let apparentTemp = temp;

    if (temp !== null) {
      if (temp >= 27 && humidity !== null) {
        // 여름철 열지수 (Heat Index)
        apparentTemp = temp + 0.33 * (humidity / 100 * 6.105 * Math.exp(17.27 * temp / (237.7 + temp))) - 4.0;
      } else if (temp <= 10 && windSpeed !== null && windSpeed > 0) {
        // 겨울철 체감온도 (Wind Chill)
        apparentTemp = 13.12 + 0.6215 * temp - 11.37 * Math.pow(windSpeed * 3.6, 0.16) + 0.3965 * temp * Math.pow(windSpeed * 3.6, 0.16);
      }
      apparentTemp = Math.round(apparentTemp * 10) / 10;
    }

    // 체감지수 점수 계산 (0-100)
    let score = 0;

    // 온도 기반 점수 (체감온도 기준)
    if (apparentTemp !== null) {
      if (apparentTemp >= 35) score += 40;
      else if (apparentTemp >= 33) score += 35;
      else if (apparentTemp >= 31) score += 30;
      else if (apparentTemp >= 28) score += 20;
      else if (apparentTemp >= 25) score += 10;
      else if (apparentTemp <= -15) score += 35;
      else if (apparentTemp <= -10) score += 25;
      else if (apparentTemp <= -5) score += 15;
      else if (apparentTemp <= 0) score += 10;
    }

    // 습도 기반 점수
    if (humidity !== null) {
      if (humidity >= 85) score += 20;
      else if (humidity >= 75) score += 15;
      else if (humidity >= 65) score += 10;
      else if (humidity <= 30) score += 10;
    }

    // 풍속 기반 점수
    if (windSpeed !== null) {
      if (windSpeed >= 14) score += 15;
      else if (windSpeed >= 10) score += 10;
      else if (windSpeed >= 7) score += 5;
    }

    // 시정 기반 점수 (미세먼지 대체)
    const visibility = obs.VS; // 10m 단위
    if (visibility !== null) {
      if (visibility <= 100) score += 25; // 1km 이하
      else if (visibility <= 200) score += 20; // 2km 이하
      else if (visibility <= 500) score += 15; // 5km 이하
      else if (visibility <= 1000) score += 10; // 10km 이하
    }

    // PM 추정 (시정 기반)
    let pm10 = 30, pm25 = 15;
    if (visibility !== null) {
      if (visibility <= 100) { pm10 = 150; pm25 = 80; }
      else if (visibility <= 200) { pm10 = 100; pm25 = 50; }
      else if (visibility <= 500) { pm10 = 70; pm25 = 35; }
      else if (visibility <= 1000) { pm10 = 50; pm25 = 25; }
      else if (visibility <= 2000) { pm10 = 40; pm25 = 20; }
    }

    // UV 지수 추정 (일사량 기반)
    let uvIndex = 0;
    const solarRadiation = obs.SI; // MJ/m2
    if (solarRadiation !== null && solarRadiation > 0) {
      // 간단한 추정식 (실제 UV는 별도 API 필요)
      uvIndex = Math.min(11, Math.round(solarRadiation * 3));
    } else {
      // 시간대 기반 추정
      const hour = new Date().getHours();
      if (hour >= 11 && hour <= 14) uvIndex = 6;
      else if (hour >= 9 && hour <= 16) uvIndex = 4;
      else if (hour >= 7 && hour <= 18) uvIndex = 2;
    }

    score = Math.min(100, Math.max(0, score));

    // 위험 등급 결정 (상수 사용)
    let risk;
    if (score >= RISK_THRESHOLDS.DANGER) {
      risk = RISK_LEVELS.danger;
    } else if (score >= RISK_THRESHOLDS.WARNING) {
      risk = RISK_LEVELS.warning;
    } else if (score >= RISK_THRESHOLDS.CAUTION) {
      risk = RISK_LEVELS.caution;
    } else {
      risk = RISK_LEVELS.safe;
    }
    const { level: riskLevel, label: riskLabel, color: riskColor } = risk;

    results.push({
      region: regionName,
      lat: coords.lat,
      lng: coords.lng,
      score,
      risk_level: riskLevel,
      risk_label: riskLabel,
      risk_color: riskColor,
      climate_data: {
        temperature: temp,
        apparent_temperature: apparentTemp,
        humidity: humidity,
        pm10: pm10,
        pm25: pm25,
        uv_index: uvIndex,
        surface_temperature: obs.TS || temp,
        wind_speed: windSpeed,
        precipitation: obs.RN_DAY || 0,
        visibility: visibility,
        pressure: obs.PS,
      },
      station: station.name,
      observed_at: datetime,
    });
  }

  return {
    datetime,
    regions: results,
    source: '기상청 API 허브',
  };
};

/**
 * 기상청 데이터를 주변 도시 형식으로 변환 (관측소 데이터 직접 전달)
 */
const processNearbyDataFromStations = (stationData, datetime) => {
  const results = [];

  for (const [regionName, stationInfo] of Object.entries(NEARBY_STATIONS)) {
    const obs = stationData[stationInfo.stn];
    if (!obs) continue;

    // 기온과 습도로 체감온도 계산
    const temp = obs.TA;
    const humidity = obs.HM;
    const windSpeed = obs.WS;
    let apparentTemp = temp;

    if (temp !== null) {
      if (temp >= 27 && humidity !== null) {
        apparentTemp = temp + 0.33 * (humidity / 100 * 6.105 * Math.exp(17.27 * temp / (237.7 + temp))) - 4.0;
      } else if (temp <= 10 && windSpeed !== null && windSpeed > 0) {
        apparentTemp = 13.12 + 0.6215 * temp - 11.37 * Math.pow(windSpeed * 3.6, 0.16) + 0.3965 * temp * Math.pow(windSpeed * 3.6, 0.16);
      }
      apparentTemp = Math.round(apparentTemp * 10) / 10;
    }

    // 체감지수 점수 계산
    let score = 0;
    if (apparentTemp !== null) {
      if (apparentTemp >= 35) score += 40;
      else if (apparentTemp >= 33) score += 35;
      else if (apparentTemp >= 31) score += 30;
      else if (apparentTemp >= 28) score += 20;
      else if (apparentTemp >= 25) score += 10;
      else if (apparentTemp <= -15) score += 35;
      else if (apparentTemp <= -10) score += 25;
      else if (apparentTemp <= -5) score += 15;
      else if (apparentTemp <= 0) score += 10;
    }

    if (humidity !== null) {
      if (humidity >= 85) score += 20;
      else if (humidity >= 75) score += 15;
      else if (humidity >= 65) score += 10;
      else if (humidity <= 30) score += 10;
    }

    if (windSpeed !== null) {
      if (windSpeed >= 14) score += 15;
      else if (windSpeed >= 10) score += 10;
      else if (windSpeed >= 7) score += 5;
    }

    const visibility = obs.VS;
    if (visibility !== null) {
      if (visibility <= 100) score += 25;
      else if (visibility <= 200) score += 20;
      else if (visibility <= 500) score += 15;
      else if (visibility <= 1000) score += 10;
    }

    let pm10 = 30, pm25 = 15;
    if (visibility !== null) {
      if (visibility <= 100) { pm10 = 150; pm25 = 80; }
      else if (visibility <= 200) { pm10 = 100; pm25 = 50; }
      else if (visibility <= 500) { pm10 = 70; pm25 = 35; }
      else if (visibility <= 1000) { pm10 = 50; pm25 = 25; }
      else if (visibility <= 2000) { pm10 = 40; pm25 = 20; }
    }

    let uvIndex = 0;
    const solarRadiation = obs.SI;
    if (solarRadiation !== null && solarRadiation > 0) {
      uvIndex = Math.min(11, Math.round(solarRadiation * 3));
    } else {
      const hour = new Date().getHours();
      if (hour >= 11 && hour <= 14) uvIndex = 6;
      else if (hour >= 9 && hour <= 16) uvIndex = 4;
      else if (hour >= 7 && hour <= 18) uvIndex = 2;
    }

    score = Math.min(100, Math.max(0, score));

    let risk;
    if (score >= RISK_THRESHOLDS.DANGER) {
      risk = RISK_LEVELS.danger;
    } else if (score >= RISK_THRESHOLDS.WARNING) {
      risk = RISK_LEVELS.warning;
    } else if (score >= RISK_THRESHOLDS.CAUTION) {
      risk = RISK_LEVELS.caution;
    } else {
      risk = RISK_LEVELS.safe;
    }
    const { level: riskLevel, label: riskLabel, color: riskColor } = risk;

    results.push({
      region: regionName,
      lat: stationInfo.lat,
      lng: stationInfo.lng,
      score,
      risk_level: riskLevel,
      risk_label: riskLabel,
      risk_color: riskColor,
      isGyeonggi: false,
      climate_data: {
        temperature: temp,
        apparent_temperature: apparentTemp,
        humidity: humidity,
        pm10: pm10,
        pm25: pm25,
        uv_index: uvIndex,
        surface_temperature: obs.TS || temp,
        wind_speed: windSpeed,
        precipitation: obs.RN_DAY || 0,
        visibility: visibility,
        pressure: obs.PS,
      },
      station: stationInfo.name,
      observed_at: datetime,
    });
  }

  return results;
};

/**
 * 주변 도시 실시간 날씨 조회
 */
export const getNearbyRealtimeWeather = async () => {
  try {
    const kst = getKSTDate();
    kst.setHours(kst.getHours() - 1, 0, 0, 0);

    const datetime = `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, '0')}${String(kst.getDate()).padStart(2, '0')}${String(kst.getHours()).padStart(2, '0')}00`;

    log.info('주변 도시 기상청 API 요청', { datetime, timezone: 'KST' });

    const allData = await getSurfaceData(datetime, 0);

    if (allData && allData.length > 0) {
      const stationData = {};
      allData.forEach(obs => {
        if (obs.STN) stationData[obs.STN] = obs;
      });
      return processNearbyDataFromStations(stationData, datetime);
    }

    // 실패시 2시간 전 시도
    kst.setHours(kst.getHours() - 1);
    const prevDatetime = `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, '0')}${String(kst.getDate()).padStart(2, '0')}${String(kst.getHours()).padStart(2, '0')}00`;

    const prevData = await getSurfaceData(prevDatetime, 0);
    if (prevData && prevData.length > 0) {
      const stationData = {};
      prevData.forEach(obs => {
        if (obs.STN) stationData[obs.STN] = obs;
      });
      return processNearbyDataFromStations(stationData, prevDatetime);
    }

    return [];
  } catch (error) {
    log.error('주변 도시 기상청 API 오류', error);
    return [];
  }
};

/**
 * 캐시 초기화
 */
export const clearCache = () => {
  cache.clear();
};

/**
 * 캐시 통계
 */
export const getCacheStats = () => ({
  size: cache.size,
  keys: Array.from(cache.keys()),
});

export default {
  getSurfaceData,
  getSurfaceDataPeriod,
  getDailyData,
  getMonthlyData,
  getHistorical10YearAverage,
  getHistorical10YearMonthlyAverages,
  getObservationData,
  getGyeonggiRealtimeWeather,
  getNearbyRealtimeWeather,
  clearCache,
  getCacheStats,
  GYEONGGI_STATIONS,
  NEARBY_STATIONS,
};
