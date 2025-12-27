# 경기 기후 체감 맵

경기도 읍·면·동 단위 기후 체감 지수 및 AI 설명 서비스

## 프로젝트 개요

기후 데이터는 존재하지만 시민이 이해하기 어렵습니다. "기온 34도"보다 중요한 것은 **체감이 얼마나 위험한가**입니다.

이 서비스는 경기도 31개 시군의 기후 데이터를 결합하여 AI가 시민 언어로 설명해주는 체감 기후 지도 웹서비스입니다.

**숫자 → 점수 → 문장 → 행동 가이드**

## 핵심 기능

### 1. 기후 체감 지수 산출 (0~100점)
- 기온, 습도, 미세먼지, 자외선, 지표면온도 등 복합 지표
- 점수가 높을수록 위험

### 2. 지도 시각화 (Heat Map)
- 🔵 안전 (0-29점)
- 🟡 주의 (30-49점)
- 🟠 경고 (50-74점)
- 🔴 위험 (75-100점)

### 3. AI 기후 설명
- 선택 지역의 기후 상태를 자연어로 요약
- 예: "오늘 안산 단원구는 체감온도 35도 수준으로 노약자와 야외활동자는 오후 외출을 피하는 것이 좋습니다."

### 4. 대상별 맞춤 문구
- 노인 / 아동 / 야외근로자 / 일반 시민

## 기술 스택

### Backend
- Python FastAPI
- climate.gg.go.kr API 연동
- 체감지수 계산 모듈
- OpenAI API (AI 설명 생성)

### Frontend
- React 18
- Leaflet (지도)
- Vite (빌드)

## 설치 및 실행

### 1. Backend 실행

```bash
cd backend

# 가상환경 생성 (선택)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정 (.env 파일 수정)
# OPENAI_API_KEY=your_api_key_here

# 서버 실행
uvicorn main:app --reload --port 8000
```

### 2. Frontend 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 3. 접속

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## API 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/regions` | 경기도 시군 목록 |
| `GET /api/climate/all` | 모든 지역 기후 데이터 |
| `GET /api/climate/{region}` | 특정 지역 기후 데이터 |
| `GET /api/climate/{region}/explain` | AI 기후 설명 |

### Query Parameters
- `target`: 대상 그룹 (`general`, `elderly`, `child`, `outdoor`)

## 데이터 흐름

```
[경기 기후 API] → [데이터 정규화] → [체감지수 계산] → [AI 설명 생성] → [웹 지도 표시]
```

## 체감 지수 계산 로직

가중치:
- 체감온도: 40%
- 미세먼지(PM10): 20%
- 초미세먼지(PM2.5): 15%
- 습도: 10%
- 자외선지수: 10%
- 지표면온도: 5%

## 폴더 구조

```
gyeonggi-climate-map/
├── backend/
│   ├── main.py              # FastAPI 서버
│   ├── climate_api.py       # 기후 API 연동
│   ├── climate_index.py     # 체감지수 계산
│   ├── ai_service.py        # AI 설명 생성
│   ├── config.py            # 설정
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── components/
│   │   │   ├── ClimateMap.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 라이선스

MIT License
