# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

경기 기후 체감 맵 - 경기도 31개 시군의 기후 체감 지수 및 AI 설명 서비스. 기온, 미세먼지, 자외선 등 복합 지표를 0-100점 체감지수로 변환하고 AI가 자연어로 설명.

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
npm run dev      # 개발 서버 (port 3000, /api 프록시 → localhost:8000)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
```

### 접속
- Frontend: http://localhost:3000
- Backend API 문서: http://localhost:8000/docs

## 아키텍처

```
[climate.gg.go.kr API] ──┐
[기상청 API (KMA)]  ─────┼──► [FastAPI Backend] ──► [React Frontend]
                         │          ↓                     ↓
                         │   [체감지수 계산]         [Supabase Auth/DB]
                         │          ↓
                         └── [OpenAI API - AI 설명]
```

### Backend 구조 (backend/)
- `main.py`: FastAPI 라우터, 엔드포인트 정의
- `climate_api.py`: 경기도 기후 API 연동, 지역 정보(`GYEONGGI_REGIONS` dict)
- `climate_index.py`: 체감지수 계산 로직, `RiskLevel` enum, `TargetGroup` enum
- `ai_service.py`: `AIClimateExplainer` 클래스 (OpenAI 또는 규칙 기반 fallback)
- `supabase_client.py`: Supabase DB 연동
- `config.py`: 환경변수 설정

### Frontend 구조 (frontend/src/)
- `App.jsx`: 메인 상태 관리, API 호출 오케스트레이션
- `api.js`: Backend API 클라이언트
- `supabase.js`: Supabase 클라이언트 설정
- `components/`:
  - `ClimateMap.jsx`: Leaflet 지도, CircleMarker 렌더링
  - `Sidebar.jsx`: 지역 상세 정보, AI 설명 표시
  - `AuthModal.jsx`: 로그인/회원가입 모달
  - `UserProfile.jsx`: 사용자 프로필, 즐겨찾기 관리
  - `NotificationManager.jsx`: 알림 설정/구독 관리
  - `OotdGenerator.jsx`: OOTD(오늘의 옷) 추천
  - `WeatherAlertBanner.jsx`: 기상 경보 배너
- `contexts/AuthContext.jsx`: Supabase Auth 상태 관리 (useAuth hook)
- `services/kmaApi.js`: 기상청 API 직접 연동
- `constants/climate.js`: 기후 관련 상수
- `api/`: Vercel serverless functions (kma.js, kma-period.js)

### 데이터베이스 (Supabase)
- `climate_data`: 지역별 기후 데이터 (31개 시군)
- `ai_explanations`: AI 설명 캐시 (region + target 유니크)
- `user_profiles`: 사용자 프로필 (auth.users 연동)
- `user_favorite_regions`: 즐겨찾기 지역
- `user_reports`: 사용자 제보
- `notification_subscriptions`: 알림 설정

## 핵심 로직

### 체감지수 계산 (climate_index.py)
- 가중치: 체감온도 40%, PM10 20%, PM2.5 15%, 습도 10%, UV 10%, 지표면 5%
- RiskLevel: `SAFE`(0-29), `CAUTION`(30-49), `WARNING`(50-74), `DANGER`(75-100)
- 대상별 보정: 노인 1.3배, 아동 1.25배, 야외근로자 1.2배

### API 엔드포인트
| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/regions` | 경기도 시군 목록 |
| `GET /api/climate/all?target={group}` | 전체 지역 데이터 |
| `GET /api/climate/{region}?target={group}` | 단일 지역 |
| `GET /api/climate/{region}/explain?target={group}` | AI 설명 |
| `GET /health` | 서버 상태 |

- `target` 파라미터: `general`, `elderly`, `child`, `outdoor`

## 환경변수

### Backend (.env)
```
CLIMATE_API_KEY=your_climate_api_key
CLIMATE_API_BASE_URL=https://climate.gg.go.kr/ols/data/api
OPENAI_API_KEY=your_openai_key  # 없으면 규칙 기반 fallback
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
```

### Frontend
- Supabase 설정은 `src/supabase.js`에 직접 정의

## 개발 참고사항

- Frontend는 Backend 없이도 Mock 데이터로 동작
- Vite 프록시: 개발 시 `/api/*` 요청은 `localhost:8000`으로 프록시
- Vite 빌드: vendor 청크 분리 (react, leaflet, chart.js, supabase)
- Supabase RLS: 공개 읽기 허용, 쓰기는 인증 필요

## Lighthouse 성능 점수 (2026-01-06)

| 카테고리 | 모바일 | 데스크톱 |
|----------|--------|----------|
| 성능 (Performance) | 90 | 97 |
| 접근성 (Accessibility) | 95 | 95 |
| Best Practices | 96 | 96 |
| SEO | 100 | 100 |

### 적용된 최적화
- 외부 폰트 제거 (시스템 폰트 사용)
- 초기 렌더링용 Mock 데이터로 즉시 표시
- Auth 초기화 지연 (requestIdleCallback)
- Lazy loading (React.lazy + Suspense)
- fetchpriority="high" 적용
- Critical CSS 인라인화
