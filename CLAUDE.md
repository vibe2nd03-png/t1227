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
npm run dev
```

## 아키텍처

```
[climate.gg.go.kr API] → [FastAPI Backend] → [React Frontend]
                              ↓
                    [체감지수 계산 모듈]
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

## 핵심 로직

### 체감지수 계산 (climate_index.py)
- 체감온도 40%, PM10 20%, PM2.5 15%, 습도 10%, UV 10%, 지표면 5%
- RiskLevel: SAFE(0-29), CAUTION(30-49), WARNING(50-74), DANGER(75-100)
- 대상별 가중치: 노인 1.3배, 아동 1.25배, 야외근로자 1.2배

### API 엔드포인트
- `GET /api/climate/all?target={group}`: 전체 지역 데이터
- `GET /api/climate/{region}?target={group}`: 단일 지역
- `GET /api/climate/{region}/explain?target={group}`: AI 설명

## 환경변수 (.env)
```
CLIMATE_API_KEY=4c58df36-82b2-40b2-b360-6450cca44b1e
OPENAI_API_KEY=your_key_here  # AI 설명용 (없으면 규칙 기반)
```

## 개발 참고사항

- Frontend는 Backend 없이도 Mock 데이터로 동작
- AI 설명은 OpenAI API 키 없으면 규칙 기반 fallback 사용
- 경기도 31개 시군 좌표는 `climate_api.py`의 GYEONGGI_REGIONS에 정의
