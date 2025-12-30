/**
 * 구조화된 로깅 유틸리티
 * 개발/프로덕션 환경에 따라 다른 로그 레벨 적용
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// 환경에 따른 최소 로그 레벨
const MIN_LOG_LEVEL = import.meta.env.PROD ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

/**
 * 타임스탬프 포맷
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * 로그 메시지 포맷
 */
const formatMessage = (level, module, message, data) => {
  const timestamp = getTimestamp();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] [${module}] ${message}${dataStr}`;
};

/**
 * 로거 생성
 * @param {string} module - 모듈명 (예: 'App', 'kmaApi', 'Sidebar')
 */
export const createLogger = (module) => {
  return {
    debug: (message, data = null) => {
      if (LOG_LEVELS.DEBUG >= MIN_LOG_LEVEL) {
        console.debug(formatMessage('DEBUG', module, message, data));
      }
    },

    info: (message, data = null) => {
      if (LOG_LEVELS.INFO >= MIN_LOG_LEVEL) {
        console.info(formatMessage('INFO', module, message, data));
      }
    },

    warn: (message, data = null) => {
      if (LOG_LEVELS.WARN >= MIN_LOG_LEVEL) {
        console.warn(formatMessage('WARN', module, message, data));
      }
    },

    error: (message, error = null, data = null) => {
      if (LOG_LEVELS.ERROR >= MIN_LOG_LEVEL) {
        const errorInfo = error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...data
        } : data;
        console.error(formatMessage('ERROR', module, message, errorInfo));
      }
    },

    // API 호출 로깅
    api: (method, url, status, duration) => {
      if (LOG_LEVELS.INFO >= MIN_LOG_LEVEL) {
        const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
        console.info(formatMessage('API', module, `${statusEmoji} ${method} ${url}`, {
          status,
          duration: `${duration}ms`
        }));
      }
    },

    // 성능 측정
    time: (label) => {
      if (LOG_LEVELS.DEBUG >= MIN_LOG_LEVEL) {
        console.time(`[${module}] ${label}`);
      }
    },

    timeEnd: (label) => {
      if (LOG_LEVELS.DEBUG >= MIN_LOG_LEVEL) {
        console.timeEnd(`[${module}] ${label}`);
      }
    },
  };
};

// 기본 로거
export const logger = createLogger('App');

export default logger;
