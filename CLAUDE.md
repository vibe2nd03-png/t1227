# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

경기 기후 체감 맵 - 경기도 31개 시군의 기후 체감 지수 및 AI 설명 서비스

## 빌드 및 실행

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
```

## 아키텍처

```
[climate.gg.go.kr API] → [FastAPI Backend] → [React Frontend]
                              ↓                      ↓
                    [체감지수 계산 모듈]      [Supabase]
                              ↓
                    [OpenAI API - AI 설명]
```

### Backend 구조
- `main.py`: FastAPI 라우터 및 엔드포인트
- `climate_api.py`: 경기도 기후 API 연동, 지역 정보(GYEONGGI_REGIONS)
- `climate_index.py`: 체감지수 계산 로직 (0-100점, RiskLevel enum)
- `ai_service.py`: AI 설명 생성 (OpenAI 또는 규칙 기반 fallback)
- `config.py`: 환경변수 설정

### Frontend 구조
- `App.jsx`: 메인 상태 관리, API 호출
- `components/ClimateMap.jsx`: Leaflet 지도, CircleMarker
- `components/Sidebar.jsx`: 지역 정보, AI 설명 표시
- `api.js`: Backend API 클라이언트
- 주요 라이브러리: React-Leaflet(지도), Chart.js(차트), Supabase(DB)

### 데이터베이스
- `supabase_setup.sql`: Supabase 테이블 스키마 및 초기 설정

## 핵심 로직

### 체감지수 계산 (climate_index.py)
- 체감온도 40%, PM10 20%, PM2.5 15%, 습도 10%, UV 10%, 지표면 5%
- RiskLevel: SAFE(0-29), CAUTION(30-49), WARNING(50-74), DANGER(75-100)
- 대상별 가중치: 노인 1.3배, 아동 1.25배, 야외근로자 1.2배

### API 엔드포인트
- `GET /api/regions`: 경기도 시군 목록
- `GET /api/climate/all?target={group}`: 전체 지역 데이터
- `GET /api/climate/{region}?target={group}`: 단일 지역
- `GET /api/climate/{region}/explain?target={group}`: AI 설명
- `GET /health`: 서버 상태 확인

## 환경변수 (.env)
```
CLIMATE_API_KEY=your_climate_api_key
OPENAI_API_KEY=your_openai_key  # AI 설명용 (없으면 규칙 기반)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## 개발 참고사항

- Frontend는 Backend 없이도 Mock 데이터로 동작
- AI 설명은 OpenAI API 키 없으면 규칙 기반 fallback 사용
- 경기도 31개 시군 좌표는 `climate_api.py`의 GYEONGGI_REGIONS에 정의
