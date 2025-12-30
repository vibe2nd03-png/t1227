"""
Supabase 클라이언트 모듈
Backend에서 Supabase DB 연동을 위한 유틸리티
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from config import settings

logger = logging.getLogger(__name__)

# Supabase 클라이언트 초기화 (설정이 있을 때만)
_supabase = None

def get_supabase():
    """Supabase 클라이언트 싱글톤 반환"""
    global _supabase
    if _supabase is None and settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client
            _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            logger.info("Supabase 클라이언트 초기화 완료")
        except Exception as e:
            logger.warning(f"Supabase 초기화 실패: {e}")
    return _supabase


class ClimateDataService:
    """기후 데이터 DB 서비스"""

    @staticmethod
    async def get_all_regions() -> Optional[List[Dict[str, Any]]]:
        """모든 지역 기후 데이터 조회"""
        client = get_supabase()
        if not client:
            return None

        try:
            response = client.table('climate_data').select('*').order('region').execute()
            return response.data
        except Exception as e:
            logger.error(f"데이터 조회 오류: {e}")
            return None

    @staticmethod
    async def get_region(region_name: str) -> Optional[Dict[str, Any]]:
        """특정 지역 기후 데이터 조회"""
        client = get_supabase()
        if not client:
            return None

        try:
            response = client.table('climate_data').select('*').eq('region', region_name).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"지역 조회 오류: {e}")
            return None

    @staticmethod
    async def update_climate_data(region_name: str, data: Dict[str, Any]) -> bool:
        """기후 데이터 업데이트"""
        client = get_supabase()
        if not client:
            return False

        try:
            data['updated_at'] = datetime.now().isoformat()
            client.table('climate_data').update(data).eq('region', region_name).execute()
            return True
        except Exception as e:
            logger.error(f"데이터 업데이트 오류: {e}")
            return False

    @staticmethod
    async def upsert_climate_data(data: Dict[str, Any]) -> bool:
        """기후 데이터 저장 (없으면 생성, 있으면 업데이트)"""
        client = get_supabase()
        if not client:
            return False

        try:
            data['updated_at'] = datetime.now().isoformat()
            client.table('climate_data').upsert(data).execute()
            return True
        except Exception as e:
            logger.error(f"데이터 upsert 오류: {e}")
            return False


class ExplanationService:
    """AI 설명 캐싱 서비스"""

    @staticmethod
    async def get_cached_explanation(region: str, target: str) -> Optional[Dict[str, Any]]:
        """캐시된 AI 설명 조회"""
        client = get_supabase()
        if not client:
            return None

        try:
            response = client.table('ai_explanations').select('*').eq('region', region).eq('target', target).single().execute()
            return response.data
        except Exception:
            return None

    @staticmethod
    async def save_explanation(region: str, target: str, explanation: str) -> bool:
        """AI 설명 캐시 저장"""
        client = get_supabase()
        if not client:
            return False

        try:
            client.table('ai_explanations').upsert({
                'region': region,
                'target': target,
                'explanation': explanation,
                'updated_at': datetime.now().isoformat()
            }).execute()
            return True
        except Exception as e:
            logger.error(f"설명 저장 오류: {e}")
            return False


class UserReportService:
    """사용자 제보 서비스"""

    @staticmethod
    async def get_reports(region: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """사용자 제보 목록 조회"""
        client = get_supabase()
        if not client:
            return []

        try:
            query = client.table('user_reports').select('*').order('created_at', desc=True).limit(limit)
            if region:
                query = query.eq('region', region)
            response = query.execute()
            return response.data or []
        except Exception as e:
            logger.error(f"제보 조회 오류: {e}")
            return []

    @staticmethod
    async def create_report(report_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """새 제보 생성"""
        client = get_supabase()
        if not client:
            return None

        try:
            response = client.table('user_reports').insert(report_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"제보 생성 오류: {e}")
            return None


# 서비스 인스턴스
climate_service = ClimateDataService()
explanation_service = ExplanationService()
report_service = UserReportService()
