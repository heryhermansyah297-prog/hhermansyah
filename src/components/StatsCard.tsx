/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, CheckCircle2, Clock, MapPin, Users, Hammer } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtext: string;
  iconType: 'alert' | 'success' | 'clock' | 'map' | 'users' | 'hammer';
  colorClass: string;
}

export default function StatsCard({ label, value, subtext, iconType, colorClass }: StatsCardProps) {
  const getIcon = () => {
    switch (iconType) {
      case 'alert':
        return <ShieldAlert id="icon-alert" className="w-4.5 h-4.5 text-zinc-400" />;
      case 'success':
        return <CheckCircle2 id="icon-success" className="w-4.5 h-4.5 text-blue-400" />;
      case 'clock':
        return <Clock id="icon-clock" className="w-4.5 h-4.5 text-amber-500" />;
      case 'map':
        return <MapPin id="icon-map" className="w-4.5 h-4.5 text-blue-400" />;
      case 'users':
        return <Users id="icon-users" className="w-4.5 h-4.5 text-blue-500" />;
      case 'hammer':
        return <Hammer id="icon-hammer" className="w-4.5 h-4.5 text-purple-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#18181B] border border-[#27272A] rounded-2xl p-3 shadow-sm hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 flex flex-col justify-between h-[84px] group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{label}</span>
        <div className="p-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 group-hover:text-white group-hover:border-blue-500/30 transition-all">
          {getIcon()}
        </div>
      </div>
      <div className="flex items-baseline justify-between mt-0.5">
        <h3 className="text-lg font-black text-white tracking-tight font-sans">{value}</h3>
        <p className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
          <span className="w-1 h-1 rounded-full bg-blue-500 inline-block animate-pulse"></span>
          {subtext}
        </p>
      </div>
    </motion.div>
  );
}
