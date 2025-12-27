-- 경기 기후 체감 맵 - Supabase 테이블 설정

-- 1. 기후 데이터 테이블 생성
CREATE TABLE IF NOT EXISTS climate_data (
  id SERIAL PRIMARY KEY,
  region VARCHAR(50) NOT NULL UNIQUE,
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  temperature DECIMAL(5, 2),
  apparent_temperature DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  pm10 DECIMAL(6, 2),
  pm25 DECIMAL(6, 2),
  uv_index DECIMAL(4, 2),
  surface_temperature DECIMAL(5, 2),
  wind_speed DECIMAL(5, 2),
  precipitation DECIMAL(6, 2),
  heat_wave_days INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  risk_level VARCHAR(20) DEFAULT 'safe',
  risk_label VARCHAR(20) DEFAULT '안전',
  risk_color VARCHAR(10) DEFAULT '#2196F3',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AI 설명 테이블 생성
CREATE TABLE IF NOT EXISTS ai_explanations (
  id SERIAL PRIMARY KEY,
  region VARCHAR(50) NOT NULL,
  target VARCHAR(20) NOT NULL,
  explanation TEXT,
  action_guides TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(region, target)
);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE climate_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_explanations ENABLE ROW LEVEL SECURITY;

-- 4. 공개 읽기 정책 설정
CREATE POLICY "Allow public read access on climate_data"
  ON climate_data FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on ai_explanations"
  ON ai_explanations FOR SELECT
  USING (true);

-- 5. 초기 데이터 삽입 (경기도 31개 시군)
INSERT INTO climate_data (region, lat, lng, temperature, apparent_temperature, humidity, pm10, pm25, uv_index, surface_temperature, wind_speed, score, risk_level, risk_label, risk_color) VALUES
('수원시', 37.2636, 127.0286, 32, 35, 70, 45, 22, 8, 42, 2.5, 65, 'warning', '경고', '#FF9800'),
('성남시', 37.4449, 127.1389, 30, 32, 65, 38, 18, 7, 38, 3.0, 45, 'caution', '주의', '#FFEB3B'),
('의정부시', 37.7381, 127.0337, 29, 31, 60, 33, 15, 6, 35, 3.5, 42, 'caution', '주의', '#FFEB3B'),
('안양시', 37.3943, 126.9568, 29, 31, 62, 35, 16, 6, 36, 2.8, 38, 'caution', '주의', '#FFEB3B'),
('부천시', 37.5034, 126.7660, 27, 28, 55, 28, 12, 5, 32, 4.0, 25, 'safe', '안전', '#2196F3'),
('광명시', 37.4786, 126.8644, 26, 27, 52, 25, 11, 4, 30, 3.8, 22, 'safe', '안전', '#2196F3'),
('평택시', 36.9921, 127.1127, 33, 35, 69, 50, 25, 8, 42, 2.0, 68, 'warning', '경고', '#FF9800'),
('동두천시', 37.9035, 127.0605, 24, 25, 48, 20, 9, 4, 28, 4.5, 18, 'safe', '안전', '#2196F3'),
('안산시', 37.3219, 126.8309, 33, 36, 72, 48, 24, 8, 43, 2.2, 72, 'warning', '경고', '#FF9800'),
('고양시', 37.6584, 126.8320, 34, 38, 75, 55, 28, 9, 45, 1.8, 78, 'danger', '위험', '#F44336'),
('과천시', 37.4292, 126.9876, 26, 27, 53, 26, 11, 5, 31, 3.5, 24, 'safe', '안전', '#2196F3'),
('구리시', 37.5943, 127.1295, 30, 32, 63, 37, 17, 6, 37, 2.9, 46, 'caution', '주의', '#FFEB3B'),
('남양주시', 37.6360, 127.2165, 31, 34, 70, 40, 19, 7, 39, 2.5, 55, 'warning', '경고', '#FF9800'),
('오산시', 37.1498, 127.0775, 34, 37, 74, 52, 26, 9, 44, 1.5, 75, 'danger', '위험', '#F44336'),
('시흥시', 37.3800, 126.8029, 32, 34, 67, 44, 21, 7, 40, 2.8, 58, 'warning', '경고', '#FF9800'),
('군포시', 37.3617, 126.9352, 27, 28, 54, 27, 12, 5, 32, 3.2, 28, 'safe', '안전', '#2196F3'),
('의왕시', 37.3449, 126.9683, 25, 26, 50, 22, 10, 4, 29, 3.8, 20, 'safe', '안전', '#2196F3'),
('하남시', 37.5393, 127.2148, 31, 33, 66, 41, 20, 7, 39, 2.6, 50, 'warning', '경고', '#FF9800'),
('용인시', 37.2411, 127.1776, 31, 33, 68, 42, 20, 7, 40, 2.4, 52, 'warning', '경고', '#FF9800'),
('파주시', 37.7600, 126.7800, 28, 30, 58, 30, 14, 5, 34, 4.2, 35, 'caution', '주의', '#FFEB3B'),
('이천시', 37.2720, 127.4350, 28, 29, 56, 29, 13, 5, 33, 3.0, 32, 'caution', '주의', '#FFEB3B'),
('안성시', 37.0080, 127.2797, 29, 31, 61, 34, 16, 6, 36, 2.7, 44, 'caution', '주의', '#FFEB3B'),
('김포시', 37.6152, 126.7156, 30, 32, 64, 38, 18, 6, 37, 3.5, 48, 'caution', '주의', '#FFEB3B'),
('화성시', 37.1996, 126.8312, 35, 39, 78, 60, 30, 10, 48, 1.2, 82, 'danger', '위험', '#F44336'),
('광주시', 37.4095, 127.2550, 32, 35, 71, 46, 23, 8, 41, 2.3, 62, 'warning', '경고', '#FF9800'),
('양주시', 37.7853, 127.0458, 29, 30, 59, 32, 15, 6, 35, 3.3, 40, 'caution', '주의', '#FFEB3B'),
('포천시', 37.8949, 127.2002, 28, 29, 57, 30, 14, 5, 33, 3.8, 36, 'caution', '주의', '#FFEB3B'),
('여주시', 37.2983, 127.6374, 27, 28, 55, 28, 13, 5, 32, 3.2, 30, 'caution', '주의', '#FFEB3B'),
('연천군', 38.0966, 127.0750, 23, 24, 45, 18, 8, 3, 27, 5.0, 15, 'safe', '안전', '#2196F3'),
('가평군', 37.8315, 127.5095, 22, 23, 42, 15, 7, 3, 25, 4.8, 12, 'safe', '안전', '#2196F3'),
('양평군', 37.4917, 127.4872, 27, 28, 54, 26, 12, 5, 31, 3.0, 26, 'safe', '안전', '#2196F3')
ON CONFLICT (region) DO UPDATE SET
  temperature = EXCLUDED.temperature,
  apparent_temperature = EXCLUDED.apparent_temperature,
  humidity = EXCLUDED.humidity,
  pm10 = EXCLUDED.pm10,
  pm25 = EXCLUDED.pm25,
  uv_index = EXCLUDED.uv_index,
  surface_temperature = EXCLUDED.surface_temperature,
  wind_speed = EXCLUDED.wind_speed,
  score = EXCLUDED.score,
  risk_level = EXCLUDED.risk_level,
  risk_label = EXCLUDED.risk_label,
  risk_color = EXCLUDED.risk_color,
  updated_at = NOW();

-- 6. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_climate_data_region ON climate_data(region);
CREATE INDEX IF NOT EXISTS idx_ai_explanations_region_target ON ai_explanations(region, target);

-- 7. 기상 경보 테이블 생성
CREATE TABLE IF NOT EXISTS weather_alerts (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL DEFAULT 'info',  -- danger, warning, watch, info
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  region VARCHAR(100),
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. weather_alerts RLS 및 정책
ALTER TABLE weather_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on weather_alerts"
  ON weather_alerts FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on weather_alerts"
  ON weather_alerts FOR INSERT
  WITH CHECK (true);

-- 9. 기상 경보 인덱스
CREATE INDEX IF NOT EXISTS idx_weather_alerts_expires ON weather_alerts(expires_at);
CREATE INDEX IF NOT EXISTS idx_weather_alerts_type ON weather_alerts(type);

-- 10. 초기 기상 경보 데이터
INSERT INTO weather_alerts (type, title, message, region, issued_at, expires_at) VALUES
('warning', '폭염주의보', '경기 남부지역(화성시, 오산시, 평택시)에 폭염주의보가 발효 중입니다. 야외활동을 자제해 주세요.', '경기 남부', NOW(), NOW() + INTERVAL '24 hours'),
('info', '미세먼지 정보', '오늘 경기 북부지역 미세먼지 농도가 ''보통'' 수준입니다.', '경기 북부', NOW(), NOW() + INTERVAL '12 hours'),
('watch', '자외선 지수 높음', '오후 12시~15시 자외선 지수가 ''매우 높음''으로 예상됩니다. 외출 시 자외선 차단제를 사용하세요.', '경기도 전역', NOW(), NOW() + INTERVAL '6 hours'),
('danger', '폭염경보', '고양시, 화성시 지역에 폭염경보가 발효되었습니다. 실외 활동을 삼가고 충분한 수분을 섭취하세요.', '고양시, 화성시', NOW(), NOW() + INTERVAL '48 hours')
ON CONFLICT DO NOTHING;

-- ========================================
-- 시민 제보 맵 (체감 짤 대항전) 테이블
-- ========================================

-- 11. 사용자 제보 테이블 생성
CREATE TABLE IF NOT EXISTS user_reports (
  id SERIAL PRIMARY KEY,
  region VARCHAR(50) NOT NULL,
  lat DECIMAL(10, 6) NOT NULL,
  lng DECIMAL(10, 6) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  feeling_label VARCHAR(50),
  sentiment_score INTEGER DEFAULT 0,      -- -3(매우더움) ~ +3(추움)
  temp_adjustment DECIMAL(4, 2) DEFAULT 0, -- 보정 온도
  comment VARCHAR(100),
  is_air_quality BOOLEAN DEFAULT false,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. user_reports RLS 및 정책
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on user_reports"
  ON user_reports FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on user_reports"
  ON user_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update likes on user_reports"
  ON user_reports FOR UPDATE
  USING (true);

-- 13. user_reports 인덱스
CREATE INDEX IF NOT EXISTS idx_user_reports_region ON user_reports(region);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_user_reports_region_time ON user_reports(region, created_at);

-- 14. 지역별 체감 통계 뷰 생성
CREATE OR REPLACE VIEW region_feeling_stats AS
SELECT
  region,
  COUNT(*) as report_count,
  ROUND(AVG(sentiment_score)::numeric, 2) as avg_sentiment,
  ROUND(AVG(temp_adjustment)::numeric, 2) as avg_temp_adjustment,
  MODE() WITHIN GROUP (ORDER BY emoji) as most_common_emoji,
  MAX(created_at) as latest_report
FROM user_reports
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY region;

-- 15. 샘플 제보 데이터 (테스트용)
INSERT INTO user_reports (region, lat, lng, emoji, feeling_label, sentiment_score, temp_adjustment, comment, created_at) VALUES
('화성시', 37.1996, 126.8312, '🥵', '너무 더워요', -3, 5, '녹아내리는 중 🫠', NOW() - INTERVAL '30 minutes'),
('화성시', 37.1996, 126.8312, '🥵', '너무 더워요', -3, 5, '여긴 사우나인가요?', NOW() - INTERVAL '1 hour'),
('고양시', 37.6584, 126.8320, '😰', '더워요', -2, 3, '에어컨 없이는 못 살아', NOW() - INTERVAL '2 hours'),
('오산시', 37.1498, 127.0775, '🥵', '너무 더워요', -3, 5, '아스팔트에서 계란 익겠다', NOW() - INTERVAL '45 minutes'),
('수원시', 37.2636, 127.0286, '😅', '조금 더워요', -1, 1, '그늘도 더워요', NOW() - INTERVAL '3 hours'),
('가평군', 37.8315, 127.5095, '😊', '쾌적해요', 0, 0, '날씨 완전 좋아요! ✨', NOW() - INTERVAL '1 hour'),
('연천군', 38.0966, 127.0750, '😌', '조금 쌀쌀해요', 1, -1, '산책하기 딱 좋은 날', NOW() - INTERVAL '2 hours'),
('안산시', 37.3219, 126.8309, '😷', '공기 안좋아요', -2, 0, '미세먼지 폭탄 💣', NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;
