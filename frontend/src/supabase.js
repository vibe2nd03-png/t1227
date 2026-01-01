import { createClient } from '@supabase/supabase-js';
import { createLogger } from './utils/logger';

const log = createLogger('Supabase');
const supabaseUrl = 'https://pcdmrofcfqtyywtzyrfo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
