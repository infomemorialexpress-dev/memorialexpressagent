import React, { useState, useEffect, useMemo } from 'react';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';
import { LEGACY_DATA } from '../../utils/legacyData.js';
import { FuneralHomeCardSkeleton } from '../common/SkeletonLoader.jsx';
import ShimmerImage from '../common/ShimmerImage.jsx';

export default function LocationSearch({ onContinue }) {
  const {
    lang,
    quote,
    selectHome,
    selectedFuneralHome,
    funeralHomes: contextHomes,
    db,
    addToast
  } = useQuote();

  const [searchFilter, setSearchFilter] = useState('City');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [allHomes, setAllHomes] = useState(() => {
    if (contextHomes && contextHomes.length > 0) return contextHomes;
    if (db?.homes && db.homes.length > 0) return db.homes;
    return LEGACY_DATA?.initialDb?.homes || [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [localSelectedId, setLocalSelectedId] = useState(
    selectedFuneralHome?._id || selectedFuneralHome?.id || quote.home || ''
  );

  // Fetch live funeral homes from backend API
  useEffect(() => {
    let isMounted = true;
    async function loadHomes() {
      setIsLoading(true);
      try {
        const res = await api.get('/funeral-homes');
        if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setAllHomes(res.data);
        } else if (isMounted && db?.homes?.length > 0) {
          setAllHomes(db.homes);
        }
      } catch (err) {
        console.warn('[LocationSearch] Failed to fetch /funeral-homes, using context/fallback:', err);
        if (isMounted) {
          const fallback = (contextHomes && contextHomes.length > 0) ? contextHomes : (db?.homes || []);
          if (fallback.length > 0) setAllHomes(fallback);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (!contextHomes || contextHomes.length === 0) {
      loadHomes();
    } else {
      setAllHomes(contextHomes);
    }

    return () => {
      isMounted = false;
    };
  }, [contextHomes]);

  // Keep local selection in sync with quote.home
  useEffect(() => {
    if (quote.home) {
      setLocalSelectedId(quote.home);
    }
  }, [quote.home]);

  // Handle Search Trigger
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      addToast(
        lang === 'es' ? 'Por favor ingrese un término de búsqueda.' : 'Please enter a search query.',
        'info'
      );
      setHasSearched(false);
      return;
    }
    setHasSearched(true);
  };

  // Filtered results based on criteria
  const filteredHomes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // If not explicitly searched yet, show all available homes
      return allHomes;
    }

    return allHomes.filter(home => {
      const chapels = home.chapels || home.locations || [];
      const homeCity = (home.city || '').toLowerCase();
      const homeZip = String(home.zipCode || home.zip || '').toLowerCase();
      const homeCounty = (home.county || '').toLowerCase();
      const homeName = (home.name || '').toLowerCase();
      const homeAddress = (home.streetAddress || home.address || '').toLowerCase();

      if (searchFilter === 'City') {
        const matchesMain = homeCity.includes(q);
        const matchesChapels = chapels.some(c => (c.city || '').toLowerCase().includes(q));
        return matchesMain || matchesChapels;
      }

      if (searchFilter === 'ZIP code') {
        const matchesMain = homeZip.includes(q);
        const matchesChapels = chapels.some(c => String(c.zip || '').toLowerCase().includes(q));
        return matchesMain || matchesChapels;
      }

      if (searchFilter === 'County' || searchFilter === 'Country') {
        const matchesMain = homeCounty.includes(q);
        const matchesChapels = chapels.some(c => (c.county || '').toLowerCase().includes(q));
        const generalMatch = ['los angeles', 'san bernardino', 'orange', 'san diego', 'riverside', 'california', 'ca', 'usa', 'united states']
          .some(term => term.includes(q) && (homeCounty.includes(term) || homeCity.includes(term)));
        return matchesMain || matchesChapels || generalMatch;
      }

      if (searchFilter === 'Within 15 or 20 km') {
        const matchesCity = homeCity.includes(q) || chapels.some(c => (c.city || '').toLowerCase().includes(q));
        const matchesZip = homeZip.includes(q) || chapels.some(c => String(c.zip || '').toLowerCase().includes(q));
        const matchesCounty = homeCounty.includes(q) || chapels.some(c => (c.county || '').toLowerCase().includes(q));
        const matchesAddr = homeAddress.includes(q);
        return matchesCity || matchesZip || matchesCounty || matchesAddr;
      }

      if (searchFilter === 'Funeral home name') {
        return homeName.includes(q);
      }

      return homeName.includes(q) || homeCity.includes(q);
    });
  }, [allHomes, searchQuery, searchFilter]);

  const handleSelectHome = (home) => {
    const homeId = home._id || home.id;
    setLocalSelectedId(homeId);
    selectHome(home);
  };

  const isContinueEnabled = Boolean(localSelectedId);

  return (
    <div>
      <h1 className="page-title">
        {lang === 'es' ? 'Seleccione la Funeraria' : 'Select a Funeral Home'}
      </h1>
      <p className="page-subtitle">
        {lang === 'es'
          ? 'Busque por ciudad, condado o código postal para encontrar funerarias asociadas.'
          : 'Search by city, ZIP, or county to view associated funeral homes and packages.'}
      </p>

      {/* Search Header Row */}
      <form
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '26px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Criteria Dropdown */}
        <div style={{ width: '220px', minWidth: '190px' }}>
          <select
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="form-select"
            style={{
              height: '46px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '14.5px',
              fontWeight: 500,
              color: '#253851',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <option value="City">City</option>
            <option value="ZIP code">ZIP code</option>
            <option value="County">County</option>
            <option value="Within 15 or 20 km">Within 15 or 20 km</option>
            <option value="Funeral home name">Funeral home name</option>
          </select>
        </div>

        {/* Text Input */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchFilter === 'City'
                ? 'e.g. Los Angeles, Ontario, Van Nuys...'
                : searchFilter === 'ZIP code'
                ? 'e.g. 90011, 91762, 90033...'
                : searchFilter === 'County'
                ? 'e.g. Los Angeles, San Diego, San Bernardino...'
                : searchFilter === 'Within 15 or 20 km'
                ? 'Enter city, ZIP code or radius area...'
                : 'e.g. Optima, Western, Felipe Bagues...'
            }
            className="form-input"
            style={{
              height: '46px',
              padding: '0 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '14.5px',
              width: '100%',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Search Button */}
        <div>
          <Button
            variant="primary"
            type="submit"
            style={{
              height: '46px',
              padding: '0 28px',
              fontWeight: 700,
              backgroundColor: '#183655',
              borderColor: '#183655',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Search
          </Button>
        </div>
      </form>

      {/* Loading Skeleton State when directory is loading */}
      {isLoading && allHomes.length === 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: '#183655', fontWeight: 650, fontSize: '13.5px' }}>
            <div className="app-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
            <span>{lang === 'es' ? 'Cargando directorio de funerarias...' : 'Loading funeral homes directory...'}</span>
          </div>
          <FuneralHomeCardSkeleton count={6} />
        </div>
      )}

      {/* Non-blocking Background Syncing Notice */}
      {isLoading && allHomes.length > 0 && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '20px',
            color: '#1d4ed8',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          <div
            className="app-spinner"
            style={{
              width: '13px',
              height: '13px',
              borderWidth: '2px',
              borderColor: '#93c5fd',
              borderTopColor: '#1d4ed8',
            }}
          />
          <span>{lang === 'es' ? 'Sincronizando directorio en vivo...' : 'Syncing live funeral homes directory...'}</span>
        </div>
      )}

      {/* Results Grid */}
      {filteredHomes.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '16px',
            marginBottom: '36px',
          }}
        >
          {filteredHomes.map((home) => {
            const homeId = home._id || home.id;
            const isSelected = localSelectedId === homeId;
            const chapels = home.chapels || home.locations || [];

            // Compute unique cities list
            const chapelCities = chapels
              .map((c) => c.city)
              .filter(Boolean);
            const uniqueCities = Array.from(new Set([home.city, ...chapelCities].filter(Boolean)));
            const citiesText = uniqueCities.slice(0, 3).join(', ');

            const imageUrl =
              home.imageUrl ||
              home.image ||
              'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=400&q=80';

            return (
              <div
                key={homeId}
                onClick={() => handleSelectHome(home)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: isSelected ? '#f1f6fb' : '#ffffff',
                  border: isSelected ? '2px solid #183655' : '1.5px solid #e2e8f0',
                  boxShadow: isSelected
                    ? '0 4px 14px rgba(24, 54, 85, 0.12)'
                    : '0 2px 6px rgba(24, 54, 85, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#92a8c3';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {/* Funeral Home Photo with smooth shimmer */}
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '9px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #edf1f6',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <ShimmerImage
                    src={imageUrl}
                    alt={home.name}
                    width="100%"
                    height="100%"
                    objectFit="cover"
                    fallbackSrc="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=400&q=80"
                  />
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <strong
                      style={{
                        fontSize: '15.5px',
                        fontWeight: 700,
                        color: '#183655',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {home.name}
                    </strong>

                    {isSelected && (
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#183655',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: '#67788e',
                      marginTop: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {citiesText || `${home.city || 'California'}, ${home.county || ''}`}
                  </span>

                  {home.program && (
                    <span
                      style={{
                        display: 'inline-block',
                        color: '#16803b',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        marginTop: '4px',
                      }}
                    >
                      • {home.program} Program
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#183655', marginBottom: '6px' }}>
            {lang === 'es' ? 'No se encontraron funerarias' : 'No funeral homes found'}
          </div>
          <div style={{ fontSize: '13.5px', color: '#67788e', maxWidth: '440px', margin: '0 auto' }}>
            {lang === 'es'
              ? `No se encontraron resultados para "${searchQuery}" bajo ${searchFilter}. Intente con otro término.`
              : `No funeral homes match "${searchQuery}" under ${searchFilter}. Please try another location or term.`}
          </div>
        </div>
      )}

      {/* Bottom Navigation Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <Button
          variant="primary"
          size="lg"
          onClick={onContinue}
          disabled={!isContinueEnabled}
          style={{
            backgroundColor: '#183655',
            borderColor: '#183655',
            padding: '12px 32px',
            fontSize: '15px',
            fontWeight: 700,
            borderRadius: '10px',
            opacity: isContinueEnabled ? 1 : 0.45,
            cursor: isContinueEnabled ? 'pointer' : 'not-allowed',
          }}
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
