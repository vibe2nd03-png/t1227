# API 문서

경기 기후 체감 맵의 API 엔드포인트 문서입니다.

## 개요

Vercel Serverless Functions를 통해 기상청(KMA) API 프록시를 제공합니다.
CORS 문제를 해결하기 위해 서버사이드에서 API를 호출합니다.

### Base URL
- 프로덕션: `https://frontend-mu-rust-96.vercel.app/api`
- 개발: `http://localhost:5173/api`

---

## 엔드포인트

### 1. 실시간 기상 데이터

단일 시점의 기상 관측 데이터를 조회합니다.

```
GET /api/kma
```

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `tm` | string | ✅ | 조회 시간 (YYYYMMDDHHmm) | `202601071200` |
| `stn` | string | ❌ | 관측소 번호 (기본: 0 = 전체) | `119` (수원) |

#### 응답

```json
{
  "success": true,
  "datetime": "202601071200",
  "count": 96,
  "data": [
    {
      "TM": 202601071200,
      "STN": 119,
      "TA": 3.5,
      "HM": 65,
      "WS": 2.3,
      "WD": 270,
      ...
    }
  ]
}
```

#### 예시 요청

```bash
curl "https://frontend-mu-rust-96.vercel.app/api/kma?tm=202601071200"
```

---

### 2. 기간별 기상 데이터

특정 기간의 기상 관측 데이터를 조회합니다.

```
GET /api/kma-period
```

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 | 예시 |
|---------|------|------|------|------|
| `tm1` | string | ✅ | 시작 시간 (YYYYMMDDHHmm) | `202601070000` |
| `tm2` | string | ✅ | 종료 시간 (YYYYMMDDHHmm) | `202601071200` |
| `stn` | string | ❌ | 관측소 번호 (기본: 0 = 전체) | `119` |

#### 응답

```json
{
  "success": true,
  "startTime": "202601070000",
  "endTime": "202601071200",
  "count": 13,
  "data": [
    {
      "TM": 202601070000,
      "STN": 119,
      "TA": 1.2,
      "HM": 78,
      ...
    }
  ]
}
```

#### 예시 요청

```bash
curl "https://frontend-mu-rust-96.vercel.app/api/kma-period?tm1=202601070000&tm2=202601071200&stn=119"
```

---

## 데이터 필드

### 주요 관측 요소

| 필드 | 설명 | 단위 |
|------|------|------|
| `TM` | 관측 시각 | YYYYMMDDHHmm |
| `STN` | 관측소 번호 | - |
| `TA` | 기온 | °C |
| `TD` | 이슬점 온도 | °C |
| `HM` | 습도 | % |
| `WS` | 풍속 | m/s |
| `WD` | 풍향 | ° (0-360) |
| `PA` | 현지기압 | hPa |
| `PS` | 해면기압 | hPa |
| `RN` | 강수량 (1시간) | mm |
| `RN_DAY` | 일 강수량 | mm |
| `VS` | 시정 | 10m |
| `CA_TOT` | 전운량 | 1/10 |

### 돌풍 관측

| 필드 | 설명 | 단위 |
|------|------|------|
| `GST_WS` | 돌풍 풍속 | m/s |
| `GST_WD` | 돌풍 풍향 | ° |
| `GST_TM` | 돌풍 시각 | HHmm |

### 지면 온도

| 필드 | 설명 | 단위 |
|------|------|------|
| `TS` | 지면 온도 | °C |
| `TE_005` | 5cm 지중 온도 | °C |
| `TE_01` | 10cm 지중 온도 | °C |
| `TE_02` | 20cm 지중 온도 | °C |
| `TE_03` | 30cm 지중 온도 | °C |

### 적설량

| 필드 | 설명 | 단위 |
|------|------|------|
| `SD_HR3` | 3시간 신적설 | cm |
| `SD_DAY` | 일 신적설 | cm |
| `SD_TOT` | 적설 심도 | cm |

### 운량/구름

| 필드 | 설명 | 단위 |
|------|------|------|
| `CA_TOT` | 전운량 | 1/10 |
| `CA_MID` | 중운량 | 1/10 |
| `CH_MIN` | 최저 운고 | 100m |
| `CT` | 운형 | 코드 |

---

## 경기도 관측소 목록

| 관측소번호 | 지역 |
|-----------|------|
| 119 | 수원 |
| 202 | 양평 |
| 203 | 이천 |
| 98 | 동두천 |
| 99 | 파주 |
| 119 | 수원 |
| 202 | 양평 |

전체 관측소는 `stn=0`으로 조회 시 모든 관측소 데이터가 반환됩니다.

---

## 에러 응답

### 400 Bad Request

필수 파라미터 누락 시:

```json
{
  "error": "tm parameter is required"
}
```

```json
{
  "error": "tm1 and tm2 parameters are required"
}
```

### 500 Internal Server Error

API 호출 실패 시:

```json
{
  "success": false,
  "error": "Failed to fetch data from KMA API"
}
```

---

## 데이터 처리 규칙

1. **결측치 처리**: `-9`, `-99.0`, `-9.0` 값은 `null`로 변환
2. **숫자 변환**: 모든 숫자 값은 `parseFloat()`으로 변환
3. **필터링**: `#`으로 시작하는 주석 라인 및 `START7777`, `END7777` 마커 제거

---

## 사용 예시 (JavaScript)

### 실시간 데이터 조회

```javascript
const fetchCurrentWeather = async () => {
  const now = new Date();
  const tm = now.toISOString().slice(0, 16).replace(/[-:T]/g, '').slice(0, 12);

  const response = await fetch(`/api/kma?tm=${tm}`);
  const { data } = await response.json();

  return data;
};
```

### 기간 데이터 조회

```javascript
const fetchPeriodWeather = async (startDate, endDate) => {
  const tm1 = formatDate(startDate); // YYYYMMDDHHmm
  const tm2 = formatDate(endDate);

  const response = await fetch(`/api/kma-period?tm1=${tm1}&tm2=${tm2}`);
  const { data } = await response.json();

  return data;
};
```

---

## Rate Limiting

기상청 API의 제한 사항을 따릅니다:
- 일일 호출 제한: API 키당 10,000회
- 동시 요청 제한: 10개

---

## 참고 자료

- [기상청 API Hub](https://apihub.kma.go.kr)
- [기상관측표준화 종합체계](https://data.kma.go.kr)
