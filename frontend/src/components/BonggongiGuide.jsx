import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';

// 음성 합성 (TTS) 유틸리티 - 어린 남자아이 목소리
const speakMessage = (text, onEnd) => {
  // 이전 음성 중단
  window.speechSynthesis.cancel();

  // 이모지 및 특수문자, 문장부호 제거 (문자만 읽기)
  const cleanText = text
    .replace(/[🐝❄️🌬️😷🌤️⚠️👆👨‍👩‍👧‍👦🏆🧤🥶🌟📊]/g, '')  // 이모지 제거
    .replace(/[!~.?,;:'"()[\]{}@#$%^&*+=<>\/\\|`_-]/g, ' ')  // 문장부호 → 공백
    .replace(/\s+/g, ' ')  // 연속 공백 정리
    .trim();
  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);

  // 한국어 음성 찾기
  const voices = window.speechSynthesis.getVoices();
  const koreanVoice = voices.find(v => v.lang.includes('ko')) || voices[0];

  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }

  // 5살 남자아이 목소리 설정 (매우 높은 피치, 귀여운 톤)
  utterance.lang = 'ko-KR';
  utterance.pitch = 1.9;  // 매우 높은 피치 (5살 아이 목소리)
  utterance.rate = 0.95;  // 약간 느린 속도 (어린아이 말투)
  utterance.volume = 0.85; // 볼륨

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
};

// 음성 합성 초기화 (voices 로드 대기)
const initVoices = () => {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
    }
  });
};

// 대상그룹별 외출 조건
const TARGET_CONDITIONS = {
  general: { minTemp: -10, maxTemp: 35, maxPop: 50, label: '일반' },
  elderly: { minTemp: -5, maxTemp: 30, maxPop: 30, label: '노인' },
  child: { minTemp: -5, maxTemp: 32, maxPop: 30, label: '아동' },
  outdoor: { minTemp: -15, maxTemp: 38, maxPop: 60, label: '야외활동' },
};

// 시간대별 활동 추천
const TIME_ACTIVITIES = {
  morning: { start: 6, end: 9, label: '아침', activity: '산책/조깅' },
  midMorning: { start: 9, end: 12, label: '오전', activity: '야외활동' },
  afternoon: { start: 12, end: 15, label: '점심/오후', activity: '외출' },
  lateAfternoon: { start: 15, end: 18, label: '오후', activity: '산책' },
  evening: { start: 18, end: 21, label: '저녁', activity: '가벼운 산책' },
};

// 봉공이 안내 메시지 (겨울철)
const GUIDE_MESSAGES = [
  { type: 'cold', message: '오늘 많이 춥네요! 따뜻하게 입고 외출하세요~ ❄️' },
  { type: 'wind', message: '바람이 불면 체감온도가 더 낮아져요! 방한용품 챙기세요~ 🌬️' },
  { type: 'pm', message: '미세먼지가 높은 지역이 있어요. 마스크 잊지 마세요! 😷' },
  { type: 'safe', message: '이 지역은 비교적 쾌적해요! 산책하기 좋은 날씨~ 🌤️' },
  { type: 'danger', message: '이 지역은 주의가 필요해요! 외출 시 조심하세요~ ⚠️' },
  { type: 'tip1', message: '지도에서 지역을 클릭하면 상세 정보를 볼 수 있어요! 👆' },
  { type: 'tip2', message: '대상별(일반/노인/아동/야외) 맞춤 정보도 확인해보세요! 👨‍👩‍👧‍👦' },
  { type: 'tip3', message: '오른쪽 랭킹에서 가장 쾌적한 지역을 찾아보세요! 🏆' },
  { type: 'winter', message: '동상 조심! 손발이 시리면 바로 따뜻하게 해주세요~ 🧤' },
];

