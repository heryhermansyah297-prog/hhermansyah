/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ServiceRequest } from '../types';

interface ChartsViewProps {
  data: ServiceRequest[];
}

export default function ChartsView({ data }: ChartsViewProps) {
  // 1. Calculate Status Distribution (Excluding RFU)
  const nonRfuDataForStatus = React.useMemo(() => {
    return data.filter(curr => !(curr.status || '').toLowerCase().includes('rfu'));
  }, [data]);

  const statusCounts = React.useMemo(() => {
    return nonRfuDataForStatus.reduce((acc, curr) => {
      const status = curr.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [nonRfuDataForStatus]);

  const statuses = React.useMemo(() => {
    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      color: name === 'Inprogress' ? '#6366f1' : name === 'Delay Labour' ? '#f59e0b' : '#a855f7'
    }));
  }, [statusCounts]);

  const nonRfuLength = nonRfuDataForStatus.length || 1;

  // 2. Weekly condition statistics (breakdown, delay labour, inprogress, rfu)
  // Helper to format date string to Indonesian formatted week range
  const getWeekString = (dateStr: string): string => {
    if (!dateStr) return 'Tanpa Tanggal';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Tanpa Tanggal';
      
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      const monday = new Date(d.setDate(diff));
      monday.setHours(0,0,0,0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `Minggu (${monday.getDate()} ${months[monday.getMonth()]} - ${sunday.getDate()} ${months[sunday.getMonth()]} ${monday.getFullYear()})`;
    } catch (e) {
      return 'Tanpa Tanggal';
    }
  };

  // Group and compile active weeks
  const weeklyDataMap = React.useMemo(() => {
    const map: Record<string, ServiceRequest[]> = {};
    data.forEach(r => {
      const dateStr = r.planningDate || r.srDate || r.actionDate || '';
      if (dateStr) {
        const weekLabel = getWeekString(dateStr);
        if (!map[weekLabel]) {
          map[weekLabel] = [];
        }
        map[weekLabel].push(r);
      } else {
        const defaultLabel = 'Lainnya / Tanpa Tanggal';
        if (!map[defaultLabel]) {
          map[defaultLabel] = [];
        }
        map[defaultLabel].push(r);
      }
    });
    return map;
  }, [data]);

  const availableWeeks = React.useMemo(() => {
    return Object.keys(weeklyDataMap).sort((a, b) => {
      if (a === 'Lainnya / Tanpa Tanggal') return 1;
      if (b === 'Lainnya / Tanpa Tanggal') return -1;
      return b.localeCompare(a); // Newest weeks first
    });
  }, [weeklyDataMap]);

  // Track selected active week
  const [activeWeek, setActiveWeek] = React.useState<string>('');

  React.useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.includes(activeWeek)) {
      setActiveWeek(availableWeeks[0]);
    }
  }, [availableWeeks, activeWeek]);

  // Calculate percentages inside selected week
  const weekStats = React.useMemo(() => {
    const reqs = weeklyDataMap[activeWeek] || [];
    const total = reqs.length || 1;

    let breakdown = 0;
    let delayLabour = 0;
    let inProgress = 0;
    let rfu = 0;

    reqs.forEach(r => {
      const statusLower = (r.status || '').toLowerCase();
      if (statusLower.includes('rfu')) {
        rfu++;
      } else if (r.unitCondition === 'Breakdown') {
        breakdown++;
      } else if (r.status === 'Delay Labour') {
        delayLabour++;
      } else if (r.status === 'Inprogress') {
        inProgress++;
      } else {
        inProgress++;
      }
    });

    const pctBreakdown = Math.round((breakdown / total) * 100);
    const pctDelayLabour = Math.round((delayLabour / total) * 100);
    const pctInProgress = Math.round((inProgress / total) * 100);
    const pctRfu = Math.round((rfu / total) * 100);

    return {
      total,
      breakdown,
      delayLabour,
      inProgress,
      rfu,
      pctBreakdown,
      pctDelayLabour,
      pctInProgress,
      pctRfu
    };
  }, [weeklyDataMap, activeWeek]);

  // 3. Calculate Location Distribution (Excluding RFU status)
  const locationCounts = React.useMemo(() => {
    return data
      .filter(curr => !(curr.status || '').toLowerCase().includes('rfu'))
      .reduce((acc, curr) => {
        const loc = curr.location || 'Tanpa Lokasi';
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }, [data]);

  const locations = React.useMemo(() => {
    return Object.entries(locationCounts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value);
  }, [locationCounts]);

  const maxLocCount = Math.max(...locations.map(l => l.value), 1);

  // 4. Compact Timeline of Service Request Aging (Excluding RFU, sorted by SR Date)
  const agingTimelineItems = React.useMemo(() => {
    return [...data]
      .filter(item => {
        const isRfu = (item.status || '').trim().toUpperCase() === 'RFU';
        return !isRfu && item.srDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.srDate).getTime();
        const dateB = new Date(b.srDate).getTime();
        return dateA - dateB;
      });
  }, [data]);

  const getDaysAging = (srDateStr: string): number => {
    if (!srDateStr) return 0;
    try {
      const srDate = new Date(srDateStr);
      if (isNaN(srDate.getTime())) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      srDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - srDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays < 0 ? 0 : diffDays;
    } catch (e) {
      return 0;
    }
  };

  const formatIndonesianDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${day} ${months[d.getMonth()]}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Status Kerja Distribution */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3 shadow-sm col-span-1 lg:col-span-2 flex flex-col justify-between">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Alokasi Status Progress
        </h3>
        
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-zinc-500 text-[11px]">Tidak ada data untuk ditampilkan</div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex h-16 items-end gap-2 px-1 border-b border-zinc-805 pb-1">
              {statuses.map((item, index) => {
                const percentage = Math.round((item.value / nonRfuLength) * 100);
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 bg-[#09090B] text-zinc-200 text-[9px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-10 border border-[#27272A]">
                      {item.name}: {item.value} unit ({percentage}%)
                    </div>
                    {/* Bar with subtle blue reflection */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.08 }}
                      className="w-full rounded-t-sm transition-colors duration-200 relative"
                      style={{ 
                        backgroundColor: item.color,
                        boxShadow: item.color === '#6366f1' || item.color === '#3b82f6' ? '0 0 8px rgba(59,130,246,0.1)' : 'none'
                      }}
                    />
                    <span className="text-[10px] font-bold text-white mt-0.5 font-mono leading-none">{item.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Legends */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px]">
              {statuses.map((item, index) => (
                <div key={index} className="flex items-center space-x-1.5 text-zinc-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name} ({Math.round((item.value / nonRfuLength) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Kondisi Alat Perminggu (Breakdown, Delay Labour, Inprogress & RFU) */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3 shadow-sm flex flex-col justify-between">
        <div className="space-y-1 mb-2">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Kondisi Alat Perminggu
          </h3>
          
          {/* Week Dropdown Selector */}
          <select
            value={activeWeek}
            onChange={(e) => setActiveWeek(e.target.value)}
            className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1 text-zinc-350 text-[10px] font-bold focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
          >
            {availableWeeks.map((wk) => (
              <option key={wk} value={wk}>{wk}</option>
            ))}
          </select>
        </div>

        {data.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-zinc-500 text-[11px] text-center">Tidak ada data</div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            {/* Visual breakdown representation */}
            <div className="w-full space-y-1.5 mt-0.5">
              {/* Breakdown */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-zinc-400 font-bold uppercase flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    Breakdown
                  </span>
                  <span className="text-zinc-200 font-mono font-black">{weekStats.breakdown} u ({weekStats.pctBreakdown}%)</span>
                </div>
                <div className="w-full bg-zinc-850 h-1.5 rounded-full overflow-hidden block border border-zinc-700/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${weekStats.pctBreakdown}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-red-500 h-full rounded-full"
                  />
                </div>
              </div>

              {/* Delay Labour */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-zinc-400 font-bold uppercase flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                    Delay
                  </span>
                  <span className="text-zinc-200 font-mono font-black">{weekStats.delayLabour} u ({weekStats.pctDelayLabour}%)</span>
                </div>
                <div className="w-full bg-zinc-850 h-1.5 rounded-full overflow-hidden block border border-zinc-700/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${weekStats.pctDelayLabour}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-amber-500 h-full rounded-full"
                  />
                </div>
              </div>

              {/* Inprogress */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-zinc-400 font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                    In Progress
                  </span>
                  <span className="text-zinc-200 font-mono font-black">{weekStats.inProgress} u ({weekStats.pctInProgress}%)</span>
                </div>
                <div className="w-full bg-zinc-850 h-1.5 rounded-full overflow-hidden block border border-zinc-700/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${weekStats.pctInProgress}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-[#6366f1] h-full rounded-full"
                  />
                </div>
              </div>

              {/* RFU */}
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-zinc-400 font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    RFU
                  </span>
                  <span className="text-zinc-200 font-mono font-black">{weekStats.rfu} u ({weekStats.pctRfu}%)</span>
                </div>
                <div className="w-full bg-[#09090B] h-1.5 rounded-full overflow-hidden block border border-zinc-700/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${weekStats.pctRfu}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-[#10b981] h-full rounded-full"
                  />
                </div>
              </div>
            </div>

            <div className="w-full text-center border-t border-zinc-800/60 pt-1 text-[8.5px] font-bold text-zinc-500 uppercase">
              Total {weekStats.total} Record
            </div>
          </div>
        )}
      </div>

      {/* 3. Sektor / Lokasi Terbanyak */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3 shadow-sm flex flex-col justify-between">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          Sektor Servis Terbanyak
        </h3>

        {locations.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-zinc-500 text-[11px] text-center">Tidak ada data</div>
        ) : (
          <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
            {locations.slice(0, 4).map((loc, idx) => {
              const pct = Math.round((loc.value / maxLocCount) * 100);
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-zinc-300 truncate max-w-[120px]">{loc.name}</span>
                    <span className="text-zinc-400 font-mono text-[9px] font-bold">{loc.value} Unit</span>
                  </div>
                  {/* Gauge bar */}
                  <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden block border border-zinc-700/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.08 }}
                      className="bg-blue-600 h-full rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Simple Service Request Aging Timeline */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-[#18181B] border border-[#27272A] rounded-2xl p-3 shadow-sm">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Timeline Aging Service Request (Berdasarkan Tanggal SR)
        </h3>
        
        {agingTimelineItems.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-zinc-550 text-[11px] text-center">
            Tidak ada Service Request aktif (Semua status RFU)
          </div>
        ) : (
          <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            <div className="relative flex items-stretch gap-4 min-w-[max-content] pt-4 pb-1 px-0.5">
              {/* Timeline Horizontal Line Path */}
              <div className="absolute top-[22px] left-6 right-6 h-0.5 bg-zinc-800 z-0" />
              
              {agingTimelineItems.map((item, idx) => {
                const dateStr = formatIndonesianDate(item.srDate);
                const isBreakdown = item.unitCondition === 'Breakdown';
                const statusBg = (item.status || '').toLowerCase() === 'inprogress'
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
                  : (item.status || '').toLowerCase() === 'delay labour'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                  : 'bg-purple-500/15 text-purple-400 border-purple-500/20';
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.04 }}
                    className="relative w-52 flex flex-col items-start z-10 group"
                  >
                    {/* Circle Node & Date Tag */}
                    <div className="flex items-center space-x-1.5 mb-2 pl-2">
                      <div className={`w-[10px] h-[10px] rounded-full flex items-center justify-center border-2 border-[#18181B] transition-transform duration-200 group-hover:scale-125 ${
                        isBreakdown ? 'bg-red-500 ring-2 ring-red-500/25' : 'bg-blue-500 ring-2 ring-blue-500/25'
                      }`} />
                      <span className="text-[8.5px] font-mono font-bold text-zinc-350 bg-zinc-900 border border-zinc-800/80 px-1.5 py-0.2 rounded-full inline-block">
                        {dateStr}
                      </span>
                    </div>

                    {/* Timeline Item Details Card */}
                    <div className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-2.5 flex flex-col justify-between hover:border-zinc-700 transition-all h-[108px] shadow-sm">
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className="text-[8.5px] font-mono text-zinc-500 font-bold truncate max-w-[100px]" title={item.srNumber}>
                            {item.srNumber}
                          </span>
                          <span className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase tracking-wider border ${statusBg}`}>
                            {item.status || 'Active'}
                          </span>
                        </div>

                        <p className="text-[10px] text-zinc-200 line-clamp-2 font-medium leading-tight" title={item.issueDescription}>
                          {item.issueDescription}
                        </p>
                      </div>

                      <div className="pt-1.5 border-t border-zinc-800/50 w-full flex items-center justify-between gap-1">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Lokasi</span>
                          <span className="text-[9.5px] text-zinc-300 font-semibold truncate max-w-[90px] mt-0.5" title={item.location}>
                            {item.location}
                          </span>
                        </div>

                        <div className="text-right flex flex-col items-end shrink-0">
                          <span className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Umur SR</span>
                          <span className="text-[11px] font-black font-mono text-amber-500 leading-none mt-0.5">
                            {getDaysAging(item.srDate)} <span className="text-[7px] text-zinc-450 font-semibold">HR</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
