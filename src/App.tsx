/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  FileDown,
  Database,
  Eye,
  Settings,
  Calendar,
  Layers,
  Activity,
  UserCheck
} from 'lucide-react';

import { ServiceRequest } from './types';
import { INITIAL_SERVICE_REQUESTS } from './data/mockData';
import StatsCard from './components/StatsCard';
import AddRequestModal from './components/AddRequestModal';
import ChartsView from './components/ChartsView';
import GoogleAppsScriptGuide from './components/GoogleAppsScriptGuide';
import FailureTrackerView from './components/FailureTrackerView';
import SuratTugasTrackerView from './components/SuratTugasTrackerView';

export default function App() {
  // --- States ---
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  // Helper untuk membersihkan dan menstandarkan format tanggal ke YYYY-MM-DD
  const formatDateString = (dtStr: string) => {
    if (!dtStr) return '-';
    const trimmed = (dtStr + '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    try {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // ignore
    }
    return trimmed;
  };

  // If you want to use the deployed GAS as default, set it here. 
  const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwS75B4D0b8pG9lmvqqv6UkltCo9QWp8R50KGfZ60r6NXLRsJ5Vg7M78QRWnsGOcfnl/exec';
  const [scriptUrl, setScriptUrl] = useState<string>(DEFAULT_SCRIPT_URL);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'table' | 'guide' | 'failure' | 'surattugas'>('table');
  const [showCharts, setShowCharts] = useState<boolean>(true);
  
  // Modals & Expansion
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingRequest, setEditingRequest] = useState<ServiceRequest | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCondition, setFilterCondition] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterUc3Status, setFilterUc3Status] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');

  // Load from localstorage on initialization
  useEffect(() => {
    let initialUrl = DEFAULT_SCRIPT_URL;
    const savedUrl = localStorage.getItem('gs_script_url');
    if (savedUrl && savedUrl !== '') {
      initialUrl = savedUrl;
      setScriptUrl(savedUrl);
    }
    
    // Sync automatically on start if we have a URL
    if (initialUrl) {
      handleSyncWithGoogleAppScript(initialUrl).catch(e => console.error("Initial load sync failed:", e));
    }
    
    // As fallback load from storage
    const savedRequests = localStorage.getItem('service_requests');
    if (savedRequests) {
      try {
        const parsed = JSON.parse(savedRequests);
        const mapped = parsed.map((item: any) => ({
          ...item,
          labour1: item.labour1 || '',
          labour2: item.labour2 || '',
          labour3: item.labour3 || '',
          labour4: item.labour4 || '',
          labour5: item.labour5 || '',
          labour6: item.labour6 || '',
        }));
        setRequests(mapped);
      } catch (e) {
        setRequests(INITIAL_SERVICE_REQUESTS);
      }
    } else {
      setRequests(INITIAL_SERVICE_REQUESTS);
    }

  }, []);

  // Save requests to localstorage whenever it changes
  const saveRequestsToStateAndStorage = (newRequests: ServiceRequest[]) => {
    setRequests(newRequests);
    localStorage.setItem('service_requests', JSON.stringify(newRequests));
  };

  // --- Dynamic calculations ---
  const uniqueLocations = useMemo(() => {
    const locations = requests.map(r => r.location).filter(Boolean);
    return Array.from(new Set(locations));
  }, [requests]);

  // --- Filter Logic ---
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 1. Search Query Match
      const matchesSearch = 
        (req.srNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.snUnit || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.issueDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.labour1 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.labour2 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.labour3 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.labour4 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.labour5 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.labour6 || '').toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Condition Match
      const matchesCondition = filterCondition === 'All' || req.unitCondition === filterCondition;

      // 3. Status Match
      const matchesStatus = filterStatus === 'All' || req.status === filterStatus;

      // 4. UC3 Status Match
      const matchesUc3Status = filterUc3Status === 'All' || req.uc3Status === filterUc3Status;

      // 5. Location Match
      const matchesLocation = filterLocation === 'All' || req.location === filterLocation;

      return matchesSearch && matchesCondition && matchesStatus && matchesUc3Status && matchesLocation;
    });
  }, [requests, searchQuery, filterCondition, filterStatus, filterUc3Status, filterLocation]);

  // --- Sync Google Sheet via Apps Script ---
  const handleSyncWithGoogleAppScript = async (url: string) => {
    setIsSyncing(true);
    try {
      const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'type=all&v=' + Date.now();
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Koneksi gagal dengan status: ${response.status}`);
      }
      
      let rawData;
      try {
        const textData = await response.text();
        if (textData.trim().startsWith('<')) {
          throw new Error("Script mengembalikan halaman Web/HTML, bukan data JSON. Pastikan saat deploy Apps Script, pilih 'Who has access: Anyone' (Siapa saja) dan URL yang dimasukkan berakhiran /exec.");
        }
        rawData = JSON.parse(textData);
      } catch (e: any) {
        if (e.message.includes("Script mengembalikan")) {
          throw e; // rethrow the specific HTML error
        }
        throw new Error(`Gagal memparsing data JSON. Pastikan Web App diset ke Anyone. Detail: ${e.message}`);
      }
      
      let srData: any[] = [];
      
      if (Array.isArray(rawData)) {
        srData = rawData;
      } else if (rawData && typeof rawData === 'object') {
        if (rawData.serviceRequests) srData = rawData.serviceRequests;
        if (rawData.failureInformations) {
          localStorage.setItem('failure_informations', JSON.stringify(rawData.failureInformations));
          window.dispatchEvent(new Event('fiDataUpdated'));
        }
      } else {
        throw new Error('Format data tidak valid!');
      }

      // Map rawData to guarantee id presence
      const sanitized: ServiceRequest[] = srData.map((item: any, idx: number) => ({
        id: item.id || (idx + 1).toString(),
        srNumber: item.srNumber || '',
        woNumber: item.woNumber || '',
        uc3Number: item.uc3Number || '',
        uc3Status: item.uc3Status || 'None',
        srDate: item.srDate || '',
        srAging: parseInt(item.srAging) || 0,
        planningDate: item.planningDate || '',
        actionDate: item.actionDate || '',
        rfuDate: item.rfuDate || '',
        unitCondition: item.unitCondition || 'Running Without Trouble',
        snUnit: item.snUnit || '',
        model: item.model || 'HX210HD',
        issueDescription: item.issueDescription || '',
        location: item.location || '',
        labour1: item.labour1 || '',
        labour2: item.labour2 || '',
        labour3: item.labour3 || '',
        labour4: item.labour4 || '',
        labour5: item.labour5 || '',
        labour6: item.labour6 || '',
        status: item.status || 'Inprogress',
        leadJobDescription: item.leadJobDescription || '',
        ticketId: item.ticketId || ''
      }));

      saveRequestsToStateAndStorage(sanitized);
      setScriptUrl(url);
      localStorage.setItem('gs_script_url', url);
      alert(`Berhasil menyinkronkan data dari Google Sheet! 🎉\n(Service Requests: ${sanitized.length}, Failure Informations: ${rawData && rawData.failureInformations ? rawData.failureInformations.length : 0})`);
    } catch (err: any) {
      console.error('Apps script error:', err);
      throw new Error(`Data Apps Script gagal di-fetch. ${err.message || ''}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearScriptConnection = () => {
    if (window.confirm('Apakah Anda yakin ingin mematikan koneksi Google Sheet dan kembali menggunakan data demo bawaan?')) {
      setScriptUrl('');
      localStorage.removeItem('gs_script_url');
      saveRequestsToStateAndStorage(INITIAL_SERVICE_REQUESTS);
    }
  };

  // --- Local & Remote modifications ---
  const handleSaveRequest = async (reqData: Omit<ServiceRequest, 'id'> & { id?: string }) => {
    let freshData: ServiceRequest;
    
    if (reqData.id) {
      // Edit mode
      freshData = { ...reqData } as ServiceRequest;
      const updated = requests.map(r => r.id === reqData.id ? freshData : r);
      saveRequestsToStateAndStorage(updated);
    } else {
      // Add mode
      freshData = {
        ...reqData,
        id: Date.now().toString()
      } as ServiceRequest;
      const updated = [freshData, ...requests];
      saveRequestsToStateAndStorage(updated);
    }

    // Push to Google Apps Script if sync is active
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: reqData.id ? 'update' : 'add', type: 'service_request', data: freshData })
        });
      } catch (err) {
        console.error("Failed to sync structural change to Google Sheets", err);
      }
    }
  };

  const handleDeleteRequest = async (id: string, srNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Apakah Anda yakin ingin menghapus Service Request ini?')) {
      const updated = requests.filter(r => r.id !== id);
      saveRequestsToStateAndStorage(updated);
      
      // Push delete event to Google Apps Script
      if (scriptUrl) {
        try {
          await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', type: 'service_request', data: { id, srNumber } })
          });
        } catch (err) {
          console.error("Failed to sync delete to Google Sheets", err);
        }
      }
    }
  };

  const restoreInitialDemoData = () => {
    if (window.confirm('Semua penambahan data lokal akan dihapus dan di-reset kembali ke data default awal sesuai screenshot. Lanjutkan?')) {
      saveRequestsToStateAndStorage(INITIAL_SERVICE_REQUESTS);
    }
  };

  // --- Exporters ---
  const handleExportCSV = () => {
    const headers = [
      'SR Number', 'WO Number', 'UC3 Number', 'UC3 Status', 'SR Date', 'SR Aging',
      'Planning Date', 'Action Date', 'RFU Date', 'Unit Condition', 'SN Unit',
      'Model', 'Issue Description', 'Location', 'Labour 1', 'Labour 2', 'Labour 3', 'Labour 4', 'Labour 5', 'Labour 6', 'Status',
      'LEAD JOB DESCRIPTION'
    ];
    
    const content = filteredRequests.map(r => [
      r.srNumber, r.woNumber, r.uc3Number, r.uc3Status, r.srDate, r.srAging,
      r.planningDate, r.actionDate, r.rfuDate, r.unitCondition, r.snUnit,
      r.model, r.issueDescription, r.location, r.labour1, r.labour2, r.labour3 || '', r.labour4 || '', r.labour5 || '', r.labour6 || '', r.status,
      `"${(r.leadJobDescription || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...content.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Filtered_Equipment_Service_Data_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Metrics ---
  const totalSR = requests.filter(r => !(r.status || '').toLowerCase().includes('rfu')).length;
  const breakdownCount = requests.filter(r => r.unitCondition === 'Breakdown' && !(r.status || '').toLowerCase().includes('rfu')).length;
  const inProgressCount = requests.filter(r => r.status === 'Inprogress').length;
  const delayLabourCount = requests.filter(r => r.status === 'Delay Labour').length;
  
  // Unique mechanicians
  const totalLabours = useMemo(() => {
    const m = new Set<string>();
    requests.forEach(r => {
      if (r.labour1) m.add(r.labour1);
      if (r.labour2) m.add(r.labour2);
      if (r.labour3) m.add(r.labour3);
      if (r.labour4) m.add(r.labour4);
      if (r.labour5) m.add(r.labour5);
      if (r.labour6) m.add(r.labour6);
    });
    return m.size;
  }, [requests]);

  return (
    <div className="min-h-screen bg-[#09090B] text-[#E4E4E7] font-sans antialiased text-xs">
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <header className="border-b border-[#27272A] bg-[#09090B]/90 sticky top-0 backdrop-blur-md z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(37,99,235,0.4)]">
              <div className="w-3.5 h-3.5 bg-white rotate-45"></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xs font-bold tracking-tight text-white sm:text-lg uppercase">Heavy Equipment Service Tracker</h1>
                {scriptUrl ? (
                  <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/22 text-emerald-400">Live</span>
                ) : (
                  <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-zinc-800 border border-[#27272A] text-zinc-400">Demo</span>
                )}
              </div>
              <p className="text-[10px] text-amber-500 mt-0.5 font-bold uppercase tracking-wider">
                REAL TIME MONITORING - UNIQUIP CABANG PALANGKARAYA (KALIMANTAN TENGAH)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Quick Button */}
            {scriptUrl && (
              <button
                onClick={() => handleSyncWithGoogleAppScript(scriptUrl)}
                disabled={isSyncing}
                title="Sikronisasi ulang dari Google Sheet"
                className="hidden sm:inline-flex p-1.5 bg-[#18181B] border border-[#27272A] hover:bg-zinc-800 text-zinc-300 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Tambah Request / Job Button */}
            <button
              onClick={() => {
                setEditingRequest(null);
                setIsAddOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/15 transition duration-150 text-white rounded-lg text-[11px] font-semibold tracking-wider uppercase cursor-pointer"
            >
              <Plus id="add-plus" className="w-3.5 h-3.5" />
              <span>Tambah Request</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-3 space-y-3.5">
        
        {/* 2. STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard
            label="Total Service Request"
            value={totalSR}
            subtext="Maksimum order"
            iconType="hammer"
            colorClass="bg-purple-500"
          />
          <StatsCard
            label="Kondisi Breakdown"
            value={breakdownCount}
            subtext={`${breakdownCount} tidak aktif`}
            iconType="alert"
            colorClass="bg-rose-500"
          />
          <StatsCard
            label="Sedang Dikerjakan"
            value={inProgressCount}
            subtext={`${requests.filter(r => r.uc3Status === 'waiting Part').length} menunggu part`}
            iconType="clock"
            colorClass="bg-amber-500"
          />
          <StatsCard
            label="Mekanik Terdaftar"
            value={totalLabours}
            subtext="Tersebar di sektor"
            iconType="users"
            colorClass="bg-blue-500"
          />
        </div>

        {/* TAB CONTROLS */}
        <div className="border-b border-[#27272A] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 py-1">
          <div className="flex space-x-1 p-0.5 bg-[#18181B] border border-[#27272A] rounded-xl self-start">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-[#27272A] text-white border border-zinc-700/50'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              Service Request Tracker
            </button>
            <button
              onClick={() => setActiveTab('failure')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition cursor-pointer ${
                activeTab === 'failure'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/10 font-extrabold'
                  : 'text-zinc-500 hover:text-amber-400'
              }`}
            >
              Failure Information Tracker
            </button>
            <button
              onClick={() => setActiveTab('surattugas')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition cursor-pointer ${
                activeTab === 'surattugas'
                  ? 'bg-yellow-650 text-white shadow-md shadow-yellow-500/10 font-extrabold border border-yellow-500/20'
                  : 'text-zinc-500 hover:text-amber-450'
              }`}
            >
              Surat Tugas Tracker
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide uppercase transition cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-500 hover:text-blue-400'
              }`}
            >
              Integrasi Google Sheets ⚡
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end text-[11px] font-normal">
            {activeTab === 'table' && (
              <>
                <button
                  onClick={() => setShowCharts(!showCharts)}
                  className={`inline-flex items-center space-x-1 py-1 transition cursor-pointer ${
                    showCharts 
                      ? 'text-blue-400 hover:text-blue-300 font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={showCharts ? "Sembunyikan visualisasi grafik" : "Tampilkan visualisasi grafik"}
                >
                  <Activity className={`w-3 h-3 ${showCharts ? 'animate-pulse' : ''}`} />
                  <span>{showCharts ? 'Sembunyikan Analisis' : 'Tampilkan Analisis'}</span>
                </button>
                <span className="text-[#27272A]">|</span>
              </>
            )}
            <button
              onClick={restoreInitialDemoData}
              className="inline-flex items-center space-x-1 text-zinc-500 hover:text-zinc-300 py-1 transition cursor-pointer"
              title="Reset data lokal ke tabel orisinal"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Data Demo</span>
            </button>
            <span className="text-[#27272A]">|</span>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1 text-zinc-400 hover:text-white py-1 transition cursor-pointer"
            >
              <FileDown className="w-3 text-zinc-500" />
              <span>Ekspor Terfilter (CSV)</span>
            </button>
          </div>
        </div>

        {/* 3. MAIN COMPONENT CONTAINER BY ACTIVE TAB */}
        <AnimatePresence mode="wait">
          {activeTab === 'table' && (
            <motion.div
              key="table-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* ANALISIS SEKTOR - GRAFIK YANG DIGABUNGKAN */}
              {showCharts && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <ChartsView data={filteredRequests} />
                </motion.div>
              )}

              {/* FILTERS PANEL */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                  {/* Search bar input with icon */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Cari SR, S/N, mekanik, masalah, sasis, atau lokasi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-lg py-1.5 pl-9 pr-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-xs transition-colors"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-wider font-mono">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Filter Aktif:</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Filter Sektor */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Sektor / Lokasi</label>
                    <select
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="All">Semua Lokasi</option>
                      {uniqueLocations.map((loc, i) => (
                        <option key={i} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter Kondisi Unit */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Kondisi Alat</label>
                    <select
                      value={filterCondition}
                      onChange={(e) => setFilterCondition(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="All">Semua Kondisi</option>
                      <option value="Breakdown">Breakdown (Alat Mati)</option>
                      <option value="Running Without Trouble">Running (Tanpa Gangguan)</option>
                    </select>
                  </div>

                  {/* Filter status kerja */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Status Pengerjaan</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="All">Semua Status</option>
                      <option value="Inprogress">Inprogress</option>
                      <option value="Delay Labour">Delay Labour</option>
                      <option value="RFU_LEAD J">RFU_LEAD J</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  {/* UC3 Status */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Status UC3</label>
                    <select
                      value={filterUc3Status}
                      onChange={(e) => setFilterUc3Status(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="All">Semua UC3</option>
                      <option value="None">None</option>
                      <option value="Inprogress">Inprogress</option>
                      <option value="waiting Part">waiting Part</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* GRID TABLE / EXPRESS-STYLE EXCEL SHEET */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-sm shadow-black/30">
                <div className="p-3.5 border-b border-[#27272A] bg-[#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      Daftar Tugas Service Request (SR)
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Menampilkan {filteredRequests.length} dari {requests.length} total request unit aktif
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-zinc-400 bg-[#09090B] border border-[#27272A] px-2.5 py-1 rounded-lg">
                      Sektor Sektor Aktif: <span className="text-blue-400 font-extrabold">{filterLocation === 'All' ? 'Semua Wilayah' : filterLocation}</span>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#09090B] text-zinc-400 border-b border-[#27272A] text-[9.5px] font-bold tracking-widest uppercase">
                        <th className="px-2.5 py-1.5 w-10 text-center">Detail</th>
                        <th className="px-2.5 py-1.5">Nomor SR</th>
                        <th className="px-2.5 py-1.5">Status UC3</th>
                        <th className="px-2.5 py-1.5">Tanggal SR</th>
                        <th className="px-2.5 py-1.5">Kondisi Alat</th>
                        <th className="px-2.5 py-1.5">Model & S/N</th>
                        <th className="px-2.5 py-1.5">Deskripsi Masalah</th>
                        <th className="px-2.5 py-1.5">Sektor / Lokasi</th>
                        <th className="px-2.5 py-1.5">Mekanik Lapangan</th>
                        <th className="px-2.5 py-1.5">Status Kerja</th>
                        <th className="px-2.5 py-1.5 w-16 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] font-sans text-[11px]">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-zinc-500 font-normal">
                             Tidak ditemukan data Service Request yang cocok dengan filter aktif.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req) => {
                          const isExpanded = expandedRowId === req.id;
                          return (
                            <React.Fragment key={req.id}>
                              {/* Row Line */}
                              <tr
                                onClick={() => setExpandedRowId(isExpanded ? null : req.id)}
                                className={`cursor-pointer transition duration-150 border-l-2 ${
                                  isExpanded 
                                    ? 'bg-[#09090B] border-blue-500' 
                                    : 'border-transparent hover:bg-zinc-800/30 hover:border-zinc-700/50'
                                }`}
                              >
                                <td className="px-2.5 py-1 text-center">
                                  <button
                                    type="button"
                                    className={`w-5 h-5 inline-flex items-center justify-center rounded-md transition-colors ${
                                      isExpanded 
                                        ? 'bg-blue-500/10 text-blue-400' 
                                        : 'bg-zinc-800/55 text-zinc-400 group-hover:bg-zinc-700/60'
                                    }`}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3 text-blue-400 mx-auto" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3 text-zinc-400 mx-auto" />
                                    )}
                                  </button>
                                </td>

                                {/* SR NO */}
                                <td className="px-2.5 py-1">
                                  <div className="font-mono font-bold text-white tracking-tight text-xs">
                                    {req.srNumber}
                                  </div>
                                  <div className="flex flex-col gap-0.5 mt-0.5 font-mono">
                                    {req.woNumber && (
                                      <div className="text-[9px] text-zinc-400 flex items-center gap-1 font-medium">
                                        <span className="font-sans text-[7px] tracking-widest font-extrabold uppercase px-1 py-0.2 rounded bg-zinc-800 text-zinc-500 border border-zinc-700/50">WO</span>
                                        <span className="tracking-wide text-zinc-400">{req.woNumber}</span>
                                      </div>
                                    )}
                                    {req.uc3Number && (
                                      <div className="text-[9px] text-zinc-400 flex items-center gap-1 font-medium font-mono">
                                        <span className="font-sans text-[7px] tracking-widest font-extrabold uppercase px-1 py-0.2 rounded bg-[#6366f1]/15 text-indigo-400 border border-indigo-500/20">UC3</span>
                                        <span className="tracking-wide text-zinc-400">{req.uc3Number}</span>
                                      </div>
                                    )}
                                    {req.ticketId && (
                                      <div className="text-[9px] text-zinc-400 flex items-center gap-1 font-medium font-mono">
                                        <span className="font-sans text-[7px] tracking-widest font-extrabold uppercase px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">TKT</span>
                                        <span className="tracking-wide text-amber-450">{req.ticketId}</span>
                                      </div>
                                    )}
                                    {!req.woNumber && !req.uc3Number && !req.ticketId && (
                                      <div className="text-[8.5px] text-zinc-650">-</div>
                                    )}
                                  </div>
                                </td>

                                {/* UC3 Status Badge */}
                                <td className="px-2.5 py-1">
                                  <span
                                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wide uppercase ${
                                      req.uc3Status === 'waiting Part'
                                        ? 'bg-amber-400/10 text-amber-500 border border-amber-500/20'
                                        : req.uc3Status === 'Inprogress'
                                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                                        : req.uc3Status === 'Done'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-zinc-800 text-zinc-500/80 px-1.5'
                                    }`}
                                  >
                                    {req.uc3Status || 'None'}
                                  </span>
                                </td>

                                {/* SR Date & Aging */}
                                <td className="px-2.5 py-1 text-zinc-300">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-mono text-zinc-300 font-semibold text-[11px]">{formatDateString(req.srDate)}</span>
                                    {req.srAging > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[8.5px] font-bold text-rose-450 bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/15 w-fit">
                                        <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                                        Aging {req.srAging} hr
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Unit Condition */}
                                <td className="px-2.5 py-1">
                                  {req.unitCondition === 'Breakdown' ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                      <span className="w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
                                      Breakdown
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                      Running
                                    </span>
                                  )}
                                </td>

                                {/* Model / SN */}
                                <td className="px-2.5 py-1">
                                  <div className="font-bold text-white tracking-tight text-[11.5px]">{req.model}</div>
                                  <span className="text-[9px] text-zinc-500 font-mono block tracking-tight mt-0.5">{req.snUnit || '-'}</span>
                                </td>

                                {/* Issue description */}
                                <td className="px-2.5 py-1 max-w-[180px] truncate text-zinc-350 font-medium text-[10.5px]" title={req.issueDescription}>
                                  {req.issueDescription}
                                </td>

                                {/* Sektor / Lokasi */}
                                <td className="px-2.5 py-1 text-zinc-300 font-semibold text-xs text-blue-400/90">
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-blue-400 bg-blue-500/5 px-1.5 py-0.2 rounded border border-blue-500/10 whitespace-normal">
                                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                                    {req.location || 'Batam'}
                                  </span>
                                </td>

                                {/* Labour */}
                                <td className="px-2.5 py-1 text-zinc-300">
                                  <div className="flex flex-col gap-0.5">
                                    {req.labour1 ? (
                                      <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-200 font-semibold" title="Mekanik 1 (Utama)">
                                        <span className="w-1 h-1 rounded-full bg-blue-500" />
                                        <span>{req.labour1}</span>
                                      </div>
                                    ) : (
                                      <span className="text-zinc-650 font-mono">-</span>
                                    )}
                                    {[req.labour2, req.labour3, req.labour4, req.labour5, req.labour6].map((lab, idx) => {
                                      if (!lab) return null;
                                      return (
                                        <div key={idx} className="flex items-center gap-1 text-[9px] text-zinc-400 font-medium ml-1" title={`Mekanik ${idx + 2}`}>
                                          <span className="w-1 h-1 rounded-full bg-zinc-600 inline-block" />
                                          <span>{lab}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>

                                {/* Job status badge */}
                                <td className="px-2.5 py-1">
                                  <span
                                    className={`inline-block px-1.5 py-0.2 rounded text-[8.5px] font-bold tracking-wide uppercase ${
                                      req.status === 'Inprogress'
                                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/15'
                                        : req.status === 'Delay Labour'
                                        ? 'bg-[#fbbf24]/10 text-amber-500 border border-[#fbbf24]/15'
                                        : req.status === 'RFU_LEAD J' || req.status === 'Done'
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-blue-500/10 text-blue-400'
                                    }`}
                                  >
                                    {req.status}
                                  </span>
                                </td>

                                {/* Action buttons */}
                                <td className="px-2.5 py-1 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRequest(req);
                                        setIsAddOpen(true);
                                      }}
                                      className="p-1 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition cursor-pointer"
                                      title="Edit Service Request ini"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteRequest(req.id, req.srNumber, e)}
                                      className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition cursor-pointer"
                                      title="Hapus baris ini secara permanen"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Expanded Row Layout */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={11} className="bg-[#09090B] p-6 border-b border-[#27272A]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                      <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                          Jadwal & ID Dokumen:
                                        </h4>
                                        <div className="space-y-1.5 text-xs text-zinc-300 py-1 flex flex-col font-mono">
                                          <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                                            <span className="text-zinc-500 font-semibold">ID Ticket:</span>
                                            <span className="text-amber-450 font-bold">{req.ticketId || '-'}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                                            <span className="text-zinc-500 font-semibold">Nomor UC3:</span>
                                            <span className="text-blue-400 font-bold">{req.uc3Number || '-'}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                                            <span className="text-zinc-500 font-semibold">Nomor WO:</span>
                                            <span className="text-zinc-100">{req.woNumber || '-'}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800 pb-1">
                                            <span className="text-zinc-500 font-semibold">Jadwal Planning:</span>
                                            <span>{formatDateString(req.planningDate)}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800 pb-1">
                                            <span className="text-zinc-500 font-semibold">Tanggal Action:</span>
                                            <span>{formatDateString(req.actionDate)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-zinc-500 font-semibold">Tanggal RFU:</span>
                                            <span className="text-emerald-400 font-bold">{formatDateString(req.rfuDate)}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                          Tim Mekanik Lapangan:
                                        </h4>
                                        <div className="space-y-1.5 text-xs text-zinc-350 py-1 flex flex-col font-mono">
                                          {req.labour1 && (
                                            <div className="flex justify-between border-b border-zinc-800 pb-1">
                                              <span className="text-zinc-500 font-semibold">Mekanik 1 (Utama):</span>
                                              <span className="text-zinc-100 font-semibold">{req.labour1}</span>
                                            </div>
                                          )}
                                          {req.labour2 && (
                                            <div className="flex justify-between border-b border-zinc-800 pb-1">
                                              <span className="text-zinc-500 font-semibold">Mekanik 2:</span>
                                              <span>{req.labour2}</span>
                                            </div>
                                          )}
                                          {req.labour3 && (
                                            <div className="flex justify-between border-b border-zinc-800 pb-1">
                                              <span className="text-zinc-500 font-semibold">Mekanik 3:</span>
                                              <span>{req.labour3}</span>
                                            </div>
                                          )}
                                          {req.labour4 && (
                                            <div className="flex justify-between border-b border-zinc-800 pb-1">
                                              <span className="text-zinc-500 font-semibold">Mekanik 4:</span>
                                              <span>{req.labour4}</span>
                                            </div>
                                          )}
                                          {req.labour5 && (
                                            <div className="flex justify-between border-b border-zinc-800 pb-1">
                                              <span className="text-zinc-500 font-semibold">Mekanik 5:</span>
                                              <span>{req.labour5}</span>
                                            </div>
                                          )}
                                          {req.labour6 && (
                                            <div className="flex justify-between">
                                              <span className="text-zinc-500 font-semibold">Mekanik 6:</span>
                                              <span>{req.labour6}</span>
                                            </div>
                                          )}
                                          {!req.labour1 && !req.labour2 && !req.labour3 && !req.labour4 && !req.labour5 && !req.labour6 && (
                                            <span className="text-zinc-500">Belum ada mekanik ditugaskan</span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          Laporan Aktivitas Mekanik (LEAD JOB DESCRIPTION)
                                        </h4>
                                        <div className="bg-[#18181B] rounded-2xl p-4.5 border border-[#27272A] text-zinc-200 mt-1.5 text-xs leading-relaxed max-h-40 overflow-y-auto block whitespace-pre-wrap font-medium">
                                          {req.leadJobDescription || 'Tidak ada deskripsi pekerjaan tambahan yang terdaftar.'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'failure' && (
            <motion.div
              key="failure-tracker-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <FailureTrackerView scriptUrl={scriptUrl} />
            </motion.div>
          )}

          {activeTab === 'surattugas' && (
            <motion.div
              key="surat-tugas-tracker-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <SuratTugasTrackerView requests={requests} />
            </motion.div>
          )}

          {activeTab === 'guide' && (
            <motion.div
              key="panel-sync"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <GoogleAppsScriptGuide
                onSync={handleSyncWithGoogleAppScript}
                currentUrl={scriptUrl}
                isSyncing={isSyncing}
                onClear={clearScriptConnection}
                mockData={requests}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#27272A] py-4 bg-[#09090B] mt-6 text-center text-[11px] text-zinc-500 font-medium tracking-wide">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Heavy Equipment Service Tracker Uniquip Cabang Palangkaraya (Kalimantan Tengah)</p>
        </div>
      </footer>

      {/* ADD NEW REQUEST MODAL DIALOG */}
      <AddRequestModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingRequest(null);
        }}
        onSave={handleSaveRequest}
        editData={editingRequest}
      />
    </div>
  );
}
