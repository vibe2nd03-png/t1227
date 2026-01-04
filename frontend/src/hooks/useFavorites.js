import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'favorite_regions';
const MAX_FAVORITES = 5;
const SUPABASE_URL = 'https://pcdmrofcfqtyywtzyrfo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q';

/**
 * 즐겨찾기 지역 관리 훅
 * - 비로그인: localStorage 저장
 * - 로그인: Supabase 동기화 (직접 fetch 사용)
 */
export function useFavorites() {
  const { user, isAuthenticated, accessToken } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // 토큰 가져오기
  const getToken = useCallback(() => {
    if (accessToken) return accessToken;
    try {
      const stored = localStorage.getItem('supabase_session');
      if (stored) {
        const session = JSON.parse(stored);
        return session?.access_token;
      }
    } catch (e) {
      console.error('토큰 로드 실패:', e);
    }
    return null;
  }, [accessToken]);

  // 초기 로드
  useEffect(() => {
    loadFavorites();
  }, [isAuthenticated, user]);

  // 즐겨찾기 로드 (직접 fetch)
  const loadFavorites = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && user) {
        const token = getToken();
        const url = `${SUPABASE_URL}/rest/v1/user_favorite_regions?user_id=eq.${user.id}&select=region&order=created_at.desc`;

        const response = await fetch(url, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const regions = data?.map(d => d.region) || [];
          console.log('즐겨찾기 로드 성공:', regions.length, '개');
          setFavorites(regions);
          // localStorage도 동기화
          localStorage.setItem(STORAGE_KEY, JSON.stringify(regions));
        } else {
          console.error('즐겨찾기 로드 실패:', response.status);
          loadFromLocalStorage();
        }
      } else {
        // 비로그인 - localStorage 사용
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('즐겨찾기 로드 실패:', error);
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  // localStorage에서 로드
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error('localStorage 로드 실패:', e);
    }
  };

  // 즐겨찾기 추가 (직접 fetch)
  const addFavorite = useCallback(async (region) => {
    if (favorites.includes(region)) return false;
    if (favorites.length >= MAX_FAVORITES) {
      alert(`즐겨찾기는 최대 ${MAX_FAVORITES}개까지 가능합니다.`);
      return false;
    }

    const newFavorites = [region, ...favorites];
    setFavorites(newFavorites);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));

    // 로그인 상태면 Supabase에도 저장
    if (isAuthenticated && user) {
      try {
        const token = getToken();
        const response = await fetch(`${SUPABASE_URL}/rest/v1/user_favorite_regions`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ user_id: user.id, region })
        });

        if (!response.ok) {
          console.error('Supabase 저장 실패:', response.status);
        }
      } catch (error) {
        console.error('Supabase 저장 실패:', error);
      }
    }

    return true;
  }, [favorites, isAuthenticated, user, getToken]);

  // 즐겨찾기 제거 (직접 fetch)
  const removeFavorite = useCallback(async (region) => {
    const newFavorites = favorites.filter(r => r !== region);
    setFavorites(newFavorites);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));

    // 로그인 상태면 Supabase에서도 삭제
    if (isAuthenticated && user) {
      try {
        const token = getToken();
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/user_favorite_regions?user_id=eq.${user.id}&region=eq.${encodeURIComponent(region)}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`
            }
          }
        );

        if (!response.ok) {
          console.error('Supabase 삭제 실패:', response.status);
        }
      } catch (error) {
        console.error('Supabase 삭제 실패:', error);
      }
    }

    return true;
  }, [favorites, isAuthenticated, user, getToken]);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async (region) => {
    if (favorites.includes(region)) {
      return removeFavorite(region);
    } else {
      return addFavorite(region);
    }
  }, [favorites, addFavorite, removeFavorite]);

  // 즐겨찾기 여부 확인
  const isFavorite = useCallback((region) => {
    return favorites.includes(region);
  }, [favorites]);

  // 수동 새로고침
  const refresh = useCallback(() => {
    loadFavorites();
  }, [isAuthenticated, user]);

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    refresh,
    maxFavorites: MAX_FAVORITES,
  };
}

export default useFavorites;
