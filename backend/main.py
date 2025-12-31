"""
경기 기후 체감 맵 - FastAPI 백엔드 서버
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

from climate_api import get_mock_climate_data, get_all_mock_data, GYEONGGI_REGIONS
from climate_index import (
    calculate_climate_score,
    adjust_score_for_target,
    get_risk_color,
    get_risk_label,
    RiskLevel,
    TargetGroup
)
from ai_service import AIClimateExplainer, get_action_guide
from kma_proxy import fetch_kma_single, fetch_kma_period

app = FastAPI(
    title="경기 기후 체감 맵 API",
    description="경기도 읍·면·동 단위 기후 체감 지수 및 AI 설명 서비스",
    version="1.0.0"
)

# CORS 설정 (프론트엔드 연동용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI 설명 생성기 초기화
ai_explainer = AIClimateExplainer()


# --- Pydantic 모델 ---
class ClimateData(BaseModel):
    region: str
    lat: float
    lng: float
    temperature: float
    apparent_temperature: float
    humidity: float
    pm10: float
    pm25: float
    uv_index: float
    surface_temperature: float
    wind_speed: Optional[float] = None
    precipitation: Optional[float] = None
    heat_wave_days: Optional[int] = None


class ClimateScore(BaseModel):
    region: str
    lat: float
    lng: float
    score: int
    adjusted_score: Optional[int] = None
    risk_level: str
    risk_label: str
    risk_color: str
    climate_data: ClimateData


class ClimateExplanation(BaseModel):
    region: str
    score: int
    risk_level: str
    risk_label: str
    explanation: str
    action_guides: List[str]
    target: str


class AllRegionsResponse(BaseModel):
    regions: List[ClimateScore]
    timestamp: str


# --- API 엔드포인트 ---

@app.get("/")
async def root():
    return {
        "service": "경기 기후 체감 맵",
        "version": "1.0.0",
        "endpoints": {
            "all_regions": "/api/climate/all",
            "single_region": "/api/climate/{region}",
            "explanation": "/api/climate/{region}/explain",
            "kma": "/api/kma",
            "kma_period": "/api/kma-period"
        }
    }


@app.get("/api/regions", response_model=List[str])
async def get_regions():
    """사용 가능한 경기도 시군 목록 조회"""
    return list(GYEONGGI_REGIONS.keys())

@app.get("/api/kma")
async def get_kma_data(
    tm: str = Query(..., description="조회 시간 (YYYYMMDDHH00 형식)"),
    stn: str = Query("0", description="관측소 번호 (0: 전체)")
):
    """기상청 API 프록시 - 단일 시간 조회"""
    try:
        return await fetch_kma_single(tm, stn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기상청 API 호출 실패: {str(e)}")


@app.get("/api/kma-period")
async def get_kma_period_data(
    tm1: str = Query(..., description="시작 시간 (YYYYMMDDHH00 형식)"),
    tm2: str = Query(..., description="종료 시간 (YYYYMMDDHH00 형식)"),
    stn: str = Query("0", description="관측소 번호 (0: 전체)")
):
    """기상청 API 프록시 - 기간 조회"""
    try:
        return await fetch_kma_period(tm1, tm2, stn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기상청 API 호출 실패: {str(e)}")


@app.get("/api/climate/all", response_model=AllRegionsResponse)
async def get_all_climate_data(
    target: Optional[str] = Query(None, description="대상 그룹: elderly, child, outdoor, general")
):
    """
    모든 경기도 시군의 기후 체감 점수 조회
    지도 전체 표시용
    """
    from datetime import datetime

    target_group = TargetGroup.GENERAL
    if target:
        try:
            target_group = TargetGroup(target)
        except ValueError:
            pass

    all_data = get_all_mock_data()
    results = []

    for data in all_data:
        score, risk_level = calculate_climate_score(data)
        adjusted = adjust_score_for_target(score, target_group) if target else None

        # adjusted_score가 있으면 그에 맞는 risk_level 재계산
        display_score = adjusted if adjusted else score
        if display_score >= 75:
            display_risk = RiskLevel.DANGER
        elif display_score >= 50:
            display_risk = RiskLevel.WARNING
        elif display_score >= 30:
            display_risk = RiskLevel.CAUTION
        else:
            display_risk = RiskLevel.SAFE

        results.append(ClimateScore(
            region=data["region"],
            lat=data["lat"],
            lng=data["lng"],
            score=score,
            adjusted_score=adjusted,
            risk_level=display_risk.value,
            risk_label=get_risk_label(display_risk),
            risk_color=get_risk_color(display_risk),
            climate_data=ClimateData(**data)
        ))

    return AllRegionsResponse(
        regions=results,
        timestamp=datetime.now().isoformat()
    )


@app.get("/api/climate/{region}", response_model=ClimateScore)
async def get_region_climate(
    region: str,
    target: Optional[str] = Query(None, description="대상 그룹")
):
    """
    특정 지역의 기후 체감 점수 조회
    """
    if region not in GYEONGGI_REGIONS:
        raise HTTPException(status_code=404, detail=f"'{region}' 지역을 찾을 수 없습니다.")

    target_group = TargetGroup.GENERAL
    if target:
        try:
            target_group = TargetGroup(target)
        except ValueError:
            pass

    data = get_mock_climate_data(region)
    score, risk_level = calculate_climate_score(data)
    adjusted = adjust_score_for_target(score, target_group) if target else None

    display_score = adjusted if adjusted else score
    if display_score >= 75:
        display_risk = RiskLevel.DANGER
    elif display_score >= 50:
        display_risk = RiskLevel.WARNING
    elif display_score >= 30:
        display_risk = RiskLevel.CAUTION
    else:
        display_risk = RiskLevel.SAFE

    return ClimateScore(
        region=data["region"],
        lat=data["lat"],
        lng=data["lng"],
        score=score,
        adjusted_score=adjusted,
        risk_level=display_risk.value,
        risk_label=get_risk_label(display_risk),
        risk_color=get_risk_color(display_risk),
        climate_data=ClimateData(**data)
    )


@app.get("/api/climate/{region}/explain", response_model=ClimateExplanation)
async def get_climate_explanation(
    region: str,
    target: Optional[str] = Query("general", description="대상 그룹: elderly, child, outdoor, general")
):
    """
    특정 지역의 AI 기후 설명 생성
    대상별 맞춤 문구 제공
    """
    if region not in GYEONGGI_REGIONS:
        raise HTTPException(status_code=404, detail=f"'{region}' 지역을 찾을 수 없습니다.")

    target_group = TargetGroup.GENERAL
    try:
        target_group = TargetGroup(target)
    except ValueError:
        pass

    data = get_mock_climate_data(region)
    score, risk_level = calculate_climate_score(data)
    adjusted = adjust_score_for_target(score, target_group)

    # 조정된 점수에 따른 위험 등급
    if adjusted >= 75:
        display_risk = RiskLevel.DANGER
    elif adjusted >= 50:
        display_risk = RiskLevel.WARNING
    elif adjusted >= 30:
        display_risk = RiskLevel.CAUTION
    else:
        display_risk = RiskLevel.SAFE

    # AI 설명 생성
    explanation = await ai_explainer.generate_explanation(
        region=region,
        climate_data=data,
        score=adjusted,
        risk_level=display_risk,
        target=target_group
    )

    # 행동 가이드
    guides = get_action_guide(display_risk, target_group)

    target_labels = {
        TargetGroup.ELDERLY: "노인",
        TargetGroup.CHILD: "아동",
        TargetGroup.OUTDOOR_WORKER: "야외근로자",
        TargetGroup.GENERAL: "일반 시민",
    }

    return ClimateExplanation(
        region=region,
        score=adjusted,
        risk_level=display_risk.value,
        risk_label=get_risk_label(display_risk),
        explanation=explanation,
        action_guides=guides,
        target=target_labels.get(target_group, "일반 시민")
    )


@app.get("/health")
async def health_check():
    """서버 상태 확인"""
    return {"status": "healthy", "service": "gyeonggi-climate-map"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
