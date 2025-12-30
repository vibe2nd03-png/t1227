-- 기존 정책 삭제 (오류 무시)
DROP POLICY IF EXISTS "Allow public read access on climate_data" ON climate_data;
DROP POLICY IF EXISTS "Allow public read access on ai_explanations" ON ai_explanations;
DROP POLICY IF EXISTS "Allow public read access on weather_alerts" ON weather_alerts;
DROP POLICY IF EXISTS "Allow public insert on weather_alerts" ON weather_alerts;
DROP POLICY IF EXISTS "Allow public read access on user_reports" ON user_reports;
DROP POLICY IF EXISTS "Allow public insert on user_reports" ON user_reports;
DROP POLICY IF EXISTS "Allow public update likes on user_reports" ON user_reports;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own favorites" ON user_favorite_regions;
DROP POLICY IF EXISTS "Users can view own notification settings" ON notification_subscriptions;
DROP POLICY IF EXISTS "Users can insert own notification settings" ON notification_subscriptions;
DROP POLICY IF EXISTS "Users can update own notification settings" ON notification_subscriptions;
DROP POLICY IF EXISTS "Users can delete own notification settings" ON notification_subscriptions;

-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_report_created ON user_reports;

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_user_report_stats();

-- 기존 뷰 삭제
DROP VIEW IF EXISTS region_feeling_stats;
