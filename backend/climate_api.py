"""
경기도 기후변화 API 연동 모듈
climate.gg.go.kr API 데이터 조회
"""
import httpx
from typing import Optional, Dict, Any, List
from config import settings

# 경기도 31개 시군 정보 (좌표 포함)
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


class ClimateAPIClient:
    """경기도 기후변화 API 클라이언트"""

    def __init__(self):
        self.api_key = settings.CLIMATE_API_KEY
        self.base_url = settings.CLIMATE_API_BASE_URL

    async def get_climate_data(self, region_code: str, data_type: str = "temperature") -> Optional[Dict[str, Any]]:
        """
        기후 데이터 조회
        data_type: temperature, humidity, pm10, precipitation 등
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    "apiKey": self.api_key,
                    "regionCode": region_code,
                    "dataType": data_type,
                    "format": "json"
                }
                response = await client.get(self.base_url, params=params)
                if response.status_code == 200:
                    return response.json()
                else:
                    return None
        except Exception as e:
            print(f"API 호출 오류: {e}")
            return None

    async def get_all_regions_data(self) -> List[Dict[str, Any]]:
        """모든 지역의 기후 데이터 조회"""
        results = []
        for region_name, info in GYEONGGI_REGIONS.items():
            data = await self.get_climate_data(info["code"])
            results.append({
                "region": region_name,
                "code": info["code"],
                "lat": info["lat"],
                "lng": info["lng"],
                "data": data
            })
        return results


def get_mock_climate_data(region_name: str) -> Dict[str, Any]:
    """
    실제 API 연결 전 테스트용 Mock 데이터
    실제 운영 시 API 데이터로 대체
    """
    import random

    info = GYEONGGI_REGIONS.get(region_name, {"lat": 37.5, "lng": 127.0})

    # 지역별 약간의 변동을 주어 현실감 있는 데이터 생성
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


def get_all_mock_data() -> List[Dict[str, Any]]:
    """모든 지역의 Mock 데이터 반환"""
    return [get_mock_climate_data(region) for region in GYEONGGI_REGIONS.keys()]
