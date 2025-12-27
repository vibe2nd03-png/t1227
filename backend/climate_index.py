"""
기후 체감 지수 계산 모듈
0~100점 체감 기후 점수 산출
"""
from typing import Dict, Any, Tuple
from enum import Enum


class RiskLevel(str, Enum):
    SAFE = "safe"           # 안전 (파랑)
    CAUTION = "caution"     # 주의 (노랑)
    WARNING = "warning"     # 경고 (주황)
    DANGER = "danger"       # 위험 (빨강)


class TargetGroup(str, Enum):
    ELDERLY = "elderly"         # 노인
    CHILD = "child"             # 아동
    OUTDOOR_WORKER = "outdoor"  # 야외근로자
    GENERAL = "general"         # 일반 시민


def calculate_apparent_temperature(temp: float, humidity: float, wind_speed: float = 2.0) -> float:
    """
    체감온도 계산 (Heat Index 기반)
    - temp: 기온 (°C)
    - humidity: 상대습도 (%)
    - wind_speed: 풍속 (m/s)
    """
    if temp < 27:
        # 저온에서는 풍속 영향 고려
        return temp - (wind_speed * 0.7)

    # 고온에서는 Heat Index 공식 적용 (간소화 버전)
    hi = temp + 0.33 * (humidity / 100 * 6.105 * (17.27 * temp / (237.7 + temp))) - 4.0

    return round(hi, 1)


def calculate_climate_score(data: Dict[str, Any]) -> Tuple[int, RiskLevel]:
    """
    체감 기후 점수 계산 (0~100)
    점수가 높을수록 위험

    가중치:
    - 체감온도: 40%
    - 미세먼지(PM10): 20%
    - 초미세먼지(PM2.5): 15%
    - 습도: 10%
    - 자외선지수: 10%
    - 지표면온도: 5%
    """
    score = 0

    # 1. 체감온도 점수 (0~40점)
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

    # 2. 미세먼지 PM10 점수 (0~20점)
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

    # 3. 초미세먼지 PM2.5 점수 (0~15점)
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

    # 4. 습도 점수 (0~10점) - 너무 높거나 낮으면 불쾌
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

    # 5. 자외선지수 점수 (0~10점)
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

    # 6. 지표면온도 보정 (0~5점)
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

    # 최종 점수 정규화
    final_score = min(100, max(0, int(score)))

    # 위험 등급 결정
    if final_score >= 75:
        risk_level = RiskLevel.DANGER
    elif final_score >= 50:
        risk_level = RiskLevel.WARNING
    elif final_score >= 30:
        risk_level = RiskLevel.CAUTION
    else:
        risk_level = RiskLevel.SAFE

    return final_score, risk_level


def get_risk_color(risk_level: RiskLevel) -> str:
    """위험 등급별 색상 코드 반환"""
    colors = {
        RiskLevel.SAFE: "#2196F3",      # 파랑
        RiskLevel.CAUTION: "#FFEB3B",   # 노랑
        RiskLevel.WARNING: "#FF9800",   # 주황
        RiskLevel.DANGER: "#F44336",    # 빨강
    }
    return colors.get(risk_level, "#9E9E9E")


def get_risk_label(risk_level: RiskLevel) -> str:
    """위험 등급 한글 라벨"""
    labels = {
        RiskLevel.SAFE: "안전",
        RiskLevel.CAUTION: "주의",
        RiskLevel.WARNING: "경고",
        RiskLevel.DANGER: "위험",
    }
    return labels.get(risk_level, "알 수 없음")


def adjust_score_for_target(base_score: int, target: TargetGroup) -> int:
    """
    대상별 점수 조정
    취약계층은 동일 조건에서 더 높은 위험도
    """
    adjustments = {
        TargetGroup.ELDERLY: 1.3,      # 노인: 30% 가중
        TargetGroup.CHILD: 1.25,       # 아동: 25% 가중
        TargetGroup.OUTDOOR_WORKER: 1.2,  # 야외근로자: 20% 가중
        TargetGroup.GENERAL: 1.0,      # 일반: 기본
    }

    multiplier = adjustments.get(target, 1.0)
    adjusted = int(base_score * multiplier)
    return min(100, adjusted)