// 최적 외출 시간 계산 함수
const calculateBestOutingTime = (forecasts, targetGroup = 'general') => {
  if (!forecasts || forecasts.length === 0) return null;

  const conditions = TARGET_CONDITIONS[targetGroup] || TARGET_CONDITIONS.general;
  const now = new Date();
  const currentHour = now.getHours();

  // 오늘과 내일의 예보만 필터링
  const todayStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}${String(tomorrow.getMonth() + 1).padStart(2, '0')}${String(tomorrow.getDate()).padStart(2, '0')}`;

  // 각 예보에 점수 부여
  const scoredForecasts = forecasts
    .filter(f => f.date === todayStr || f.date === tomorrowStr)
    .filter(f => {
      // 오늘이면 현재 시간 이후만
      if (f.date === todayStr) {
        return f.hour >= currentHour;
      }
      return true;
    })
    .map(f => {
      let score = 100;
      const temp = f.temperature;
      const pop = f.pop || 0;
      const hour = f.hour;

      // 기온 점수 (적정 온도에서 멀어질수록 감점)
      if (temp !== null) {
        if (temp < conditions.minTemp) {
          score -= (conditions.minTemp - temp) * 5;
        } else if (temp > conditions.maxTemp) {
          score -= (temp - conditions.maxTemp) * 5;
        }
        // 적정 기온 범위 (10~20도)에서 보너스
        if (temp >= 10 && temp <= 20) {
          score += 10;
        } else if (temp >= 5 && temp <= 25) {
          score += 5;
        }
      }

      // 강수확률 점수
      if (pop > conditions.maxPop) {
        score -= (pop - conditions.maxPop);
      }
      if (pop === 0) {
        score += 10;
      }

      // 시간대 보너스 (활동하기 좋은 시간)
      if (hour >= 9 && hour <= 16) {
        score += 10; // 낮 시간 보너스
      } else if (hour >= 6 && hour < 9) {
        score += 5; // 아침 보너스
      } else if (hour >= 17 && hour <= 19) {
        score += 3; // 저녁 산책 시간
      }

      // 날씨 아이콘 기반 보너스
      if (f.icon === '☀️' || f.icon === '🌤️') {
        score += 15;
      } else if (f.icon === '⛅') {
        score += 5;
      } else if (f.icon === '🌧️' || f.icon === '❄️') {
        score -= 20;
      }

      return {
        ...f,
        score: Math.max(0, Math.min(100, score)),
        isToday: f.date === todayStr,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (scoredForecasts.length === 0) return null;

  // 최고 점수 시간대
  const best = scoredForecasts[0];

  // 시간대 라벨 결정
  let timeLabel = '';
  if (best.hour >= 6 && best.hour < 9) timeLabel = '아침';
  else if (best.hour >= 9 && best.hour < 12) timeLabel = '오전';
  else if (best.hour >= 12 && best.hour < 15) timeLabel = '점심~오후';
  else if (best.hour >= 15 && best.hour < 18) timeLabel = '오후';
  else if (best.hour >= 18 && best.hour < 21) timeLabel = '저녁';
  else timeLabel = '밤';

  return {
    forecast: best,
    timeLabel,
    dayLabel: best.isToday ? '오늘' : '내일',
    score: best.score,
  };
};

// 외출 추천 메시지 생성
const generateOutingRecommendation = (bestTime, targetGroup, regionName) => {
  if (!bestTime) {
    return {
      type: 'outing',
      message: `${regionName}의 예보를 확인 중이에요~ 잠시만요! 🔍`,
    };
  }

  const { forecast, timeLabel, dayLabel, score } = bestTime;
  const temp = forecast.temperature;
  const icon = forecast.icon;
  const conditions = TARGET_CONDITIONS[targetGroup] || TARGET_CONDITIONS.general;

  // 점수에 따른 메시지
  if (score >= 80) {
    return {
      type: 'outing-great',
      message: `${dayLabel} ${timeLabel}이 외출하기 딱 좋아요! ${icon} ${temp}°C로 ${conditions.label}분께 추천해요~`,
    };
  } else if (score >= 60) {
    return {
      type: 'outing-good',
      message: `${dayLabel} ${timeLabel}에 나가시면 좋겠어요! ${icon} ${temp}°C 예상이에요~`,
    };
  } else if (score >= 40) {
    return {
      type: 'outing-caution',
      message: `${dayLabel} ${timeLabel}이 그나마 나아요. ${icon} ${temp}°C지만 따뜻하게 입으세요!`,
    };
  } else {
    return {
      type: 'outing-warning',
      message: `오늘은 실내 활동을 추천해요! ${icon} ${temp}°C로 많이 ${temp < 0 ? '추워요' : '더워요'}~ ⚠️`,
    };
  }
};

// 경기도 주요 지점 (봉공이 이동 경로)
const PATROL_POINTS = [
  { lat: 37.2636, lng: 127.0286, name: '수원시' },
  { lat: 37.6584, lng: 126.8320, name: '고양시' },
  { lat: 37.4449, lng: 127.1389, name: '성남시' },
  { lat: 37.7381, lng: 127.0337, name: '의정부시' },
  { lat: 37.1996, lng: 126.8312, name: '화성시' },
  { lat: 37.5034, lng: 126.7660, name: '부천시' },
  { lat: 37.8949, lng: 127.2002, name: '포천시' },
  { lat: 37.4138, lng: 127.5183, name: '경기도 중앙' },
];

// 봉공이 캐릭터 아이콘 (SVG) - 큰 사이즈
const createBonggongiIcon = () => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <!-- 몸통 (노란색 타원) -->
      <ellipse cx="50" cy="55" rx="28" ry="32" fill="#FFD93D" stroke="#E8A317" stroke-width="2"/>
      <!-- 줄무늬 -->
      <ellipse cx="50" cy="48" rx="24" ry="6" fill="#1A1A2E" opacity="0.8"/>
      <ellipse cx="50" cy="62" rx="22" ry="5" fill="#1A1A2E" opacity="0.8"/>
      <!-- 얼굴 -->
      <circle cx="50" cy="35" r="22" fill="#FFE066" stroke="#E8A317" stroke-width="2"/>
      <!-- 눈 -->
      <ellipse cx="42" cy="32" rx="5" ry="6" fill="#1A1A2E"/>
      <ellipse cx="58" cy="32" rx="5" ry="6" fill="#1A1A2E"/>
      <!-- 눈 반짝임 -->
      <circle cx="44" cy="30" r="2" fill="white"/>
      <circle cx="60" cy="30" r="2" fill="white"/>
      <!-- 볼 터치 -->
      <ellipse cx="35" cy="38" rx="5" ry="3" fill="#FF9999" opacity="0.6"/>
      <ellipse cx="65" cy="38" rx="5" ry="3" fill="#FF9999" opacity="0.6"/>
      <!-- 입 (미소) -->
      <path d="M 42 42 Q 50 50 58 42" stroke="#1A1A2E" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- 더듬이 -->
      <line x1="40" y1="15" x2="35" y2="5" stroke="#1A1A2E" stroke-width="2" stroke-linecap="round"/>
      <line x1="60" y1="15" x2="65" y2="5" stroke="#1A1A2E" stroke-width="2" stroke-linecap="round"/>
      <circle cx="35" cy="5" r="4" fill="#FFD93D" stroke="#E8A317" stroke-width="1"/>
      <circle cx="65" cy="5" r="4" fill="#FFD93D" stroke="#E8A317" stroke-width="1"/>
      <!-- 날개 -->
      <ellipse cx="22" cy="45" rx="12" ry="18" fill="rgba(200, 230, 255, 0.7)" stroke="#87CEEB" stroke-width="1">
        <animate attributeName="ry" values="18;20;18" dur="0.3s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="78" cy="45" rx="12" ry="18" fill="rgba(200, 230, 255, 0.7)" stroke="#87CEEB" stroke-width="1">
        <animate attributeName="ry" values="18;20;18" dur="0.3s" repeatCount="indefinite"/>
      </ellipse>
      <!-- 경기도 마크 (가슴) -->
      <text x="50" y="58" text-anchor="middle" font-size="10" font-weight="bold" fill="#1A1A2E">경기</text>
    </svg>
  `;

  return L.divIcon({
    html: `<div class="bonggongi-container">${svgIcon}</div>`,
    className: 'bonggongi-icon',
    iconSize: [100, 100],
    iconAnchor: [50, 100],
    popupAnchor: [0, -90],
  });
};

