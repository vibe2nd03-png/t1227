/**
 * 기상청 단기예보 API 프록시
 * 시간대별 날씨 예보 조회
 */

// 경기도 주요 지역 격자 좌표 (기상청 격자)
const GRID_COORDS = {
  '수원시': { nx: 60, ny: 121 },
  '성남시': { nx: 63, ny: 124 },
  '고양시': { nx: 57, ny: 128 },
  '용인시': { nx: 64, ny: 119 },
  '부천시': { nx: 56, ny: 125 },
  '안산시': { nx: 53, ny: 121 },
  '안양시': { nx: 59, ny: 123 },
  '남양주시': { nx: 64, ny: 128 },
  '화성시': { nx: 57, ny: 119 },
  '평택시': { nx: 62, ny: 114 },
  '의정부시': { nx: 61, ny: 130 },
  '시흥시': { nx: 55, ny: 122 },
  '파주시': { nx: 56, ny: 131 },
  '김포시': { nx: 55, ny: 128 },
  '광명시': { nx: 58, ny: 125 },
  '광주시': { nx: 65, ny: 123 },
  '군포시': { nx: 59, ny: 122 },
  '하남시': { nx: 64, ny: 126 },
  '오산시': { nx: 62, ny: 118 },
  '이천시': { nx: 68, ny: 121 },
  '안성시': { nx: 65, ny: 115 },
  '의왕시': { nx: 60, ny: 122 },
  '양주시': { nx: 61, ny: 131 },
  '포천시': { nx: 64, ny: 134 },
  '여주시': { nx: 71, ny: 121 },
  '동두천시': { nx: 61, ny: 134 },
  '과천시': { nx: 60, ny: 124 },
  '구리시': { nx: 62, ny: 127 },
  '연천군': { nx: 61, ny: 138 },
  '가평군': { nx: 69, ny: 133 },
  '양평군': { nx: 69, ny: 125 },
};

// 날씨 코드 -> 한글/아이콘 변환
const SKY_CODES = {
  '1': { text: '맑음', icon: '☀️' },
  '3': { text: '구름많음', icon: '⛅' },
  '4': { text: '흐림', icon: '☁️' },
};

const PTY_CODES = {
  '0': { text: '없음', icon: '' },
  '1': { text: '비', icon: '🌧️' },
  '2': { text: '비/눈', icon: '🌨️' },
  '3': { text: '눈', icon: '❄️' },
  '4': { text: '소나기', icon: '🌦️' },
};

/**
 * 기상청 단기예보 API 호출
 */
