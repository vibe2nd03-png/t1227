"""
기상청 API 프록시 모듈
CORS 문제를 해결하기 위해 서버사이드에서 API 호출
"""
import httpx
import re
from typing import List, Dict, Any

# 기상청 API 설정
KMA_AUTH_KEY = "DbUh4_ekRRi1IeP3pPUYog"
KMA_BASE_URL = "https://apihub.kma.go.kr/api/typ01/url"

# 기상청 API 응답 컬럼 정의
KMA_COLUMNS = [
    'TM', 'STN', 'WD', 'WS', 'GST_WD', 'GST_WS', 'GST_TM',
    'PA', 'PS', 'PT', 'PR', 'TA', 'TD', 'HM', 'PV',
    'RN', 'RN_DAY', 'RN_JUN', 'RN_INT', 'SD_HR3', 'SD_DAY', 'SD_TOT',
    'WC', 'WP', 'WW', 'CA_TOT', 'CA_MID', 'CH_MIN', 'CT',
    'CT_TOP', 'CT_MID', 'CT_LOW', 'VS', 'SS', 'SI',
    'ST_GD', 'TS', 'TE_005', 'TE_01', 'TE_02', 'TE_03',
    'ST_SEA', 'WH', 'BF', 'IR', 'IX'
]


def parse_kma_response(text: str) -> List[Dict[str, Any]]:
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
                # 결측값 처리 (-9, -99.0, -9.0)
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


async def fetch_kma_single(tm: str, stn: str = "0") -> Dict[str, Any]:
    """단일 시간 기상 데이터 조회"""
    url = f"{KMA_BASE_URL}/kma_sfctm2.php?tm={tm}&stn={stn}&authKey={KMA_AUTH_KEY}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        text = response.text
        data = parse_kma_response(text)
        
        return {
            "success": True,
            "datetime": tm,
            "count": len(data),
            "data": data
        }


async def fetch_kma_period(tm1: str, tm2: str, stn: str = "0") -> Dict[str, Any]:
    """기간 기상 데이터 조회"""
    url = f"{KMA_BASE_URL}/kma_sfctm3.php?tm1={tm1}&tm2={tm2}&stn={stn}&authKey={KMA_AUTH_KEY}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url)
        text = response.text
        data = parse_kma_response(text)
        
        return {
            "success": True,
            "startTime": tm1,
            "endTime": tm2,
            "count": len(data),
            "data": data
        }
