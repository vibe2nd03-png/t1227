import React, { useState, useEffect } from 'react';

// 성별/연령대 옵션
const GENDER_OPTIONS = [
  { value: 'male', label: '남성', emoji: '👨' },
  { value: 'female', label: '여성', emoji: '👩' },
];

const AGE_OPTIONS = [
  { value: 'teen', label: '10대', prompt: 'teenager' },
  { value: '20s', label: '20대', prompt: 'young adult in 20s' },
  { value: '30s', label: '30대', prompt: 'adult in 30s' },
  { value: '40s', label: '40대', prompt: 'adult in 40s' },
  { value: '50s', label: '50대', prompt: 'mature adult in 50s' },
  { value: '60s', label: '60대', prompt: 'senior adult in 60s' },
  { value: '70s', label: '70대', prompt: 'elderly person in 70s' },
];

const STYLE_OPTIONS = [
  { value: 'casual', label: '캐주얼', prompt: 'casual streetwear' },
  { value: 'office', label: '오피스', prompt: 'office business casual' },
  { value: 'sporty', label: '스포티', prompt: 'sporty athletic wear' },
  { value: 'minimal', label: '미니멀', prompt: 'minimalist clean style' },
];

function OotdGenerator({ selectedRegion }) {
  const [isOpen, setIsOpen] = useState(false);
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('20s');
  const [style, setStyle] = useState('casual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [outfitDescription, setOutfitDescription] = useState('');
  const [error, setError] = useState(null);

  // 기후 데이터를 패션 프롬프트로 변환
  const generateFashionPrompt = (climate, genderVal, ageVal, styleVal) => {
    const temp = climate.apparent_temperature || climate.temperature || 25;
    const humidity = climate.humidity || 50;
    const pm10 = climate.pm10 || 30;
    const pm25 = climate.pm25 || 15;
    const uvIndex = climate.uv_index || 5;

    // 온도별 옷차림
    let temperatureOutfit = '';
    let season = '';
    if (temp >= 33) {
      temperatureOutfit = 'very light summer clothes, tank top, shorts, sandals';
      season = 'hot summer';
    } else if (temp >= 28) {
      temperatureOutfit = 'light summer outfit, short sleeve t-shirt, thin pants or shorts';
      season = 'summer';
    } else if (temp >= 23) {
      temperatureOutfit = 'light spring outfit, thin long sleeve or short sleeve, light pants';
      season = 'late spring';
    } else if (temp >= 17) {
      temperatureOutfit = 'spring outfit, light jacket or cardigan, long pants';
      season = 'spring';
    } else if (temp >= 12) {
      temperatureOutfit = 'autumn outfit, sweater or hoodie, jacket';
      season = 'autumn';
    } else if (temp >= 5) {
      temperatureOutfit = 'cold weather outfit, warm coat, scarf, layers';
      season = 'late autumn';
    } else {
      temperatureOutfit = 'winter outfit, padded jacket, warm coat, beanie, gloves';
      season = 'winter';
    }

    // 습도별 소재
    let fabricType = '';
    if (humidity >= 70) {
      fabricType = 'breathable linen or moisture-wicking fabric';
    } else if (humidity >= 50) {
      fabricType = 'cotton fabric';
    } else {
      fabricType = 'comfortable fabric';
    }

    // 미세먼지 대응
    let dustProtection = '';
    if (pm10 >= 80 || pm25 >= 35) {
      dustProtection = ', wearing KF94 mask for dust protection';
    } else if (pm10 >= 50 || pm25 >= 25) {
      dustProtection = ', wearing simple mask';
    }

    // 자외선 대응
    let uvProtection = '';
    if (uvIndex >= 8) {
      uvProtection = ', wearing sunglasses and cap/hat for UV protection';
    } else if (uvIndex >= 6) {
      uvProtection = ', wearing sunglasses';
    }

    // 성별/연령대/스타일 정보
    const genderText = genderVal === 'male' ? 'Korean man' : 'Korean woman';
    const ageText = AGE_OPTIONS.find(a => a.value === ageVal)?.prompt || 'young adult';
    const styleText = STYLE_OPTIONS.find(s => s.value === styleVal)?.prompt || 'casual';

    // 최종 프롬프트 조합
    const prompt = `Fashion illustration of a ${ageText} ${genderText}, ${styleText} style, ${temperatureOutfit}, ${fabricType}${dustProtection}${uvProtection}, ${season} weather in Korea, full body shot, standing pose, white background, high quality fashion photography style`;

    return { prompt, temp, humidity, pm10, uvIndex, season };
  };

  // 옷차림 설명 생성
  const generateDescription = (climate, season) => {
    const temp = climate.apparent_temperature || climate.temperature || 25;
    const humidity = climate.humidity || 50;
    const pm10 = climate.pm10 || 30;
    const uvIndex = climate.uv_index || 5;

    let desc = [];

    // 온도 기반 추천
    if (temp >= 33) {
      desc.push('🌡️ 폭염! 최대한 시원한 옷차림 필수');
    } else if (temp >= 28) {
      desc.push('☀️ 더운 날씨, 반팔/반바지 추천');
    } else if (temp >= 23) {
      desc.push('🌤️ 따뜻한 날씨, 가벼운 옷차림');
    } else if (temp >= 17) {
      desc.push('🍃 선선함, 얇은 겉옷 준비');
    } else if (temp >= 12) {
      desc.push('🍂 쌀쌀함, 자켓/가디건 필수');
    } else if (temp >= 5) {
      desc.push('❄️ 추움, 따뜻한 외투 필수');
    } else {
      desc.push('🥶 한파! 패딩/목도리 필수');
    }

    // 습도 기반 추천
    if (humidity >= 70) {
      desc.push('💧 습도 높음 - 통기성 좋은 린넨/면 소재');
    }

    // 미세먼지 기반 추천
    if (pm10 >= 80) {
      desc.push('😷 미세먼지 나쁨 - KF94 마스크 필수!');
    } else if (pm10 >= 50) {
      desc.push('😐 미세먼지 보통 - 마스크 권장');
    }

    // 자외선 기반 추천
    if (uvIndex >= 8) {
      desc.push('🕶️ 자외선 매우 높음 - 선글라스/모자 필수');
    } else if (uvIndex >= 6) {
      desc.push('🧢 자외선 높음 - 선글라스 권장');
    }

    return desc;
  };

  // 이미지 생성 (Pollinations.ai 무료 API 사용)
  const generateImage = async () => {
    if (!selectedRegion?.climate_data) {
      setError('지역을 먼저 선택해주세요');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const climate = selectedRegion.climate_data;
      const { prompt, season } = generateFashionPrompt(
        climate, gender, age, style
      );

      // 옷차림 설명 생성
      const description = generateDescription(climate, season);
      setOutfitDescription(description);

      // Pollinations.ai 무료 이미지 생성 API (더 간단한 프롬프트)
      const simplePrompt = `fashion photo, ${gender === 'male' ? 'man' : 'woman'}, ${style} style, ${season} outfit, full body, white background`;
      const encodedPrompt = encodeURIComponent(simplePrompt);
      const seed = Math.floor(Math.random() * 100000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=768&seed=${seed}&nologo=true`;

      console.log('OOTD 이미지 URL:', imageUrl);

      // 타임아웃 설정 (30초)
      const timeoutId = setTimeout(() => {
        setError('이미지 생성 시간이 초과되었습니다. 다시 시도해주세요.');
        setIsGenerating(false);
      }, 30000);

      // 이미지 로드 확인
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        clearTimeout(timeoutId);
        setGeneratedImage(imageUrl);
        setIsGenerating(false);
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        // 재시도 URL 생성
        const retryUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=768&seed=${seed + 1}&nologo=true`;
        const retryImg = new Image();
        retryImg.crossOrigin = 'anonymous';
        retryImg.onload = () => {
          setGeneratedImage(retryUrl);
          setIsGenerating(false);
        };
        retryImg.onerror = () => {
          setError('이미지 생성에 실패했습니다. 다시 시도해주세요.');
          setIsGenerating(false);
        };
        retryImg.src = retryUrl;
      };
      img.src = imageUrl;

    } catch (err) {
      console.error('OOTD 생성 오류:', err);
      setError('생성 중 오류가 발생했습니다.');
      setIsGenerating(false);
    }
  };

  if (!selectedRegion) return null;

  return (
    <div className="ootd-generator">
      {/* 토글 버튼 */}
      <button
        className={`ootd-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="toggle-icon">👔</span>
        <span>AI 오늘의 옷차림</span>
      </button>

      {/* 패널 내용 */}
      {isOpen && (
        <div className="ootd-panel-content">
          <div className="ootd-header">
            <h3>👗 AI OOTD 생성기</h3>
            <p>{selectedRegion.region} 날씨에 맞는 옷차림 추천</p>
          </div>

          {/* 옵션 선택 */}
          <div className="ootd-options">
            {/* 성별 선택 */}
            <div className="option-group">
              <label>성별</label>
              <div className="option-buttons">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`option-btn ${gender === opt.value ? 'selected' : ''}`}
                    onClick={() => setGender(opt.value)}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 연령대 선택 */}
            <div className="option-group">
              <label>연령대</label>
              <div className="option-buttons age-buttons">
                {AGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`option-btn small ${age === opt.value ? 'selected' : ''}`}
                    onClick={() => setAge(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 스타일 선택 */}
            <div className="option-group">
              <label>스타일</label>
              <div className="option-buttons">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`option-btn small ${style === opt.value ? 'selected' : ''}`}
                    onClick={() => setStyle(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 현재 날씨 정보 */}
          <div className="weather-summary">
            <span>🌡️ {selectedRegion.climate_data?.apparent_temperature || selectedRegion.climate_data?.temperature}°C</span>
            <span>💧 {selectedRegion.climate_data?.humidity}%</span>
            <span>🌫️ PM10: {selectedRegion.climate_data?.pm10}</span>
            <span>☀️ UV: {selectedRegion.climate_data?.uv_index}</span>
          </div>

          {/* 생성 버튼 */}
          <button
            className="generate-btn"
            onClick={generateImage}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading-spinner"></span>
                AI가 옷차림 생성 중... (10-20초)
              </>
            ) : (
              '✨ AI 옷차림 생성하기'
            )}
          </button>

          {/* 에러 표시 */}
          {error && (
            <div className="ootd-error">
              {error}
            </div>
          )}

          {/* 생성된 이미지 */}
          {generatedImage && (
            <div className="ootd-result">
              <div className="ootd-image-container">
                <img src={generatedImage} alt="AI 생성 옷차림" />
              </div>

              {/* 옷차림 설명 */}
              {outfitDescription.length > 0 && (
                <div className="outfit-tips">
                  <h4>오늘의 옷차림 팁</h4>
                  <ul>
                    {outfitDescription.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 재생성 버튼 */}
              <button
                className="regenerate-btn"
                onClick={generateImage}
                disabled={isGenerating}
              >
                🔄 다른 스타일 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OotdGenerator;
