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

  // 상세 옷차림 추천 데이터
  const CLOTHING_RECOMMENDATIONS = {
    // 35도 이상 - 극심한 폭염
    extremeHeat: {
      title: '🔥 극심한 폭염 (35°C 이상)',
      main: '최대한 시원하고 통풍이 잘 되는 옷차림이 필수입니다!',
      tops: ['민소매 탱크탑', '린넨 반팔 셔츠', '크롭탑', '얇은 면 티셔츠'],
      bottoms: ['반바지', '린넨 와이드 팬츠', '얇은 면 치마', '쇼츠'],
      shoes: ['샌들', '슬리퍼', '통풍 좋은 스니커즈', '에스파드리유'],
      accessories: ['양산', '밀짚모자', '휴대용 선풍기', '쿨링 타월'],
      colors: '흰색, 베이지, 연한 파스텔톤 등 밝은 색상 권장',
      tips: ['야외 활동은 오전 10시~오후 4시 피하기', '물을 자주 마시고 그늘에서 휴식', '땀 흡수가 빠른 기능성 속옷 추천']
    },
    // 30-34도 - 폭염
    veryHot: {
      title: '☀️ 무더운 날씨 (30~34°C)',
      main: '가볍고 시원한 여름 옷차림으로 더위를 이겨내세요!',
      tops: ['반팔 티셔츠', '린넨 블라우스', '오버핏 반팔', '시스루 가디건'],
      bottoms: ['면 반바지', '와이드 팬츠', '린넨 슬랙스', '플리츠 스커트'],
      shoes: ['가벼운 샌들', '메쉬 운동화', '뮬', '에어 스니커즈'],
      accessories: ['선캡', '선글라스', '부채', '손선풍기'],
      colors: '화이트, 스카이블루, 민트 등 청량한 색상',
      tips: ['자외선 차단제 필수', '통풍이 잘 되는 천연 소재 추천', '냉감 소재 의류 활용']
    },
    // 27-29도 - 더움
    hot: {
      title: '🌡️ 더운 날씨 (27~29°C)',
      main: '가벼운 여름 옷차림이 좋아요. 실내 냉방에 대비해 얇은 겉옷도!',
      tops: ['반팔 셔츠', '얇은 블라우스', '면 티셔츠', '캡소매 탑'],
      bottoms: ['면바지', '치노팬츠', '미디 스커트', '쿨링 팬츠'],
      shoes: ['로퍼', '캔버스 스니커즈', '스트랩 샌들', '슬립온'],
      accessories: ['얇은 가디건(실내용)', '선글라스', '모자'],
      colors: '밝은 톤의 여름 컬러, 시원한 블루 계열',
      tips: ['실내 에어컨 대비 얇은 겉옷 챙기기', '땀 얼룩이 안 보이는 패턴 옷 추천']
    },
    // 23-26도 - 따뜻함
    warm: {
      title: '🌤️ 따뜻한 날씨 (23~26°C)',
      main: '외출하기 가장 좋은 날씨! 가벼운 레이어드를 추천해요.',
      tops: ['얇은 긴팔 셔츠', '7부 소매 블라우스', '얇은 니트', '면 셔츠'],
      bottoms: ['청바지', '슬랙스', '롱스커트', '면바지'],
      shoes: ['운동화', '로퍼', '플랫슈즈', '단화'],
      accessories: ['가벼운 스카프', '선글라스', '크로스백'],
      colors: '어떤 색상이든 OK! 봄/가을 무드 컬러',
      tips: ['낮과 밤 기온차 대비 얇은 겉옷 준비', '활동하기 편한 옷차림 추천']
    },
    // 17-22도 - 선선함
    mild: {
      title: '🍃 선선한 날씨 (17~22°C)',
      main: '아침저녁으로 쌀쌀할 수 있어요. 가디건이나 자켓 필수!',
      tops: ['얇은 니트', '셔츠 + 가디건', '맨투맨', '긴팔 티셔츠'],
      bottoms: ['청바지', '면바지', '롱스커트', '슬랙스'],
      shoes: ['스니커즈', '로퍼', '앵클부츠', '단화'],
      accessories: ['가벼운 자켓', '얇은 가디건', '스카프'],
      colors: '베이지, 카키, 머스타드 등 가을 컬러',
      tips: ['일교차가 크니 레이어드 필수', '바람막이 자켓 챙기면 좋아요']
    },
    // 12-16도 - 쌀쌀함
    cool: {
      title: '🍂 쌀쌀한 날씨 (12~16°C)',
      main: '제법 쌀쌀해요! 자켓이나 가벼운 코트가 필요해요.',
      tops: ['니트', '맨투맨', '후드티', '셔츠 레이어드'],
      bottoms: ['기모 청바지', '코듀로이 팬츠', '울 슬랙스', '롱스커트+타이츠'],
      shoes: ['하이탑 스니커즈', '첼시부츠', '로퍼', '앵클부츠'],
      accessories: ['트렌치코트', '자켓', '가벼운 목도리'],
      colors: '버건디, 네이비, 브라운 등 가을 컬러',
      tips: ['바람이 불면 체감온도가 더 낮아요', '히트텍 같은 발열 내의 추천']
    },
    // 5-11도 - 추움
    cold: {
      title: '❄️ 추운 날씨 (5~11°C)',
      main: '따뜻한 외투와 레이어드 필수! 방한용품도 챙기세요.',
      tops: ['두꺼운 니트', '기모 맨투맨', '터틀넥', '플리스'],
      bottoms: ['기모바지', '울 팬츠', '코듀로이', '기모 레깅스'],
      shoes: ['부츠', '털 운동화', '어그부츠', '방한화'],
      accessories: ['울 코트', '패딩 자켓', '목도리', '장갑'],
      colors: '블랙, 그레이, 네이비, 카멜 등 겨울 컬러',
      tips: ['모자 쓰면 체감온도 2~3도 상승', '목을 따뜻하게 하면 전신이 따뜻해져요']
    },
    // 0-4도 - 매우 추움
    veryCold: {
      title: '🥶 매우 추운 날씨 (0~4°C)',
      main: '완전 방한 모드! 패딩, 목도리, 장갑 모두 필수예요.',
      tops: ['두꺼운 니트', '플리스', '기모 후드티', '히트텍+셔츠'],
      bottoms: ['기모 청바지', '패딩 팬츠', '울 슬랙스', '히트텍 레깅스'],
      shoes: ['방한부츠', '털 안감 부츠', '어그부츠', '패딩 슈즈'],
      accessories: ['롱패딩', '숏패딩', '목도리', '비니', '장갑', '귀마개'],
      colors: '블랙, 차콜, 다크 컬러 + 포인트 머플러',
      tips: ['히트텍/발열내의 필수', '핫팩 챙기세요', '장시간 외출 시 방한 철저히']
    },
    // 영하 - 한파
    freezing: {
      title: '🧊 한파 (0°C 미만)',
      main: '한파 경보! 최대한 따뜻하게 입고 외출을 자제하세요.',
      tops: ['두꺼운 히트텍', '터틀넥 니트', '플리스 안감 셔츠', '기모 맨투맨'],
      bottoms: ['패딩 팬츠', '기모 청바지', '이중 레깅스', '울 슬랙스'],
      shoes: ['털 부츠', '방한화', '패딩 슈즈', '방수 부츠'],
      accessories: ['롱패딩', '두꺼운 목도리', '기모 장갑', '비니', '귀마개', '핫팩'],
      colors: '따뜻해 보이는 브라운, 버건디 또는 블랙',
      tips: ['동상 주의! 손발을 따뜻하게', '마스크가 방한에도 도움', '가급적 외출 자제', '차가운 바람에 피부 보호']
    }
  };

  // 옷차림 설명 생성
  const generateDescription = (climate, season) => {
    const temp = climate.apparent_temperature || climate.temperature || 25;
    const humidity = climate.humidity || 50;
    const pm10 = climate.pm10 || 30;
    const pm25 = climate.pm25 || 15;
    const uvIndex = climate.uv_index || 5;
    const windSpeed = climate.wind_speed || 0;

    let desc = [];
    let recommendation = null;

    // 온도 기반 상세 추천
    if (temp >= 35) {
      recommendation = CLOTHING_RECOMMENDATIONS.extremeHeat;
    } else if (temp >= 30) {
      recommendation = CLOTHING_RECOMMENDATIONS.veryHot;
    } else if (temp >= 27) {
      recommendation = CLOTHING_RECOMMENDATIONS.hot;
    } else if (temp >= 23) {
      recommendation = CLOTHING_RECOMMENDATIONS.warm;
    } else if (temp >= 17) {
      recommendation = CLOTHING_RECOMMENDATIONS.mild;
    } else if (temp >= 12) {
      recommendation = CLOTHING_RECOMMENDATIONS.cool;
    } else if (temp >= 5) {
      recommendation = CLOTHING_RECOMMENDATIONS.cold;
    } else if (temp >= 0) {
      recommendation = CLOTHING_RECOMMENDATIONS.veryCold;
    } else {
      recommendation = CLOTHING_RECOMMENDATIONS.freezing;
    }

    // 기본 추천 추가
    desc.push(recommendation.title);
    desc.push(`💡 ${recommendation.main}`);
    desc.push(`👕 상의: ${recommendation.tops.slice(0, 3).join(', ')}`);
    desc.push(`👖 하의: ${recommendation.bottoms.slice(0, 3).join(', ')}`);
    desc.push(`👟 신발: ${recommendation.shoes.slice(0, 3).join(', ')}`);
    desc.push(`🎒 아이템: ${recommendation.accessories.slice(0, 3).join(', ')}`);
    desc.push(`🎨 추천 컬러: ${recommendation.colors}`);

    // 습도 기반 추가 추천
    if (humidity >= 80) {
      desc.push('💧 습도 매우 높음 - 땀 흡수 빠른 기능성 소재, 린넨/면 필수! 여분의 옷 챙기세요.');
    } else if (humidity >= 70) {
      desc.push('💧 습도 높음 - 통기성 좋은 천연 소재(면, 린넨) 추천');
    } else if (humidity <= 30) {
      desc.push('🏜️ 건조함 - 보습제 바르고 정전기 방지 섬유유연제 사용 추천');
    }

    // 바람 기반 추가 추천
    if (windSpeed >= 10) {
      desc.push('💨 바람 강함 - 바람막이 자켓 필수! 모자는 날아갈 수 있어요.');
    } else if (windSpeed >= 5) {
      desc.push('🌬️ 바람 있음 - 가벼운 바람막이나 자켓 권장');
    }

    // 미세먼지 기반 추가 추천
    if (pm10 >= 150 || pm25 >= 75) {
      desc.push('😷 미세먼지 매우 나쁨 - KF94 마스크 필수! 가급적 외출 자제하세요.');
    } else if (pm10 >= 80 || pm25 >= 35) {
      desc.push('😷 미세먼지 나쁨 - KF94 마스크 착용, 외출 후 옷 세탁 권장');
    } else if (pm10 >= 50 || pm25 >= 25) {
      desc.push('😐 미세먼지 보통 - 민감하신 분은 마스크 권장');
    }

    // 자외선 기반 추가 추천
    if (uvIndex >= 11) {
      desc.push('🕶️ 자외선 위험 - 선크림 SPF50+, 선글라스, 양산, 긴팔 필수!');
    } else if (uvIndex >= 8) {
      desc.push('🕶️ 자외선 매우 높음 - 선크림, 선글라스, 모자 필수! 한낮 외출 자제');
    } else if (uvIndex >= 6) {
      desc.push('🧢 자외선 높음 - 선크림 바르고 선글라스/모자 권장');
    } else if (uvIndex >= 3) {
      desc.push('☀️ 자외선 보통 - 선크림 권장');
    }

    // 랜덤 팁 추가
    if (recommendation.tips && recommendation.tips.length > 0) {
      const randomTip = recommendation.tips[Math.floor(Math.random() * recommendation.tips.length)];
      desc.push(`💡 TIP: ${randomTip}`);
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
