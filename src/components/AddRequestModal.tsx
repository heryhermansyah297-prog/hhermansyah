/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Edit2 } from 'lucide-react';
import { ServiceRequest } from '../types';

interface AddRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (request: Omit<ServiceRequest, 'id'> & { id?: string }) => void;
  editData?: ServiceRequest | null;
  uniqueMechanics?: string[];
}

export default function AddRequestModal({ isOpen, onClose, onSave, editData, uniqueMechanics = [] }: AddRequestModalProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    srNumber: 'SR/PKY/05/26/0160',
    woNumber: '',
    uc3Number: '',
    uc3Status: 'None',
    srDate: new Date().toISOString().split('T')[0],
    srAging: 0,
    planningDate: '',
    actionDate: '',
    rfuDate: '',
    unitCondition: 'Running Without Trouble',
    snUnit: '',
    model: 'HX210HD',
    issueDescription: '',
    location: '',
    labour1: '',
    labour2: '',
    labour3: '',
    labour4: '',
    labour5: '',
    labour6: '',
    status: 'Inprogress',
    leadJobDescription: '',
    ticketId: ''
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        customerName: editData.customerName || '',
        srNumber: editData.srNumber || '',
        woNumber: editData.woNumber || '',
        uc3Number: editData.uc3Number || '',
        uc3Status: editData.uc3Status || 'None',
        srDate: editData.srDate || '',
        srAging: editData.srAging || 0,
        planningDate: editData.planningDate || '',
        actionDate: editData.actionDate || '',
        rfuDate: editData.rfuDate || '',
        unitCondition: editData.unitCondition || 'Running Without Trouble',
        snUnit: editData.snUnit || '',
        model: editData.model || '',
        issueDescription: editData.issueDescription || '',
        location: editData.location || '',
        labour1: editData.labour1 || '',
        labour2: editData.labour2 || '',
        labour3: editData.labour3 || '',
        labour4: editData.labour4 || '',
        labour5: editData.labour5 || '',
        labour6: editData.labour6 || '',
        status: editData.status || 'Inprogress',
        leadJobDescription: editData.leadJobDescription || '',
        ticketId: editData.ticketId || ''
      });
    } else {
      setFormData({
        customerName: '',
        srNumber: 'SR/PKY/05/26/' + Math.floor(100 + Math.random() * 900),
        woNumber: '',
        uc3Number: '',
        uc3Status: 'None',
        srDate: new Date().toISOString().split('T')[0],
        srAging: 0,
        planningDate: '',
        actionDate: '',
        rfuDate: '',
        unitCondition: 'Running Without Trouble',
        snUnit: '',
        model: 'HX210HD',
        issueDescription: '',
        location: '',
        labour1: '',
        labour2: '',
        labour3: '',
        labour4: '',
        labour5: '',
        labour6: '',
        status: 'Inprogress',
        leadJobDescription: '',
        ticketId: ''
      });
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editData ? { ...formData, id: editData.id } : formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'srAging' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#18181B] border border-[#27272A] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#27272A]">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600/15 text-blue-400 p-2.5 rounded-xl">
              {editData ? <Edit2 className="w-5 h-5" /> : <Plus id="modal-plus" className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {editData ? 'Edit Service Request' : 'Tambah Service Request Baru'}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">
                {editData ? 'Perbarui detail request mekanik dan kondisi unit.' : 'Masukkan detail request mekanik dan kondisi unit.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-2.5 bg-[#09090B] border border-[#27272A] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Row 0: Customer Name */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="cth: PT BUKIT MAKMUR MANDIRI UTAMA"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-sans text-xs focus:outline-none focus:border-blue-500 transition-colors uppercase"
              />
            </div>
          </div>

          {/* Row 1: SR Number & WO Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Nomor SR *</label>
              <input
                required
                type="text"
                name="srNumber"
                value={formData.srNumber}
                onChange={handleChange}
                placeholder="cth: SR/PKY/05/26/0154"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Nomor WO</label>
              <input
                type="text"
                name="woNumber"
                value={formData.woNumber}
                onChange={handleChange}
                placeholder="cth: UC3/PKY/05/26"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 1.5: Nomor UC3 & Nomor ID Ticket */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Nomor UC3</label>
              <input
                type="text"
                name="uc3Number"
                value={formData.uc3Number}
                onChange={handleChange}
                placeholder="cth: UC3/PKY/05/26/102"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Nomor ID Ticket</label>
              <input
                type="text"
                name="ticketId"
                value={formData.ticketId}
                onChange={handleChange}
                placeholder="cth: TKT-2026-003"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: UC3 Status & SR Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Status UC3</label>
              <select
                name="uc3Status"
                value={formData.uc3Status}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="None">None</option>
                <option value="Inprogress">Inprogress</option>
                <option value="waiting Part">Waiting Part</option>
                <option value="Done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Tanggal SR</label>
              <input
                type="date"
                name="srDate"
                value={formData.srDate}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 3: Unit Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Model Unit *</label>
              <input
                required
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="cth: HX210HD"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Serial Number (S/N)</label>
              <input
                type="text"
                name="snUnit"
                value={formData.snUnit}
                onChange={handleChange}
                placeholder="cth: HDCKEBAEVS0040324"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Kondisi Unit</label>
              <select
                name="unitCondition"
                value={formData.unitCondition}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Running Without Trouble">Running Without Trouble</option>
                <option value="Running With Trouble">Running With Trouble</option>
                <option value="Breakdown">Breakdown</option>
              </select>
            </div>
          </div>

          {/* Row 4: Issue Description & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Isi / Deskripsi Masalah *</label>
              <input
                required
                type="text"
                name="issueDescription"
                value={formData.issueDescription}
                onChange={handleChange}
                placeholder="cth: PM 1000 HOURS, Engine Noise, dll"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Lokasi / Sektor</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="cth: Kasongan, Unggang, Tumbang Miri"
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 5: Mechanics / Labour (Up to 6) */}
          <div className="border-t border-[#27272A]/80 pt-4">
            <h4 className="text-[10px] font-extrabold uppercase text-amber-500 mb-3 tracking-widest">Mekanik Lapangan (Maksimal 6 Orang)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Mekanik 1 (Utama)</label>
                <select
                  name="labour1"
                  value={formData.labour1}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Pilih Mekanik...</option>
                  {uniqueMechanics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Mekanik 2</label>
                <select                
                  name="labour2"
                  value={formData.labour2}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Pilih Mekanik...</option>
                  {uniqueMechanics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Mekanik 3</label>
                <select
                  name="labour3"
                  value={formData.labour3}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Pilih Mekanik...</option>
                  {uniqueMechanics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Mekanik 4</label>
                <select
                  name="labour4"
                  value={formData.labour4}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Pilih Mekanik...</option>
                  {uniqueMechanics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Mekanik 5</label>
                <select
                  name="labour5"
                  value={formData.labour5}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Pilih Mekanik...</option>
                  {uniqueMechanics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Mekanik 6</label>
                <select
                  name="labour6"
                  value={formData.labour6}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Pilih Mekanik...</option>
                  {uniqueMechanics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Row 5.5: Status Pekerjaan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#27272A]/80 pt-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Status Pekerjaan</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Inprogress">Inprogress</option>
                <option value="Delay Labour">Delay Labour</option>
                <option value="RFU">RFU</option>
                <option value="Waiting Payment Customer">Waiting Payment Customer</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          {/* Row 6: Schedule Planning / Action Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#27272A]/80 pt-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Planning Date</label>
              <input
                type="date"
                name="planningDate"
                value={formData.planningDate}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">Action Date</label>
              <input
                type="date"
                name="actionDate"
                value={formData.actionDate}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">RFU Date</label>
              <input
                type="date"
                name="rfuDate"
                value={formData.rfuDate}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-zinc-300 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 7: Lead Job Description */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 tracking-widest">
              Deskripsi Pekerjaan (Lead Job Description)
            </label>
            <textarea
              name="leadJobDescription"
              value={formData.leadJobDescription}
              onChange={handleChange}
              rows={3}
              placeholder="Masukkan detail penanganan unit, kendala yang dihadapi, penggantian oli, filter..."
              className="w-full px-4 py-3 bg-[#09090B] border border-[#27272A] rounded-2xl text-white text-xs leading-relaxed focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Spacer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#27272A] uppercase text-[10px] font-bold tracking-widest">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#09090B] border border-[#27272A] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition flex items-center gap-2 cursor-pointer font-bold shadow-[0_0_15px_rgba(37,99,235,0.2)]"
            >
              <Save className="w-4 h-4" />
              <span>{editData ? 'Simpan Perubahan' : 'Simpan Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
