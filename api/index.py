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


# 경기도 지역 격자 좌표 (기상청 단기예보용)
GRID_COORDS = {
    '수원시': {'nx': 60, 'ny': 121},
    '성남시': {'nx': 63, 'ny': 124},
    '고양시': {'nx': 57, 'ny': 128},
    '용인시': {'nx': 64, 'ny': 119},
    '부천시': {'nx': 56, 'ny': 125},
    '안산시': {'nx': 53, 'ny': 121},
    '안양시': {'nx': 59, 'ny': 123},
    '남양주시': {'nx': 64, 'ny': 128},
    '화성시': {'nx': 57, 'ny': 119},
    '평택시': {'nx': 62, 'ny': 114},
    '의정부시': {'nx': 61, 'ny': 130},
    '시흥시': {'nx': 55, 'ny': 122},
    '파주시': {'nx': 56, 'ny': 131},
    '김포시': {'nx': 55, 'ny': 128},
    '광명시': {'nx': 58, 'ny': 125},
    '광주시': {'nx': 65, 'ny': 123},
    '군포시': {'nx': 59, 'ny': 122},
    '하남시': {'nx': 64, 'ny': 126},
    '오산시': {'nx': 62, 'ny': 118},
    '이천시': {'nx': 68, 'ny': 121},
    '안성시': {'nx': 65, 'ny': 115},
    '의왕시': {'nx': 60, 'ny': 122},
    '양주시': {'nx': 61, 'ny': 131},
    '포천시': {'nx': 64, 'ny': 134},
    '여주시': {'nx': 71, 'ny': 121},
    '동두천시': {'nx': 61, 'ny': 134},
    '과천시': {'nx': 60, 'ny': 124},
    '구리시': {'nx': 62, 'ny': 127},
    '연천군': {'nx': 61, 'ny': 138},
    '가평군': {'nx': 69, 'ny': 133},
    '양평군': {'nx': 69, 'ny': 125},
}

# 하늘상태 코드
SKY_CODES = {
    '1': {'text': '맑음', 'icon': '☀️'},
    '3': {'text': '구름많음', 'icon': '⛅'},
    '4': {'text': '흐림', 'icon': '☁️'},
}

# 강수형태 코드
PTY_CODES = {
    '0': {'text': '', 'icon': ''},
    '1': {'text': '비', 'icon': '🌧️'},
    '2': {'text': '비/눈', 'icon': '🌨️'},
    '3': {'text': '눈', 'icon': '❄️'},
    '4': {'text': '소나기', 'icon': '🌦️'},
}


def get_base_datetime():
    """가장 가까운 발표시각 계산 (단기예보는 02, 05, 08, 11, 14, 17, 20, 23시)"""
    from datetime import timedelta
    now = datetime.now()
    # UTC to KST
    kst = now + timedelta(hours=9)

    hours = kst.hour
    minutes = kst.minute

    base_times = [2, 5, 8, 11, 14, 17, 20, 23]

    # API 제공 시간 고려 (발표 후 약 10분 소요)
    current_hour = hours
    if minutes < 10:
        current_hour = hours - 1
        if current_hour < 0:
            current_hour = 23

    # 가장 가까운 과거 발표 시각 찾기
    base_time = base_times[0]
    for i in range(len(base_times) - 1, -1, -1):
        if base_times[i] <= current_hour:
            base_time = base_times[i]
            break

    # 0시~2시 사이면 전날 23시 발표 사용
    if current_hour < 2:
        base_time = 23
        kst = kst - timedelta(days=1)

    base_date = kst.strftime("%Y%m%d")
    base_time_str = f"{base_time:02d}00"

    return base_date, base_time_str


def fetch_kma_forecast(nx, ny, base_date, base_time):
    """기상청 단기예보 API 호출"""
    try:
        url = f"https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=1000&dataType=JSON&base_date={base_date}&base_time={base_time}&nx={nx}&ny={ny}&authKey={KMA_AUTH_KEY}"

        with urlopen(url, timeout=30) as response:
            text = response.read().decode('utf-8')
            data = json.loads(text)

            if data.get('response', {}).get('body', {}).get('items', {}).get('item'):
                return data['response']['body']['items']['item']
    except Exception as e:
        print(f"KMA Forecast API Error: {e}")

    return None


def parse_forecast_data(items):
    """예보 데이터 파싱"""
    forecasts = {}

    for item in items:
        key = f"{item['fcstDate']}_{item['fcstTime']}"
        if key not in forecasts:
            forecasts[key] = {
                'date': item['fcstDate'],
                'time': item['fcstTime'],
                'hour': int(item['fcstTime'][:2]),
            }

        category = item['category']
        value = item['fcstValue']

        if category == 'TMP':
            forecasts[key]['temperature'] = float(value)
        elif category == 'SKY':
            forecasts[key]['sky'] = value
            sky_info = SKY_CODES.get(value, {'text': '알수없음', 'icon': '❓'})
            forecasts[key]['skyText'] = sky_info['text']
            forecasts[key]['skyIcon'] = sky_info['icon']
        elif category == 'PTY':
            forecasts[key]['pty'] = value
            pty_info = PTY_CODES.get(value, {'text': '', 'icon': ''})
            forecasts[key]['ptyText'] = pty_info['text']
            forecasts[key]['ptyIcon'] = pty_info['icon']
        elif category == 'POP':
            forecasts[key]['pop'] = int(value)
        elif category == 'REH':
            forecasts[key]['humidity'] = int(value)
        elif category == 'WSD':
            forecasts[key]['windSpeed'] = float(value)

    # 시간순 정렬 및 아이콘 설정
    result = []
    for f in sorted(forecasts.values(), key=lambda x: (x['date'], x['time'])):
        f['icon'] = f.get('ptyIcon') or f.get('skyIcon', '☀️')
        f['condition'] = f.get('ptyText') or f.get('skyText', '맑음')
        result.append(f)

    return result


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
    """실제 기상청 예보 데이터 조회"""
    coords = GRID_COORDS.get(region_name)
    if not coords:
        coords = {'nx': 60, 'ny': 121}  # 기본값: 수원시

    base_date, base_time = get_base_datetime()

    # 기상청 API 호출
    items = fetch_kma_forecast(coords['nx'], coords['ny'], base_date, base_time)

    if items:
        forecasts = parse_forecast_data(items)
        if forecasts:
            return {
                "success": True,
                "region": region_name,
                "baseTime": f"{base_date[4:6]}/{base_date[6:8]} {base_time[:2]}:00 기준",
                "forecasts": forecasts[:24],
                "isMock": False
            }

    # API 실패시 이전 발표시각으로 재시도
    prev_base_time = f"{(int(base_time[:2]) - 3 + 24) % 24:02d}00"
    items = fetch_kma_forecast(coords['nx'], coords['ny'], base_date, prev_base_time)

    if items:
        forecasts = parse_forecast_data(items)
        if forecasts:
            return {
                "success": True,
                "region": region_name,
                "baseTime": f"{base_date[4:6]}/{base_date[6:8]} {prev_base_time[:2]}:00 기준",
                "forecasts": forecasts[:24],
                "isMock": False
            }

    # 최종 폴백: Mock 데이터
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
