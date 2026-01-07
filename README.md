# 경기 기후 체감 맵

경기도 31개 시군의 실시간 기후 체감 지수 및 AI 설명 서비스

[![Deploy with Vercel](https://vercel.com/button)](https://frontend-mu-rust-96.vercel.app)

## 데모

**라이브 데모**: https://frontend-mu-rust-96.vercel.app

## 프로젝트 개요

기후 데이터는 존재하지만 시민이 이해하기 어렵습니다. "기온 34도"보다 중요한 것은 **체감이 얼마나 위험한가**입니다.

이 서비스는 경기도 31개 시군의 기후 데이터를 결합하여 AI가 시민 언어로 설명해주는 체감 기후 지도 웹서비스입니다.

**숫자 → 점수 → 문장 → 행동 가이드**

## 주요 기능

### 1. 기후 체감 지수 산출 (0~100점)

- 기온, 습도, 미세먼지, 자외선, 지표면온도 등 복합 지표
- 점수가 높을수록 위험

### 2. 지도 시각화 (Heat Map)

| 색상    | 점수 범위 | 상태 |
| ------- | --------- | ---- |
| 🔵 파랑 | 0-29점    | 안전 |
| 🟡 노랑 | 30-49점   | 주의 |
| 🟠 주황 | 50-74점   | 경고 |
| 🔴 빨강 | 75-100점  | 위험 |

### 3. AI 기후 설명

- 선택 지역의 기후 상태를 자연어로 요약
- 예: "오늘 안산 단원구는 체감온도 35도 수준으로 노약자와 야외활동자는 오후 외출을 피하는 것이 좋습니다."

### 4. 대상별 맞춤 문구

- 노인 / 아동 / 야외근로자 / 일반 시민

### 5. PWA 지원

- 오프라인 사용 가능
- 홈 화면에 앱 설치 가능
- 푸시 알림 지원

### 6. 실시간 기상 데이터

- 기상청(KMA) API 연동
- 시간별/주간 예보 제공
- 기상 특보 알림

## 기술 스택

### Frontend

| 기술     | 버전  | 용도                 |
| -------- | ----- | -------------------- |
| React    | 18.x  | UI 프레임워크        |
| Vite     | 7.x   | 빌드 도구            |
| Leaflet  | 1.9.x | 지도 시각화          |
| Chart.js | 4.x   | 차트 시각화          |
| Supabase | -     | 인증 및 데이터베이스 |

### Backend

| 기술              | 용도               |
| ----------------- | ------------------ |
| Vercel Serverless | API 프록시         |
| 기상청 API        | 실시간 기상 데이터 |

### 인프라

| 서비스   | 용도              |
| -------- | ----------------- |
| Vercel   | 호스팅 및 배포    |
| Supabase | PostgreSQL + Auth |

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/vibe2nd03-png/t1227.git
cd t1227/frontend
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일 편집:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. 개발 서버 실행

```bash
npm run dev
```

### 5. 접속

- 개발 서버: http://localhost:5173

## 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
```

### Vercel 배포

```bash
vercel --prod
```

## API 엔드포인트

| 엔드포인트            | 설명                      |
| --------------------- | ------------------------- |
| `GET /api/kma`        | 기상청 실시간 관측 데이터 |
| `GET /api/kma-period` | 기상청 기간별 데이터      |

### KMA API 파라미터

| 파라미터 | 필수 | 설명                     |
| -------- | ---- | ------------------------ |
| `tm`     | ✅   | 조회 시간 (YYYYMMDDHHmm) |
| `stn`    | ❌   | 관측소 번호 (기본: 0)    |

## 폴더 구조

```
gyeonggi-climate-map/
├── frontend/
│   ├── api/                    # Vercel Serverless Functions
│   │   ├── kma.js             # 기상청 API 프록시
│   │   └── kma-period.js      # 기간별 데이터 API
│   ├── public/
│   │   ├── sw.js              # Service Worker (PWA)
│   │   ├── manifest.json      # PWA 매니페스트
│   │   ├── robots.txt         # SEO
│   │   └── sitemap.xml        # SEO
│   ├── src/
│   │   ├── components/
│   │   │   ├── ClimateMap.jsx      # 메인 지도
│   │   │   ├── Sidebar.jsx         # 사이드바
│   │   │   ├── BonggongiGuide.jsx  # AI 캐릭터 가이드
│   │   │   ├── AuthModal.jsx       # 로그인/회원가입
│   │   │   ├── UserProfile.jsx     # 사용자 프로필
│   │   │   └── ...
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx     # 인증 컨텍스트
│   │   ├── services/
│   │   │   └── kmaApi.js           # 기상청 API 서비스
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── supabase.js             # Supabase 클라이언트
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── backend/                    # Python FastAPI (선택적)
├── supabase_setup.sql         # 데이터베이스 스키마
├── CLAUDE.md                  # 프로젝트 가이드
└── README.md
```

## 성능 최적화

### Lighthouse 점수 (2026-01-08 기준)

| 카테고리       | 점수 |
| -------------- | ---- |
| Performance    | 95   |
| Accessibility  | 100  |
| Best Practices | 100  |
| SEO            | 100  |

### 적용된 최적화

- **외부 폰트 제거**: 시스템 폰트 사용으로 네트워크 요청 최적화
- **초기 렌더링 최적화**: Mock 데이터로 즉시 표시 (API 응답 대기 없음)
- **Auth 지연 로드**: requestIdleCallback으로 메인 스레드 차단 방지
- **코드 분할**: React.lazy() 및 Suspense 활용
- **Critical CSS**: 초기 로딩 스타일 인라인화
- **fetchpriority**: 메인 스크립트에 high 우선순위 적용
- **캐싱**: Service Worker 오프라인 캐싱

## SEO 설정

- Open Graph 메타 태그
- Twitter Card 메타 태그
- Canonical URL
- robots.txt
- sitemap.xml

## PWA 기능

- **오프라인 지원**: Service Worker 캐싱
- **설치 가능**: 홈 화면에 앱 추가
- **푸시 알림**: 기상 특보 알림 (선택적)

### PWA 테스트

1. Chrome DevTools → Application → Manifest
2. "Installability" 섹션 확인
3. 설치 아이콘 클릭

## 체감 지수 계산 로직

| 요소              | 가중치 |
| ----------------- | ------ |
| 체감온도          | 40%    |
| 미세먼지(PM10)    | 20%    |
| 초미세먼지(PM2.5) | 15%    |
| 습도              | 10%    |
| 자외선지수        | 10%    |
| 지표면온도        | 5%     |

## 테스트

### 테스트 커버리지 (77.58%)

```bash
# 테스트 실행
npm test

# 커버리지 리포트 생성
npm run test:coverage
```

| 파일                     | 커버리지 |
| ------------------------ | -------- |
| services/kmaApi.js       | 90%+     |
| contexts/AuthContext.jsx | 70%+     |

## 스크립트

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm test

# 테스트 커버리지
npm run test:coverage

# ESLint 검사
npm run lint

# ESLint 자동 수정
npm run lint:fix

# Prettier 포맷팅
npm run format

# 포맷 검사
npm run format:check
```

## 개발 과정 (Development History)

### 프로젝트 통계

| 항목           | 내용              |
| -------------- | ----------------- |
| **총 커밋 수** | 161개             |
| **개발 기간**  | 2024.12 ~ 2026.01 |
| **테스트 수**  | 132개             |

### Phase 1: 기초 구축

- 프로젝트 초기 설정 및 Supabase 연동
- Leaflet 지도 시각화 및 애니메이션
- 실시간 기상 경보 배너
- 시민 제보 맵 (체감 짤 대항전)
- 로그인/회원가입 기능 (이메일/비밀번호)

### Phase 2: 핵심 기능 개발

- AI OOTD (오늘의 옷차림) 생성기
- 호흡기 안전 네비게이션
- 위험 지역 푸시 알림
- 과거 10년 기후 데이터 비교 차트
- 기상청 API 허브 연동

### Phase 3: API 안정화

- CORS 오류 해결 (Vercel Serverless 프록시)
- 기상청 API 병렬 호출 성능 개선
- 타임아웃 및 폴백 로직 구현
- KST 시간 계산 수정

### Phase 4: UI/UX 개선

- 모바일 UI 전면 재디자인
- Atmospheric Noir 디자인 시스템
- 5단계 동적 날씨 테마 시스템
- AI 도우미 "봉공이" 캐릭터
- AI반디 음성 안내 기능

### Phase 5: 고급 기능

- 주간 기후 리스크 캘린더
- 커뮤니티 기능 (대화방)
- PWA 지원 (오프라인 캐싱)
- 시간대별 예보 연동

### Phase 6: 품질 최적화

- ESLint/Prettier 코드 품질 관리
- 단위 테스트 (커버리지 77.58%)
- Lighthouse 성능 최적화 (92→95점)
- 접근성 개선 (WCAG 2.0 AA 준수)
- SEO 최적화 (robots, JSON-LD)
- 보안 취약점 점검 (0개)

### 최종 품질 지표

| 항목                      | 점수/상태 |
| ------------------------- | --------- |
| Lighthouse Performance    | 95점      |
| Lighthouse Accessibility  | 100점     |
| Lighthouse Best Practices | 100점     |
| Lighthouse SEO            | 100점     |
| 테스트 커버리지           | 77.58%    |
| 보안 취약점               | 0개       |
| ESLint 오류               | 0개       |

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 라이선스

MIT License

## 문의

- GitHub Issues: [이슈 등록](https://github.com/vibe2nd03-png/t1227/issues)
