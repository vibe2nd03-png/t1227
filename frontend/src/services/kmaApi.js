/**
 * 기상청 API 허브 연동 서비스
 * https://apihub.kma.go.kr
 *
 * CORS 문제로 인해 Vercel Serverless Function 프록시 사용
 */

// 프록시 API 엔드포인트 (Vercel Serverless Function)
const KMA_PROXY_API = '/api/kma';

// 직접 API (서버사이드 전용)
const KMA_API_BASE = 'https://apihub.kma.go.kr/api/typ01/url';
const AUTH_KEY = 'DbUh4_ekRRi1IeP3pPUYog';

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

    console.error('기상청 프록시 API 오류:', json.error);
    return null;
  } catch (error) {
    console.error('기상청 API 오류:', error);
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

    console.error('기상청 기간 조회 API 오류:', json.error);
    return null;
  } catch (error) {
    console.error('기상청 기간 조회 API 오류:', error);
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
    console.error('기상청 일별 API 오류:', error);
    return null;
  }
};

/**
 * 지상 월 자료 조회
 * @param {string} yearMonth - YYYYMM 형식
 * @param {number} stn - 관측소 코드
 */
export const getMonthlyData = async (yearMonth, stn) => {
  try {
    const url = `${KMA_API_BASE}/kma_sfcmm.php?tm=${yearMonth}&stn=${stn}&authKey=${AUTH_KEY}`;
    const response = await fetch(url);
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
    console.error('기상청 월별 API 오류:', error);
    return null;
  }
};

/**
 * 과거 10년 월별 평균 데이터 조회
 * @param {string} regionName - 지역명 (예: '수원시')
 * @param {number} month - 월 (1-12)
 */
export const getHistorical10YearAverage = async (regionName, month) => {
  const station = GYEONGGI_STATIONS[regionName];
  if (!station) {
    console.warn(`${regionName}의 관측소 정보가 없습니다.`);
    return null;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 1 - i); // 작년부터 10년

  const monthlyData = [];

  for (const year of years) {
    const yearMonth = `${year}${String(month).padStart(2, '0')}`;
    const data = await getMonthlyData(yearMonth, station.stn);
    if (data && data.length > 0) {
      monthlyData.push(data[0]);
    }
  }

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
 * 과거 10년 전체 월별 평균 데이터 조회 (1월~12월)
 * @param {string} regionName - 지역명
 */
export const getHistorical10YearMonthlyAverages = async (regionName) => {
  const results = [];

  for (let month = 1; month <= 12; month++) {
    const monthData = await getHistorical10YearAverage(regionName, month);
    if (monthData) {
      results.push(monthData);
    }
  }

  return results;
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
 * 경기도 31개 시군 실시간 기상 데이터 조회 (단일 API 호출)
 */
export const getGyeonggiRealtimeWeather = async () => {
  try {
    // 한국 시간 기준 1시간 전 정시
    const now = new Date();
    now.setTime(now.getTime() + 9 * 60 * 60 * 1000); // UTC to KST
    now.setHours(now.getHours() - 1, 0, 0, 0);

    const datetime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}00`;

    console.log('기상청 API 요청:', datetime);

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
    now.setHours(now.getHours() - 1);
    const prevDatetime = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}00`;

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
    console.error('기상청 API 오류:', error);
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

    // 위험 등급 결정
    let riskLevel, riskLabel, riskColor;
    if (score >= 75) {
      riskLevel = 'danger'; riskLabel = '위험'; riskColor = '#F44336';
    } else if (score >= 50) {
      riskLevel = 'warning'; riskLabel = '경고'; riskColor = '#FF9800';
    } else if (score >= 30) {
      riskLevel = 'caution'; riskLabel = '주의'; riskColor = '#FFEB3B';
    } else {
      riskLevel = 'safe'; riskLabel = '안전'; riskColor = '#2196F3';
    }

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

export default {
  getSurfaceData,
  getSurfaceDataPeriod,
  getDailyData,
  getMonthlyData,
  getHistorical10YearAverage,
  getHistorical10YearMonthlyAverages,
  getObservationData,
  getGyeonggiRealtimeWeather,
  GYEONGGI_STATIONS,
};
