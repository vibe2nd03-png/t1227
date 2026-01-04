import axios from "axios";

const API_BASE = "/api";

export const climateApi = {
  // 모든 지역 기후 데이터 조회
  getAllRegions: async (target = null) => {
    const params = target ? { target } : {};
    const response = await axios.get(`${API_BASE}/climate/all`, { params });
    return response.data;
  },

  // 특정 지역 기후 데이터 조회
  getRegion: async (region, target = null) => {
    const params = target ? { target } : {};
    const response = await axios.get(
      `${API_BASE}/climate/${encodeURIComponent(region)}`,
      { params },
    );
    return response.data;
  },

  // AI 설명 조회
  getExplanation: async (region, target = "general") => {
    const response = await axios.get(
      `${API_BASE}/climate/${encodeURIComponent(region)}/explain`,
      { params: { target } },
    );
    return response.data;
  },

  // 지역 목록 조회
  getRegionList: async () => {
    const response = await axios.get(`${API_BASE}/regions`);
    return response.data;
  },
};
