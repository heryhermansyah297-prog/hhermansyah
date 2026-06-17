/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Calendar,
  Eraser,
  TrendingUp,
  UserCheck,
  Clock,
  Briefcase,
  SlidersHorizontal,
  ChevronRight,
  Info,
  X,
  Trash2,
  ArrowDownToLine
} from 'lucide-react';
import { ServiceRequest, SuratTugas } from '../types';

interface SuratTugasTrackerViewProps {
  requests: ServiceRequest[];
}

export default function SuratTugasTrackerView({ requests }: SuratTugasTrackerViewProps) {
  // --- States ---
  const [assignments, setAssignments] = useState<Record<string, SuratTugas>>(() => {
    const saved = localStorage.getItem('surat_tugas_assignments');
    return saved ? JSON.parse(saved) : {};
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Active' | 'Idle'>('All');
  const [filterKPI, setFilterKPI] = useState<string>('All');
  const [isAddMechanicModalOpen, setIsAddMechanicModalOpen] = useState(false);
  const [newMechanicName, setNewMechanicName] = useState('');
  const [isDeleteMechanicModalOpen, setIsDeleteMechanicModalOpen] = useState(false);
  const [mechanicToDelete, setMechanicToDelete] = useState('');
  const [deletedMechanics, setDeletedMechanics] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load from localStorage on initialization
  useEffect(() => {
    const loadAssignments = () => {
      const saved = localStorage.getItem('surat_tugas_assignments');
      if (saved) {
        try {
          setAssignments(JSON.parse(saved));
          setRefreshKey(prev => prev + 1);
        } catch (e) {
          console.error('Failed to parse surat_tugas_assignments', e);
        }
      }
    };
    
    // loadAssignments is already done at init, but re-load if storage changes
    
    const savedDeleted = localStorage.getItem('surat_tugas_deleted');
    if (savedDeleted) {
      try {
        setDeletedMechanics(JSON.parse(savedDeleted));
      } catch (e) {
        console.error('Failed to parse surat_tugas_deleted', e);
      }
    }

    const handleUpdate = (e: any) => {
      if (e instanceof CustomEvent && e.detail) {
        setAssignments(e.detail);
        setRefreshKey(prev => prev + 1);
      } else {
        loadAssignments();
      }
    };

    window.addEventListener('suratTugasUpdated', handleUpdate);
    return () => {
      window.removeEventListener('suratTugasUpdated', handleUpdate);
    };
  }, []);

  const computeMetricsForAssignment = (assignmentToSave: any) => {
    const maxDeclDays = assignmentToSave.statusTugas === 'Lumpsum' ? 15 : 14;
    let declarationElapsed = 0;
    if (assignmentToSave.lastDateDeclaration) {
      const lastDecl = new Date(assignmentToSave.lastDateDeclaration);
      const today = new Date();
      if (!isNaN(lastDecl.getTime())) {
        declarationElapsed = Math.floor((today.getTime() - lastDecl.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else if (assignmentToSave.startDate) {
      const start = new Date(assignmentToSave.startDate);
      const today = new Date();
      if (!isNaN(start.getTime())) {
        declarationElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    const deklarasiVal = Math.max(0, Math.round((declarationElapsed / maxDeclDays) * 100));

    let durationDays = 0;
    let weekdayCount = 0;
    if (assignmentToSave.startDate && assignmentToSave.endDate) {
      const start = new Date(assignmentToSave.startDate);
      const end = new Date(assignmentToSave.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const tempDate = new Date(start);
        if (end.getTime() - start.getTime() < 366 * 24 * 60 * 60 * 1000) {
          while (tempDate <= end) {
            const day = tempDate.getDay();
            if (day >= 1 && day <= 5) weekdayCount++;
            tempDate.setDate(tempDate.getDate() + 1);
          }
        }
      }
    }
    const kpiVal = assignmentToSave.startDate && assignmentToSave.endDate 
      ? Math.min(100, Math.round((weekdayCount / 5) * 100))
      : 0;

    let grade = '-';
    if (assignmentToSave.startDate && assignmentToSave.endDate) {
      if (kpiVal >= 100) grade = 'A+';
      else if (kpiVal >= 90) grade = 'A';
      else if (kpiVal >= 80) grade = 'B+';
      else if (kpiVal >= 70) grade = 'B';
      else if (kpiVal >= 60) grade = 'C';
      else if (kpiVal > 0) grade = 'D';
      else grade = 'F';
    }

    return {
      ...assignmentToSave,
      deklarasi: (assignmentToSave.startDate || assignmentToSave.lastDateDeclaration) ? deklarasiVal + '%' : '',
      hariSt: durationDays > 0 ? durationDays : '',
      kpiScore: grade === '-' ? '-' : `${kpiVal}% (${grade})`,
      tindakan: assignmentToSave.tindakan || '-'
    };
  };

  // Save specific mechanic assignment
  const saveAssignment = async (mechanicName: string, fields: Partial<SuratTugas>) => {
    const key = mechanicName.trim().toUpperCase();
    const existing = assignments[key] || { mechanicName, startDate: '', endDate: '' };
    
    const assignmentToSave = {
      ...existing,
      ...fields,
      mechanicName // ensure name is preserved
    };
    
    const updated = {
      ...assignments,
      [key]: assignmentToSave
    };
    setAssignments(updated);
    setRefreshKey(prev => prev + 1);
    localStorage.setItem('surat_tugas_assignments', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('suratTugasUpdated', { detail: updated }));

    // Remove from deleted list if it was there
    const updatedDeleted = deletedMechanics.filter(d => d.trim().toLowerCase() !== mechanicName.trim().toLowerCase());
    setDeletedMechanics(updatedDeleted);
    localStorage.setItem('surat_tugas_deleted', JSON.stringify(updatedDeleted));
    
    // Sync to Google Sheets
    const scriptUrl = localStorage.getItem('gs_script_url');
    if (scriptUrl) {
      setSaveStatus('saving');
      try {
        const payloadWithMetrics = computeMetricsForAssignment(assignmentToSave);
        
        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: existing.startDate || existing.statusTugas ? 'update' : 'add',
            type: 'surat_tugas',
            data: payloadWithMetrics
          })
        });
        const result = await res.json();
        if (result.status === 'success') {
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error("Failed to sync surat tugas to Google Sheets", err);
        setSaveStatus('error');
      }
    }
  };

  // Clear specific assignment
  const handleClear = async (mechanicName: string) => {
    const key = mechanicName.trim().toUpperCase();
    const updated = { ...assignments };
    const existing = updated[key];
    delete updated[key];
    setAssignments(updated);
    setRefreshKey(prev => prev + 1);
    localStorage.setItem('surat_tugas_assignments', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('suratTugasUpdated', { detail: updated }));
    
    const scriptUrl = localStorage.getItem('gs_script_url');
    if (scriptUrl && existing) {
      setSaveStatus('saving');
      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'delete',
            type: 'surat_tugas',
            data: { mechanicName }
          })
        });
        if (res.ok) {
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error("Failed to sync delete to Google Sheets", err);
        setSaveStatus('error');
      }
    }
  };

  // Clear all assignments
  const handleClearAll = () => {
    if (window.confirm('Apakah Anda yakin ingin membersihkan semua surat tugas mekanik?')) {
      const empty = {};
      setAssignments(empty);
      setRefreshKey(prev => prev + 1);
      localStorage.removeItem('surat_tugas_assignments');
      window.dispatchEvent(new CustomEvent('suratTugasUpdated', { detail: empty }));
    }
  };

  // Quick submit for delete mechanic
  const submitDeleteMechanic = async () => {
    if (mechanicToDelete.trim()) {
      const trimmed = mechanicToDelete.trim();
      const updatedDeleted = [...deletedMechanics, trimmed];
      setDeletedMechanics(updatedDeleted);
      localStorage.setItem('surat_tugas_deleted', JSON.stringify(updatedDeleted));
      
      // Also remove from assignments if it's there
      const key = trimmed.toUpperCase();
      const updatedAssignments = { ...assignments };
      if (updatedAssignments[key]) {
        delete updatedAssignments[key];
        setAssignments(updatedAssignments);
        setRefreshKey(prev => prev + 1);
        localStorage.setItem('surat_tugas_assignments', JSON.stringify(updatedAssignments));
        window.dispatchEvent(new CustomEvent('suratTugasUpdated', { detail: updatedAssignments }));
        
        // Sync delete to Google Sheets
        const scriptUrl = localStorage.getItem('gs_script_url');
        if (scriptUrl) {
          try {
            await fetch(scriptUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'delete',
                type: 'surat_tugas',
                data: { mechanicName: trimmed }
              })
            });
          } catch (err) {
            console.error("Failed to sync delete to Google Sheets", err);
          }
        }
      }

      setIsDeleteMechanicModalOpen(false);
      setMechanicToDelete('');
    }
  };

  const [isPushing, setIsPushing] = useState(false);
  const handlePushAllToSheets = async () => {
    const list = Object.values(assignments).map(a => computeMetricsForAssignment(a));
    if (list.length === 0) {
      alert('Tidak ada data mekanik lokal untuk didorong ke Google Sheets.');
      return;
    }

    const scriptUrl = localStorage.getItem('gs_script_url');
    if (!scriptUrl) {
      alert('Google Apps Script URL belum diatur di menu Sinkronisasi!');
      return;
    }

    if (!window.confirm(`Anda akan mereplace SEMUA baris Surat Tugas di Sheet dengan ${list.length} data ini. Kolom tambahan yang tidak ada di dashboard (A-AI) akan TETAP DIPERTAHANKAN sesuai data terakhir yang ditarik. Yakin?`)) {
      return;
    }
    setIsPushing(true);
    try {
       const res = await fetch(scriptUrl, {
         method: 'POST',
         headers: { 'Content-Type': 'text/plain;charset=utf-8' },
         body: JSON.stringify({ 
           action: 'bulk_replace', 
           type: 'surat_tugas',
           payload: list
         })
       });
       console.log(await res.text());
       alert('Berhasil mendorong semua data Surat Tugas ke Google Sheets!');
    } catch (err: any) {
       console.error("Gagal push ke Google Sheets", err);
       alert("Gagal push data. " + err.message);
    } finally {
       setIsPushing(false);
    }
  };

  // Extract all unique mechanics dynamically from the requests list
  const getUniqueMechanics = (): string[] => {
    // Map to store normalizedName -> OriginalName
    const names = new Map<string, string>();
    const normalize = (name: string) => name.trim().toUpperCase();

    requests.forEach(r => {
      [r.labour1, r.labour2, r.labour3, r.labour4, r.labour5, r.labour6].forEach(labour => {
        if (labour && labour.trim()) {
          const norm = normalize(labour);
          if (!names.has(norm)) {
            names.set(norm, labour.trim());
          }
        }
      });
    });
    
    // Add manually assigned mechanics from localStorage
    Object.values(assignments).forEach((st: SuratTugas) => {
      if (st.mechanicName && st.mechanicName.trim()) {
        const norm = normalize(st.mechanicName);
        if (!names.has(norm)) {
          names.set(norm, st.mechanicName.trim());
        }
      }
    });
    
    // Filter out deleted mechanics
    deletedMechanics.forEach(name => names.delete(normalize(name)));
    
    // Return sorted original names
    return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
  };

  const uniqueMechanics = useMemo(() => {
    const list = getUniqueMechanics();
    console.log("Unique Mechanics:", list);
    console.log("Assignments:", assignments);
    console.log("Requests:", requests);
    return list;
  }, [requests, assignments, deletedMechanics]);

  // Helper mapping: compile each mechanic with their calculated statistics
  const mechanicsCompiled = useMemo(() => {
    return uniqueMechanics.map(name => {
      const normName = name.trim().toLowerCase();
      // Find all service requests assigned to this mechanic
      const assignedRequests = requests.filter(r => 
        (r.labour1 || '').trim().toLowerCase() === normName ||
        (r.labour2 || '').trim().toLowerCase() === normName ||
        (r.labour3 || '').trim().toLowerCase() === normName ||
        (r.labour4 || '').trim().toLowerCase() === normName ||
        (r.labour5 || '').trim().toLowerCase() === normName ||
        (r.labour6 || '').trim().toLowerCase() === normName
      );

      // Active = status is NOT "RFU" and NOT "Done" and NOT "Resolved" and NOT empty.
      const activeRequests = assignedRequests.filter(r => {
        const s = (r.status || '').trim().toUpperCase();
        return s !== '' && s !== 'RFU' && s !== 'DONE' && s !== 'RESOLVED';
      });

      const activeCount = activeRequests.length;
      
      // RFU percentage = (completed / total) * 100
      const totalCount = assignedRequests.length;
      const completedCount = totalCount - activeCount;
      const rfuPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Extract Surat Tugas values
      // Use case-insensitive and whitespace-insensitive lookup
      const normalizedAssignmentKey = Object.keys(assignments).find(k => k.trim().toLowerCase() === name.trim().toLowerCase());
      const st = (normalizedAssignmentKey ? assignments[normalizedAssignmentKey] : null) || { mechanicName: name, startDate: '', endDate: '' };
      
      const startDate = st.startDate;
      const endDate = st.endDate;
      const statusTugas = st.statusTugas || 'Surat Tugas';
      const lastDateDeclaration = st.lastDateDeclaration || '';
      
      const maxDeclDays = statusTugas === 'Lumpsum' ? 15 : 14;
      let declarationElapsed = 0;
      if (lastDateDeclaration) {
        const lastDecl = new Date(lastDateDeclaration);
        const today = new Date();
        if (!isNaN(lastDecl.getTime())) {
          declarationElapsed = Math.floor((today.getTime() - lastDecl.getTime()) / (1000 * 60 * 60 * 24));
        }
      } else if (startDate) {
        const start = new Date(startDate);
        const today = new Date();
        if (!isNaN(start.getTime())) {
          declarationElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      const declarationPercentage = Math.max(0, Math.round((declarationElapsed / maxDeclDays) * 100));

      // 1. Calculate duration in calendar days (inclusive)
      let durationDays = 0;
      let weekdayCount = 0;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          // 2. Calculate weekday count (Mon-Fri) in the range
          const tempDate = new Date(start);
          // Protect against freeze / safe limit of 1 year
          if (end.getTime() - start.getTime() < 366 * 24 * 60 * 60 * 1000) {
            while (tempDate <= end) {
              const day = tempDate.getDay(); // 0 = Sun, 6 = Sat
              if (day >= 1 && day <= 5) {
                weekdayCount++;
              }
              tempDate.setDate(tempDate.getDate() + 1);
            }
          }
        }
      }

      // 3. KPI score based on weekdayCount. A standard week contains 5 days.
      // So formula is: (weekdays in range / 5 target) * 100, capped at 100.
      const kpiPercentage = startDate && endDate 
        ? Math.min(100, Math.round((weekdayCount / 5) * 100))
        : 0;

      // Grade classification matches professional criteria
      let grade = '-';
      if (startDate && endDate) {
        if (kpiPercentage >= 100) grade = 'A+';
        else if (kpiPercentage >= 90) grade = 'A';
        else if (kpiPercentage >= 80) grade = 'B+';
        else if (kpiPercentage >= 70) grade = 'B';
        else if (kpiPercentage >= 60) grade = 'C';
        else grade = 'D';
      }

      const tindakan = st.tindakan || '';

      return {
        name,
        totalSR: totalCount,
        activeSR: activeCount,
        rfuRate: rfuPercentage,
        startDate,
        endDate,
        durationDays,
        weekdayCount,
        kpiPercentage,
        grade,
        statusTugas,
        lastDateDeclaration,
        declarationPercentage,
        tindakan
      };
    });
  }, [uniqueMechanics, requests, assignments]);

  // --- Filtering Logic ---
  const filteredMechanics = useMemo(() => {
    return mechanicsCompiled.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const hasST = m.startDate && m.endDate;
      const matchesMode = 
        filterMode === 'All' ||
        (filterMode === 'Active' && hasST) ||
        (filterMode === 'Idle' && !hasST);

      const matchesKPI = filterKPI === 'All' || m.grade === filterKPI;

      return matchesSearch && matchesMode && matchesKPI;
    });
  }, [mechanicsCompiled, searchQuery, filterMode, filterKPI]);

  // --- Dynamic Dashboard Summary KPIs ---
  const summaryKPIs = useMemo(() => {
    const total = mechanicsCompiled.length;
    const activeST = mechanicsCompiled.filter(m => m.startDate && m.endDate).length;
    const idleST = total - activeST;
    
    const activeSTRecords = mechanicsCompiled.filter(m => m.startDate && m.endDate);
    const avgDuration = activeSTRecords.length > 0
      ? Math.round(activeSTRecords.reduce((sum, m) => sum + m.durationDays, 0) / activeSTRecords.length)
      : 0;

    return { total, activeST, idleST, avgDuration };
  }, [mechanicsCompiled]);

  const handleAddNewMechanic = () => {
    setIsAddMechanicModalOpen(true);
    setNewMechanicName('');
  };

  const submitNewMechanic = () => {
    if (newMechanicName.trim()) {
      saveAssignment(newMechanicName.trim(), { statusTugas: 'Surat Tugas' });
      setIsAddMechanicModalOpen(false);
      setNewMechanicName('');
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 0. Ranking Mekanik (SR Aktif) */}
      <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-5 shadow-2xl">
        <div className="mb-5">
          <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
            RANKING MEKANIK (TOTAL SR - UPDATE PER MINGGU)
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {mechanicsCompiled
            .sort((a, b) => b.totalSR - a.totalSR)
            .map((m, i) => (
              <div 
                key={i} 
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                  m.totalSR > 0 
                  ? 'bg-[#18181B] border-[#27272A] hover:border-emerald-500/50 hover:bg-[#1f1f23]' 
                  : 'bg-[#09090B] border-[#18181B] opacity-70'
                }`}
              >
                <span className={`text-[11px] font-bold truncate pr-2 transition-colors ${m.totalSR > 0 ? 'text-zinc-200' : 'text-zinc-600'}`}>{m.name}</span>
                <span className={`text-[12px] font-black px-2.5 py-0.5 rounded-full ${
                  m.totalSR > 0 
                  ? 'text-emerald-400 bg-emerald-500/10' 
                  : 'text-zinc-600 bg-zinc-900'
                }`}>{m.totalSR}</span>
              </div>
            ))}
        </div>
      </div>

      {/* 1. Dashboard Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#18181B] border border-[#27272A] rounded-2xl p-4 shadow-sm shadow-black/20">
        <div>
          <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block" />
            Surat Tugas Tracker
          </h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Sistem penjadwalan Surat Tugas (ST) mekanik, analisis hari kerja aktif, serta perhitungan otomatis KPI penugasan (Senin-Jumat).
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={handleAddNewMechanic}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-900/40 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
          >
            <span>+ Tambahkan ST Mekanik</span>
          </button>
          
          <button
            onClick={() => {
              setIsDeleteMechanicModalOpen(true);
              setMechanicToDelete('');
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/30 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Mekanik</span>
          </button>
          
          <button
            onClick={handleClearAll}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/30 rounded-lg text-[10px] font-bold tracking-wider uppercase transition cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Bersihkan Semua</span>
          </button>
        </div>
      </div>

      {/* 2. Key Performance Indicators Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Mechanics */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Mekanik</span>
            <div className="p-1 px-1.5 bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-400">
              <UserCheck className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-white">{summaryKPIs.total}</span>
            <span className="text-[9px] font-medium text-zinc-500 uppercase">Orang</span>
          </div>
          <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate font-medium">Terdaftar di proyek lapangan</p>
        </div>

        {/* Active ST */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mekanik Bertugas (ST)</span>
            <div className="p-1 px-1.5 bg-amber-950/40 border border-amber-900/40 rounded-lg text-amber-500">
              <Briefcase className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-550">{summaryKPIs.activeST}</span>
            <span className="text-[9px] font-medium text-amber-550 uppercase">Bertugas</span>
          </div>
          <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate font-medium">Mempunyai Surat Tugas aktif</p>
        </div>

        {/* Idle ST */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mekanik Standby (Idle)</span>
            <div className="p-1 px-1.5 bg-blue-950/40 border border-blue-900/40 rounded-lg text-blue-450 font-medium">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-blue-500">{summaryKPIs.idleST}</span>
            <span className="text-[9px] font-medium text-blue-500 uppercase">Standby</span>
          </div>
          <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate font-medium">Siap untuk ditugaskan kapan saja</p>
        </div>

        {/* Average ST Duration */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rata-rata Durasi ST</span>
            <div className="p-1 px-1.5 bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-emerald-450">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-500">{summaryKPIs.avgDuration}</span>
            <span className="text-[9px] font-medium text-emerald-500 uppercase">Hari</span>
          </div>
          <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate font-medium">Rata-rata durasi penugasan aktif</p>
        </div>
      </div>

      {/* 3. Search Bar, Filters Panel */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {/* SearchInput */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">CARI MEKANIK</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Cari berdasarkan Nama Mekanik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#09090B] border border-[#27272A] rounded-xl py-2 pl-9 pr-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs transition-colors"
              />
            </div>
          </div>

          {/* Filter Status Penugasan */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">STATUS TUGAS</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-2.5 py-1.8 text-zinc-300 text-xs focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="All">Semua Mekanik</option>
              <option value="Active">Aktif Bertugas (Ada Tanggal ST)</option>
              <option value="Idle">Idle / Standby (Belum Ada ST)</option>
            </select>
          </div>

          {/* Filter Grade KPI */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">GRADE KPI</label>
            <select
              value={filterKPI}
              onChange={(e) => setFilterKPI(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-2.5 py-1.8 text-zinc-300 text-xs focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="All">Semua Grade KPI</option>
              <option value="A+">A+ (Sempurna - 100%)</option>
              <option value="A">A (Sangat Baik - 90%)</option>
              <option value="B+">B+ (Baik - 80%)</option>
              <option value="B">B (Cukup Baik - 70%)</option>
              <option value="C">C (Cukup - 60%)</option>
              <option value="D">D (Kurang - &lt;60%)</option>
              <option value="-">- (Tanpa Penugasan)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Surat Tugas Table */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-auto min-w-[850px]">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#121214] text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                <th className="px-3 py-3 select-none">NAMA MEKANIK</th>
                <th className="px-3 py-3 text-center">STATUS TUGAS</th>
                <th className="px-3 py-3 text-center">ST MULAI</th>
                <th className="px-3 py-3 text-center">ST SELESAI</th>
                <th className="px-3 py-3 text-center">LAST DATE DECLARATION</th>
                <th className="px-3 py-3 text-center">DEKLARASI (%)</th>
                <th className="px-3 py-3 text-center w-20">HARI ST</th>
                <th className="px-3 py-3 w-[200px]">PENCAPAIAN KPI (SENIN-JUMAT)</th>
                <th className="px-3 py-3 text-right w-24">TINDAKAN</th>
                <th className="px-3 py-3 text-right w-20">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/70 text-[11px] font-medium text-zinc-200">
              {filteredMechanics.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-zinc-500 text-xs font-semibold">
                    Tidak ada record mekanik dalam Surat Tugas Tracker yang cocok dengan penyaringan pencarian.
                  </td>
                </tr>
              ) : (
                filteredMechanics.map((item) => (
                  <tr
                    key={item.name}
                    className="hover:bg-[#0c0c0e]/80 transition duration-155"
                  >
                    {/* NAMA MEKANIK & Badges */}
                    <td className="px-3 py-3.5">
                      <div className="font-bold text-[12px] text-zinc-100 uppercase tracking-tight">
                        {item.name}
                      </div>
                      
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[9px] font-semibold">
                          {item.activeSR} SR Aktif
                        </span>
                        
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#27272A] text-zinc-350 text-[9px] font-semibold border border-zinc-800">
                          {item.rfuRate}% RFU
                        </span>

                        {item.totalSR > 0 && (
                          <span className="inline-flex items-center gap-1 px-1 py-0.5 rounded text-[8px] text-zinc-500 text-center uppercase font-mono">
                            {item.totalSR} Total
                          </span>
                        )}
                      </div>
                    </td>

                    {/* STATUS TUGAS */}
                    <td className="px-3 py-3 text-center">
                      <select
                        value={item.statusTugas || 'Surat Tugas'}
                        onChange={(e) => saveAssignment(item.name, { statusTugas: e.target.value as any })}
                        className={`inline-flex outline-none items-center px-1.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border cursor-pointer ${
                          item.statusTugas === 'Lumpsum' 
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        <option value="Surat Tugas" className="bg-[#121214] text-emerald-400">SURAT TUGAS</option>
                        <option value="Lumpsum" className="bg-[#121214] text-purple-400">LUMPSUM</option>
                      </select>
                    </td>

                    {/* ST MULAI */}
                    <td className="px-3 py-3 text-center">
                      <div className="inline-block relative">
                        <input
                          type="date"
                          value={item.startDate || ''}
                          onChange={(e) => saveAssignment(item.name, { startDate: e.target.value })}
                          className="bg-[#09090B] hover:bg-zinc-900 focus:bg-zinc-900 border border-[#27272A] hover:border-amber-500/50 rounded-lg px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-amber-500 font-mono text-[10px] cursor-pointer transition text-center min-w-[115px]"
                        />
                      </div>
                    </td>

                    {/* ST SELESAI */}
                    <td className="px-3 py-3 text-center">
                      <div className="inline-block relative">
                        <input
                          type="date"
                          value={item.endDate || ''}
                          onChange={(e) => saveAssignment(item.name, { endDate: e.target.value })}
                          className="bg-[#09090B] hover:bg-zinc-900 focus:bg-zinc-900 border border-[#27272A] hover:border-amber-500/50 rounded-lg px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-amber-500 font-mono text-[10px] cursor-pointer transition text-center min-w-[115px]"
                        />
                      </div>
                    </td>

                    {/* LAST DATE DECLARATION */}
                    <td className="px-3 py-3 text-center">
                      <div className="inline-block relative">
                        <input
                          type="date"
                          value={item.lastDateDeclaration || ''}
                          onChange={(e) => saveAssignment(item.name, { lastDateDeclaration: e.target.value })}
                          className="bg-[#09090B] hover:bg-zinc-900 focus:bg-zinc-900 border border-[#27272A] hover:border-amber-500/50 rounded-lg px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-amber-500 font-mono text-[10px] cursor-pointer transition text-center min-w-[115px]"
                        />
                      </div>
                    </td>

                    {/* DEKLARASI (%) */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-bold font-mono text-[11px] ${
                          item.declarationPercentage >= 100 ? 'text-red-400' :
                          item.declarationPercentage >= 80 ? 'text-amber-400' :
                          item.declarationPercentage > 0 ? 'text-emerald-400' :
                          'text-zinc-500'
                        }`}>
                          {item.startDate || item.lastDateDeclaration ? `${item.declarationPercentage}%` : '-'}
                        </span>
                        {(item.startDate || item.lastDateDeclaration) && (
                          <div className="w-full max-w-[60px] h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                item.declarationPercentage >= 100 ? 'bg-red-500' :
                                item.declarationPercentage >= 80 ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, item.declarationPercentage)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* HARI ST */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {item.durationDays > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 font-mono font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-[11px]">
                          {item.durationDays} d
                        </span>
                      ) : (
                        <span className="font-mono text-zinc-650 text-center">-</span>
                      )}
                    </td>

                    {/* PENCAPAIAN KPI (SENIN-JUMAT) */}
                    <td className="px-3 py-3">
                      {item.startDate && item.endDate ? (
                        <div className="flex items-center gap-3 w-full">
                          {/* Grade badge customized */}
                          <div className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black border text-center min-w-[32px] tracking-tight ${
                            item.grade === 'A+' 
                              ? 'bg-amber-550/10 text-amber-500 border-amber-500/25' 
                              : item.grade === 'A' 
                              ? 'bg-amber-600/10 text-amber-550 border-amber-600/20'
                              : item.grade.startsWith('B') 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-750'
                          }`}>
                            {item.grade}
                          </div>

                          {/* Progress gauge/slider bar */}
                          <div className="flex-1 min-w-[80px]">
                            <div className="w-full bg-zinc-850 h-2 rounded-full overflow-hidden relative">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${item.kpiPercentage}%`,
                                  backgroundColor: item.grade.includes('A') ? '#f59e0b' : item.grade.startsWith('B') ? '#10b981' : '#3b82f6'
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-zinc-500 mt-1 block">
                              Weekdays: {item.weekdayCount} hari
                            </span>
                          </div>

                          {/* Percentage value */}
                          <span className="font-mono font-extrabold text-white text-[11px]">
                            {item.kpiPercentage}%
                          </span>
                        </div>
                      ) : (
                        <div className="text-zinc-600 text-[10px] italic flex items-center gap-1.5 font-medium">
                          <Info className="w-3.5 h-3.5 text-zinc-700" />
                          Set Tanggal ST untuk mengaktifkan KPI
                        </div>
                      )}
                    </td>

                    {/* TINDAKAN */}
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        placeholder="Tindakan..."
                        value={item.tindakan || ''}
                        onChange={(e) => saveAssignment(item.name, { tindakan: e.target.value })}
                        className="w-full bg-[#09090B] hover:bg-zinc-900 border border-[#27272A] hover:border-blue-500/50 rounded-lg px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-blue-500 text-[10px] transition"
                      />
                    </td>

                    {/* ACTIONS - "BERSIHKAN" */}
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => handleClear(item.name)}
                          disabled={!item.startDate && !item.endDate && !item.lastDateDeclaration}
                          className={`px-2.5 py-1.5 rounded-md text-[9px] uppercase font-bold tracking-wider border transition w-full text-center ${
                            item.startDate || item.endDate || item.lastDateDeclaration
                              ? 'bg-zinc-900 border-[#27272A] hover:bg-zinc-850 hover:text-white cursor-pointer text-zinc-400'
                              : 'bg-transparent border-zinc-850/40 text-zinc-700 cursor-not-allowed'
                          }`}
                          title="Bersihkan tanggal Surat Tugas"
                        >
                          Bersihkan
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAddMechanicModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddMechanicModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Menu Tambah ST Mekanik
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Tambahkan nama mekanik baru ke dalam daftar tracking Surat Tugas
                  </p>
                </div>
                <button
                  onClick={() => setIsAddMechanicModalOpen(false)}
                  className="p-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                    Nama Mekanik Baru
                  </label>
                  <input
                    type="text"
                    value={newMechanicName}
                    onChange={(e) => setNewMechanicName(e.target.value)}
                    placeholder="Ketik nama mekanik..."
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitNewMechanic();
                    }}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[#27272A]/50">
                <button
                  onClick={() => setIsAddMechanicModalOpen(false)}
                  className="px-4 py-2 border border-[#27272A] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={submitNewMechanic}
                  disabled={!newMechanicName.trim()}
                  className="px-4 py-2 border border-amber-900/40 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#18181B] text-xs font-black uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
                >
                  Tambahkan Mekanik
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {isDeleteMechanicModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteMechanicModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#121214] border border-red-900/30 rounded-2xl p-6 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Menu Hapus Mekanik
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Masukkan nama mekanik (persis) yang ingin dihapus secara permanen dari daftar tracker.
                  </p>
                </div>
                <button
                  onClick={() => setIsDeleteMechanicModalOpen(false)}
                  className="p-2 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                    Nama Mekanik Saat Ini
                  </label>
                  <input
                    type="text"
                    value={mechanicToDelete}
                    onChange={(e) => setMechanicToDelete(e.target.value)}
                    placeholder="Sama persis seperti di daftar..."
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-red-500 transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitDeleteMechanic();
                    }}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[#27272A]/50">
                <button
                  onClick={() => setIsDeleteMechanicModalOpen(false)}
                  className="px-4 py-2 border border-[#27272A] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={submitDeleteMechanic}
                  disabled={!mechanicToDelete.trim()}
                  className="px-4 py-2 border border-red-900/40 bg-red-500/20 hover:bg-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(239,68,68,0.1)] cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
