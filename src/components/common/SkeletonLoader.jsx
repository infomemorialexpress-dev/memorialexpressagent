import React from 'react';

/**
 * Basic Shimmer Line / Block
 */
export function SkeletonBlock({ width = '100%', height = '16px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        flexShrink: 0,
        ...style
      }}
    />
  );
}

/**
 * Skeleton for Funeral Home Cards in Step 1 (LocationSearch)
 */
export function FuneralHomeCardSkeleton({ count = 4 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: '20px',
        marginTop: '18px'
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton-box"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1.5px solid #e8eef5'
          }}
        >
          {/* Top Home Image Box */}
          <SkeletonBlock height="150px" borderRadius="10px" />

          {/* Title & Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <SkeletonBlock width="65%" height="20px" borderRadius="4px" />
            <SkeletonBlock width="25%" height="16px" borderRadius="12px" />
          </div>

          {/* Address Line 1 */}
          <SkeletonBlock width="80%" height="13px" />
          {/* Address Line 2 */}
          <SkeletonBlock width="50%" height="13px" />

          {/* Chapel tags */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <SkeletonBlock width="60px" height="22px" borderRadius="6px" />
            <SkeletonBlock width="75px" height="22px" borderRadius="6px" />
          </div>

          {/* Action button */}
          <div style={{ marginTop: '10px' }}>
            <SkeletonBlock height="38px" borderRadius="8px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Funeral Service Options in Step 2 (SelectService)
 */
export function ServiceCardSkeleton({ count = 6 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '14px',
        marginBottom: '36px'
      }}
      className="choices-grid"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton-box"
          style={{
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '82px',
            border: '1.5px solid #e5edf5'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <SkeletonBlock width="55%" height="18px" borderRadius="4px" />
            <SkeletonBlock width="18px" height="18px" borderRadius="50%" />
          </div>
          <SkeletonBlock width="85%" height="12px" borderRadius="4px" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Caskets & Merchandise Cards in Step 3 (ChooseCasket)
 */
export function CasketCardSkeleton({ count = 6 }) {
  return (
    <div className="catalog-grid" style={{ marginBottom: '36px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton-box"
          style={{
            padding: '16px 18px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1.5px solid #e5edf5',
            borderRadius: '16px',
            minHeight: '400px'
          }}
        >
          <div>
            {/* Casket Image Frame Shimmer */}
            <SkeletonBlock height="190px" borderRadius="10px" style={{ marginBottom: '14px' }} />

            {/* Title */}
            <SkeletonBlock width="75%" height="18px" borderRadius="4px" style={{ marginBottom: '10px' }} />

            {/* Spec bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              <SkeletonBlock width="90%" height="11px" />
              <SkeletonBlock width="80%" height="11px" />
              <SkeletonBlock width="60%" height="11px" />
            </div>
          </div>

          {/* Bottom Price & Badge Row */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <SkeletonBlock width="70px" height="22px" borderRadius="4px" />
              <SkeletonBlock width="80px" height="20px" borderRadius="6px" />
            </div>
            {/* Zoom button */}
            <div style={{ marginTop: '10px' }}>
              <SkeletonBlock height="32px" borderRadius="6px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Add-ons List Rows in Step 4 (AddonsOptions)
 */
export function AddonRowSkeleton({ count = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '18px 0' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton-box"
          style={{
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #e8eef5',
            borderRadius: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '70%' }}>
            <SkeletonBlock width="20px" height="20px" borderRadius="4px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <SkeletonBlock width="50%" height="15px" borderRadius="4px" />
              <SkeletonBlock width="80%" height="11px" borderRadius="4px" />
            </div>
          </div>
          <SkeletonBlock width="65px" height="18px" borderRadius="4px" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Official Quote Summary / FSA in Step 5 (QuoteSummary)
 */
export function QuoteSummarySkeleton() {
  return (
    <div
      className="skeleton-box"
      style={{
        padding: 'clamp(20px, 4vw, 36px)',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        border: '1.5px solid #e2e8f0',
        maxWidth: '820px',
        margin: '0 auto 36px'
      }}
    >
      {/* Header Banner */}
      <div style={{ textAlign: 'center', paddingBottom: '24px', borderBottom: '2px solid #eef2f6' }}>
        <SkeletonBlock width="220px" height="26px" style={{ margin: '0 auto 10px' }} />
        <SkeletonBlock width="340px" height="14px" style={{ margin: '0 auto 6px' }} />
        <SkeletonBlock width="180px" height="13px" style={{ margin: '0 auto' }} />
      </div>

      {/* Section I Bar */}
      <div style={{ margin: '24px 0 16px' }}>
        <SkeletonBlock width="100%" height="38px" borderRadius="8px" />
      </div>

      {/* Itemized Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <SkeletonBlock width={`${45 + (i % 3) * 15}%`} height="13px" />
            <SkeletonBlock width="70px" height="13px" />
          </div>
        ))}
      </div>

      {/* Section II Bar */}
      <div style={{ margin: '28px 0 16px' }}>
        <SkeletonBlock width="100%" height="38px" borderRadius="8px" />
      </div>
      <div style={{ display: 'flex', gap: '20px', padding: '0 8px' }}>
        <SkeletonBlock width="120px" height="90px" borderRadius="8px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SkeletonBlock width="60%" height="18px" />
          <SkeletonBlock width="90%" height="12px" />
          <SkeletonBlock width="40%" height="12px" />
        </div>
      </div>

      {/* Totals Box */}
      <div style={{ marginTop: '32px', padding: '18px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <SkeletonBlock width="140px" height="16px" />
          <SkeletonBlock width="90px" height="16px" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <SkeletonBlock width="180px" height="24px" />
          <SkeletonBlock width="120px" height="24px" />
        </div>
      </div>
    </div>
  );
}
