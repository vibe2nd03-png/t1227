import { createClient } from '@supabase/supabase-js';
import { createLogger } from './utils/logger';

const log = createLogger('Supabase');

// 환경 변수에서 Supabase 설정 로드
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'gyeonggi-climate-map',
    },
  },
  // 재시도 설정
  db: {
    schema: 'public',
  },
});

// 경기도 31개 시군 기후 데이터 조회
export const climateService = {
  // 모든 지역 데이터 조회
  async getAllRegions() {
    const { data, error } = await supabase
      .from('climate_data')
      .select('*')
      .order('region');

    if (error) {
      log.error('데이터 조회 오류', error);
      return null;
    }
    return data;
  },

  // 특정 지역 데이터 조회
  async getRegion(regionName) {
    const { data, error } = await supabase
      .from('climate_data')
      .select('*')
      .eq('region', regionName)
      .single();

    if (error) {
      log.error('지역 조회 오류', error);
      return null;
    }
    return data;
  },

  // 기후 데이터 업데이트
  async updateClimateData(regionName, climateData) {
    const { data, error } = await supabase
      .from('climate_data')
      .update(climateData)
      .eq('region', regionName)
      .select();

    if (error) {
      log.error('데이터 업데이트 오류', error);
      return null;
    }
    return data;
  },

  // AI 설명 저장
  async saveExplanation(regionName, target, explanation) {
    const { data, error } = await supabase
      .from('ai_explanations')
      .upsert({
        region: regionName,
        target: target,
        explanation: explanation,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      log.error('설명 저장 오류', error);
      return null;
    }
    return data;
  },

  // AI 설명 조회
  async getExplanation(regionName, target) {
    const { data, error } = await supabase
      .from('ai_explanations')
      .select('*')
      .eq('region', regionName)
      .eq('target', target)
      .single();

    if (error && error.code !== 'PGRST116') {
      log.error('설명 조회 오류', error);
      return null;
    }
    return data;
  }
};
