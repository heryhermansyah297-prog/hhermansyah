/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  FileDown,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  X,
  Filter
} from 'lucide-react';
import { FailureInformation } from '../types';
import { INITIAL_FAILURE_INFORMATIONS } from '../data/mockData';

export default function FailureTrackerView() {
  // --- States ---
  const [fiList, setFiList] = useState<FailureInformation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterEvident, setFilterEvident] = useState('All');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FailureInformation | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    customer: '',
    fiNumber: '',
    fiDate: '',
    fiStatus: 'Waiting Decision',
    fiAging: 0,
    evidentPm: '',
    createBy: '',
    partStatus: 'Waiting Part',
    planningProgress: ''
  });

  // Load Initial Data from LocalStorage/Mock Data
  useEffect(() => {
    const saved = localStorage.getItem('failure_informations');
    if (saved) {
      try {
        setFiList(JSON.parse(saved));
      } catch (e) {
        setFiList(INITIAL_FAILURE_INFORMATIONS);
      }
    } else {
      setFiList(INITIAL_FAILURE_INFORMATIONS);
    }
  }, []);

  const saveToStorage = (newList: FailureInformation[]) => {
    setFiList(newList);
    localStorage.setItem('failure_informations', JSON.stringify(newList));
  };

  // Reset or restore demo data
  const handleResetData = () => {
    if (window.confirm('Apakah Anda yakin ingin meriset data Failure Information ke kondisi awal?')) {
      saveToStorage(INITIAL_FAILURE_INFORMATIONS);
    }
  };

  // --- Filtering Logic ---
  const filteredList = useMemo(() => {
    return fiList.filter(item => {
      const matchesSearch =
        (item.customer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.fiNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.evidentPm || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.partStatus || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.planningProgress || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.createBy || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'All' || item.fiStatus === filterStatus;
      
      const matchesEvident = filterEvident === 'All' || 
        (filterEvident === 'Done' && (item.evidentPm || '').toLowerCase() === 'done') ||
        (filterEvident === 'Pending' && (item.evidentPm || '').toLowerCase() === 'pending') ||
        (filterEvident === 'None' && !(item.evidentPm || '').trim());

      return matchesSearch && matchesStatus && matchesEvident;
    });
  }, [fiList, searchQuery, filterStatus, filterEvident]);

  // --- KPI Stats Calculation ---
  const stats = useMemo(() => {
    const total = filteredList.length;
    const waitingDecision = filteredList.filter(item => item.fiStatus === 'Waiting Decision').length;
    const pmDone = filteredList.filter(item => (item.evidentPm || '').toLowerCase() === 'done').length;
    
    // Calculate average aging
    const itemsWithAging = filteredList.filter(item => item.fiAging > 0);
    const avgAging = itemsWithAging.length > 0
      ? Math.round(itemsWithAging.reduce((sum, item) => sum + item.fiAging, 0) / itemsWithAging.length)
      : 0;

    return { total, waitingDecision, pmDone, avgAging };
  }, [filteredList]);

  // --- UI Charts Calculations ---
  const statusSummary = useMemo(() => {
    const summary = filteredList.reduce((acc, curr) => {
      const st = curr.fiStatus || 'Other';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(summary).map(([name, count]) => {
      const numCount = Number(count);
      return {
        name,
        count: numCount,
        percent: filteredList.length > 0 ? Math.round((numCount / filteredList.length) * 100) : 0,
        color: name === 'Waiting Decision' ? '#f59e0b' : name === 'Resolved' ? '#10b981' : name === 'Approved' ? '#3b82f6' : name === 'Data Not Complete' ? '#ef4444' : name === 'Rejected' ? '#71717a' : '#a855f7'
      };
    });
  }, [filteredList]);

  const customerDistribution = useMemo(() => {
    const summary = filteredList.reduce((acc, curr) => {
      const cust = curr.customer || 'Unknown';
      acc[cust] = (acc[cust] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(summary)
      .map(([name, count]) => ({ name, count: Number(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredList]);

  // --- CRUD Handlers ---
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      customer: '',
      fiNumber: `FI/PKY/05/26/${String(fiList.length + 37).padStart(4, '0')}`,
      fiDate: new Date().toISOString().split('T')[0],
      fiStatus: 'Waiting Decision',
      fiAging: 0,
      evidentPm: '',
      createBy: 'Agung Kristianto',
      partStatus: 'Waiting Part',
      planningProgress: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: FailureInformation) => {
    setEditingItem(item);
    setFormData({
      customer: item.customer,
      fiNumber: item.fiNumber,
      fiDate: item.fiDate,
      fiStatus: item.fiStatus,
      fiAging: item.fiAging,
      evidentPm: item.evidentPm,
      createBy: item.createBy,
      partStatus: item.partStatus || 'Waiting Part',
      planningProgress: item.planningProgress || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteItem = (id: string, number: string) => {
    if (window.confirm(`Hapus entri Failure Information ${number}?`)) {
      const updated = fiList.filter(item => item.id !== id);
      saveToStorage(updated);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer || !formData.fiNumber) {
      alert('Nama Customer dan FI Number harus diisi!');
      return;
    }

    if (editingItem) {
      // Edit
      const updated = fiList.map(item =>
        item.id === editingItem.id ? { ...item, ...formData } : item
      );
      saveToStorage(updated);
    } else {
      // Add
      const newItem: FailureInformation = {
        id: 'fi-' + Date.now(),
        ...formData
      };
      saveToStorage([newItem, ...fiList]);
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }
    const headers = ['CUSTOMER', 'FI NUMBER', 'FI DATE', 'FI STATUS', 'PART STATUS', 'PLANNING PROGRESS', 'FI AGING', 'EVIDENT PM', 'CREATE BY'];
    const rows = filteredList.map(item => [
      item.customer,
      item.fiNumber,
      item.fiDate,
      item.fiStatus,
      item.partStatus || 'Waiting Part',
      item.planningProgress || '',
      item.fiAging || '',
      item.evidentPm || '',
      item.createBy
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Failure_Information_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Information & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#18181B] border border-[#27272A] rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block" />
            Failure Information Tracker
          </h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Sistem Pemantauan dan Analisis Kegagalan Unit Lapangan & Respon Solusi Layanan.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/15 transition duration-150 text-white rounded-lg text-[11px] font-semibold tracking-wider uppercase cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Record FI</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 animate-fadeIn">
        {/* Total FI */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-2.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total FI Records</span>
            <div className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-450">
              <FileText className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-white">{stats.total}</span>
            <span className="text-[9px] font-medium text-zinc-500 uppercase">kasus</span>
          </div>
          <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate font-medium">Monitoring kegagalan unit</p>
        </div>

        {/* Waiting Decision */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-2.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Waiting Decision</span>
            <div className="p-1 px-1.5 bg-amber-950/40 border border-amber-900/40 rounded-lg text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-500">{stats.waitingDecision}</span>
            <span className="text-[9px] font-medium text-amber-500/80 uppercase">tertahan</span>
          </div>
          <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate font-medium">Butuh approval segera</p>
        </div>

        {/* Evident PM Done */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-2.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">EVIDENT PM Completed</span>
            <div className="p-1 px-1.5 bg-emerald-950/50 border border-emerald-900/50 rounded-lg text-emerald-450">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-500">{stats.pmDone}</span>
            <span className="text-[9px] font-medium text-emerald-500/80 uppercase">berhasil</span>
          </div>
          <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate font-medium">Buktian PM terlampir</p>
        </div>

        {/* Average FI Aging */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-2.5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Average Aging</span>
            <div className="p-1 px-1.5 bg-blue-950/40 border border-blue-900/40 rounded-lg text-blue-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-blue-500">{stats.avgAging}</span>
            <span className="text-[9px] font-medium text-blue-500/80 uppercase">hari</span>
          </div>
          <p className="text-[9.5px] text-zinc-500 mt-0.5 truncate font-medium">Kecepatan responsif taktis</p>
        </div>
      </div>

      {/* 3. Analytical Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FI Status Distribution */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Distribusi Status Failure Information
          </h3>

          {filteredList.length === 0 ? (
            <div className="flex items-center justify-center h-28 text-zinc-500 text-xs text-center font-medium">
              Tidak ada data untuk dianalisis
            </div>
          ) : (
            <div className="space-y-3 py-1">
              <div className="flex h-14 items-end gap-2.5 border-b border-zinc-800 pb-2">
                {statusSummary.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div className="absolute bottom-full mb-1 bg-[#09090B] text-zinc-200 text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-10 border border-[#27272A]">
                      {item.name}: {item.count} entri ({item.percent}%)
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${item.percent}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="w-full rounded-t-md transition-colors duration-200"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[10px] font-bold text-white mt-1 font-mono">{item.count}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-zinc-400 pt-1.5 font-medium">
                {statusSummary.map((item, index) => (
                  <div key={index} className="flex items-center space-x-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name} ({item.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Customer Frequency */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Top 5 Customers dengan Kasus FI Terbanyak
          </h3>

          {customerDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-28 text-zinc-500 text-xs text-center font-medium">
              Tidak ada data customer
            </div>
          ) : (
            <div className="space-y-2 max-h-[145px] overflow-y-auto pr-1">
              {customerDistribution.map((cust, idx) => {
                const maxVal = Math.max(...customerDistribution.map(c => c.count), 1);
                const pct = Math.round((cust.count / maxVal) * 100);
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-zinc-300 truncate max-w-[170px]">{cust.name}</span>
                      <span className="text-amber-450 font-mono text-[10px] font-bold">{cust.count} Kasus</span>
                    </div>
                    {/* Gauge bar */}
                    <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden block">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        className="bg-amber-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Filter Panel & Secondary Actions */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar input with icon */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Cari berdasarkan Customer, FI Number, Evident PM, Pembuat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] rounded-xl py-2 pl-9 pr-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5 text-xs text-zinc-400 justify-end">
            <button
              onClick={handleResetData}
              className="inline-flex items-center space-x-1 text-zinc-500 hover:text-zinc-300 py-1 transition cursor-pointer font-medium"
              title="Reset data lokal ke setting orisinal"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Data Demo</span>
            </button>
            <span className="text-zinc-800">|</span>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1 text-zinc-400 hover:text-white py-1 transition cursor-pointer font-medium"
            >
              <FileDown className="w-3 text-zinc-500" />
              <span>Ekspor FI (CSV)</span>
            </button>
          </div>
        </div>

        {/* Filter selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 border-t border-zinc-800/60">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">FI STATUS</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-zinc-350 text-xs focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="All">Semua Status</option>
              <option value="Waiting Decision">Waiting Decision</option>
              <option value="Data Not Complete">Data Not Complete</option>
              <option value="Rejected">Rejected</option>
              <option value="Approved">Approved</option>
              <option value="Resolved">Resolved</option>
              <option value="Under Investigation">Under Investigation</option>
            </select>
          </div>

          {/* PM Evident status */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">EVIDENT PM</label>
            <select
              value={filterEvident}
              onChange={(e) => setFilterEvident(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-zinc-350 text-xs focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="All">Semua Evident PM</option>
              <option value="Done">Done</option>
              <option value="Pending">Pending</option>
              <option value="None">Kosong / Belum Selesai</option>
            </select>
          </div>

          {/* Count Helper */}
          <div className="flex items-end justify-end pb-1.5 font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Menampilkan: <span className="text-white ml-1.5 font-sans font-extrabold">{filteredList.length}</span> / {fiList.length} baris
          </div>
        </div>
      </div>

      {/* 5. Main FI Data Table */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-auto min-w-[800px]">
            <thead>
              <tr className="border-b border-[#27272A]/85 bg-[#121214] text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                <th className="px-3.5 py-2.5 select-none w-1/5">CUSTOMER</th>
                <th className="px-3 py-2.5">FI NUMBER</th>
                <th className="px-3 py-2.5">FI DATE</th>
                <th className="px-2 py-2.5 text-center">FI AGING (DAYS)</th>
                <th className="px-3 py-2.5">FI STATUS</th>
                <th className="px-3 py-2.5">PART STATUS</th>
                <th className="px-3 py-2.5">PLANNING PROGRESS</th>
                <th className="px-3 py-2.5 text-center">EVIDENT PM</th>
                <th className="px-3 py-2.5">CREATED BY</th>
                <th className="px-3 py-2.5 text-right w-20">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/60 text-[11px] font-medium text-zinc-200">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-500 text-xs font-semibold">
                    Tidak ada record Failure Information yang cocok dengan filter pencarian pencocokan.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[#0c0c0e] hover:text-white transition duration-150"
                  >
                    {/* CUSTOMER */}
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-[11.5px] text-zinc-100 uppercase tracking-tight">
                        {item.customer}
                      </div>
                    </td>

                    {/* FI NUMBER */}
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-zinc-400">{item.fiNumber}</span>
                    </td>

                    {/* FI DATE */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>
                          {item.fiDate ? item.fiDate.split('-').reverse().join('-') : '-'}
                        </span>
                      </div>
                    </td>

                    {/* FI AGING */}
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-500">
                      {item.fiAging !== undefined && item.fiAging !== null && item.fiAging !== 0 ? (
                        <span>{item.fiAging} Hari</span>
                      ) : (
                        <span className="text-zinc-650 font-normal">-</span>
                      )}
                    </td>

                    {/* FI STATUS */}
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                          item.fiStatus === 'Waiting Decision'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                            : item.fiStatus === 'Resolved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                            : item.fiStatus === 'Approved'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                            : item.fiStatus === 'Data Not Complete'
                            ? 'bg-rose-500/10 text-rose-450 border border-rose-550/20'
                            : item.fiStatus === 'Rejected'
                            ? 'bg-zinc-550/10 text-zinc-400 border border-zinc-700/50'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/15'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${
                          item.fiStatus === 'Waiting Decision' 
                            ? 'bg-amber-400' 
                            : item.fiStatus === 'Resolved' 
                            ? 'bg-emerald-400' 
                            : item.fiStatus === 'Approved' 
                            ? 'bg-blue-400'
                            : item.fiStatus === 'Data Not Complete'
                            ? 'bg-rose-400'
                            : item.fiStatus === 'Rejected'
                            ? 'bg-zinc-400'
                            : 'bg-purple-400'
                        }`} />
                        {item.fiStatus}
                      </span>
                    </td>

                    {/* PART STATUS */}
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest ${
                          (item.partStatus || 'Waiting Part') === 'Ready for Install'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${
                          (item.partStatus || 'Waiting Part') === 'Ready for Install' 
                            ? 'bg-emerald-400' 
                            : 'bg-amber-400'
                        }`} />
                        {item.partStatus || 'Waiting Part'}
                      </span>
                    </td>

                    {/* PLANNING PROGRESS */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>
                          {item.planningProgress ? item.planningProgress.split('-').reverse().join('-') : 'Belum Ada'}
                        </span>
                      </div>
                    </td>

                    {/* EVIDENT PM */}
                    <td className="px-3 py-2.5 text-center">
                      {(item.evidentPm || '').toLowerCase() === 'done' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[9.5px] font-bold rounded-lg uppercase tracking-wider">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 inline" />
                          Done
                        </span>
                      ) : (item.evidentPm || '').toLowerCase() === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-amber-450 border border-zinc-700/80 text-[9.5px] font-bold rounded-lg uppercase tracking-wider">
                          <AlertCircle className="w-2.5 h-2.5 text-amber-400 inline" />
                          Pending
                        </span>
                      ) : (
                        <span className="text-zinc-650 font-mono text-[10px]">-</span>
                      )}
                    </td>

                    {/* CREATED BY */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-zinc-350">
                        <User className="w-3.5 h-3.5 text-zinc-550" />
                        <span className="truncate max-w-[130px]" title={item.createBy}>{item.createBy}</span>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-zinc-400 hover:text-white bg-[#09090B] hover:bg-zinc-800 rounded border border-[#27272A] transition cursor-pointer"
                          title="Edit Log"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.fiNumber)}
                          className="p-1 text-zinc-500 hover:text-red-400 bg-[#09090B] hover:bg-red-950/20 rounded border border-[#27272A] hover:border-red-950/50 transition cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* 6. Form Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121214] border border-[#27272A] rounded-2xl w-full max-w-lg p-5 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-[#27272A]/80 pb-3 mb-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-500 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  {editingItem ? 'Edit Record Failure Information' : 'Tambah Record Failure Information'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                {/* Customer */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: UNITED EQUIPMENT INDONESIA"
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors uppercase"
                  />
                </div>

                {/* FI Number & FI Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                      FI Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: FI/PKY/05/26/0037"
                      value={formData.fiNumber}
                      onChange={(e) => setFormData({ ...formData, fiNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                      FI Date
                    </label>
                    <input
                      type="date"
                      value={formData.fiDate}
                      onChange={(e) => setFormData({ ...formData, fiDate: e.target.value })}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* FI Status & FI Aging */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                      FI Status
                    </label>
                    <select
                      value={formData.fiStatus}
                      onChange={(e) => setFormData({ ...formData, fiStatus: e.target.value })}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="Waiting Decision">Waiting Decision</option>
                      <option value="Data Not Complete">Data Not Complete</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Approved">Approved</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Under Investigation">Under Investigation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                      Aging (Hari)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.fiAging}
                      onChange={(e) => setFormData({ ...formData, fiAging: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Part Status & Planning Progress */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                      Part Status
                    </label>
                    <select
                      value={formData.partStatus}
                      onChange={(e) => setFormData({ ...formData, partStatus: e.target.value })}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="Waiting Part">Waiting Part</option>
                      <option value="Ready for Install">Ready for Install</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                      Planning Progress
                    </label>
                    <input
                      type="date"
                      value={formData.planningProgress}
                      onChange={(e) => setFormData({ ...formData, planningProgress: e.target.value })}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Evident PM & Create By */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest border-dashed">
                      EVIDENT PM
                    </label>
                    <select
                      value={formData.evidentPm}
                      onChange={(e) => setFormData({ ...formData, evidentPm: e.target.value })}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="">(Kosong / Belum Selesai)</option>
                      <option value="Done">Done</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
                      Created By
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Pembuat"
                      value={formData.createBy}
                      onChange={(e) => setFormData({ ...formData, createBy: e.target.value })}
                      className="w-full px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#27272A]/70 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase rounded-xl tracking-wider text-xs border border-zinc-800/80 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 font-bold uppercase text-white rounded-xl tracking-wider text-xs shadow-md shadow-amber-600/10 transition cursor-pointer"
                  >
                    {editingItem ? 'Simpan Perubahan' : 'Tambah Entri'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
