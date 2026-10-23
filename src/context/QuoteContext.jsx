import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchAgentQuoteDb } from '../services/agent/agentService.js';
import { getStoredDb } from '../services/base/apiClient.js';
import { calculateQuote, isCremation } from '../utils/quoteLogic.js';
import api from '../services/api.js';

const QuoteContext = createContext(null);

export function QuoteProvider({ children }) {
  // Language State
  const [lang, setLang] = useState(() => localStorage.getItem('memorial_lang') || 'en');

  // Real Funeral Homes from Backend API
  const [funeralHomes, setFuneralHomes] = useState([]);
  const [isLoadingHomes, setIsLoadingHomes] = useState(false);
  const [selectedFuneralHome, setSelectedFuneralHome] = useState(null);

  // Read-only catalog snapshot for the agent quoter
  const [db, setDb] = useState(() => {
    try {
      return getStoredDb();
    } catch {
      return { homes: [], caskets: [], addons: [], packages: {}, fees: {} };
    }
  });
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Funnel Step State (0 = Location/Home, 1 = Home Confirm, 2 = Service, 3 = Merchandise, 4 = Addons, 5 = Summary)
  const [step, setStep] = useState(0);

  // Quote State
  const [quote, setQuote] = useState({
    location: '',
    budget: '',
    home: '',
    homeId: '',
    homeName: '',
    selectedHomeObj: null,
    service: '',
    casket: '',
    addons: [],
    certs: 1,
    urnAllowance: '',
    airfarePrice: 1000,
    airfareSelected: true,
    shipDestination: 'north_america',
    flowersQty: 1,
    escortQty: 1,
    priceOverrides: {}
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch real funeral homes from Backend API
  const fetchFuneralHomes = useCallback(async () => {
    setIsLoadingHomes(true);
    try {
      const response = await api.get('/funeral-homes');
      const homes = response.data || [];
      setFuneralHomes(homes);
      setDb(prev => ({
        ...prev,
        homes: homes.length > 0 ? homes : (prev.homes || [])
      }));
      return homes;
    } catch (err) {
      console.warn('[QuoteContext] Could not fetch /funeral-homes, using fallback snapshot:', err);
      return [];
    } finally {
      setIsLoadingHomes(false);
    }
  }, []);

  useEffect(() => {
    fetchFuneralHomes();
  }, [fetchFuneralHomes]);

  // Fetch catalog snapshot
  const loadAgentCatalog = useCallback(async () => {
    try {
      const res = await fetchAgentQuoteDb();
      if (res.success && res.db) {
        setDb(prev => ({
          ...res.db,
          homes: funeralHomes.length > 0 ? funeralHomes : res.db.homes
        }));
      }
    } catch (err) {
      console.error('[QuoteContext] Failed to load agent catalog:', err);
      setDbError(err.message || 'Failed to load catalog');
    }
  }, [funeralHomes]);

  useEffect(() => {
    loadAgentCatalog();
  }, [loadAgentCatalog]);

  const handleSetLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('memorial_lang', newLang);
    document.documentElement.lang = newLang;
  };

  // Funnel Actions: selectHome saves the selected FuneralHome object (including its _id and chapels array)
  const selectHome = (homeOrId) => {
    let homeObj = null;
    let homeId = '';

    if (homeOrId && typeof homeOrId === 'object') {
      homeObj = homeOrId;
      homeId = homeOrId._id || homeOrId.id;
    } else if (typeof homeOrId === 'string') {
      homeId = homeOrId;
      homeObj = funeralHomes.find(h => (h._id === homeId || h.id === homeId)) ||
                (db.homes || []).find(h => (h.id === homeId || h._id === homeId)) || null;
    }

    setSelectedFuneralHome(homeObj);

    const isWestern = (homeObj?.name || '').toLowerCase().includes('western') || homeId === 'western';
    const defaultAddons = isWestern
      ? ['western_flower_spray', 'western_memorial_video', 'western_register_book', 'western_prayer_cards']
      : [];

    setQuote(prev => ({
      ...prev,
      home: homeId,
      homeId: homeId,
      homeName: homeObj?.name || prev.homeName || '',
      selectedHomeObj: homeObj,
      service: '',
      casket: '',
      addons: defaultAddons,
      urnAllowance: '',
      priceOverrides: {}
    }));
  };

  // Selected Service Object
  const [selectedService, setSelectedService] = useState(null);

  const selectService = (serviceOrId) => {
    let serviceObj = null;
    let serviceId = '';

    if (serviceOrId && typeof serviceOrId === 'object') {
      serviceObj = serviceOrId;
      const nameLower = (serviceObj.name || '').toLowerCase();
      if (nameLower.includes('two-day') || nameLower.includes('two day')) serviceId = 'two_day';
      else if (nameLower.includes('one-day') || nameLower.includes('one day')) serviceId = 'one_day';
      else if (nameLower.includes('traditional cremation')) serviceId = 'traditional_cremation';
      else if (nameLower.includes('memorial cremation')) serviceId = 'memorial_cremation';
      else if (nameLower.includes('direct cremation')) serviceId = 'direct_cremation';
      else if (nameLower.includes('ship out with') || nameLower.includes('ship traditional')) serviceId = 'ship_traditional';
      else if (nameLower.includes('direct ship')) serviceId = 'ship_direct';
      else serviceId = serviceObj._id || serviceObj.id || serviceObj.name;
    } else if (typeof serviceOrId === 'string') {
      serviceId = serviceOrId;
    }

    setSelectedService(serviceObj);

    setQuote(prev => {
      let addons = [...prev.addons];
      const homeNameLower = (prev.homeName || '').toLowerCase();
      const isOptima = homeNameLower.includes('optima') || prev.home === 'optima';
      const isWestern = homeNameLower.includes('western') || prev.home === 'western';
      const isMurillo = homeNameLower.includes('murillo') || prev.home === 'murillo';

      if (isOptima && serviceId === 'direct_cremation') {
        addons = [];
      }
      if (isWestern && serviceId === 'direct_cremation') {
        addons = addons.filter(id => !id.startsWith('western_'));
      }
      if (isWestern && serviceId === 'memorial_cremation') {
        addons = addons.filter(id => id !== 'western_flower_spray');
      }

      if (serviceId === 'ship_direct') {
        addons = ['air_tray'];
      } else if (['ship_traditional', 'ship_direct'].includes(serviceId)) {
        addons = [...new Set([...addons, 'air_tray'])];
      } else {
        addons = addons.filter(id => id !== 'air_tray');
      }

      let urnAllowance = prev.urnAllowance;
      if (!isCremation(serviceId) || (isWestern && serviceId === 'direct_cremation')) {
        urnAllowance = '';
      } else if (isMurillo && isCremation(serviceId)) {
        urnAllowance = String(Math.max(200, Number(prev.urnAllowance) || 200));
      }

      return {
        ...prev,
        service: serviceId,
        serviceName: serviceObj?.name || prev.serviceName || '',
        selectedServiceObject: serviceObj,
        casket: '',
        addons,
        urnAllowance,
        airfareSelected: true,
        airfarePrice: 1000,
        shipDestination: 'north_america'
      };
    });
  };

  const setService = selectService;

  const [selectedCasket, setSelectedCasket] = useState(null);

  const selectCasket = (casketOrId) => {
    let casketObj = null;
    let casketId = '';

    if (casketOrId && typeof casketOrId === 'object') {
      casketObj = casketOrId;
      casketId = casketOrId._id || casketOrId.id || casketOrId.productCode;
    } else if (typeof casketOrId === 'string') {
      casketId = casketOrId;
      casketObj = (db.caskets || []).find(c => c.id === casketId || c._id === casketId) || null;
    }

    setSelectedCasket(casketObj);

    setQuote(prev => ({
      ...prev,
      casket: casketId,
      casketName: casketObj?.name || prev.casketName || '',
      selectedCasketObject: casketObj,
      casketPrice: casketObj?.listPrice ?? casketObj?.price ?? 0
    }));
  };

  const toggleAddon = (addonId) => {
    setQuote(prev => {
      const exists = prev.addons.includes(addonId);
      let newAddons;
      if (exists) {
        newAddons = prev.addons.filter(id => id !== addonId);
      } else {
        newAddons = [...prev.addons, addonId];
      }
      return { ...prev, addons: newAddons };
    });
  };

  const updateQuantity = (key, val) => {
    setQuote(prev => ({ ...prev, [key]: val }));
  };

  const updatePriceOverride = (addonId, val) => {
    setQuote(prev => {
      const overrides = { ...prev.priceOverrides };
      if (val === '' || val === undefined) {
        delete overrides[addonId];
      } else {
        overrides[addonId] = Number(val);
      }
      return { ...prev, priceOverrides: overrides };
    });
  };

  // Live calculation results based on read-only DB snapshot and selected home
  const calculation = db ? calculateQuote(quote, db) : null;
  if (calculation && selectedFuneralHome) {
    calculation.homeObj = selectedFuneralHome;
  }

  return (
    <QuoteContext.Provider
      value={{
        lang,
        setLanguage: handleSetLanguage,
        step,
        setStep,
        quote,
        setQuote,
        funeralHomes,
        isLoadingHomes,
        selectedFuneralHome,
        fetchFuneralHomes,
        db: db || { homes: [], caskets: [], addons: [], packages: {}, fees: {} },
        isLoadingDb,
        dbError,
        reloadCatalog: loadAgentCatalog,
        calculation,
        selectHome,
        selectedService,
        selectService,
        setService,
        selectedCasket,
        selectCasket,
        toggleAddon,
        updateQuantity,
        updatePriceOverride,
        toasts,
        addToast,
        removeToast
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const context = useContext(QuoteContext);
  if (!context) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
}
