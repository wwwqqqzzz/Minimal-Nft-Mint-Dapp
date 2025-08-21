import React from 'react';

export default function SkeletonCard(){
  return (
    <div className="skeleton-card">
      <div className="skeleton-image"/>
      <div className="skeleton-text-line"/>
      <div className="skeleton-text-line skeleton-text-short"/>
    </div>
  );
}