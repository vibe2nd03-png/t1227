/**
 * 기후 체감 지수 관련 상수
 * 이 파일에서 모든 임계값과 설정을 관리합니다.
 */

// 위험 등급 임계값
export const RISK_THRESHOLDS = {
  DANGER: 75,   // 75점 이상: 위험
  WARNING: 50,  // 50-74점: 경고
  CAUTION: 30,  // 30-49점: 주의
  SAFE: 0,      // 0-29점: 안전
};

// 위험 등급 정보
export const RISK_LEVELS = {
  danger: { level: 'danger', label: '위험', color: '#F44336', emoji: '🔴' },
  warning: { level: 'warning', label: '경고', color: '#FF9800', emoji: '🟠' },
  caution: { level: 'caution', label: '주의', color: '#FFEB3B', emoji: '🟡' },
  safe: { level: 'safe', label: '안전', color: '#2196F3', emoji: '🔵' },
};

// 대상별 점수 조정 배율
export const TARGET_MULTIPLIERS = {
  elderly: 1.3,      // 노인: 30% 가중
  child: 1.25,       // 아동: 25% 가중
  outdoor: 1.2,      // 야외근로자: 20% 가중
  general: 1.0,      // 일반: 기본값
};

// 대상 라벨
export const TARGET_LABELS = {
  general: '일반 시민',
  elderly: '노인',
  child: '아동',
  outdoor: '야외근로자',
};

// 체감지수 계산 가중치
export const SCORE_WEIGHTS = {
  apparent_temperature: 0.40, // 체감온도 40%
  pm10: 0.20,                 // PM10 20%
  pm25: 0.15,                 // PM2.5 15%
  humidity: 0.10,             // 습도 10%
  uv_index: 0.10,             // 자외선 10%
  surface_temperature: 0.05,  // 지표면온도 5%
};

/**
 * 점수로 위험 등급 계산
 * @param {number} score - 0-100 점수
 * @returns {{ level: string, label: string, color: string, emoji: string }}
 */
export const calculateRiskLevel = (score) => {
  if (score >= RISK_THRESHOLDS.DANGER) return RISK_LEVELS.danger;
  if (score >= RISK_THRESHOLDS.WARNING) return RISK_LEVELS.warning;
  if (score >= RISK_THRESHOLDS.CAUTION) return RISK_LEVELS.caution;
  return RISK_LEVELS.safe;
};

/**
 * 대상별 점수 조정
 * @param {number} score - 기본 점수
 * @param {string} target - 대상 그룹 (general, elderly, child, outdoor)
 * @returns {number} - 조정된 점수 (0-100)
 */
export const adjustScoreForTarget = (score, target = 'general') => {
  const multiplier = TARGET_MULTIPLIERS[target] || 1.0;
  return Math.min(100, Math.round(score * multiplier));
};

/**
 * 대상 라벨 반환
 * @param {string} target - 대상 그룹
 * @returns {string}
 */
export const getTargetLabel = (target) => {
  return TARGET_LABELS[target] || TARGET_LABELS.general;
};

export default {
  RISK_THRESHOLDS,
  RISK_LEVELS,
  TARGET_MULTIPLIERS,
  TARGET_LABELS,
  SCORE_WEIGHTS,
  calculateRiskLevel,
  adjustScoreForTarget,
  getTargetLabel,
};
