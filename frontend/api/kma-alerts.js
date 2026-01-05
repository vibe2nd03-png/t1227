// 기상청 특보 RSS 프록시 API
export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 기상청 특보 RSS 피드
    const rssUrl =
      "https://www.kma.go.kr/weather/lifenindustry/service/lifeweather_list.rss";

    let alerts = [];

    // 특보 RSS 가져오기
    try {
      const response = await fetch(rssUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (response.ok) {
        const text = await response.text();
        alerts = parseRssToAlerts(text);
      }
    } catch (e) {
      console.error("특보 RSS 오류:", e);
    }

    // 기상청 날씨 뉴스 API (추가 정보)
    try {
      const newsUrl = "https://www.kma.go.kr/cgi-bin/rss/weather/wrn.rss";
      const newsResponse = await fetch(newsUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (newsResponse.ok) {
        const newsText = await newsResponse.text();
        const newsAlerts = parseWrnRss(newsText);
        alerts = [...alerts, ...newsAlerts];
      }
    } catch (e) {
      console.error("뉴스 RSS 오류:", e);
    }

    // 경기도 우선 정렬
    alerts = sortByGyeonggi(alerts);

    // 중복 제거
    alerts = removeDuplicates(alerts);

    // 최대 10개
    alerts = alerts.slice(0, 10);

    // 알림이 없으면 기본 메시지
    if (alerts.length === 0) {
      alerts = getDefaultAlerts();
    }

    return res.status(200).json({
      success: true,
      alerts,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API 오류:", error);
    return res.status(200).json({
      success: true,
      alerts: getDefaultAlerts(),
      updatedAt: new Date().toISOString(),
    });
  }
}

// RSS 파싱
function parseRssToAlerts(xml) {
  const alerts = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex =
    /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const descRegex =
    /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const titleMatch = item.match(titleRegex);
    const descMatch = item.match(descRegex);
    const dateMatch = item.match(pubDateRegex);

    const title = titleMatch
      ? (titleMatch[1] || titleMatch[2] || "").trim()
      : "";
    const description = descMatch
      ? (descMatch[1] || descMatch[2] || "").trim()
      : "";
    const pubDate = dateMatch ? dateMatch[1] : new Date().toISOString();

    if (title) {
      alerts.push({
        id: `rss-${Date.now()}-${Math.random()}`,
        type: determineAlertType(title),
        title: extractTitle(title),
        message: description || title,
        region: extractRegion(title + " " + description),
        issued_at: new Date(pubDate).toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  return alerts;
}

// 특보 RSS 파싱
function parseWrnRss(xml) {
  const alerts = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex =
    /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const descRegex =
    /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const titleMatch = item.match(titleRegex);
    const descMatch = item.match(descRegex);
    const dateMatch = item.match(pubDateRegex);

    const title = titleMatch
      ? (titleMatch[1] || titleMatch[2] || "").trim()
      : "";
    const description = descMatch
      ? (descMatch[1] || descMatch[2] || "").trim()
      : "";
    const pubDate = dateMatch ? dateMatch[1] : new Date().toISOString();

    if (title && !title.includes("기상청")) {
      alerts.push({
        id: `wrn-${Date.now()}-${Math.random()}`,
        type: determineAlertType(title),
        title: extractTitle(title),
        message: description || title,
        region: extractRegion(title + " " + description),
        issued_at: new Date(pubDate).toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  return alerts;
}

// 알림 유형 결정
function determineAlertType(text) {
  if (text.includes("경보") || text.includes("위험") || text.includes("긴급")) {
    return "danger";
  }
  if (text.includes("주의보") || text.includes("주의")) {
    return "warning";
  }
  if (text.includes("예비") || text.includes("관심")) {
    return "watch";
  }
  return "info";
}

// 제목 추출
function extractTitle(text) {
  // 특보 키워드 추출
  const keywords = [
    "폭염경보",
    "폭염주의보",
    "한파경보",
    "한파주의보",
    "대설경보",
    "대설주의보",
    "호우경보",
    "호우주의보",
    "강풍경보",
    "강풍주의보",
    "풍랑경보",
    "풍랑주의보",
    "태풍경보",
    "태풍주의보",
    "건조경보",
    "건조주의보",
    "황사경보",
    "황사주의보",
    "미세먼지",
    "초미세먼지",
    "오존",
    "자외선",
  ];

  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  // 첫 10자 또는 콜론/대괄호 앞 내용
  const colonIdx = text.indexOf(":");
  const bracketIdx = text.indexOf("[");

  if (colonIdx > 0 && colonIdx < 20) {
    return text.substring(0, colonIdx).trim();
  }
  if (bracketIdx > 0 && bracketIdx < 20) {
    return text.substring(0, bracketIdx).trim();
  }

  return text.substring(0, 15).trim();
}

// 지역 추출
function extractRegion(text) {
  const regions = [
    "경기",
    "서울",
    "인천",
    "강원",
    "충북",
    "충남",
    "대전",
    "세종",
    "전북",
    "전남",
    "광주",
    "경북",
    "경남",
    "대구",
    "울산",
    "부산",
    "제주",
  ];

  for (const region of regions) {
    if (text.includes(region)) {
      return region;
    }
  }
  return "전국";
}

// 경기도 우선 정렬
function sortByGyeonggi(alerts) {
  return alerts.sort((a, b) => {
    const aIsGyeonggi =
      a.region?.includes("경기") || a.message?.includes("경기") ? 1 : 0;
    const bIsGyeonggi =
      b.region?.includes("경기") || b.message?.includes("경기") ? 1 : 0;

    if (aIsGyeonggi !== bIsGyeonggi) {
      return bIsGyeonggi - aIsGyeonggi;
    }

    // 같은 경우 심각도순
    const typeOrder = { danger: 0, warning: 1, watch: 2, info: 3 };
    return (typeOrder[a.type] || 4) - (typeOrder[b.type] || 4);
  });
}

// 중복 제거
function removeDuplicates(alerts) {
  const seen = new Set();
  return alerts.filter((alert) => {
    const key = `${alert.title}-${alert.region}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 기본 알림
function getDefaultAlerts() {
  const now = new Date();
  const hour = now.getHours();

  const alerts = [];

  // 시간대별 기본 메시지
  if (hour >= 6 && hour < 12) {
    alerts.push({
      id: "default-morning",
      type: "info",
      title: "오늘의 날씨",
      message:
        "경기도 오늘 날씨 정보를 확인하세요. 지역을 클릭하면 상세 정보를 볼 수 있습니다.",
      region: "경기도",
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    });
  } else if (hour >= 12 && hour < 18) {
    alerts.push({
      id: "default-afternoon",
      type: "info",
      title: "오후 날씨",
      message: "경기도 오후 날씨 현황입니다. 외출 시 날씨 변화에 유의하세요.",
      region: "경기도",
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
    });
  } else {
    alerts.push({
      id: "default-night",
      type: "info",
      title: "야간 날씨",
      message:
        "경기도 야간 기온 변화에 유의하세요. 내일 날씨도 미리 확인하세요.",
      region: "경기도",
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
    });
  }

  return alerts;
}
