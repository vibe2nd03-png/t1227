"""
경기 기후 체감 맵 - Vercel Serverless API
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen
from urllib.error import URLError
import json
import random
import re
from datetime import datetime

# 기상청 API 설정
KMA_AUTH_KEY = "DbUh4_ekRRi1IeP3pPUYog"
KMA_FORECAST_KEY = "Ns9jp8v2RkSPY6fL9gZEeg"  # 예보 API 인증키
KMA_BASE_URL = "https://apihub.kma.go.kr/api/typ01/url"
KMA_COLUMNS = [
    'TM', 'STN', 'WD', 'WS', 'GST_WD', 'GST_WS', 'GST_TM',
    'PA', 'PS', 'PT', 'PR', 'TA', 'TD', 'HM', 'PV',
    'RN', 'RN_DAY', 'RN_JUN', 'RN_INT', 'SD_HR3', 'SD_DAY', 'SD_TOT',
    'WC', 'WP', 'WW', 'CA_TOT', 'CA_MID', 'CH_MIN', 'CT',
    'CT_TOP', 'CT_MID', 'CT_LOW', 'VS', 'SS', 'SI',
    'ST_GD', 'TS', 'TE_005', 'TE_01', 'TE_02', 'TE_03',
    'ST_SEA', 'WH', 'BF', 'IR', 'IX'
]


def parse_kma_response(text):
    """기상청 API 텍스트 응답을 JSON으로 파싱"""
    lines = [
        line for line in text.split('\n')
        if line.strip() and not line.startswith('#')
        and 'END7777' not in line and 'START7777' not in line
    ]

    data = []
    for line in lines:
        values = line.strip().split()
        record = {}
        for idx, col in enumerate(KMA_COLUMNS):
            if idx < len(values):
                value = values[idx]
                if value in ['-9', '-99.0', '-9.0']:
                    record[col] = None
                elif re.match(r'^-?\d+\.?\d*$', value):
                    record[col] = float(value)
                else:
                    record[col] = value
            else:
                record[col] = None
        data.append(record)
    return data


def fetch_kma_data(tm, stn="0"):
    """기상청 API 호출"""
    try:
        url = f"{KMA_BASE_URL}/kma_sfctm2.php?tm={tm}&stn={stn}&authKey={KMA_AUTH_KEY}"
        with urlopen(url, timeout=30) as response:
            text = response.read().decode('utf-8')
            data = parse_kma_response(text)
            return {"success": True, "datetime": tm, "count": len(data), "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


def fetch_kma_period(tm1, tm2, stn="0"):
    """기상청 기간 API 호출"""
    try:
        url = f"{KMA_BASE_URL}/kma_sfctm3.php?tm1={tm1}&tm2={tm2}&stn={stn}&authKey={KMA_AUTH_KEY}"
        with urlopen(url, timeout=30) as response:
            text = response.read().decode('utf-8')
            data = parse_kma_response(text)
            return {"success": True, "startTime": tm1, "endTime": tm2, "count": len(data), "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

# 경기도 31개 시군 정보
GYEONGGI_REGIONS = {
    "수원시": {"code": "41110", "lat": 37.2636, "lng": 127.0286},
    "성남시": {"code": "41130", "lat": 37.4449, "lng": 127.1389},
    "의정부시": {"code": "41150", "lat": 37.7381, "lng": 127.0337},
    "안양시": {"code": "41170", "lat": 37.3943, "lng": 126.9568},
    "부천시": {"code": "41190", "lat": 37.5034, "lng": 126.7660},
    "광명시": {"code": "41210", "lat": 37.4786, "lng": 126.8644},
    "평택시": {"code": "41220", "lat": 36.9921, "lng": 127.1127},
    "동두천시": {"code": "41230", "lat": 37.9035, "lng": 127.0605},
    "안산시": {"code": "41270", "lat": 37.3219, "lng": 126.8309},
    "고양시": {"code": "41280", "lat": 37.6584, "lng": 126.8320},
    "과천시": {"code": "41290", "lat": 37.4292, "lng": 126.9876},
    "구리시": {"code": "41310", "lat": 37.5943, "lng": 127.1295},
    "남양주시": {"code": "41360", "lat": 37.6360, "lng": 127.2165},
    "오산시": {"code": "41370", "lat": 37.1498, "lng": 127.0775},
    "시흥시": {"code": "41390", "lat": 37.3800, "lng": 126.8029},
    "군포시": {"code": "41410", "lat": 37.3617, "lng": 126.9352},
    "의왕시": {"code": "41430", "lat": 37.3449, "lng": 126.9683},
    "하남시": {"code": "41450", "lat": 37.5393, "lng": 127.2148},
    "용인시": {"code": "41460", "lat": 37.2411, "lng": 127.1776},
    "파주시": {"code": "41480", "lat": 37.7600, "lng": 126.7800},
    "이천시": {"code": "41500", "lat": 37.2720, "lng": 127.4350},
    "안성시": {"code": "41550", "lat": 37.0080, "lng": 127.2797},
    "김포시": {"code": "41570", "lat": 37.6152, "lng": 126.7156},
    "화성시": {"code": "41590", "lat": 37.1996, "lng": 126.8312},
    "광주시": {"code": "41610", "lat": 37.4095, "lng": 127.2550},
    "양주시": {"code": "41630", "lat": 37.7853, "lng": 127.0458},
    "포천시": {"code": "41650", "lat": 37.8949, "lng": 127.2002},
    "여주시": {"code": "41670", "lat": 37.2983, "lng": 127.6374},
    "연천군": {"code": "41800", "lat": 38.0966, "lng": 127.0750},
    "가평군": {"code": "41820", "lat": 37.8315, "lng": 127.5095},
    "양평군": {"code": "41830", "lat": 37.4917, "lng": 127.4872},
}

RISK_THRESHOLDS = {"DANGER": 75, "WARNING": 50, "CAUTION": 30, "SAFE": 0}
TARGET_MULTIPLIERS = {"elderly": 1.3, "child": 1.25, "outdoor": 1.2, "general": 1.0}
RISK_COLORS = {"safe": "#2196F3", "caution": "#FFEB3B", "warning": "#FF9800", "danger": "#F44336"}
RISK_LABELS = {"safe": "안전", "caution": "주의", "warning": "경고", "danger": "위험"}


# 경기도 지역별 예보구역코드 (기상청 API허브용)
FORECAST_REG_CODES = {
    '수원시': '11B20601',
    '성남시': '11B20605',
    '고양시': '11B20302',
    '용인시': '11B20612',
    '부천시': '11B20402',
    '안산시': '11B20203',
    '안양시': '11B20602',
    '남양주시': '11B20501',
    '화성시': '11B20604',
    '평택시': '11B20606',
    '의정부시': '11B20301',
    '시흥시': '11B20404',
    '파주시': '11B20305',
    '김포시': '11B20102',
    '광명시': '11B20401',
    '광주시': '11B20702',
    '군포시': '11B20610',
    '하남시': '11B20504',
    '오산시': '11B20603',
    '이천시': '11B20703',
    '안성시': '11B20611',
    '의왕시': '11B20609',
    '양주시': '11B20304',
    '포천시': '11B20403',
    '여주시': '11B20701',
    '동두천시': '11B20401',
    '과천시': '11B20609',
    '구리시': '11B20502',
    '연천군': '11B20402',
    '가평군': '11B20503',
    '양평군': '11B20503',
}

# 하늘상태 코드 (기상청 API허브)
SKY_CODES_KMA = {
    'DB01': {'text': '맑음', 'icon': '☀️'},
    'DB02': {'text': '구름조금', 'icon': '🌤️'},
    'DB03': {'text': '구름많음', 'icon': '⛅'},
    'DB04': {'text': '흐림', 'icon': '☁️'},
    'DB05': {'text': '비', 'icon': '🌧️'},
    'DB06': {'text': '눈/비', 'icon': '🌨️'},
    'DB07': {'text': '눈', 'icon': '❄️'},
    'DB09': {'text': '흐리고 비', 'icon': '🌧️'},
    'DB11': {'text': '흐리고 눈', 'icon': '❄️'},
    'DB13': {'text': '흐리고 비/눈', 'icon': '🌨️'},
}


def fetch_kma_hub_forecast(reg_code):
    """기상청 API허브 단기예보 호출"""
    try:
        url = f"{KMA_BASE_URL}/fct_afs_dl.php?reg={reg_code}&tmfc=0&authKey={KMA_FORECAST_KEY}"

        with urlopen(url, timeout=30) as response:
            text = response.read().decode('euc-kr', errors='ignore')
            return parse_kma_hub_forecast(text)
    except Exception as e:
        print(f"KMA Hub Forecast API Error: {e}")

    return None


def parse_kma_hub_forecast(text):
    """기상청 API허브 예보 응답 파싱"""
    forecasts = []
    lines = text.split('\n')

    for line in lines:
        # 주석 및 빈 줄 제외
        if line.startswith('#') or not line.strip() or 'END7777' in line or 'START7777' in line:
            continue

        parts = line.split()
        if len(parts) < 15:
            continue

        try:
            # REG_ID TM_FC TM_EF MOD NE STN C MAN_ID MAN_FC W1 T W2 TA ST SKY PREP WF
            tm_ef = parts[2]  # 예보시각 (예: 202601051200)
            ta = parts[12]     # 기온
            sky = parts[14]    # 하늘상태 (DB01, DB03 등)
            prep = parts[15] if len(parts) > 15 else '0'  # 강수확률

            # 시간 파싱
            date = tm_ef[:8]
            time = tm_ef[8:12]
            hour = int(time[:2])

            # 기온 파싱 (-99는 무효값)
            temp = int(ta) if ta != '-99' else None

            # 하늘상태 아이콘
            sky_info = SKY_CODES_KMA.get(sky, {'text': '맑음', 'icon': '☀️'})

            # 야간 아이콘 처리
            icon = sky_info['icon']
            if hour >= 18 or hour < 6:
                if icon == '☀️':
                    icon = '🌙'
                elif icon == '🌤️':
                    icon = '🌙'

            forecasts.append({
                'date': date,
                'time': time,
                'hour': hour,
                'temperature': temp,
                'icon': icon,
                'skyText': sky_info['text'],
                'condition': sky_info['text'],
                'pop': int(prep) if prep.isdigit() else 0,
            })
        except (ValueError, IndexError) as e:
            continue

    return forecasts


def get_mock_forecast(region_name):
    """Mock 예보 데이터 생성 (API 실패시 폴백)"""
    from datetime import timedelta
    now = datetime.now() + timedelta(hours=9)  # KST
    forecasts = []

    for i in range(24):
        hour = (now.hour + i) % 24
        day_offset = (now.hour + i) // 24

        # 시간대별 기온 변화
        if hour >= 13 and hour <= 15:
            base_temp = 3
        elif hour >= 5 and hour <= 7:
            base_temp = -5
        elif hour >= 8 and hour <= 12:
            base_temp = -2 + (hour - 8)
        elif hour >= 16 and hour <= 18:
            base_temp = 2 - (hour - 16)
        else:
            base_temp = -3

        temp = base_temp + random.randint(-1, 2)
        is_night = hour >= 19 or hour < 6

        forecast_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if day_offset > 0:
            forecast_date = forecast_date + timedelta(days=day_offset)

        forecasts.append({
            "date": forecast_date.strftime("%Y%m%d"),
            "time": f"{hour:02d}00",
            "hour": hour,
            "temperature": temp,
            "icon": "🌙" if is_night else ("☀️" if temp > 0 else "⛅"),
            "skyIcon": "🌙" if is_night else "☀️",
            "condition": "맑음",
            "skyText": "맑음",
            "pop": 10,
            "humidity": 50 + random.randint(0, 20),
            "windSpeed": 2 + random.randint(0, 3),
        })

    return forecasts


def get_real_forecast(region_name):
    """실제 기상청 예보 데이터 조회 (API허브 사용)"""
    from datetime import timedelta

    # 지역 코드 조회
    reg_code = FORECAST_REG_CODES.get(region_name, '11B20601')  # 기본값: 수원시

    # 기상청 API허브 호출
    forecasts = fetch_kma_hub_forecast(reg_code)

    if forecasts and len(forecasts) > 0:
        # 현재 시간 기준 정보
        now = datetime.now() + timedelta(hours=9)  # KST
        base_time = now.strftime("%m/%d %H:00 기준")

        return {
            "success": True,
            "region": region_name,
            "baseTime": base_time,
            "forecasts": forecasts,
            "isMock": False
        }

    # API 실패시 Mock 데이터
    now = datetime.now()
    return {
        "success": True,
        "region": region_name,
        "baseTime": now.strftime("%m/%d %H:00 기준 (예상치)"),
        "forecasts": get_mock_forecast(region_name),
        "isMock": True
    }


def get_weather_alerts():
    """기상 특보 데이터"""
    return {
        "success": True,
        "alerts": [],
        "message": "현재 발효 중인 기상 특보가 없습니다."
    }


def get_mock_climate_data(region_name):
    """Mock 기후 데이터 생성"""
    info = GYEONGGI_REGIONS.get(region_name, {"lat": 37.5, "lng": 127.0})
    base_temp = 28 + random.uniform(-5, 8)
    humidity = 55 + random.uniform(-15, 25)
    pm10 = 35 + random.uniform(-20, 45)
    pm25 = 18 + random.uniform(-10, 25)

    return {
        "region": region_name,
        "lat": info.get("lat", 37.5),
        "lng": info.get("lng", 127.0),
        "temperature": round(base_temp, 1),
        "humidity": round(humidity, 1),
        "apparent_temperature": round(base_temp + (humidity - 50) * 0.1, 1),
        "pm10": round(pm10, 0),
        "pm25": round(pm25, 0),
        "heat_wave_days": random.randint(0, 15),
        "precipitation": round(random.uniform(0, 50), 1),
        "surface_temperature": round(base_temp + random.uniform(3, 12), 1),
        "uv_index": round(random.uniform(5, 11), 1),
        "wind_speed": round(random.uniform(1, 8), 1),
    }


def calculate_climate_score(data):
    """체감 기후 점수 계산 (0~100)"""
    score = 0

    apparent_temp = data.get("apparent_temperature", data.get("temperature", 25))
    if apparent_temp >= 41:
        temp_score = 40
    elif apparent_temp >= 35:
        temp_score = 30 + (apparent_temp - 35) * 1.67
    elif apparent_temp >= 31:
        temp_score = 20 + (apparent_temp - 31) * 2.5
    elif apparent_temp >= 27:
        temp_score = 10 + (apparent_temp - 27) * 2.5
    else:
        temp_score = max(0, apparent_temp - 17)
    score += min(40, temp_score)

    pm10 = data.get("pm10", 30)
    if pm10 >= 151:
        pm10_score = 20
    elif pm10 >= 81:
        pm10_score = 15 + (pm10 - 81) * 0.07
    elif pm10 >= 31:
        pm10_score = 5 + (pm10 - 31) * 0.2
    else:
        pm10_score = pm10 / 6
    score += min(20, pm10_score)

    pm25 = data.get("pm25", 15)
    if pm25 >= 76:
        pm25_score = 15
    elif pm25 >= 36:
        pm25_score = 10 + (pm25 - 36) * 0.125
    elif pm25 >= 16:
        pm25_score = 5 + (pm25 - 16) * 0.25
    else:
        pm25_score = pm25 / 3
    score += min(15, pm25_score)

    humidity = data.get("humidity", 50)
    if humidity >= 80 or humidity <= 20:
        humidity_score = 10
    elif humidity >= 70 or humidity <= 30:
        humidity_score = 6
    elif humidity >= 60 or humidity <= 40:
        humidity_score = 3
    else:
        humidity_score = 0
    score += humidity_score

    uv = data.get("uv_index", 6)
    if uv >= 11:
        uv_score = 10
    elif uv >= 8:
        uv_score = 7 + (uv - 8)
    elif uv >= 6:
        uv_score = 4 + (uv - 6) * 1.5
    elif uv >= 3:
        uv_score = (uv - 3) * 1.33
    else:
        uv_score = 0
    score += min(10, uv_score)

    surface_temp = data.get("surface_temperature", data.get("temperature", 25) + 5)
    temp_diff = surface_temp - data.get("temperature", 25)
    if temp_diff >= 15:
        surface_score = 5
    elif temp_diff >= 10:
        surface_score = 3
    elif temp_diff >= 5:
        surface_score = 1
    else:
        surface_score = 0
    score += surface_score

    final_score = min(100, max(0, int(score)))

    if final_score >= RISK_THRESHOLDS["DANGER"]:
        risk_level = "danger"
    elif final_score >= RISK_THRESHOLDS["WARNING"]:
        risk_level = "warning"
    elif final_score >= RISK_THRESHOLDS["CAUTION"]:
        risk_level = "caution"
    else:
        risk_level = "safe"

    return final_score, risk_level


def adjust_score_for_target(base_score, target):
    multiplier = TARGET_MULTIPLIERS.get(target, 1.0)
    return min(100, int(base_score * multiplier))


def get_all_climate_data(target=None):
    """모든 지역의 기후 데이터 조회"""
    results = []
    target_group = target if target else "general"

    for region_name in GYEONGGI_REGIONS.keys():
        data = get_mock_climate_data(region_name)
        score, risk_level = calculate_climate_score(data)
        adjusted = adjust_score_for_target(score, target_group) if target else None

        display_score = adjusted if adjusted else score
        if display_score >= 75:
            display_risk = "danger"
        elif display_score >= 50:
            display_risk = "warning"
        elif display_score >= 30:
            display_risk = "caution"
        else:
            display_risk = "safe"

        results.append({
            "region": data["region"],
            "lat": data["lat"],
            "lng": data["lng"],
            "score": score,
            "adjusted_score": adjusted,
            "risk_level": display_risk,
            "risk_label": RISK_LABELS.get(display_risk, "알 수 없음"),
            "risk_color": RISK_COLORS.get(display_risk, "#9E9E9E"),
            "climate_data": data
        })

    return {
        "regions": results,
        "timestamp": datetime.now().isoformat()
    }


def get_region_climate(region, target=None):
    """특정 지역의 기후 데이터 조회"""
    if region not in GYEONGGI_REGIONS:
        return None

    target_group = target if target else "general"
    data = get_mock_climate_data(region)
    score, risk_level = calculate_climate_score(data)
    adjusted = adjust_score_for_target(score, target_group) if target else None

    display_score = adjusted if adjusted else score
    if display_score >= 75:
        display_risk = "danger"
    elif display_score >= 50:
        display_risk = "warning"
    elif display_score >= 30:
        display_risk = "caution"
    else:
        display_risk = "safe"

    return {
        "region": data["region"],
        "lat": data["lat"],
        "lng": data["lng"],
        "score": score,
        "adjusted_score": adjusted,
        "risk_level": display_risk,
        "risk_label": RISK_LABELS.get(display_risk, "알 수 없음"),
        "risk_color": RISK_COLORS.get(display_risk, "#9E9E9E"),
        "climate_data": data
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)

        # CORS 헤더
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        response = {}

        if path == '/api' or path == '/api/':
            response = {
                "service": "경기 기후 체감 맵",
                "version": "1.0.0",
                "endpoints": {
                    "all_regions": "/api/climate/all",
                    "single_region": "/api/climate/{region}",
                    "regions": "/api/regions",
                    "health": "/api/health"
                }
            }
        elif path == '/api/regions':
            response = list(GYEONGGI_REGIONS.keys())
        elif path == '/api/health':
            response = {"status": "healthy", "service": "gyeonggi-climate-map"}
        elif path == '/api/kma':
            tm = query_params.get('tm', [None])[0]
            stn = query_params.get('stn', ['0'])[0]
            if tm:
                response = fetch_kma_data(tm, stn)
            else:
                response = {"error": "tm 파라미터가 필요합니다"}
        elif path == '/api/kma-period':
            tm1 = query_params.get('tm1', [None])[0]
            tm2 = query_params.get('tm2', [None])[0]
            stn = query_params.get('stn', ['0'])[0]
            if tm1 and tm2:
                response = fetch_kma_period(tm1, tm2, stn)
            else:
                response = {"error": "tm1, tm2 파라미터가 필요합니다"}
        elif path == '/api/kma-forecast':
            from urllib.parse import unquote
            region = query_params.get('region', ['수원시'])[0]
            region = unquote(region)
            response = get_real_forecast(region)
        elif path == '/api/kma-alerts':
            response = get_weather_alerts()
        elif path == '/api/climate/all':
            target = query_params.get('target', [None])[0]
            response = get_all_climate_data(target)
        elif path.startswith('/api/climate/'):
            region = path.replace('/api/climate/', '').strip('/')
            region = region.replace('%EC%', '').replace('%', '')  # URL decode 시도
            # URL 디코딩
            from urllib.parse import unquote
            region = unquote(path.replace('/api/climate/', '').strip('/'))
            target = query_params.get('target', [None])[0]
            result = get_region_climate(region, target)
            if result:
                response = result
            else:
                self.send_response(404)
                response = {"error": f"'{region}' 지역을 찾을 수 없습니다."}
        else:
            response = {"error": "Not found", "path": path}

        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
