/**
 * 기상청 API 허브 연동 서비스
 * https://apihub.kma.go.kr
 */

const KMA_API_BASE = 'https://apihub.kma.go.kr/api/typ01/url';
const AUTH_KEY = '-uv3O-FtR1Gr9zvhbYdRMA';

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
 * @param {string} datetime - YYYYMMDDHHMM 형식
 * @param {number} stn - 관측소 코드 (0: 전체)
 */
export const getSurfaceData = async (datetime, stn = 0) => {
  try {
    const url = `${KMA_API_BASE}/kma_sfctm2.php?tm=${datetime}&stn=${stn}&authKey=${AUTH_KEY}`;
    const response = await fetch(url);
    const text = await response.text();

    const columns = [
      'TM', 'STN', 'WD', 'WS', 'GST_WD', 'GST_WS', 'GST_TM',
      'PA', 'PS', 'PT', 'PR', 'TA', 'TD', 'HM', 'PV',
      'RN', 'RN_DAY', 'RN_JUN', 'RN_INT', 'SD_HR3', 'SD_DAY', 'SD_TOT',
      'WC', 'WP', 'WW', 'CA_TOT', 'CA_MID', 'CH_MIN', 'CT',
      'CT_TOP', 'CT_MID', 'CT_LOW', 'VS', 'SS', 'SI',
      'ST_GD', 'TS', 'TE_005', 'TE_01', 'TE_02', 'TE_03',
      'ST_SEA', 'WH', 'BF', 'IR', 'IX'
    ];

    return parseKmaResponse(text, columns);
  } catch (error) {
    console.error('기상청 API 오류:', error);
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

export default {
  getSurfaceData,
  getDailyData,
  getMonthlyData,
  getHistorical10YearAverage,
  getHistorical10YearMonthlyAverages,
  getObservationData,
  GYEONGGI_STATIONS,
};
