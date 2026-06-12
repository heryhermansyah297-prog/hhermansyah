/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, FileSpreadsheet, ArrowRight, Play, Database, FileDown } from 'lucide-react';
import { ServiceRequest } from '../types';

interface GoogleAppsScriptGuideProps {
  onSync: (url: string) => Promise<void>;
  currentUrl: string;
  isSyncing: boolean;
  onClear: () => void;
  mockData: ServiceRequest[];
}

export default function GoogleAppsScriptGuide({
  onSync,
  currentUrl,
  isSyncing,
  onClear,
  mockData,
}: GoogleAppsScriptGuideProps) {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [copied, setCopied] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    if (!urlInput.trim()) {
      setErrorLocal('Mohon masukkan URL Google Apps Script yang valid.');
      return;
    }
    if (!urlInput.startsWith('https://script.google.com/')) {
      setErrorLocal('URL harus dimulai dengan "https://script.google.com/..."');
      return;
    }
    try {
      await onSync(urlInput.trim());
    } catch (err: any) {
      setErrorLocal(err?.message || 'Gagal mensinkronisasikan data. Pastikan CORS diaktifkan dan deployment diset ke "Anyone".');
    }
  };

  const scriptCode = `/**
 * @license
 * Heavy Equipment Service Tracker - Google Sheets Sync Script
 * Versi Dinamis - Mendukung Header Indonesia & Inggris
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var result = {
      serviceRequests: [],
      failureInformations: [],
      suratTugas: [],
      sheetsFound: {
        serviceRequests: false,
        failureInformations: false,
        suratTugas: false
      },
      debuginfo: {
        processedSheets: []
      }
    };
    
    // Identifikasi sheet berdasarkan header yang ada di baris pertama
    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var sheetName = sheet.getName();
      var rows = sheet.getDataRange().getValues();
      
      result.debuginfo.processedSheets.push({
        name: sheetName,
        rows: rows.length,
        headers: rows.length > 0 ? rows[0].join('|').slice(0, 50) + "..." : "EMPTY"
      });

      if (rows.length <= 0) continue;
      
      var headers = rows[0].map(function(h) {
        return h.toString().trim();
      });
      
      var headersStr = headers.join('|').toUpperCase();
      var type = 'unknown';
      
      // Deteksi Tipe Sheet berdasarkan kata kunci di Header
      if (headersStr.indexOf('SR NUMBER') > -1 || headersStr.indexOf('NOMOR SR') > -1 || headersStr.indexOf('SR NO') > -1 || headersStr.indexOf('CUSTOMER') > -1) {
        type = 'service_request';
        result.sheetsFound.serviceRequests = true;
      } else if (headersStr.indexOf('FI NUMBER') > -1 || headersStr.indexOf('NOMOR FI') > -1 || headersStr.indexOf('FI NO') > -1) {
        type = 'failure_information';
        result.sheetsFound.failureInformations = true;
      } else if (headersStr.indexOf('NAMA MEKANIK') > -1 || headersStr.indexOf('MECHANIC NAME') > -1 || headersStr.indexOf('KPI') > -1) {
        type = 'surat_tugas';
        result.sheetsFound.suratTugas = true;
      }
      
      if (type === 'unknown') continue;
      
      // Found the right sheet, but maybe it only has headers
      if (rows.length <= 1) continue;

      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var item = { id: (i).toString() };
        var hasData = false;
        
        for (var j = 0; j < headers.length; j++) {
          var header = headers[j];
          var val = row[j];
          
          if (val instanceof Date) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
          }
          
          var key = mapHeaderToKey(header, type);
          if (key) {
            item[key] = val;
            if (val !== undefined && val !== null && val.toString().trim() !== "") {
              hasData = true;
            }
          } else {
            // Backup jika tidak ada mapping: gunakan nama header asli
            item[header] = val;
          }
        }
        
        if (hasData) {
          if (type === 'service_request' && (item.srNumber || item.customerName)) {
             result.serviceRequests.push(item);
          } else if (type === 'failure_information' && (item.fiNumber || item.customer)) {
             result.failureInformations.push(item);
          } else if (type === 'surat_tugas' && (item.mechanicName)) {
             result.suratTugas.push(item);
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function mapHeaderToKey(header, type) {
  var h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (type === 'service_request') {
    if (h === "customername" || h === "namacustomer" || h === "pelanggan") return "customerName";
    if (h === "srnumber" || h === "nomorsr") return "srNumber";
    if (h === "wonumber" || h === "nomorwo") return "woNumber";
    if (h === "uc3number" || h === "nomoruc3") return "uc3Number";
    if (h === "uc3status" || h === "statusuc3") return "uc3Status";
    if (h === "ticketid" || h === "idticket" || h === "idtiket") return "ticketId";
    if (h === "srdate" || h === "tanggalsr" || h === "tanggal") return "srDate";
    if (h === "sraging" || h === "umursr" || h === "aging") return "srAging";
    if (h === "planningdate" || h === "jadwalplanning" || h === "tanggalplanning") return "planningDate";
    if (h === "actiondate" || h === "tanggalaction" || h === "action") return "actionDate";
    if (h === "rfudate" || h === "tanggalrfu" || h === "rfu") return "rfuDate";
    if (h === "unitcondition" || h === "kondisialat" || h === "kondisiunit") return "unitCondition";
    if (h === "snunit" || h === "sn" || h === "serialnumber") return "snUnit";
    if (h === "model" || h === "tipe") return "model";
    if (h === "issuedescription" || h === "deskripsimasalah" || h === "masalah" || h === "isideskripsimasalah") return "issueDescription";
    if (h === "location" || h === "lokasi" || h === "sektor") return "location";
    if (h === "labour1" || h === "mekanik1") return "labour1";
    if (h === "labour2" || h === "mekanik2") return "labour2";
    if (h === "labour3" || h === "mekanik3") return "labour3";
    if (h === "labour4" || h === "mekanik4") return "labour4";
    if (h === "labour5" || h === "mekanik5") return "labour5";
    if (h === "labour6" || h === "mekanik6") return "labour6";
    if (h === "status" || h === "statuskerja" || h === "statuspekerjaan") return "status";
    if (h === "leadjobdescription" || h === "deskripsikerja" || h === "laporanaktivitas" || h === "leadjob") return "leadJobDescription";
    if (h === "aksi" || h === "action") return "aksi";
    if (h === "component" || h === "komponen") return "component";
    if (h === "partnumber" || h === "nomorpart") return "partNumber";
    if (h === "partdescription" || h === "deskripsipart") return "partDescription";
    if (h === "qty" || h === "jumlah") return "qty";
    if (h === "price" || h === "harga") return "price";
    if (h === "totalprice" || h === "totalharga") return "totalPrice";
    if (h === "remarks" || h === "keterangan") return "remarks";
    if (h === "lastupdated" || h === "updateterakhir") return "lastUpdated";
    if (h === "updatedby" || h === "diperbaruioleh") return "updatedBy";
    if (h === "segment" || h === "segmen") return "segment";
  }
  
  if (type === 'failure_information') {
    if (h === "customer" || h === "pelanggan") return "customer";
    if (h === "finumber" || h === "nomorfi") return "fiNumber";
    if (h === "fidate" || h === "tanggalfi") return "fiDate";
    if (h === "fiaging" || h === "aging") return "fiAging";
    if (h === "fistatus" || h === "statusfi") return "fiStatus";
    if (h === "partstatus" || h === "statuspart") return "partStatus";
    if (h === "planningprogress" || h === "jadwalplanning") return "planningProgress";
    if (h === "evidentpm" || h === "bukti") return "evidentPm";
    if (h === "createby" || h === "dibuatoleh") return "createBy";
    if (h === "action" || h === "aksi") return "action";
    if (h === "status") return "status";
  }
  
  if (type === 'surat_tugas') {
    if (h === "namamekanik" || h === "mechanicname") return "mechanicName";
    if (h === "statustugas" || h === "statustugasmekanik") return "statusTugas";
    if (h === "stmulai" || h === "startdate") return "startDate";
    if (h === "stselesai" || h === "enddate") return "endDate";
    if (h === "lastdatedeclaration" || h === "declarationdate") return "lastDateDeclaration";
    if (h === "deklarasi" || h === "deklarasipersentase") return "deklarasi";
    if (h === "harist" || h === "jumlahhari") return "hariSt";
    if (h === "pencapaiankpi" || h === "kpimin" || h === "pencapaiankpiseniunjumat") return "kpiScore";
    if (h === "tindakan" || h === "action") return "tindakan";
  }
  
  return null;
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = postData.action;
    var type = postData.type || 'service_request';
    var payload = postData.data || postData.payload;
    
    // Temukan sheet yang sesuai secara dinamis
    var sheets = ss.getSheets();
    var sheet = null;
    
    for (var s = 0; s < sheets.length; s++) {
      var hRow = sheets[s].getDataRange().getValues()[0] || [];
      var hStr = hRow.join('|').toUpperCase();
      
      if (type === 'service_request' && (hStr.indexOf('NOMOR SR') > -1 || hStr.indexOf('SR NUMBER') > -1)) {
        sheet = sheets[s]; break;
      } else if (type === 'failure_information' && (hStr.indexOf('NOMOR FI') > -1 || hStr.indexOf('FI NUMBER') > -1)) {
        sheet = sheets[s]; break;
      } else if (type === 'surat_tugas' && (hStr.indexOf('NAMA MEKANIK') > -1 || hStr.indexOf('MECHANIC NAME') > -1)) {
        sheet = sheets[s]; break;
      }
    }
    
    if (!sheet) return errorResponse("Sheet target tidak ditemukan di spreadsheet ini.");

    var rows = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return h.toString().trim(); });

    if (action === 'bulk_replace') {
      if (!payload || !Array.isArray(payload)) return errorResponse("Payload tidak valid untuk bulk_replace.");
      
      // Safety guard: Jangan hapus data jika payload kosong (mungkin bug di dashboard)
      // kecuali user memang sengaja ingin mengosongkan (bisa dicek lewat flag lain jika perlu)
      if (payload.length === 0 && sheet.getLastRow() > 10) {
        return errorResponse("Push dibatalkan: Dashboard mengirim 0 data untuk sheet yang berisi banyak baris. Mohon refresh dashboard dulu.");
      }

      if (sheet.getLastRow() > 1) {
        // Hanya bersihkan baris data, biarkan header tetap ada.
        // Gunakan getLastColumn untuk memastikan semua kolom dibersihkan sebelum ditimpa data baru
        sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(headers.length, sheet.getLastColumn())).clearContent();
      }
      
      if (payload.length > 0) {
        var valuesToWrite = [];
        for (var i = 0; i < payload.length; i++) {
          var item = payload[i];
          var rowData = new Array(headers.length);
          for (var j = 0; j < headers.length; j++) {
            var headerName = headers[j];
            var key = mapHeaderToKey(headerName, type);
            
            // Prioritas: key mapping dashboard -> nama header asli dari objek item
            var val = "";
            if (key && item[key] !== undefined) {
              val = item[key];
            } else if (item[headerName] !== undefined) {
              val = item[headerName];
            }
            rowData[j] = val;
          }
          valuesToWrite.push(rowData);
        }
        if (valuesToWrite.length > 0) {
          sheet.getRange(2, 1, valuesToWrite.length, headers.length).setValues(valuesToWrite);
        }
      }
      return successResponse();
    }

    // Operasi per record (Add/Update/Delete)
    var findColIdx = function(keyName) {
      for (var j = 0; j < headers.length; j++) {
        if (mapHeaderToKey(headers[j], type) === keyName) return j;
      }
      return -1;
    };

    var idKey = type === 'service_request' ? 'srNumber' : (type === 'failure_information' ? 'fiNumber' : 'mechanicName');
    var idColIdx = findColIdx(idKey);
    
    if (action === 'add') {
      var newRow = new Array(headers.length);
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j];
        var key = mapHeaderToKey(headerName, type);
        var val = "";
        
        if (key && payload[key] !== undefined) {
          val = payload[key];
        } else if (payload[headerName] !== undefined) {
          val = payload[headerName];
        }
        newRow[j] = val;
      }
      
      // Cari baris kosong pertama mulai dari baris 2
      var targetRow = -1;
      for (var r = 1; r < rows.length; r++) {
        // Cek apakah kolom ID di baris ini kosong
        if (rows[r][idColIdx] === "" || rows[r][idColIdx] === undefined || rows[r][idColIdx] === null) {
          targetRow = r + 1;
          break;
        }
      }
      
      if (targetRow > -1) {
        sheet.getRange(targetRow, 1, 1, headers.length).setValues([newRow]);
      } else {
        sheet.appendRow(newRow);
      }
      return successResponse();
    }

    if (idColIdx > -1) {
      for (var r = 1; r < rows.length; r++) {
        // Pembandingan ID (Nomor SR atau Nama Mekanik)
        if (rows[r][idColIdx] == payload[idKey]) {
          if (action === 'delete') {
            sheet.deleteRow(r + 1);
          } else if (action === 'update') {
            for (var j = 0; j < headers.length; j++) {
              var headerName = headers[j];
              var key = mapHeaderToKey(headerName, type);
              var newVal = undefined;
              
              if (key && payload[key] !== undefined) {
                newVal = payload[key];
              } else if (payload[headerName] !== undefined) {
                newVal = payload[headerName];
              }
              
              if (newVal !== undefined) {
                sheet.getRange(r + 1, j + 1).setValue(newVal);
              }
            }
          }
          return successResponse();
        }
      }
    }

    return errorResponse("Record tidak ditemukan di sheet.");
  } catch (err) {
    return errorResponse(err.toString());
  }
}

function successResponse() {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: msg })).setMimeType(ContentService.MimeType.JSON);
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    const headers = [
      'SR Number',
      'WO Number',
      'UC3 Number',
      'UC3 Status',
      'SR Date',
      'SR Aging',
      'Planning Date',
      'Action Date',
      'RFU Date',
      'Unit Condition',
      'SN Unit',
      'Model',
      'Issue Description',
      'Location',
      'Labour 1',
      'Labour 2',
      'Status',
      'LEAD JOB DESCRIPTION'
    ];

    const content = mockData.map(item => [
      item.srNumber,
      item.woNumber,
      item.uc3Number,
      item.uc3Status,
      item.srDate,
      item.srAging,
      item.planningDate,
      item.actionDate,
      item.rfuDate,
      item.unitCondition,
      item.snUnit,
      item.model,
      item.issueDescription,
      item.location,
      item.labour1,
      item.labour2,
      item.status,
      // escape double quotes of job descriptions
      '"' + (item.leadJobDescription || '').replace(/"/g, '""') + '"'
    ]);

    const csvContent = [headers.join(','), ...content.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Heavy_Equipment_Service_Data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-3xl p-6 md:p-8 text-zinc-100 max-w-4xl mx-auto shadow-xl">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/10">
          <Database id="sync-icon" className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white font-sans">Hubungkan dengan Google Sheets Anda</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Untuk menyambungkan dashboard ini ke file spreadsheet target Anda secara dua arah (Baca & Tulis), 
            Anda harus menambahkan kode Apps Script ke file tersebut sehingga browser memiliki izin akses keamanan.
          </p>
        </div>
      </div>

      <div className="mb-10 border-b border-zinc-800 pb-8">
        <form onSubmit={handleSyncSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              URL Google Apps Script Web App
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-4 py-3 bg-[#09090B] border border-[#27272A] rounded-xl font-mono text-sm focus:outline-none focus:border-blue-500 text-zinc-200 transition-colors"
              />
              <button
                type="submit"
                disabled={isSyncing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-semibold text-xs uppercase tracking-wider transition-all duration-150 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center space-x-2 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Data'}</span>
              </button>
            </div>
            {errorLocal && (
              <p className="text-rose-400 text-xs mt-2.5 font-medium whitespace-pre-line">
                <span className="mr-1">⚠️</span> {errorLocal}
              </p>
            )}
            {currentUrl && !errorLocal && (
              <p className="text-emerald-400 text-xs mt-2.5 flex items-center gap-1.5 font-medium">
                <span>✓</span> Terhubung ke: <span className="font-mono bg-[#09090B] border border-[#27272A] px-1.5 py-0.5 rounded text-blue-400">{currentUrl.substring(0, 45)}...</span>
              </p>
            )}
          </div>
          {currentUrl && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-zinc-400 hover:text-white transition cursor-pointer font-medium"
              >
                Putuskan koneksi & kembali ke data demo
              </button>
            </div>
          )}
        </form>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          Langkah-langkah Setup Google Sheets (Google Apps Script)
        </h3>

        <div className="space-y-6 text-sm text-zinc-300">
          {/* Langkah 1 */}
          <div className="flex items-start space-x-4">
            <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-[#09090B] border border-[#27272A] text-blue-400 text-xs font-bold rounded-xl shadow-inner">
              1
            </span>
            <div className="flex-1">
              <p className="font-semibold text-white">Sesuaikan Format Kolom target Anda</p>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Google Sheet target harus memiliki 1 baris pertama yang berisi nama-nama kolom/header. Dashboard ini mendukung mapping otomatis untuk Service Request (Kolom A-X) dan Surat Tugas (Kolom AW-BE):
              </p>
              
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Service Request (Kolom A-X)</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] font-mono text-emerald-400 bg-[#09090B] p-3 rounded-xl border border-zinc-800">
                    <div>A: CUSTOMER NAME</div>
                    <div>B: NOMOR SR</div>
                    <div>C: NOMOR WO</div>
                    <div>D: NOMOR UC3</div>
                    <div>E: STATUS UC3</div>
                    <div>F: ID TICKET</div>
                    <div>G: TANGGAL SR</div>
                    <div>H: SR AGING</div>
                    <div>I: JADWAL PLANNING</div>
                    <div>J: TANGGAL ACTION</div>
                    <div>K: TANGGAL RFU</div>
                    <div>L: KONDISI ALAT</div>
                    <div>M: S/N</div>
                    <div>N: MODEL</div>
                    <div>O: DESKRIPSI MASALAH</div>
                    <div>P: LOKASI / SEKTOR</div>
                    <div>Q-V: MEKANIK 1-6</div>
                    <div>W: STATUS KERJA</div>
                    <div>X: LAPORAN AKTIVITAS</div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Failure Information (Kolom Y-AI)</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] font-mono text-amber-400 bg-[#09090B] p-3 rounded-xl border border-zinc-800">
                    <div>Y: CUSTOMER</div>
                    <div>Z: FI NUMBER</div>
                    <div>AA: FI DATE</div>
                    <div>AB: FI AGING</div>
                    <div>AC: FI STATUS</div>
                    <div>AD: PART STATUS</div>
                    <div>AE: PLANNING PROGRESS</div>
                    <div>AF: EVIDENT PM</div>
                    <div>AG: CREATE BY</div>
                    <div>AH: ACTION</div>
                    <div>AI: STATUS</div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Surat Tugas (Kolom AJ-AQ)</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9px] font-mono text-blue-400 bg-[#09090B] p-3 rounded-xl border border-zinc-800">
                    <div>AJ: NAMA MEKANIK</div>
                    <div>AK: STATUS TUGAS</div>
                    <div>AL: ST MULAI</div>
                    <div>AM: ST SELESAI</div>
                    <div>AN: LAST DATE DECLARATION</div>
                    <div>AO: DEKLARASI (%)</div>
                    <div>AP: HARI ST</div>
                    <div>AQ: PENCAPAIAN KPI</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadCSV}
                className="mt-4 inline-flex items-center space-x-2 px-3.5 py-2 bg-[#09090B] border border-[#27272A] hover:bg-zinc-800 hover:text-white transition rounded-xl text-xs font-semibold text-zinc-200 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 text-zinc-400" />
                <span>Unduh Format Template CSV</span>
              </button>
            </div>
          </div>

          {/* Langkah 2 */}
          <div className="flex items-start space-x-4">
            <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-[#09090B] border border-[#27272A] text-blue-400 text-xs font-bold rounded-xl shadow-inner">
              2
            </span>
            <div className="flex-1">
              <p className="font-semibold text-white">Tambahkan Script ke Google Sheet Target Anda</p>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Buka file Google Sheet yang ingin disinkronisasi: <a href="https://docs.google.com/spreadsheets/d/1k1ydWIDJGOzwQhNh-sfc5odySSqudJtX_SGWnisl2yY/edit" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">1k1ydWIDJGOzwQ...</a> <br/>
                Lalu dari menu atas, klik <span className="font-mono bg-[#09090B] border border-[#27272A] px-1.5 py-0.5 rounded text-blue-400">Extensions (Ekstensi)</span> → <span className="font-mono bg-[#09090B] border border-[#27272A] px-1.5 py-0.5 rounded text-blue-400">Apps Script</span>. Hapus kode default (jika ada), lalu <strong>salin dan tempelkan kode di bawah ini</strong>:
              </p>

              <div className="relative mt-4 group">
                <div className="absolute right-3 top-3 z-10">
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 px-3 bg-[#09090B] border border-[#27272A] text-zinc-300 rounded-lg hover:bg-zinc-800 hover:text-white text-xs inline-flex items-center gap-1.5 transition cursor-pointer font-semibold"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Salin Script</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 bg-[#09090B] border border-[#27272A] text-zinc-300 text-xs font-mono rounded-xl max-h-60 overflow-y-auto block whitespace-pre scrollbar-thin">
                  {scriptCode}
                </pre>
              </div>
            </div>
          </div>

          {/* Langkah 3 */}
          <div className="flex items-start space-x-4">
            <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-[#09090B] border border-[#27272A] text-blue-400 text-xs font-bold rounded-xl shadow-inner">
              3
            </span>
            <div className="flex-1">
              <p className="font-semibold text-white">Deploy sebagai Aplikasi Web (Web App)</p>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Di pojok kanan atas editor script, klik tombol <span className="font-semibold text-blue-400">Deploy</span> → <span className="font-semibold text-blue-400">New deployment</span>.
              </p>
              <ul className="list-disc pl-5 mt-1.5 space-y-1.5 text-xs text-zinc-400 leading-relaxed font-medium">
                <li>Klik tombol <span className="font-bold text-zinc-300">Select type (Pilih jenis)</span> (ikon roda gigi) dan pilih <span className="text-zinc-300">Web app</span>.</li>
                <li>Setel <span className="font-bold text-zinc-300">Execute as (Jalankan sebagai)</span> ke <span className="font-semibold text-emerald-400 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">Me (Saya / Email Anda)</span>.</li>
                <li>Setel <span className="font-bold text-zinc-300">Who has access (Siapa yang memiliki akses)</span> ke <span className="font-semibold text-amber-500 text-xs bg-amber-500/10 px-1.5 py-0.5 rounded">Anyone (Siapa saja)</span>. <span className="text-blue-400 font-semibold">(Sangat penting agar bypass CORS berhasil!)</span></li>
                <li>Klik <span className="font-bold text-zinc-300">Deploy</span>, berikan izin jika diminta, lalu salin <span className="font-bold text-zinc-200">Web App URL</span> yang berakhiran <span className="font-mono text-zinc-300">/exec</span> dan tempelkan di formulir sinkronisasi di atas!</li>
              </ul>
            </div>
          </div>

          <div className="bg-[#09090B] rounded-2xl p-4.5 border border-[#27272A] text-xs text-zinc-400 leading-relaxed flex items-center gap-3">
            <div className="bg-blue-500/15 text-blue-400 p-2 rounded-xl self-start">
              💡
            </div>
            <p className="font-medium">
              <strong>Tips Keamanan & Aksesibilitas:</strong> Pilihan <span className="text-zinc-300 font-semibold">"Who has access: Anyone"</span> hanya mengekspos script untuk memformat spreadsheet Anda menjadi JSON, bukan data privat Google Drive Anda secara langsung. Ini adalah metode termudah dan teraman untuk menyinkronkan data visualisasi tanpa setup client-auth yang repot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