function BonggongiGuide({ regions, selectedRegion, targetGroup = 'general' }) {
  const map = useMap();
  const { profile } = useAuth();
  const markerRef = useRef(null);
  const [position, setPosition] = useState(PATROL_POINTS[0]);
  const [isVisible, setIsVisible] = useState(true);
  const [patrolIndex, setPatrolIndex] = useState(0);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const hasSpokenGreeting = useRef(false);
  const [forecastData, setForecastData] = useState([]);
  const [outingRecommendation, setOutingRecommendation] = useState(null);
  const prevMessageRef = useRef(null);
  const hasShownOutingRef = useRef(false);  // 외출 추천 1회만 표시
  const isPatrolMoving = useRef(false);  // 순찰 이동 중 음성 방지

  // 로그인 여부 확인
  const isLoggedIn = !!profile?.display_name;

  // 닉네임 기반 인사 메시지 생성
  const greetingMessage = useMemo(() => {
    const nickname = profile?.display_name;
    if (nickname) {
      return { type: 'greeting', message: `${nickname}님 안녕하세요! 저는 AI반디예요 🐝` };
    }
    return { type: 'greeting', message: '안녕하세요~ 로그인하세요! 🐝' };
  }, [profile?.display_name]);

  const [currentMessage, setCurrentMessage] = useState(null);

  // 첫 인사 메시지 설정 (닉네임 로드 후)
  useEffect(() => {
    if (!currentMessage && greetingMessage) {
      setCurrentMessage(greetingMessage);
    }
  }, [greetingMessage]);

  // 음성 합성 초기화
  useEffect(() => {
    if ('speechSynthesis' in window) {
      initVoices().then(() => {
        setVoicesReady(true);
      });
    }

    // 컴포넌트 언마운트 시 음성 중단
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 예보 데이터 가져오기 (로그인 시에만, 선택된 지역 또는 현재 위치 기반)
  useEffect(() => {
    // 로그인하지 않으면 예보/외출추천 안 함
    if (!isLoggedIn) return;

    const fetchForecast = async (regionName) => {
      try {
        const response = await fetch(`/api/kma-forecast?region=${encodeURIComponent(regionName)}`);
        const data = await response.json();

        if (data.success && data.forecasts) {
          setForecastData(data.forecasts);

          // 최적 외출 시간 계산
          const bestTime = calculateBestOutingTime(data.forecasts, targetGroup);
          if (bestTime) {
            const recommendation = generateOutingRecommendation(bestTime, targetGroup, regionName);
            setOutingRecommendation(recommendation);
          }
        }
      } catch (err) {
        console.error('예보 데이터 로드 실패:', err);
      }
    };

    // 선택된 지역이 있으면 해당 지역, 없으면 현재 순찰 위치
    const regionName = selectedRegion?.region || position.name || '수원시';
    fetchForecast(regionName);
  }, [isLoggedIn, selectedRegion, position.name, targetGroup]);

  // 메시지가 변경되면 음성으로 읽기 (음소거 아닐 때만)
  useEffect(() => {
    if (!currentMessage || !voicesReady || !isVisible || isMuted) return;

    // 순찰 이동 중에는 음성 안내 안함
    if (isPatrolMoving.current) {
      isPatrolMoving.current = false;
      return;
    }

    // 첫 인사는 한 번만
    if (currentMessage.type === 'greeting') {
      if (hasSpokenGreeting.current) return;
      hasSpokenGreeting.current = true;
    }

    // 사용자 상호작용 후에만 음성 재생 (브라우저 정책)
    const playVoice = () => {
      setIsSpeaking(true);
      speakMessage(currentMessage.message, () => {
        setIsSpeaking(false);
      });
    };

    // 약간의 딜레이 후 재생
    const timer = setTimeout(playVoice, 300);
    return () => clearTimeout(timer);
  }, [currentMessage, voicesReady, isVisible, isMuted]);

  // 말풍선 자동 열기
  useEffect(() => {
    if (markerRef.current && isVisible) {
      setTimeout(() => {
        markerRef.current.openPopup();
      }, 500);
    }
  }, [position, currentMessage, isVisible]);

  // 지역 상태에 따른 메시지 선택 (중복 방지)
  const getContextualMessage = useCallback((pos) => {
    const nearbyRegion = regions.find(r =>
      Math.abs(r.lat - pos.lat) < 0.1 && Math.abs(r.lng - pos.lng) < 0.1
    );

    // 가능한 메시지 후보들을 수집
    const candidates = [];

    // 외출 추천 메시지 - 1회만 표시
    // (getContextualMessage에서는 추가하지 않음 - 첫 인사 후 1회만 별도 처리)

    if (nearbyRegion) {
      const temp = nearbyRegion.climate_data?.apparent_temperature;
      const pm10 = nearbyRegion.climate_data?.pm10;
      const regionName = nearbyRegion.region || pos.name;

      // 기온 기반 메시지
      if (temp !== null && temp <= -10) {
        candidates.push({ type: 'cold', message: `${regionName}은 체감온도 ${temp}°C! 정말 추우니 조심하세요! 🥶` });
        candidates.push(GUIDE_MESSAGES.find(m => m.type === 'cold'));
      }

      // 미세먼지 메시지
      if (pm10 && pm10 >= 80) {
        candidates.push(GUIDE_MESSAGES.find(m => m.type === 'pm'));
      }

      // 위험도 기반 메시지
      if (nearbyRegion.risk_level === 'danger' || nearbyRegion.risk_level === 'warning') {
        candidates.push(GUIDE_MESSAGES.find(m => m.type === 'danger'));
      } else if (nearbyRegion.risk_level === 'safe') {
        candidates.push({ type: 'safe', message: `${regionName}은 비교적 쾌적해요! 산책하기 좋은 날씨~ 🌟` });
        candidates.push(GUIDE_MESSAGES.find(m => m.type === 'safe'));
      }
    }

    // 팁 메시지들 추가
    const tips = GUIDE_MESSAGES.filter(m => m.type.startsWith('tip') || m.type === 'winter' || m.type === 'wind');
    candidates.push(...tips);

    // 유효한 후보만 필터링
    const validCandidates = candidates.filter(c => c && c.message);

    // 이전 메시지와 다른 메시지 선택
    const prevMessage = prevMessageRef.current;
    const differentCandidates = validCandidates.filter(c => c.message !== prevMessage?.message);

    // 다른 메시지가 있으면 그 중에서, 없으면 전체에서 선택
    const pool = differentCandidates.length > 0 ? differentCandidates : validCandidates;
    const selected = pool[Math.floor(Math.random() * pool.length)] || GUIDE_MESSAGES[0];

    // 선택된 메시지 저장
    prevMessageRef.current = selected;

    return selected;
  }, [regions]);

  // 첫 인사 후 외출 추천 1회 표시 (로그인 시에만)
  useEffect(() => {
    if (!hasGreeted) {
      const greetingTimer = setTimeout(() => {
        setHasGreeted(true);

        // 로그인하지 않으면 인사 메시지 유지 (다른 메시지로 전환 안 함)
        if (!isLoggedIn) {
          return;
        }

        // 외출 추천이 있고 아직 안 보여줬으면 1회 표시
        if (outingRecommendation && !hasShownOutingRef.current) {
          hasShownOutingRef.current = true;
          setCurrentMessage(outingRecommendation);
        } else {
          // 현재 위치의 날씨 정보로 전환
          setCurrentMessage(getContextualMessage(position));
        }
      }, 4000); // 4초 후 전환

      return () => clearTimeout(greetingTimer);
    }
  }, [hasGreeted, getContextualMessage, position, outingRecommendation, isLoggedIn]);

  // 순찰 이동 (로그인 후 인사 완료 시에만) - 음성 안내 없이 이동만
  useEffect(() => {
    // 로그인 안 했으면 순찰 안 함
    if (!isLoggedIn || !hasGreeted) return;

    const moveInterval = setInterval(() => {
      isPatrolMoving.current = true;  // 순찰 이동 중 플래그
      setPatrolIndex(prev => {
        const nextIndex = (prev + 1) % PATROL_POINTS.length;
        const nextPos = PATROL_POINTS[nextIndex];
        setPosition(nextPos);
        setCurrentMessage(getContextualMessage(nextPos));
        return nextIndex;
      });
    }, 8000); // 8초마다 이동

    return () => clearInterval(moveInterval);
  }, [hasGreeted, getContextualMessage]);

  // 선택된 지역으로 이동 (로그인 시에만 음성 안내)
  useEffect(() => {
    if (selectedRegion) {
      setPosition({
        lat: selectedRegion.lat + 0.05, // 약간 위에 위치
        lng: selectedRegion.lng,
        name: selectedRegion.region,
      });

      // 로그인하지 않으면 인사/로그인 안내 유지
      if (!isLoggedIn) {
        return;
      }

      // 선택된 지역에 맞는 메시지 (외출 추천은 첫 접속 시 1회만)
      const temp = selectedRegion.climate_data?.apparent_temperature;
      if (temp !== null && temp <= -15) {
        setCurrentMessage({ type: 'cold', message: `${selectedRegion.region}은 체감온도 ${temp}°C! 정말 추우니 조심하세요! 🥶` });
      } else if (temp !== null && temp <= -5) {
        setCurrentMessage({ type: 'cold', message: `${selectedRegion.region}의 체감온도는 ${temp}°C예요. 따뜻하게 입으세요~ ❄️` });
      } else if (selectedRegion.risk_level === 'danger') {
        setCurrentMessage({ type: 'danger', message: `${selectedRegion.region}은 주의가 필요한 지역이에요! ⚠️` });
      } else if (selectedRegion.risk_level === 'safe') {
        setCurrentMessage({ type: 'safe', message: `${selectedRegion.region}은 비교적 쾌적한 지역이에요! 🌟` });
      } else {
        setCurrentMessage({ type: 'info', message: `${selectedRegion.region}의 기후 정보를 확인해보세요! 📊` });
      }
    }
  }, [selectedRegion, isLoggedIn]);

  if (!isVisible) return null;

  return (
    <>
      <Marker
        ref={markerRef}
        position={[position.lat, position.lng]}
        icon={createBonggongiIcon()}
        eventHandlers={{
          click: () => {
            // 로그인 전에는 메시지 변경 안 함
            if (!isLoggedIn) return;

            // 클릭 시 외출 추천 또는 팁 표시
            if (outingRecommendation && Math.random() < 0.5) {
              setCurrentMessage(outingRecommendation);
            } else {
              const tips = GUIDE_MESSAGES.filter(m => m.type.startsWith('tip'));
              setCurrentMessage(tips[Math.floor(Math.random() * tips.length)]);
            }
          },
        }}
      >
        <Popup className="bonggongi-popup" autoPan={false}>
          <div className="bonggongi-speech">
            <div className="speech-header">
              <span className="bonggongi-name">🐝 AI반디</span>
              <div className="speech-controls">
                {/* 음성 토글 버튼 */}
                <button
                  className={`voice-toggle-btn ${isSpeaking ? 'speaking' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMuted) {
                      setIsMuted(false);
                      // 음소거 해제 시 현재 메시지 읽기
                      if (currentMessage?.message) {
                        speakMessage(currentMessage.message);
                      }
                    } else {
                      setIsMuted(true);
                      window.speechSynthesis.cancel();
                    }
                  }}
                  title={isMuted ? '음성 켜기' : '음성 끄기'}
                >
                  {isMuted ? '🔇' : (isSpeaking ? '🔊' : '🔈')}
                </button>
                <button
                  className="close-guide-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.speechSynthesis.cancel();
                    setIsVisible(false);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <p className="speech-text">{currentMessage?.message || '로딩 중...'}</p>
            {/* 외출 추천 버튼 - 로그인한 사용자에게만 표시 */}
            {isLoggedIn && (
              <div className="speech-actions">
                <button
                  className="outing-recommend-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (outingRecommendation) {
                      setCurrentMessage(outingRecommendation);
                    } else {
                      setCurrentMessage({
                        type: 'loading',
                        message: '예보 데이터를 불러오는 중이에요~ 🔍',
                      });
                    }
                  }}
                  title="오늘 외출하기 좋은 시간 추천"
                >
                  🌟 외출 추천
                </button>
              </div>
            )}
          </div>
        </Popup>
      </Marker>

      {/* 봉공이 토글 버튼 (숨겼을 때 다시 표시) */}
      {!isVisible && (
        <div
          className="bonggongi-toggle"
          onClick={() => setIsVisible(true)}
        >
          🐝 AI반디 부르기
        </div>
      )}
    </>
  );
}

export default BonggongiGuide;