async function getVilageFcst(nx, ny, baseDate, baseTime) {
  const serviceKey = 'DbUh4_ekRRi1IeP3pPUYog';
  const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}&authKey=${serviceKey}`;

  const response = await fetch(url);
  const text = await response.text();

  try {
    const json = JSON.parse(text);
    if (json.response?.body?.items?.item) {
      return json.response.body.items.item;
    }
  } catch (e) {
    console.error('JSON 파싱 오류:', e);
  }

  return null;
}

/**
 * 가장 가까운 발표시각 계산
 * 단기예보는 02, 05, 08, 11, 14, 17, 20, 23시에 발표
 */
function getBaseDateTime() {
  const now = new Date();
  // UTC to KST
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const hours = kst.getUTCHours();
  const minutes = kst.getUTCMinutes();

  // 발표 시각 배열
  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];

  // API 제공 시간 고려 (발표 후 약 10분 소요)
  let currentHour = hours;
  if (minutes < 10) {
    currentHour = hours - 1;
    if (currentHour < 0) currentHour = 23;
  }

  // 가장 가까운 과거 발표 시각 찾기
  let baseTime = baseTimes[0];
  for (let i = baseTimes.length - 1; i >= 0; i--) {
    if (baseTimes[i] <= currentHour) {
      baseTime = baseTimes[i];
      break;
    }
  }

  // 0시~2시 사이면 전날 23시 발표 사용
  if (currentHour < 2) {
    baseTime = 23;
    kst.setUTCDate(kst.getUTCDate() - 1);
  }

  const baseDate = `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(kst.getUTCDate()).padStart(2, '0')}`;
  const baseTimeStr = String(baseTime).padStart(2, '0') + '00';

  return { baseDate, baseTime: baseTimeStr };
}

/**
 * 예보 데이터 파싱 및 시간대별 정리
 */
function parseForecastData(items) {
  const forecasts = {};

  items.forEach(item => {
    const key = `${item.fcstDate}_${item.fcstTime}`;
    if (!forecasts[key]) {
      forecasts[key] = {
        date: item.fcstDate,
        time: item.fcstTime,
        hour: parseInt(item.fcstTime.substring(0, 2)),
      };
    }

    switch (item.category) {
      case 'TMP': // 기온
        forecasts[key].temperature = parseFloat(item.fcstValue);
        break;
      case 'SKY': // 하늘상태
        forecasts[key].sky = item.fcstValue;
        forecasts[key].skyText = SKY_CODES[item.fcstValue]?.text || '알수없음';
        forecasts[key].skyIcon = SKY_CODES[item.fcstValue]?.icon || '❓';
        break;
      case 'PTY': // 강수형태
        forecasts[key].pty = item.fcstValue;
        forecasts[key].ptyText = PTY_CODES[item.fcstValue]?.text || '';
        forecasts[key].ptyIcon = PTY_CODES[item.fcstValue]?.icon || '';
        break;
      case 'POP': // 강수확률
        forecasts[key].pop = parseInt(item.fcstValue);
        break;
      case 'REH': // 습도
        forecasts[key].humidity = parseInt(item.fcstValue);
        break;
      case 'WSD': // 풍속
        forecasts[key].windSpeed = parseFloat(item.fcstValue);
        break;
      case 'PCP': // 1시간 강수량
        forecasts[key].precipitation = item.fcstValue === '강수없음' ? 0 : item.fcstValue;
        break;
      case 'SNO': // 적설량
        forecasts[key].snow = item.fcstValue === '적설없음' ? 0 : item.fcstValue;
        break;
    }
  });

  // 시간순 정렬
  return Object.values(forecasts)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    })
    .map(f => ({
      ...f,
      // 강수가 있으면 강수 아이콘, 없으면 하늘상태 아이콘
      icon: f.ptyIcon || f.skyIcon,
      condition: f.ptyText || f.skyText,
    }));
}

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { region } = req.query;

  if (!region) {
    return res.status(400).json({
      success: false,
      error: '지역명이 필요합니다 (예: ?region=수원시)',
    });
  }

  const coords = GRID_COORDS[region];
  if (!coords) {
    return res.status(400).json({
      success: false,
      error: `지원하지 않는 지역입니다: ${region}`,
      supportedRegions: Object.keys(GRID_COORDS),
    });
  }

  try {
    const { baseDate, baseTime } = getBaseDateTime();

    console.log(`[KMA Forecast] ${region} (${coords.nx}, ${coords.ny}) - ${baseDate} ${baseTime}`);

    const items = await getVilageFcst(coords.nx, coords.ny, baseDate, baseTime);

    if (!items || items.length === 0) {
      // 이전 발표시각으로 재시도
      const prevBaseTime = String((parseInt(baseTime) - 300 + 2400) % 2400).padStart(4, '0');
      const retryItems = await getVilageFcst(coords.nx, coords.ny, baseDate, prevBaseTime);

      if (!retryItems || retryItems.length === 0) {
        return res.status(500).json({
          success: false,
          error: '예보 데이터를 가져올 수 없습니다',
        });
      }

      const forecasts = parseForecastData(retryItems);
      return res.status(200).json({
        success: true,
        region,
        baseDate,
        baseTime: prevBaseTime,
        forecasts: forecasts.slice(0, 24), // 24시간분
      });
    }

    const forecasts = parseForecastData(items);

    return res.status(200).json({
      success: true,
      region,
      baseDate,
      baseTime,
      forecasts: forecasts.slice(0, 24), // 24시간분
    });

  } catch (error) {
    console.error('[KMA Forecast Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
