/**
 * Vercel Serverless Function - 기상청 API 기간 조회 프록시
 * kma_sfctm3.php - 시간자료 기간 조회
 */

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { tm1, tm2, stn = "0" } = req.query;
  const AUTH_KEY = "DbUh4_ekRRi1IeP3pPUYog";

  if (!tm1 || !tm2) {
    return res
      .status(400)
      .json({ error: "tm1 and tm2 parameters are required" });
  }

  try {
    const url = `https://apihub.kma.go.kr/api/typ01/url/kma_sfctm3.php?tm1=${tm1}&tm2=${tm2}&stn=${stn}&authKey=${AUTH_KEY}`;

    const response = await fetch(url);
    const text = await response.text();

    // 텍스트 응답을 JSON으로 파싱
    const lines = text
      .split("\n")
      .filter(
        (line) =>
          line.trim() &&
          !line.startsWith("#") &&
          !line.includes("END7777") &&
          !line.includes("START7777"),
      );

    const columns = [
      "TM",
      "STN",
      "WD",
      "WS",
      "GST_WD",
      "GST_WS",
      "GST_TM",
      "PA",
      "PS",
      "PT",
      "PR",
      "TA",
      "TD",
      "HM",
      "PV",
      "RN",
      "RN_DAY",
      "RN_JUN",
      "RN_INT",
      "SD_HR3",
      "SD_DAY",
      "SD_TOT",
      "WC",
      "WP",
      "WW",
      "CA_TOT",
      "CA_MID",
      "CH_MIN",
      "CT",
      "CT_TOP",
      "CT_MID",
      "CT_LOW",
      "VS",
      "SS",
      "SI",
      "ST_GD",
      "TS",
      "TE_005",
      "TE_01",
      "TE_02",
      "TE_03",
      "ST_SEA",
      "WH",
      "BF",
      "IR",
      "IX",
    ];

    const data = lines.map((line) => {
      const values = line.trim().split(/\s+/);
      const record = {};
      columns.forEach((col, idx) => {
        const value = values[idx];
        if (
          value &&
          !isNaN(value) &&
          value !== "-9" &&
          value !== "-99.0" &&
          value !== "-9.0"
        ) {
          record[col] = parseFloat(value);
        } else if (value === "-9" || value === "-99.0" || value === "-9.0") {
          record[col] = null;
        } else {
          record[col] = value;
        }
      });
      return record;
    });

    res.status(200).json({
      success: true,
      startTime: tm1,
      endTime: tm2,
      count: data.length,
      data: data,
    });
  } catch (error) {
    console.error("KMA Period API Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
