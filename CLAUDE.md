# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

경기 기후 체감 맵 - 경기도 31개 시군의 기후 체감 지수 및 AI 설명 서비스. 기온, 미세먼지, 자외선 등 복합 지표를 0-100점 체감지수로 변환하고 AI가 자연어로 설명.

**라이브 데모**: https://frontend-mu-rust-96.vercel.app

## 명령어

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev          # 개발 서버 (port 3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 검사
npm run lint:fix     # ESLint 자동 수정
npm run format       # Prettier 포맷팅
npm run format:check # 포맷 검사
npm test             # 테스트 실행 (vitest)
npm run test:watch   # 테스트 watch 모드
npm run test:coverage # 커버리지 리포트
```

### Backend (FastAPI, 선택적)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 접속
- Frontend: http://localhost:3000 (개발 시 `/api/*` → localhost:8000 프록시)
- Backend API 문서: http://localhost:8000/docs

## 아키텍처

```
[기상청 API (KMA)] ──► [Vercel Serverless] ──► [React Frontend]
                                                      ↓
                                               [Supabase Auth/DB]
```

프로덕션에서는 Backend 없이 Vercel Serverless로 기상청 API 프록시 처리.

### Frontend 핵심 파일 (frontend/src/)
- `App.jsx`: 메인 상태 관리, API 호출 오케스트레이션
- `contexts/AuthContext.jsx`: Supabase Auth 상태 관리 (`useAuth` hook 제공)
- `services/kmaApi.js`: 기상청 API 클라이언트
- `supabase.js`: Supabase 클라이언트 설정
- `hooks/useFavorites.js`: 즐겨찾기 관리 hook

### Vercel Serverless Functions (frontend/api/)
- `kma.js`: 기상청 실시간 관측 데이터 프록시
- `kma-period.js`: 기상청 기간별 데이터 프록시

### Backend 구조 (backend/, 선택적)
- `main.py`: FastAPI 라우터
- `climate_api.py`: 경기도 기후 API 연동, `GYEONGGI_REGIONS` dict
- `climate_index.py`: 체감지수 계산, `RiskLevel`/`TargetGroup` enum
- `ai_service.py`: `AIClimateExplainer` (OpenAI 또는 규칙 기반 fallback)
- `kma_proxy.py`: 기상청 API 프록시

### 데이터베이스 (Supabase)
- `user_profiles`: 사용자 프로필 (auth.users 연동)
- `user_favorite_regions`: 즐겨찾기 지역
- `notification_subscriptions`: 알림 설정
- RLS: 공개 읽기 허용, 쓰기는 인증 필요

## 핵심 로직

### 체감지수 계산 (backend/climate_index.py)
- 가중치: 체감온도 40%, PM10 20%, PM2.5 15%, 습도 10%, UV 10%, 지표면 5%
- `RiskLevel`: SAFE(0-29), CAUTION(30-49), WARNING(50-74), DANGER(75-100)
- 대상별 보정: 노인 1.3배, 아동 1.25배, 야외근로자 1.2배

### API 엔드포인트
| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/kma?tm=YYYYMMDDHHmm` | 기상청 실시간 관측 |
| `GET /api/kma-period?tm=...` | 기상청 기간별 데이터 |

## 환경변수

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env, 선택적)
```
CLIMATE_API_KEY=your_climate_api_key
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
- **push/PR to main**: lint → format:check → test → build
- **PR only**: Lighthouse CI 감사

## 테스트

```bash
cd frontend
npm test                    # 전체 테스트 (vitest)
npm run test:coverage       # 커버리지 리포트
```

테스트 파일: `*.test.js`, `*.test.jsx` (소스 파일과 동일 디렉토리에 위치)

## 개발 참고사항

- Frontend는 Backend 없이 Mock 데이터로 동작
- Vite 빌드: vendor 청크 분리 (react, leaflet, chart.js, supabase)
- PWA 지원: Service Worker (`public/sw.js`), manifest.json
