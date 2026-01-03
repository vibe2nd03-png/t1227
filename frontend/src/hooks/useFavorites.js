import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'favorite_regions';
const MAX_FAVORITES = 5;

/**
 * 즐겨찾기 지역 관리 훅
 * - 비로그인: localStorage 저장
 * - 로그인: Supabase 동기화
 */
export function useFavorites() {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    loadFavorites();
  }, [isAuthenticated, user]);

  // 즐겨찾기 로드
  const loadFavorites = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && user) {
        // Supabase에서 로드
        const { supabase } = await import('../supabase');
        const { data, error } = await supabase
          .from('user_favorites')
          .select('region')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const regions = data.map(d => d.region);
          setFavorites(regions);
          // localStorage도 동기화
          localStorage.setItem(STORAGE_KEY, JSON.stringify(regions));
        } else {
          // Supabase 실패 시 localStorage 사용
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

  // 즐겨찾기 추가
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
        const { supabase } = await import('../supabase');
        await supabase.from('user_favorites').insert({
          user_id: user.id,
          region: region,
        });
      } catch (error) {
        console.error('Supabase 저장 실패:', error);
      }
    }

    return true;
  }, [favorites, isAuthenticated, user]);

  // 즐겨찾기 제거
  const removeFavorite = useCallback(async (region) => {
    const newFavorites = favorites.filter(r => r !== region);
    setFavorites(newFavorites);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));

    // 로그인 상태면 Supabase에서도 삭제
    if (isAuthenticated && user) {
      try {
        const { supabase } = await import('../supabase');
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('region', region);
      } catch (error) {
        console.error('Supabase 삭제 실패:', error);
      }
    }

    return true;
  }, [favorites, isAuthenticated, user]);

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

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    maxFavorites: MAX_FAVORITES,
  };
}

export default useFavorites;
