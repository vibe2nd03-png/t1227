import React, { useState, useEffect, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../supabase';

// 떠다니는 제보를 위한 커스텀 아이콘 생성
const createFloatingIcon = (emoji, comment) => {
  return L.divIcon({
    className: 'floating-report-marker',
    html: `
      <div class="floating-bubble">
        <span class="bubble-emoji">${emoji}</span>
        <span class="bubble-text">${comment.length > 15 ? comment.slice(0, 15) + '...' : comment}</span>
      </div>
    `,
    iconSize: [120, 50],
    iconAnchor: [60, 50],
  });
};

function FloatingReports({ visible }) {
  const [reports, setReports] = useState([]);
  const [animationOffsets, setAnimationOffsets] = useState({});
  const map = useMap();
  const animationRef = useRef(null);

  // 제보 데이터 로드
  useEffect(() => {
    if (visible) {
      loadRecentReports();
      // 30초마다 새로고침
      const interval = setInterval(loadRecentReports, 30000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  // 부드러운 떠다니는 애니메이션
  useEffect(() => {
    if (!visible || reports.length === 0) return;

    const animate = () => {
      const time = Date.now() / 1000;
      const newOffsets = {};

      reports.forEach((report, idx) => {
        // 각 마커마다 다른 주기와 진폭으로 움직임
        const offsetX = Math.sin(time * 0.5 + idx * 1.5) * 0.0003;
        const offsetY = Math.cos(time * 0.7 + idx * 2) * 0.0002;
        newOffsets[report.id] = { x: offsetX, y: offsetY };
      });

      setAnimationOffsets(newOffsets);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visible, reports]);

  const loadRecentReports = async () => {
    console.log('FloatingReports: 제보 로드 시작');
    try {
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const url = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports?created_at=gte.${since}&order=created_at.desc&limit=30`;

      console.log('FloatingReports: fetch URL:', url);
      const response = await fetch(url, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q'
        }
      });

      console.log('FloatingReports: 응답 상태:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('FloatingReports: 받은 데이터:', data.length, '개', data);

        // 같은 지역의 중복 제보는 최신 것만 표시
        const uniqueByLocation = data.reduce((acc, report) => {
          const key = `${report.lat.toFixed(3)}-${report.lng.toFixed(3)}`;
          if (!acc[key]) {
            acc[key] = report;
          }
          return acc;
        }, {});

        const uniqueReports = Object.values(uniqueByLocation);
        console.log('FloatingReports: 표시할 제보:', uniqueReports.length, '개');
        setReports(uniqueReports);
      } else {
        console.error('FloatingReports: 응답 실패:', response.status);
      }
    } catch (error) {
      console.error('제보 마커 로드 실패:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMins = Math.floor((now - date) / 60000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}시간 전`;
  };

  if (!visible) return null;

  return (
    <>
      {reports.map((report) => {
        const offset = animationOffsets[report.id] || { x: 0, y: 0 };
        // 약간의 랜덤 오프셋 추가 (같은 위치 제보가 겹치지 않도록)
        const jitter = {
          lat: (Math.sin(report.id * 12.34) * 0.005),
          lng: (Math.cos(report.id * 56.78) * 0.008),
        };

        return (
          <Marker
            key={report.id}
            position={[
              parseFloat(report.lat) + offset.y + jitter.lat,
              parseFloat(report.lng) + offset.x + jitter.lng,
            ]}
            icon={createFloatingIcon(report.emoji, report.comment || report.feeling_label)}
          >
            <Popup>
              <div className="report-popup">
                <div className="popup-header">
                  <span className="popup-emoji">{report.emoji}</span>
                  <span className="popup-region">{report.region}</span>
                </div>
                <p className="popup-comment">{report.comment || report.feeling_label}</p>
                <div className="popup-meta">
                  <span className="popup-time">{formatTimeAgo(report.created_at)}</span>
                  {report.temp_adjustment !== 0 && (
                    <span className="popup-temp-adj">
                      체감 {report.temp_adjustment > 0 ? '+' : ''}{report.temp_adjustment}°C
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default FloatingReports;
