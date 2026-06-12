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
  SlidersHorizontal,
  FileDown,
  Database,
  Eye,
  Settings,
  Calendar,
  Layers,
  Activity,
  UserCheck,
  ArrowDownToLine
} from 'lucide-react';

import { ServiceRequest, SuratTugas, FailureInformation } from './types';
import { INITIAL_SERVICE_REQUESTS } from './data/mockData';
import StatsCard from './components/StatsCard';
import AddRequestModal from './components/AddRequestModal';
import ChartsView from './components/ChartsView';
import GoogleAppsScriptGuide from './components/GoogleAppsScriptGuide';
import FailureTrackerView from './components/FailureTrackerView';
import SuratTugasTrackerView from './components/SuratTugasTrackerView';

export default function App() {
  // --- States ---
  const [requests, setRequests] = useState<ServiceRequest[]>(() => {
    const savedRequests = localStorage.getItem('service_requests');
    if (savedRequests) {
      try {
        const parsed = JSON.parse(savedRequests);
        return parsed.map((item: any) => ({
          ...item,
          labour1: item.labour1 || '',
          labour2: item.labour2 || '',
          labour3: item.labour3 || '',
          labour4: item.labour4 || '',
          labour5: item.labour5 || '',
          labour6: item.labour6 || '',
        }));
      } catch (e) {
        return INITIAL_SERVICE_REQUESTS;
      }
    }
    return INITIAL_SERVICE_REQUESTS;
  });

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
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'saving' | 'error' | 'idle'>('idle');
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

  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Sync automatically on start if we have a URL
  useEffect(() => {
    let initialUrl = DEFAULT_SCRIPT_URL;
    const savedUrl = localStorage.getItem('gs_script_url');
    if (savedUrl && savedUrl !== '') {
      initialUrl = savedUrl;
      setScriptUrl(savedUrl);
    }
    
    // Sync automatically on start if we have a URL
    if (initialUrl) {
      setIsSyncing(true);
      handleSyncWithGoogleAppScript(initialUrl, true)
        .then(() => {
          console.log("Initial load sync complete");
          setLastSyncTime(Date.now());
        })
        .catch(e => console.error("Initial load sync failed:", e))
        .finally(() => setIsSyncing(false));
    }
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
        const savedUrl = localStorage.getItem('gs_script_url');
        if (savedUrl) {
            handleSyncWithGoogleAppScript(savedUrl, true).catch(e => console.error("Auto-sync failed:", e));
        }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Sync assignments on update
  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('surat_tugas_assignments');
      setAssignments(saved ? JSON.parse(saved) : {});
    };
    window.addEventListener('suratTugasUpdated', handleUpdate);
    return () => window.removeEventListener('suratTugasUpdated', handleUpdate);
  }, []);

  // Save requests to localstorage whenever it changes
  const saveRequestsToStateAndStorage = (newRequests: ServiceRequest[]) => {
    setRequests(newRequests);
    localStorage.setItem('service_requests', JSON.stringify(newRequests));
  };

  const [assignments, setAssignments] = useState<Record<string, SuratTugas>>(() => {
    const saved = localStorage.getItem('surat_tugas_assignments');
    return saved ? JSON.parse(saved) : {};
  });
  
  // Save assignments to localstorage whenever it changes
  const saveAssignmentsToStateAndStorage = (newAssignments: Record<string, SuratTugas>) => {
    // Ensure all keys are normalized (uppercase) to prevent duplicates
    const normalized: Record<string, SuratTugas> = {};
    Object.keys(newAssignments).forEach(k => {
      if (k && k.trim()) {
        normalized[k.trim().toUpperCase()] = newAssignments[k];
      }
    });
    setAssignments(normalized);
    localStorage.setItem('surat_tugas_assignments', JSON.stringify(normalized));
    
    // Dispatch event to notify other components (like SuratTugasTrackerView)
    window.dispatchEvent(new CustomEvent('suratTugasUpdated', { detail: normalized }));
  };

  // --- Dynamic calculations ---
  const uniqueLocations = useMemo(() => {
    const locations = requests.map(r => r.location).filter(Boolean);
    return Array.from(new Set(locations));
  }, [requests]);

  const uniqueMechanics = useMemo(() => {
    // Map to store normalizedName -> OriginalName
    const namesMap = new Map<string, string>();
    const normalize = (name: string) => name.trim().toUpperCase();

    requests.forEach(r => {
      [r.labour1, r.labour2, r.labour3, r.labour4, r.labour5, r.labour6].forEach(labour => {
        if (labour && labour.trim()) {
          const norm = normalize(labour);
          if (!namesMap.has(norm)) {
            namesMap.set(norm, labour.trim());
          }
        }
      });
    });
    
    // Re-include mechanics from assignments so they can be selected in dropdowns
    Object.values(assignments).forEach((st: SuratTugas) => {
      if (st.mechanicName && st.mechanicName.trim()) {
        const norm = normalize(st.mechanicName);
        if (!namesMap.has(norm)) {
          namesMap.set(norm, st.mechanicName.trim());
        }
      }
    });
    
    return Array.from(namesMap.values()).sort((a, b) => a.localeCompare(b));
  }, [requests, assignments]);
  const filteredRequests = useMemo(() => {
    const filtered = requests.filter(req => {
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

    // Custom sort by status: Inprogress, Delay Labour, Waiting Payment Customer, RFU
    const statusOrder: Record<string, number> = {
      'Inprogress': 1,
      'Delay Labour': 2,
      'Waiting Payment Customer': 3,
      'RFU': 4
    };

    return filtered.sort((a, b) => {
      const statusA = (a.status || '').trim();
      const statusB = (b.status || '').trim();
      const orderA = statusOrder[statusA] || 99;
      const orderB = statusOrder[statusB] || 99;
      return orderA - orderB;
    });
  }, [requests, searchQuery, filterCondition, filterStatus, filterUc3Status, filterLocation]);

  // --- Sync Google Sheet via Apps Script ---
  const handleSyncWithGoogleAppScript = async (url: string, isAutoSync: boolean = false) => {
    setIsSyncing(true);
    if (!localStorage.getItem('gs_script_url')) {
      localStorage.setItem('gs_script_url', url);
    }
    try {
      const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'type=all&v=' + Date.now();
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Koneksi HTTP Gagal (Status ${response.status}). Pastikan URL Apps Script benar.`);
      }
      
      let rawData;
      const textData = await response.text();
      
      if (textData.trim().startsWith('<')) {
        console.error("Received HTML response instead of JSON:", textData.substring(0, 200));
        throw new Error("Script mengembalikan halaman Web/HTML. ⚠️ SOLUSI: 1) Deploy ulang Apps Script Anda. 2) Pilih tipe 'Web App'. 3) Pada pengaturan akses 'Who has access', pilih 'Anyone'.");
      }

      try {
        rawData = JSON.parse(textData);
      } catch (e: any) {
        throw new Error(`Gagal memparsing JSON. Data dari server tidak sesuai format. Detail: ${e.message}`);
      }
      
      let srData: any[] = [];
      let shouldUpdateServiceRequests = true;
      let shouldUpdateFailureInformations = true;
      let shouldUpdateSuratTugas = true;
      
      if (Array.isArray(rawData)) {
        // Compatibility for old Apps Script (returning pure array)
        if (rawData.length > 0 && rawData[0].fiNumber) {
           // It's an array of Failure Informations
           localStorage.setItem('failure_informations', JSON.stringify(rawData));
           window.dispatchEvent(new Event('fiDataUpdated'));
           shouldUpdateServiceRequests = false;
           shouldUpdateSuratTugas = false;
        } else {
           // It's an array of Service Requests
           srData = rawData;
           shouldUpdateFailureInformations = false;
           shouldUpdateSuratTugas = false;
        }
      } else if (rawData && typeof rawData === 'object') {
        if (rawData.sheetsFound) {
          shouldUpdateServiceRequests = !!rawData.sheetsFound.serviceRequests;
          shouldUpdateFailureInformations = !!rawData.sheetsFound.failureInformations;
          shouldUpdateSuratTugas = !!rawData.sheetsFound.suratTugas;
          
          // Debug logs for user
          console.log("Sheets found status:", rawData.sheetsFound);
        } else {
          // Compatibility for scripts without sheetsFound
          shouldUpdateServiceRequests = rawData.serviceRequests !== undefined;
          shouldUpdateFailureInformations = rawData.failureInformations && rawData.failureInformations.length > 0;
          shouldUpdateSuratTugas = rawData.suratTugas && rawData.suratTugas.length > 0;
        }

        if (shouldUpdateServiceRequests && rawData.serviceRequests) {
          srData = rawData.serviceRequests;
        } else if (rawData.serviceRequests === undefined && !rawData.sheetsFound) {
          // If neither found nor provided, we shouldn't wipe data
          shouldUpdateServiceRequests = false;
        }
        
        if (shouldUpdateFailureInformations && rawData.failureInformations) {
          const localFailureInfo = JSON.parse(localStorage.getItem('failure_informations') || '[]');
          
          if (rawData.failureInformations.length === 0 && localFailureInfo.length > 5) {
            if (isAutoSync) {
              console.warn("Auto-sync returned 0 Failure Informations. Ignoring to prevent data loss.");
            } else {
              if (!window.confirm("Sinkronisasi mengembalikan 0 data Failure Information. Apakah Anda yakin ingin mengosongkan dashboard?")) {
                shouldUpdateFailureInformations = false;
              } else {
                localStorage.setItem('failure_informations', JSON.stringify([]));
                window.dispatchEvent(new Event('fiDataUpdated'));
              }
            }
          } else {
            // Map remote data while preserving ALL original fields from Sheet
            const sanitizedFi: FailureInformation[] = rawData.failureInformations.map((item: any, idx: number) => ({
              ...item, // Preserve columns Y to AI and any others
              id: item.id || `fi-${idx}-${Date.now()}`,
              customer: item.customer || item['CUSTOMER'] || '',
              fiNumber: item.fiNumber || item['FI NUMBER'] || '',
              fiDate: item.fiDate || item['FI DATE'] || '',
              fiAging: parseInt(item.fiAging || item['FI AGING (DAYS)'] || item['FI AGING']) || 0,
              fiStatus: item.fiStatus || item['FI STATUS'] || 'Waiting Decision',
              partStatus: item.partStatus || item['PART STATUS'] || 'Waiting Part',
              planningProgress: item.planningProgress || item['PLANNING PROGRESS'] || '',
              evidentPm: item.evidentPm || item['EVIDENT PM'] || '',
              createBy: item.createBy || item['CREATE BY'] || '',
              action: item.action || item['ACTION'] || '',
              status: item.status || item['STATUS'] || 'waiting decision'
            }));

            localStorage.setItem('failure_informations', JSON.stringify(sanitizedFi));
            window.dispatchEvent(new Event('fiDataUpdated'));
          }
        }

        if (shouldUpdateSuratTugas) {
          const currentLocal = JSON.parse(localStorage.getItem('surat_tugas_assignments') || '{}');
          const assignmentsRecord: Record<string, any> = { ...currentLocal };
          
          if (rawData.suratTugas && Array.isArray(rawData.suratTugas)) {
            // De-duplicate incoming sheet data: map normalized name -> best record
            const sheetRecords: Record<string, any> = {};
            rawData.suratTugas.forEach((st: any) => {
              const mName = st.mechanicName || st['NAMA MEKANIK'];
              if (mName) {
                const normalized = mName.trim().toUpperCase();
                const existing = sheetRecords[normalized];
                
                // Keep all original fields from the sheet item to prevent data loss
                const mergedRecord = {
                  ...(existing || {}),
                  ...st, // Spread ALL original fields from Google Sheet
                  mechanicName: mName.trim(), 
                  startDate: st.startDate || st['ST MULAI'] || '',
                  endDate: st.endDate || st['ST SELESAI'] || '',
                  lastDateDeclaration: st.lastDateDeclaration || st['LAST DATE DECLARATION'] || '',
                  statusTugas: st.statusTugas || st['STATUS TUGAS'] || 'Surat Tugas',
                  deklarasi: st.deklarasi || st['DEKLARASI (%)'] || '',
                  hariSt: st.hariSt || st['HARI ST'] || '',
                  kpiScore: st.kpiScore || st['PENCAPAIAN KPI (SENIN-JUMAT)'] || '',
                  tindakan: st.tindakan || st['TINDAKAN'] || ''
                };

                // Keep the record that has more data (e.g., startDate or endDate)
                if (!existing || (!existing.startDate && (st.startDate || st['ST MULAI']))) {
                  sheetRecords[normalized] = mergedRecord;
                }
              }
            });

            const localSTCount = Object.keys(currentLocal).length;
            const sheetCount = Object.keys(sheetRecords).length;
            
            // If it's a confirmed empty fetch during auto-sync, be cautious
            if (sheetCount === 0 && localSTCount > 5) {
              if (isAutoSync) {
                console.warn("Auto-sync returned 0 Surat Tugas. Ignoring to prevent data loss.");
              } else {
                if (!window.confirm("Sinkronisasi mengembalikan 0 data Surat Tugas (Mekanik). Apakah Anda yakin ingin mengosongkan daftar mekanik di dashboard? (Disarankan: Periksa header sheet target Anda)")) {
                  shouldUpdateSuratTugas = false;
                } else {
                  saveAssignmentsToStateAndStorage(assignmentsRecord);
                }
              }
            } else {
              // Merge sheet records into assignments (remote priority for overlapping)
              Object.keys(sheetRecords).forEach(key => {
                assignmentsRecord[key] = sheetRecords[key];
              });
              saveAssignmentsToStateAndStorage(assignmentsRecord);
            }
          }
        }
      } else {
        throw new Error('Format balikan JSON tidak valid (bukan Array dan bukan Object yang diharapkan).');
      }

      if (shouldUpdateServiceRequests) {
        // Map rawData to guarantee id presence while preserving ALL other original fields
        const sanitized: ServiceRequest[] = srData.map((item: any, idx: number) => ({
          ...item, // Preserve all original spreadsheet columns
          id: item.id || (idx + 1).toString(),
          customerName: item.customerName || item['Customer Name'] || '',
          srNumber: item.srNumber || item['Nomor SR'] || '',
          woNumber: item.woNumber || item['Nomor WO'] || '',
          uc3Number: item.uc3Number || item['Nomor UC3'] || '',
          uc3Status: item.uc3Status || item['Status UC3'] || 'None',
          srDate: formatDateString(item.srDate || item['Tanggal SR'] || ''),
          srAging: parseInt(item.srAging || item['SR Aging']) || 0,
          planningDate: formatDateString(item.planningDate || item['Jadwal Planning'] || ''),
          actionDate: formatDateString(item.actionDate || item['Tanggal Action'] || ''),
          rfuDate: formatDateString(item.rfuDate || item['Tanggal RFU'] || ''),
          unitCondition: item.unitCondition || item['Kondisi Alat'] || 'Running Without Trouble',
          snUnit: item.snUnit || item['SN'] || '',
          model: item.model || item['Model'] || 'HX210HD',
          issueDescription: item.issueDescription || item['Deskripsi Masalah'] || item['Isi / Deskripsi Masalah'] || '',
          location: item.location || item['Lokasi'] || item['Lokasi / Sektor'] || '',
          labour1: item.labour1 || item['Mekanik 1'] || '',
          labour2: item.labour2 || item['Mekanik 2'] || '',
          labour3: item.labour3 || item['Mekanik 3'] || '',
          labour4: item.labour4 || item['Mekanik 4'] || '',
          labour5: item.labour5 || item['Mekanik 5'] || '',
          labour6: item.labour6 || item['Mekanik 6'] || '',
          status: item.status || item['Status Pekerjaan'] || 'Inprogress',
          leadJobDescription: item.leadJobDescription || item['Deskripsi Pekerjaan'] || item['LEAD JOB DESCRIPTION'] || '',
          ticketId: item.ticketId || item['ID Ticket'] || '',
          aksi: item.aksi || '',
          // New fields for A-AJ
          component: item.component || item['Component'] || item['Komponen'] || '',
          partNumber: item.partNumber || item['Part Number'] || item['Nomor Part'] || '',
          partDescription: item.partDescription || item['Part Description'] || item['Deskripsi Part'] || '',
          qty: parseFloat(item.qty || item['Qty'] || '0') || 0,
          price: parseFloat(item.price || item['Price'] || item['Harga'] || '0') || 0,
          totalPrice: parseFloat(item.totalPrice || item['Total Price'] || item['Total Harga'] || '0') || 0,
          remarks: item.remarks || item['Remarks'] || item['Keterangan'] || '',
          lastUpdated: formatDateString(item.lastUpdated || item['Last Updated'] || item['Update Terakhir'] || ''),
          updatedBy: item.updatedBy || item['Updated By'] || item['Diperbarui Oleh'] || '',
          segment: item.segment || item['Segment'] || item['Segmen'] || ''
        }));

        // Safeguard: If we have local data and sync returns 0 rows, 
        // we might ignore it during auto-sync to prevent "disappearing" data if it's a transient failure
        const localCount = requests.length;
        if (sanitized.length === 0 && localCount > 5) {
          if (isAutoSync) {
            console.warn("Auto-sync returned 0 Service Requests. Ignoring to prevent data loss.");
          } else {
            if (!window.confirm("Sinkronisasi mengembalikan 0 data Service Request. Apakah Anda yakin ingin mengosongkan dashboard? (Disarankan: Periksa header sheet target Anda)")) {
              shouldUpdateServiceRequests = false;
            } else {
              saveRequestsToStateAndStorage(sanitized);
            }
          }
        } else {
          saveRequestsToStateAndStorage(sanitized);
        }
      }
      
      setScriptUrl(url);
      localStorage.setItem('gs_script_url', url);
      
      if (!isAutoSync) {
        setLastSyncTime(Date.now());
        const srStatus = shouldUpdateServiceRequests ? (srData.length > 0 ? "🟢" : "🟡") : "⚪";
        const fiStatus = shouldUpdateFailureInformations ? (rawData.failureInformations.length > 0 ? "🟢" : "🟡") : "⚪";
        const stStatus = shouldUpdateSuratTugas ? (rawData.suratTugas.length > 0 ? "🟢" : "🟡") : "⚪";

        const srMsg = shouldUpdateServiceRequests 
          ? `${srStatus} Service Requests: ${srData.length} baris` 
          : `${srStatus} Service Requests: Dipertahankan (Sheet tidak ditemukan)`;
        
        const fiMsg = shouldUpdateFailureInformations 
          ? `${fiStatus} Failure Informations: ${rawData && rawData.failureInformations ? rawData.failureInformations.length : 0} baris` 
          : `${fiStatus} Failure Informations: Dipertahankan (Sheet tidak ditemukan)`;
        
        const stMsg = shouldUpdateSuratTugas 
          ? `${stStatus} KPI & Surat Tugas: ${rawData && rawData.suratTugas ? rawData.suratTugas.length : 0} baris` 
          : `${stStatus} KPI & Surat Tugas: Dipertahankan (Sheet tidak ditemukan)`;
        
        alert(`SINKRONISASI SELESAI:
------------------------------------------
${srMsg}
${fiMsg}
${stMsg}
------------------------------------------

* "Dipertahankan" berarti data lokal tetap dijaga karena sheet target tidak ditemukan (Check header: 'NOMOR SR', 'NOMOR FI', atau 'NAMA MEKANIK').

${(!shouldUpdateServiceRequests && !shouldUpdateFailureInformations && !shouldUpdateSuratTugas) ? "⚠️ Peringatan: Tidak ada sheet yang cocok." : "✅ Sinkronisasi Berhasil."}`);
      }
    } catch (err: any) {
      console.error('Apps script error:', err);
      if (!isAutoSync) {
        throw new Error(`Data Apps Script gagal di-fetch.\nDetail: ${err.message || ''}\n\n* Jika Anda baru saja memperbarui script, pastikan untuk membuat DEPLOYMENT BARU (New Deployment), bukan hanya Test Deployment.`);
      }
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
      setCloudStatus('saving');
      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ 
            action: reqData.id ? 'update' : 'add', 
            type: 'service_request', 
            data: freshData 
          })
        });
        
        const result = await res.json();
        if (result.status === 'success') {
          setCloudStatus('synced');
          setTimeout(() => setCloudStatus('idle'), 3000);
        } else {
          setCloudStatus('error');
        }
      } catch (err) {
        console.error("Failed to sync to Google Sheets", err);
        setCloudStatus('error');
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
        setCloudStatus('saving');
        try {
          const res = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'delete', type: 'service_request', data: { id, srNumber } })
          });
          if (res.ok) {
            setCloudStatus('synced');
            setTimeout(() => setCloudStatus('idle'), 3000);
          } else {
            setCloudStatus('error');
          }
        } catch (err) {
          console.error("Failed to sync delete to Google Sheets", err);
          setCloudStatus('error');
        }
      }
    }
  };

  // --- Exporters ---
  const handleExportCSV = () => {
    const headers = [
      'SR Number', 'WO Number', 'UC3 Number', 'UC3 Status', 'SR Date', 'SR Aging',
      'Planning Date', 'Action Date', 'RFU Date', 'Unit Condition', 'SN Unit',
      'Model', 'Issue Description', 'Location', 'Labour 1', 'Labour 2', 'Labour 3', 'Labour 4', 'Labour 5', 'Labour 6', 'Status',
      'LEAD JOB DESCRIPTION', 'Aksi', 'Component', 'Part Number', 'Part Description', 'Qty', 'Price', 'Total Price', 'Remarks',
      'Last Updated', 'Updated By', 'Segment'
    ];
    
    const content = filteredRequests.map(r => [
      r.srNumber, r.woNumber, r.uc3Number, r.uc3Status, r.srDate, r.srAging,
      r.planningDate, r.actionDate, r.rfuDate, r.unitCondition, r.snUnit,
      r.model, r.issueDescription, r.location, r.labour1, r.labour2, r.labour3 || '', r.labour4 || '', r.labour5 || '', r.labour6 || '', r.status,
      `"${(r.leadJobDescription || '').replace(/"/g, '""')}"`,
      r.aksi || '',
      r.component || '',
      r.partNumber || '',
      r.partDescription || '',
      r.qty || 0,
      r.price || 0,
      r.totalPrice || 0,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
      r.lastUpdated || '',
      r.updatedBy || '',
      r.segment || ''
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

  const [isPushing, setIsPushing] = useState(false);
  const handlePushAllToSheets = async () => {
    if (requests.length === 0) {
      alert('Tidak ada data SR lokal untuk didorong ke Google Sheets.');
      return;
    }
    
    // Safety check: Jangan izinkan push jika belum pernah fetch di sesi ini
    if (!lastSyncTime) {
      if (!window.confirm('Dashboard belum melakukan sinkronisasi dengan Google Sheet di sesi ini. Melakukan push sekarang berisiko menimpa data terbaru di Sheet dengan data lokal yang mungkin usang. Lanjutkan?')) {
        return;
      }
    }

    if (!window.confirm(`Anda akan mereplace SEMUA baris Service Request di Sheet dengan ${requests.length} data ini. Seluruh kolom asli akan dipertahankan berdasarkan data terakhir yang ditarik. Yakin?`)) {
      return;
    }
    const scriptUrl = localStorage.getItem('gs_script_url');
    if (!scriptUrl) {
      alert('Google Apps Script URL belum diatur di menu Sinkronisasi!');
      return;
    }
    setIsPushing(true);
    try {
       const res = await fetch(scriptUrl, {
         method: 'POST',
         headers: { 'Content-Type': 'text/plain;charset=utf-8' },
         body: JSON.stringify({ 
           action: 'bulk_replace', 
           type: 'service_request',
           payload: requests
         })
       });
       console.log(await res.text());
       alert('Berhasil mendorong semua data SR ke Google Sheets!');
    } catch (err: any) {
       console.error("Gagal push ke Google Sheets", err);
       alert("Gagal push data. " + err.message);
    } finally {
       setIsPushing(false);
    }
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
            {/* Cloud Sync Status */}
            {scriptUrl && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-xl mr-2">
                <div className={`w-2 h-2 rounded-full ${
                  cloudStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                  cloudStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
                  cloudStatus === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                  'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                }`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {cloudStatus === 'synced' ? 'Cloud Terupdate' :
                   cloudStatus === 'saving' ? 'Menyimpan ke Cloud...' :
                   cloudStatus === 'error' ? 'Gagal Sinkron' :
                   'Cloud Terhubung'}
                </span>
              </div>
            )}

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
              className={`px-4 py-2 rounded-lg text-[12px] font-bold tracking-wide uppercase transition cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-zinc-800 text-white shadow-md ring-1 ring-zinc-700'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              Service Request Tracker
            </button>
            <button
              onClick={() => setActiveTab('failure')}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold tracking-wide uppercase transition cursor-pointer ${
                activeTab === 'failure'
                  ? 'bg-amber-700 text-white shadow-md ring-1 ring-amber-600'
                  : 'text-zinc-400 hover:text-amber-400 hover:bg-amber-900/20'
              }`}
            >
              Failure Information Tracker
            </button>
            <button
              onClick={() => setActiveTab('surattugas')}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold tracking-wide uppercase transition cursor-pointer ${
                activeTab === 'surattugas'
                  ? 'bg-yellow-700 text-white shadow-md ring-1 ring-yellow-600'
                  : 'text-zinc-400 hover:text-yellow-400 hover:bg-yellow-900/20'
              }`}
            >
              Surat Tugas Tracker
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold tracking-wide uppercase transition cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-blue-700 text-white shadow-md ring-1 ring-blue-600'
                  : 'text-zinc-400 hover:text-blue-400 hover:bg-blue-900/20'
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
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="text-[10px] font-medium text-zinc-400 bg-[#09090B] border border-[#27272A] px-2.5 py-1.5 rounded-lg">
                      Sektor Sektor Aktif: <span className="text-blue-400 font-extrabold">{filterLocation === 'All' ? 'Semua Wilayah' : filterLocation}</span>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#09090B] text-zinc-400 border-b border-[#27272A] text-[9.5px] font-bold tracking-widest uppercase">
                        <th className="px-2.5 py-1.5 w-10 text-center">Detail</th>
                        <th className="px-2.5 py-1.5">Customer Name</th>
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
                                
                                {/* CUSTOMER NAME */}
                                <td className="px-2.5 py-1">
                                  <div className="font-sans font-medium text-zinc-300 text-[10px] uppercase truncate max-w-[120px]">
                                    {req.customerName || '-'}
                                  </div>
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
                                        <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          Informasi Tambahan & Part:
                                        </h4>
                                        <div className="space-y-1.5 text-xs text-zinc-350 py-1 flex flex-col font-mono">
                                          <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                                            <span className="text-zinc-500 font-semibold">Komponen:</span>
                                            <span className="text-zinc-200">{req.component || '-'}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                                            <span className="text-zinc-500 font-semibold">Part Number:</span>
                                            <span className="text-blue-300">{req.partNumber || '-'}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                                            <span className="text-zinc-500 font-semibold">Qty:</span>
                                            <span className="text-zinc-200">{req.qty || 0}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800/60 pb-1">
                                            <span className="text-zinc-500 font-semibold">Price:</span>
                                            <span className="text-zinc-200">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(req.price || 0)}</span>
                                          </div>
                                          <div className="flex justify-between border-b border-zinc-800/60 pb-1 font-bold">
                                            <span className="text-zinc-500 font-semibold">Total Price:</span>
                                            <span className="text-emerald-400">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(req.totalPrice || 0)}</span>
                                          </div>
                                          <div className="flex flex-col pt-1">
                                            <span className="text-zinc-500 font-semibold">Remarks:</span>
                                            <span className="text-zinc-400 text-[10px] bg-zinc-900/50 p-2 rounded mt-1 border border-zinc-800 leading-relaxed italic">{req.remarks || 'Tidak ada keterangan tambahan.'}</span>
                                          </div>
                                          <div className="mt-2 text-[9px] text-zinc-600 flex justify-between italic">
                                            <span>Terakhir Update: {req.lastUpdated || '-'}</span>
                                            <span>Oleh: {req.updatedBy || 'System'}</span>
                                          </div>
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
        uniqueMechanics={uniqueMechanics}
      />
    </div>
  );
}
