import React from 'react';

export default function SkeletonCard(){
  return (
    <div style={{
      background: '#f3f4f6',
      borderRadius: 12,
      padding: 12,
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      animation: 'pulse 1.5s ease-in-out infinite'
    }}>
      <div style={{
        width: '100%',
        paddingTop: '100%',
        background: '#e5e7eb',
        borderRadius: 8
      }}/>
      <div style={{height: 16, background: '#e5e7eb', borderRadius: 4}}/>
      <div style={{height: 16, background: '#e5e7eb', borderRadius: 4, width: '60%'}}/>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}