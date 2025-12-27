import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // 초기 세션 확인
  useEffect(() => {
    // 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 프로필 조회
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('프로필 조회 오류:', error);
      }
      setProfile(data);
    } catch (error) {
      console.error('프로필 조회 실패:', error);
    }
  };

  // Google 로그인
  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      setAuthError(error.message);
      console.error('Google 로그인 오류:', error);
    }
  };

  // 전화번호 OTP 발송
  const sendPhoneOtp = async (phone) => {
    setAuthError(null);
    try {
      // 한국 전화번호 포맷팅 (+82)
      const formattedPhone = phone.startsWith('+82')
        ? phone
        : `+82${phone.replace(/^0/, '')}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      console.error('OTP 발송 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 전화번호 OTP 인증
  const verifyPhoneOtp = async (phone, token) => {
    setAuthError(null);
    try {
      const formattedPhone = phone.startsWith('+82')
        ? phone
        : `+82${phone.replace(/^0/, '')}`;

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token,
        type: 'sms',
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      setAuthError(error.message);
      console.error('OTP 인증 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 이메일 로그인 (대안)
  const signInWithEmail = async (email) => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      console.error('이메일 로그인 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 프로필 업데이트
  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return { success: true, data };
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 즐겨찾기 지역 추가
  const addFavoriteRegion = async (region) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    try {
      const { error } = await supabase
        .from('user_favorite_regions')
        .insert({ user_id: user.id, region });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('즐겨찾기 추가 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 즐겨찾기 지역 삭제
  const removeFavoriteRegion = async (region) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    try {
      const { error } = await supabase
        .from('user_favorite_regions')
        .delete()
        .eq('user_id', user.id)
        .eq('region', region);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('즐겨찾기 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 즐겨찾기 목록 조회
  const getFavoriteRegions = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('user_favorite_regions')
        .select('region')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map((r) => r.region);
    } catch (error) {
      console.error('즐겨찾기 조회 오류:', error);
      return [];
    }
  };

  const value = {
    user,
    profile,
    loading,
    authError,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    signInWithEmail,
    signOut,
    updateProfile,
    addFavoriteRegion,
    removeFavoriteRegion,
    getFavoriteRegions,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
