"""
AI 기후 설명 생성 모듈
OpenAI/Claude API를 활용한 자연어 설명 생성
"""
from typing import Dict, Any, Optional
from openai import AsyncOpenAI
from climate_index import RiskLevel, TargetGroup, get_risk_label
from config import settings


class AIClimateExplainer:
    """AI 기반 기후 설명 생성기"""

    def __init__(self):
        self.client = None
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your_openai_api_key_here":
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_explanation(
        self,
        region: str,
        climate_data: Dict[str, Any],
        score: int,
        risk_level: RiskLevel,
        target: TargetGroup = TargetGroup.GENERAL
    ) -> str:
        """
        지역 기후 상태에 대한 AI 설명 생성
        """
        if self.client:
            return await self._generate_with_api(region, climate_data, score, risk_level, target)
        else:
            return self._generate_fallback(region, climate_data, score, risk_level, target)

    async def _generate_with_api(
        self,
        region: str,
        climate_data: Dict[str, Any],
        score: int,
        risk_level: RiskLevel,
        target: TargetGroup
    ) -> str:
        """OpenAI API를 사용한 설명 생성"""

        target_descriptions = {
            TargetGroup.ELDERLY: "65세 이상 노인",
            TargetGroup.CHILD: "어린이 (12세 이하)",
            TargetGroup.OUTDOOR_WORKER: "야외 근로자",
            TargetGroup.GENERAL: "일반 시민",
        }

        prompt = f"""다음은 경기도 {region}의 현재 기후 데이터입니다.

기온: {climate_data.get('temperature', 'N/A')}°C
체감온도: {climate_data.get('apparent_temperature', 'N/A')}°C
습도: {climate_data.get('humidity', 'N/A')}%
미세먼지(PM10): {climate_data.get('pm10', 'N/A')} μg/m³
초미세먼지(PM2.5): {climate_data.get('pm25', 'N/A')} μg/m³
자외선지수: {climate_data.get('uv_index', 'N/A')}
지표면온도: {climate_data.get('surface_temperature', 'N/A')}°C

체감기후점수: {score}점 (100점 만점, 높을수록 위험)
위험등급: {get_risk_label(risk_level)}

대상: {target_descriptions.get(target, '일반 시민')}

위 데이터를 바탕으로 {target_descriptions.get(target)}이 이해하기 쉬운 날씨 안내 문장을 작성해주세요.
- 2~3문장으로 간결하게
- 구체적인 행동 가이드 포함
- 친근하고 이해하기 쉬운 표현 사용
- 이모지는 사용하지 마세요"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "당신은 시민들에게 날씨와 건강 정보를 알기 쉽게 전달하는 기상 안내 전문가입니다."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI API 오류: {e}")
            return self._generate_fallback(region, climate_data, score, risk_level, target)

    def _generate_fallback(
        self,
        region: str,
        climate_data: Dict[str, Any],
        score: int,
        risk_level: RiskLevel,
        target: TargetGroup
    ) -> str:
        """API 없이 규칙 기반 설명 생성"""

        temp = climate_data.get("apparent_temperature", climate_data.get("temperature", 25))
        pm10 = climate_data.get("pm10", 30)
        pm25 = climate_data.get("pm25", 15)

        # 온도 상태 문구
        if temp >= 35:
            temp_status = "매우 무더운"
            temp_advice = "실외 활동을 자제하고 시원한 실내에서 휴식하세요."
        elif temp >= 31:
            temp_status = "무더운"
            temp_advice = "장시간 야외 활동은 피하고 충분한 수분을 섭취하세요."
        elif temp >= 27:
            temp_status = "다소 더운"
            temp_advice = "야외 활동 시 그늘에서 휴식을 취하세요."
        elif temp >= 20:
            temp_status = "쾌적한"
            temp_advice = "야외 활동하기 좋은 날씨입니다."
        else:
            temp_status = "선선한"
            temp_advice = "가벼운 겉옷을 챙기세요."

        # 미세먼지 상태 문구
        if pm25 >= 36 or pm10 >= 81:
            dust_status = "미세먼지가 나쁨 상태입니다. "
            dust_advice = "마스크를 착용하고 외출을 줄이세요."
        elif pm25 >= 16 or pm10 >= 31:
            dust_status = "미세먼지가 보통 수준입니다. "
            dust_advice = ""
        else:
            dust_status = ""
            dust_advice = ""

        # 대상별 추가 문구
        target_specific = ""
        if target == TargetGroup.ELDERLY:
            if risk_level in [RiskLevel.DANGER, RiskLevel.WARNING]:
                target_specific = " 어르신께서는 특히 무리하지 마시고 주변에 이상 증상이 있으면 즉시 알려주세요."
        elif target == TargetGroup.CHILD:
            if risk_level in [RiskLevel.DANGER, RiskLevel.WARNING]:
                target_specific = " 아이들의 야외 놀이 시간을 줄이고 충분한 물을 마시게 해주세요."
        elif target == TargetGroup.OUTDOOR_WORKER:
            if risk_level in [RiskLevel.DANGER, RiskLevel.WARNING]:
                target_specific = " 야외 작업 시 매시간 10분 이상 그늘에서 휴식하고 물을 자주 드세요."

        # 위험 등급별 경고
        risk_warning = ""
        if risk_level == RiskLevel.DANGER:
            risk_warning = f"현재 {region}은 기후 위험 단계입니다. "
        elif risk_level == RiskLevel.WARNING:
            risk_warning = f"현재 {region}은 기후 경고 단계입니다. "

        # 최종 문장 조합
        explanation = f"오늘 {region}은 체감온도 {temp}도로 {temp_status} 날씨입니다. {risk_warning}{dust_status}{temp_advice}{dust_advice}{target_specific}"

        return explanation.strip()


def get_action_guide(risk_level: RiskLevel, target: TargetGroup) -> list:
    """대상별 행동 가이드 리스트 반환"""

    guides = {
        RiskLevel.SAFE: {
            TargetGroup.GENERAL: ["야외 활동에 적합한 날씨입니다", "평소처럼 생활하셔도 됩니다"],
            TargetGroup.ELDERLY: ["산책하기 좋은 날씨입니다", "물을 충분히 드세요"],
            TargetGroup.CHILD: ["밖에서 놀아도 좋아요", "모자를 쓰면 더 좋아요"],
            TargetGroup.OUTDOOR_WORKER: ["작업하기 좋은 날씨입니다", "수분 섭취를 잊지 마세요"],
        },
        RiskLevel.CAUTION: {
            TargetGroup.GENERAL: ["장시간 야외 활동은 주의하세요", "수분 섭취를 늘리세요"],
            TargetGroup.ELDERLY: ["외출 시 그늘로 다니세요", "무리한 활동은 피하세요"],
            TargetGroup.CHILD: ["그늘에서 놀게 해주세요", "물을 자주 마시게 하세요"],
            TargetGroup.OUTDOOR_WORKER: ["1시간마다 휴식하세요", "시원한 물을 자주 드세요"],
        },
        RiskLevel.WARNING: {
            TargetGroup.GENERAL: ["가급적 실내에 머무르세요", "외출 시 양산/모자 필수"],
            TargetGroup.ELDERLY: ["에어컨이 있는 곳에 계세요", "어지러우면 즉시 휴식하세요"],
            TargetGroup.CHILD: ["실내 놀이를 권장합니다", "야외 체육 활동 자제"],
            TargetGroup.OUTDOOR_WORKER: ["30분마다 그늘 휴식 필수", "이상 증상 시 작업 중단"],
        },
        RiskLevel.DANGER: {
            TargetGroup.GENERAL: ["외출을 삼가세요", "냉방 시설을 이용하세요", "응급상황 대비 119"],
            TargetGroup.ELDERLY: ["절대 외출하지 마세요", "시원한 곳에서 휴식하세요", "가족에게 연락 유지"],
            TargetGroup.CHILD: ["야외 활동 금지", "시원한 실내에 있게 하세요", "수분/염분 섭취 중요"],
            TargetGroup.OUTDOOR_WORKER: ["야외 작업 중단 권고", "실내로 대피하세요", "동료 상태 서로 확인"],
        },
    }

    return guides.get(risk_level, {}).get(target, ["날씨 정보를 확인하세요"])
