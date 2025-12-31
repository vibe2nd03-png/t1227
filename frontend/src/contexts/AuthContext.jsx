import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { createLogger } from '../utils/logger';

const log = createLogger('Auth');
const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // 타임아웃 헬퍼 함수
  const withTimeout = (promise, ms = 10000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('요청 시간 초과')), ms)
      )
    ]);
  };

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
        log.error('프로필 조회 오류', error);
      }
      setProfile(data);
    } catch (error) {
      log.error('프로필 조회 실패', error);
    }
  };

  // 이메일+비밀번호 회원가입 (이메일 인증 없이 즉시 가입)
  const signUpWithEmail = async (email, password) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // 이메일 인증 없이 즉시 세션 생성
          data: {
            email_confirmed: true,
          },
        },
      });

      if (error) throw error;

      // 이미 가입된 이메일인 경우
      if (data?.user?.identities?.length === 0) {
        return { success: false, error: '이미 가입된 이메일입니다. 로그인해주세요.' };
      }

      // 세션이 있으면 즉시 로그인 성공
      if (data.session) {
        return { success: true, needsConfirmation: false };
      }

      // 세션이 없으면 자동 로그인 시도
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // 로그인 실패해도 회원가입은 성공
        return { success: true, needsConfirmation: false };
      }

      return { success: true, needsConfirmation: false };
    } catch (error) {
      setAuthError(error.message);
      log.error('회원가입 오류', error);
      return { success: false, error: error.message };
    }
  };

  // 이메일+비밀번호 로그인
  const signInWithEmail = async (email, password) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      setAuthError(error.message);
      log.error('로그인 오류', error);
      return { success: false, error: error.message };
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
      log.error('OTP 발송 오류', error);
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
      log.error('OTP 인증 오류', error);
      return { success: false, error: error.message };
    }
  };

  // 로그아웃
  const signOut = async () => {
    log.info('로그아웃 시도');
    try {
      const { error } = await withTimeout(supabase.auth.signOut());
      if (error) throw error;
      setUser(null);
      setProfile(null);
      log.info('로그아웃 성공');
    } catch (error) {
      log.error('로그아웃 오류', error);
      // 타임아웃이어도 로컬 상태는 초기화
      setUser(null);
      setProfile(null);
    }
  };

  // 프로필 업데이트 (없으면 생성)
  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    log.info('프로필 업데이트 시도', { userId: user.id, updates });

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            ...updates,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
      );

      log.info('프로필 업데이트 응답', { data, error });

      if (error) throw error;
      setProfile(data);
      return { success: true, data };
    } catch (error) {
      log.error('프로필 업데이트 오류', error);
      return { success: false, error: error.message };
    }
  };

  // 즐겨찾기 지역 추가
  const addFavoriteRegion = async (region) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    log.info('즐겨찾기 추가 시도', { region, userId: user.id });

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_favorite_regions')
          .insert({ user_id: user.id, region })
          .select()
      );

      log.info('즐겨찾기 추가 응답', { data, error });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      log.error('즐겨찾기 추가 오류', error);
      return { success: false, error: error.message };
    }
  };

  // 즐겨찾기 지역 삭제
  const removeFavoriteRegion = async (region) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    log.info('즐겨찾기 삭제 시도', { region, userId: user.id });

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_favorite_regions')
          .delete()
          .eq('user_id', user.id)
          .eq('region', region)
          .select()
      );

      log.info('즐겨찾기 삭제 응답', { data, error });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      log.error('즐겨찾기 삭제 오류', error);
      return { success: false, error: error.message };
    }
  };

  // 즐겨찾기 목록 조회
  const getFavoriteRegions = async () => {
    if (!user) return [];

    log.info('즐겨찾기 조회 시도', { userId: user.id });

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_favorite_regions')
          .select('region')
          .eq('user_id', user.id)
      );

      log.info('즐겨찾기 조회 응답', { data, error });

      if (error) throw error;
      return data?.map((r) => r.region) || [];
    } catch (error) {
      log.error('즐겨찾기 조회 오류', error);
      return [];
    }
  };

  // 내 제보 목록 조회
  const getMyReports = async () => {
    if (!user) return [];

    log.info('내 제보 조회 시도', { userId: user.id });

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      );

      log.info('내 제보 조회 응답', { count: data?.length, error });

      if (error) throw error;
      return data || [];
    } catch (error) {
      log.error('내 제보 조회 오류', error);
      return [];
    }
  };

  // 제보 삭제
  const deleteMyReport = async (reportId) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    log.info('제보 삭제 시도', { reportId, userId: user.id });

    try {
      const { error } = await withTimeout(
        supabase
          .from('user_reports')
          .delete()
          .eq('id', reportId)
          .eq('user_id', user.id)
      );

      if (error) throw error;
      log.info('제보 삭제 성공', { reportId });
      return { success: true };
    } catch (error) {
      log.error('제보 삭제 오류', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    profile,
    loading,
    authError,
    signUpWithEmail,
    signInWithEmail,
    sendPhoneOtp,
    verifyPhoneOtp,
    signOut,
    updateProfile,
    addFavoriteRegion,
    removeFavoriteRegion,
    getFavoriteRegions,
    getMyReports,
    deleteMyReport,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
