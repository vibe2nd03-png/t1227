"""
경기 기후 체감 맵 - Vercel Serverless API
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import random
import re
from datetime import datetime

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
