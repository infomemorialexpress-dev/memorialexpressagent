import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchAgentQuoteDb } from '../services/agent/agentService.js';
import { calculateQuote, isCremation } from '../utils/quoteLogic.js';
import api from '../services/api.js';
import i18n from '../i18n.js';

const QuoteContext = createContext(null);

export function QuoteProvider({ children }) {
  // Language State
  const [lang, setLang] = useState(() => localStorage.getItem('memorial_lang') || 'en');

  // Real Funeral Homes from Backend API
  const [funeralHomes, setFuneralHomes] = useState([]);
  const [isLoadingHomes, setIsLoadingHomes] = useState(true);
  const [selectedFuneralHome, setSelectedFuneralHome] = useState(null);

  // Live database catalog strictly from MongoDB
  const [db, setDb] = useState({ homes: [], caskets: [], addons: [], packages: {}, fees: {} });
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [dbError, setDbError] = useState(null);

  // Funnel Step State (0 = Location/Home, 1 = Home Confirm, 2 = Service, 3 = Merchandise, 4 = Addons, 5 = Summary, 6 = Legal)
  const [step, setStep] = useState(0);

  // Initial Quote State definition for clean re-use
  const initialQuoteState = {
    location: '',
    budget: '',
    home: '',
    homeId: '',
    homeName: '',
    selectedHomeObj: null,
    service: '',
    serviceName: '',
    selectedServiceObject: null,
    casket: '',
    casketName: '',
    selectedCasketObject: null,
    casketPrice: 0,
    addons: [],
    guaranteedAddons: [],
    nonGuaranteedAddons: [],
    selectedAddonObjects: [],
    addonQuantities: {},
    customNonGuaranteedItems: [
      { name: '', price: '' },
      { name: '', price: '' },
      { name: '', price: '' }
    ],
    guaranteedAddonsTotal: 0,
    guaranteedAddonsTax: 0,
    certs: 1,
    urnAllowance: '',
    airfarePrice: 1000,
    airfareSelected: true,
    shipDestination: 'north_america',
    flowersQty: 1,
    escortQty: 1,
    selectedBranch: null,
    selectedChapel: null,
    priceOverrides: {}
  };

  // Quote State
  const [quote, setQuote] = useState(initialQuoteState);

  // Toasts with guaranteed auto-dismissal
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration + 300);
    }
  }, []);

  // Fetch real funeral homes from Backend API with concurrency guard
  const isFetchingHomesRef = useRef(false);
  const fetchFuneralHomes = useCallback(async () => {
    if (isFetchingHomesRef.current) return;
    isFetchingHomesRef.current = true;
    setIsLoadingHomes(true);
    try {
      const response = await api.get('/funeral-homes?onlyActive=true');
      const homes = Array.isArray(response.data) ? response.data : [];
      setFuneralHomes(homes);
      setDb(prev => ({
        ...prev,
        homes
      }));
      setDbError(null);
      return homes;
    } catch (err) {
      console.error('[QuoteContext] Could not fetch /funeral-homes from backend:', err);
      if (err.response?.status === 429) {
        setDbError('Rate limit exceeded (429). Please wait a few seconds and try again.');
      } else {
        setDbError(err.userMessage || 'Could not connect to database to load funeral homes.');
      }
      return [];
    } finally {
      setIsLoadingHomes(false);
      isFetchingHomesRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchFuneralHomes();
  }, [fetchFuneralHomes]);

  // Fetch live catalog snapshot with concurrency guard
  const isFetchingDbRef = useRef(false);
  const loadAgentCatalog = useCallback(async () => {
    if (isFetchingDbRef.current) return;
    isFetchingDbRef.current = true;
    setIsLoadingDb(true);
    try {
      const res = await fetchAgentQuoteDb();
      if (res.success && res.db) {
        setDb(prev => ({
          ...res.db,
          homes: prev.homes.length > 0 ? prev.homes : res.db.homes
        }));
        setDbError(null);
      }
    } catch (err) {
      console.error('[QuoteContext] Failed to load agent catalog:', err);
      if (err.response?.status === 429 || err.status === 429) {
        setDbError('Rate limit exceeded (429). Please wait a few seconds and try again.');
      } else {
        setDbError(err.message || 'Failed to load catalog from database');
      }
    } finally {
      setIsLoadingDb(false);
      isFetchingDbRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadAgentCatalog();
  }, [loadAgentCatalog]);

  const handleSetLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('memorial_lang', newLang);
    document.documentElement.lang = newLang;
    try {
      i18n.changeLanguage(newLang);
    } catch (e) {
      console.warn('i18n changeLanguage failed:', e);
    }
  };

  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);

  // Reset Quote / Start New Quote action
  const resetQuote = useCallback(() => {
    setSelectedFuneralHome(null);
    setSelectedChapel(null);
    setSelectedBranch(null);
    setSelectedService(null);
    setSelectedCasket(null);
    setQuote(initialQuoteState);
    setStep(0);
  }, []);

  // Funnel Actions: selectHome saves the selected FuneralHome object (including its _id and chapels array)
  // Whenever user selects a new Funeral Home (Step 1), selectedCasket, selectedService, and selectedAddons are explicitly reset
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
    setSelectedChapel(null);
    setSelectedBranch(null);
    setSelectedService(null);
    setSelectedCasket(null);

    setQuote(prev => ({
      ...prev,
      home: homeId,
      homeId: homeId,
      homeName: homeObj?.name || prev.homeName || '',
      selectedHomeObj: homeObj,
      selectedChapel: null,
      selectedBranch: null,
      service: '',
      serviceName: '',
      selectedServiceObject: null,
      casket: '',
      casketName: '',
      selectedCasketObject: null,
      casketPrice: 0,
      addons: [],
      guaranteedAddons: [],
      nonGuaranteedAddons: [],
      selectedAddonObjects: [],
      addonQuantities: {},
      urnAllowance: '',
      priceOverrides: {}
    }));
  };

  // Selected Chapel State & Action
  const [selectedChapel, setSelectedChapel] = useState(null);

  const selectChapel = (chapel) => {
    let chapelObj = null;
    if (chapel) {
      const chapelName = chapel.name || (chapel.city ? `${chapel.city} Chapel${chapel.zip ? ` (${chapel.zip})` : ''}` : 'Main Facility Chapel');
      const surcharge = Number(chapel.surcharge) || 0;
      chapelObj = {
        ...chapel,
        name: chapelName,
        surcharge
      };
    }
    setSelectedChapel(chapelObj);
    setQuote(prev => ({
      ...prev,
      selectedChapel: chapelObj
    }));
  };

  // Selected Sub-Location Branch State & Action
  const [selectedBranch, setSelectedBranch] = useState(null);

  const selectBranch = (branch) => {
    let branchObj = null;
    if (branch) {
      branchObj = {
        branchName: branch.branchName || branch.name || '',
        streetAddress: branch.streetAddress || branch.address || '',
        city: branch.city || '',
        zipCode: branch.zipCode || branch.zip || '',
        county: branch.county || '',
        phone: branch.phone || '',
        briefNote: branch.briefNote || branch.note || '',
      };
    }
    setSelectedBranch(branchObj);
    setQuote(prev => ({
      ...prev,
      selectedBranch: branchObj
    }));
  };

  // Selected Service Object
  const [selectedService, setSelectedService] = useState(null);

  // Whenever user selects or changes a Package (Step 3), selectedCasket and selectedAddons are explicitly reset
  const selectService = (serviceOrId) => {
    let serviceObj = null;
    let serviceId = '';

    if (serviceOrId && typeof serviceOrId === 'object') {
      serviceObj = serviceOrId;
      const nameLower = (serviceObj.name || '').toLowerCase();
      if (nameLower.includes('two-day') || nameLower.includes('two day') || nameLower.includes('2 day')) serviceId = 'two_day';
      else if (nameLower.includes('one-day') || nameLower.includes('one day') || nameLower.includes('1 day')) serviceId = 'one_day';
      else if (nameLower.includes('traditional') && !nameLower.includes('cremat')) serviceId = 'one_day';
      else if (nameLower.includes('graveside') || nameLower.includes('burial') || nameLower.includes('complete funeral')) serviceId = 'one_day';
      else if (nameLower.includes('traditional cremation')) serviceId = 'traditional_cremation';
      else if (nameLower.includes('memorial cremation')) serviceId = 'memorial_cremation';
      else if (nameLower.includes('direct cremation') || nameLower.includes('cremat')) serviceId = 'direct_cremation';
      else if (nameLower.includes('ship out with') || nameLower.includes('ship traditional')) serviceId = 'ship_traditional';
      else if (nameLower.includes('direct ship') || nameLower.includes('ship')) serviceId = 'ship_direct';
      else serviceId = serviceObj._id || serviceObj.id || serviceObj.name;
    } else if (typeof serviceOrId === 'string') {
      serviceId = serviceOrId;
    }

    setSelectedService(serviceObj);
    setSelectedCasket(null);

    setQuote(prev => {
      let urnAllowance = prev.urnAllowance;
      if (!isCremation(serviceId)) {
        urnAllowance = '';
      }

      return {
        ...prev,
        service: serviceId,
        serviceName: serviceObj?.name || serviceObj?.packageName || prev.serviceName || '',
        selectedServiceObject: serviceObj,
        casket: '',
        casketName: '',
        selectedCasketObject: null,
        casketPrice: 0,
        addons: [],
        guaranteedAddons: [],
        nonGuaranteedAddons: [],
        selectedAddonObjects: [],
        addonQuantities: {},
        urnAllowance,
        priceOverrides: {}
      };
    });
  };

  const setService = selectService;

  const [selectedCasket, setSelectedCasket] = useState(null);

  const selectCasket = (casketOrId) => {
    if (!casketOrId) {
      setSelectedCasket(null);
      setQuote(prev => ({
        ...prev,
        casket: '',
        casketName: '',
        selectedCasketObject: null,
        casketPrice: 0
      }));
      return;
    }

    let casketObj = null;
    let casketId = '';

    if (typeof casketOrId === 'object' && !Array.isArray(casketOrId)) {
      casketObj = casketOrId;
      casketId = casketOrId._id || casketOrId.id || casketOrId.productCode || '';
    } else if (typeof casketOrId === 'string' && casketOrId.trim() !== '') {
      casketId = casketOrId;
      casketObj = (db.caskets || []).find(c => c.id === casketId || c._id === casketId) || null;
    }

    setSelectedCasket(casketObj);

    setQuote(prev => ({
      ...prev,
      casket: casketId,
      casketName: casketObj?.name || (casketId ? prev.casketName : '') || '',
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
        resetQuote,
        startNewQuote: resetQuote,
        selectHome,
        selectedService,
        selectService,
        setService,
        selectedChapel,
        selectChapel,
        selectedBranch,
        selectBranch,
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
