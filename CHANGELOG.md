# Changelog

경기 기후 체감 맵 변경 이력입니다.

## [Unreleased]

### Added
- 테스트 커버리지 72.74% 달성 (`767e1d1`)
- 기상청(KMA) API 연동 (`kmaApi.js`)
- PWA 오프라인 캐싱 기능 (`38cf7e0`)
- SEO 최적화 - 메타 태그 및 크롤링 설정 (`e18865a`)

### Changed
- 모바일 UI/UX 전면 재디자인 (`b6c9cf0`)
- 지도 타일을 한글 라벨 OpenStreetMap으로 변경 (`e96f869`)

### Performance
- 모바일 Lighthouse 성능 90점 달성
- 외부 폰트 제거로 네트워크 요청 최적화 (`e809b6b`)
- 초기 렌더링 추가 최적화 (`f0b8e52`)
- LCP 성능 최적화 (`a4b69d6`)
- 모바일 성능 최적화 (FCP/LCP 개선) (`231d1c2`)

### Fixed
- ESLint 미사용 변수 경고 수정 (`13dab3c`)
- Best Practices 개선 - 고해상도 타일 및 음성 정책 준수 (`8f39496`)
- 모바일 체감랭킹 렌더링 문제 해결 (`52121ee`, `aa2898c`, `14d4d52`)
- PWA 아이콘 PNG 파일 재생성 (`959379b`, `0266648`)

### Documentation
- CLAUDE.md에 Lighthouse 성능 점수 기록 (`1096fcc`)
- README.md 전면 업데이트 (`97b3194`)

### Testing
- 누락된 테스트 추가 - 커버리지 72.74% (`767e1d1`)
- 테스트 커버리지 65%로 향상 (`1330435`)
- kmaApi 및 AuthContext 테스트 추가 (`b0975bc`)
- 단위 테스트 환경 구축 및 테스트 추가 (`f006c56`)

### CI/CD
- GitHub Actions CI/CD 파이프라인 설정 (`f62ca14`)
- workflow_dispatch 트리거 추가 (`ee0b592`)

### Code Quality
- Prettier 포맷팅 적용 (`7743226`, `902c0c`, `2526dbe`)
- ESLint 오류 수정 (`78f33de`)
- 미사용 변수 및 import 정리 (`ed17c17`)
- 사용하지 않는 코드 및 CSS 삭제 (`4d06ea5`)
- secretlint 설정 추가 (`bfbd880`)
- ESLint 설정 추가 및 업데이트 (`9adcf29`, `97430dc`)

### Security
- 보안 취약점 수정 및 의존성 업데이트 (`d8f11fb`)

### Accessibility
- 접근성 100점 달성 (`c036165`)

---

## 버전 히스토리

### v1.0.0 (2026-01-07)

첫 공개 릴리스

**주요 기능**:
- 경기도 31개 시군 기후 체감 지수 표시
- AI 기반 기후 설명 서비스
- 실시간 기상청 데이터 연동
- PWA 지원 (오프라인 사용, 앱 설치)
- Supabase 인증 및 데이터베이스

**성능**:
- Lighthouse 성능: 모바일 90 / 데스크톱 97
- Lighthouse 접근성: 95
- Lighthouse Best Practices: 96
- Lighthouse SEO: 100
- 테스트 커버리지: 72.74%

---

## 커밋 컨벤션

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `perf`: 성능 개선
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/개발환경 설정
- `ci`: CI/CD 설정
- `a11y`: 접근성 개선
- `seo`: SEO 최적화
