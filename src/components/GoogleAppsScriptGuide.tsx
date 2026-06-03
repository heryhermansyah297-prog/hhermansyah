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

  const scriptCode = `function doGet(e) {
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
    }
  };
  
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) continue;
    
    var headers = rows[0].map(function(h) {
      return h.toString().trim();
    });
    
    // Classify columns into segment ranges
    var colSegments = new Array(headers.length);
    var currentSegment = 'service_request';
    for (var j = 0; j < headers.length; j++) {
      var hClean = headers[j].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (hClean === 'customer' || hClean === 'finumber') {
        currentSegment = 'failure_information';
      } else if (hClean === 'namamekanik' || hClean === 'mechanicname') {
        currentSegment = 'surat_tugas';
      }
      colSegments[j] = currentSegment;
      
      if (currentSegment === 'service_request') result.sheetsFound.serviceRequests = true;
      if (currentSegment === 'failure_information') result.sheetsFound.failureInformations = true;
      if (currentSegment === 'surat_tugas') result.sheetsFound.suratTugas = true;
    }
    
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var srItem = { id: i.toString() };
      var fiItem = { id: i.toString() };
      var stItem = { id: i.toString() };
      
      var srHasData = false;
      var fiHasData = false;
      var stHasData = false;
      
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        var val = row[j];
        
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
        }
        
        var segment = colSegments[j];
        var key = mapHeaderToKey(header, segment);
        if (key) {
          if (segment === 'service_request') {
            srItem[key] = val;
            if (val !== undefined && val !== null && val.toString().trim() !== "") {
              srHasData = true;
            }
          } else if (segment === 'failure_information') {
            fiItem[key] = val;
            if (val !== undefined && val !== null && val.toString().trim() !== "") {
              fiHasData = true;
            }
          } else if (segment === 'surat_tugas') {
            stItem[key] = val;
            if (val !== undefined && val !== null && val.toString().trim() !== "") {
              stHasData = true;
            }
          }
        }
      }
      
      if (srHasData && srItem.srNumber) {
        srItem.status = srItem.status || "Inprogress";
        result.serviceRequests.push(srItem);
      }
      if (fiHasData && fiItem.fiNumber) {
        result.failureInformations.push(fiItem);
      }
      if (stHasData && stItem.mechanicName) {
        result.suratTugas.push(stItem);
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function mapHeaderToKey(header, segment) {
  var h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (segment === 'service_request') {
    if (h === "customername" || h === "namacustomer") return "customerName";
    if (h === "srnumber" || h === "nomorsr") return "srNumber";
    if (h === "wonumber" || h === "nomorwo") return "woNumber";
    if (h === "uc3number" || h === "uc3no" || h === "nomoruc3") return "uc3Number";
    if (h === "uc3status" || h === "statusuc3") return "uc3Status";
    if (h === "ticketid" || h === "idticket" || h === "nomorticket") return "ticketId";
    if (h === "srdate" || h === "tanggal" || h === "tanggalsr") return "srDate";
    if (h === "sraging" || h === "aging" || h === "umursr") return "srAging";
    if (h === "planningdate" || h === "tanggalplanning" || h === "jadwalplanning") return "planningDate";
    if (h === "actiondate" || h === "tanggalaction") return "actionDate";
    if (h === "rfudate" || h === "tanggalrfu") return "rfuDate";
    if (h === "unitcondition" || h === "kondisiunit" || h === "kondisialat") return "unitCondition";
    if (h === "snunit" || h === "serialnumber" || h === "sn") return "snUnit";
    if (h === "model" || h === "tipe") return "model";
    if (h === "issuedescription" || h === "masalah" || h === "deskripsi" || h === "deskrispisu" || h === "deskripsimasalah") return "issueDescription";
    if (h === "location" || h === "lokasi" || h === "sektorlokasi") return "location";
    if (h === "labour1" || h === "mekanik1" || h === "laboursatu") return "labour1";
    if (h === "labour2" || h === "mekanik2" || h === "labourdua") return "labour2";
    if (h === "labour3" || h === "mekanik3" || h === "labourtiga") return "labour3";
    if (h === "labour4" || h === "mekanik4" || h === "labourempat") return "labour4";
    if (h === "labour5" || h === "mekanik5" || h === "labourlima") return "labour5";
    if (h === "labour6" || h === "mekanik6" || h === "labourenam") return "labour6";
    if (h === "status" || h === "statuskerja") return "status";
    if (h === "leadjobdescription" || h === "deskripsikerja" || h === "leadjob" || h === "laporanaktivitasmekanikleadjobdescription" || h === "laporanaktivitasmekanik") return "leadJobDescription";
    if (h === "aksi") return "aksi";
  }
  
  if (segment === 'failure_information') {
    if (h === "customer" || h === "pelanggan") return "customer";
    if (h === "finumber" || h === "nomorfi") return "fiNumber";
    if (h === "fidate" || h === "tanggalfi") return "fiDate";
    if (h === "fiaging" || h === "fiagingdays") return "fiAging";
    if (h === "fistatus" || h === "statusfi" || h === "status") return "fiStatus";
    if (h === "partstatus" || h === "statuspart") return "partStatus";
    if (h === "planningprogress" || h === "progressplanning") return "planningProgress";
    if (h === "evidentpm" || h === "evident") return "evidentPm";
    if (h === "createby" || h === "dibuatoleh") return "createBy";
    if (h === "action" || h === "tindakan") return "action";
  }
  
  if (segment === 'surat_tugas') {
    if (h === "namamekanik" || h === "mechanicname") return "mechanicName";
    if (h === "statustugas" || h === "status") return "statusTugas";
    if (h === "stmulai" || h === "startdate") return "startDate";
    if (h === "stselesai" || h === "enddate") return "endDate";
    if (h === "lastdatedeclaration") return "lastDateDeclaration";
    if (h === "deklarasi") return "deklarasi";
    if (h === "harist") return "hariSt";
    if (h === "pencapaiankpiseninjumat" || h === "pencapaiankpi") return "kpiScore";
    if (h === "tindakan" || h === "action") return "action";
  }
  
  return null;
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var payload = postData.data || postData.payload;
    var type = postData.type;

    var sheets = ss.getSheets();
    var sheet = ss.getActiveSheet();

    for (var s = 0; s < sheets.length; s++) {
       var sHeaders = sheets[s].getDataRange().getValues()[0] || [];
       var sHeadersStr = sHeaders.join('').toUpperCase();
       
       var firstPayloadItem = null;
       if (payload) {
         if (Array.isArray(payload)) {
           if (payload.length > 0) {
             firstPayloadItem = payload[0];
           }
         } else {
           firstPayloadItem = payload;
         }
       }

       if (type === 'failure_information' || (firstPayloadItem && firstPayloadItem.fiNumber !== undefined)) {
         if (sHeadersStr.indexOf('FI NUMBER') > -1) {
            sheet = sheets[s];
            break;
         }
       } else if (type === 'surat_tugas' || (firstPayloadItem && firstPayloadItem.mechanicName !== undefined)) {
         if (sHeadersStr.indexOf('NAMA MEKANIK') > -1 || sHeadersStr.indexOf('ST MULAI') > -1) {
            sheet = sheets[s];
            break;
         }
       } else {
         if (sHeadersStr.indexOf('SR NUMBER') > -1 || sHeadersStr.indexOf('WO NUMBER') > -1) {
            sheet = sheets[s];
            break;
         }
       }
    }

    var rows = sheet.getDataRange().getValues();
    var headers = rows[0].map(function(h) { return h.toString().trim(); });

    // Classify columns into segment ranges
    var colSegments = new Array(headers.length);
    var currentSegment = 'service_request';
    for (var j = 0; j < headers.length; j++) {
      var hClean = headers[j].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (hClean === 'customer' || hClean === 'finumber') {
        currentSegment = 'failure_information';
      } else if (hClean === 'namamekanik' || hClean === 'mechanicname') {
        currentSegment = 'surat_tugas';
      }
      colSegments[j] = currentSegment;
    }

    // Find the columns that are target for this action
    var targetCols = [];
    for (var j = 0; j < headers.length; j++) {
      if (colSegments[j] === type) {
        targetCols.push(j);
      }
    }

    if (targetCols.length === 0) {
       for (var j = 0; j < headers.length; j++) {
         targetCols.push(j);
       }
    }

    var minColIdx = targetCols[0];
    var maxColIdx = targetCols[targetCols.length - 1];
    var numCols = maxColIdx - minColIdx + 1;

    if (action === 'add') {
       var targetRowIdx = 2;
       var foundEmpty = false;
       for (var r = 1; r < rows.length; r++) {
         var isEmpty = true;
         for (var k = 0; k < targetCols.length; k++) {
           var val = rows[r][targetCols[k]];
           if (val !== undefined && val !== null && val.toString().trim() !== "") {
             isEmpty = false;
             break;
           }
         }
         if (isEmpty) {
           targetRowIdx = r + 1;
           foundEmpty = true;
           break;
         }
       }
       if (!foundEmpty) {
         targetRowIdx = rows.length + 1;
       }

       var maxRows = sheet.getMaxRows();
       if (targetRowIdx > maxRows) {
         sheet.insertRowsAfter(maxRows, targetRowIdx - maxRows);
       }
       
       for (var k = 0; k < targetCols.length; k++) {
         var colIndex = targetCols[k] + 1;
         var hName = headers[targetCols[k]];
         var key = mapHeaderToKey(hName, type);
         var val = (key && payload[key] !== undefined && payload[key] !== null) ? payload[key] : "";
         sheet.getRange(targetRowIdx, colIndex).setValue(val);
       }
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    } 
    
    if (action === 'bulk_replace') {
       var maxRows = sheet.getMaxRows();
       if (maxRows > 1) {
         sheet.getRange(2, minColIdx + 1, maxRows - 1, numCols).clearContent();
       }
       
       if (payload && Array.isArray(payload)) {
         var valuesToWrite = [];
         for (var i = 0; i < payload.length; i++) {
           var item = payload[i];
           var rowValues = new Array(numCols);
           for (var c = 0; c < numCols; c++) {
             var hIdx = minColIdx + c;
             var hName = headers[hIdx];
             var key = mapHeaderToKey(hName, type);
             rowValues[c] = (key && item[key] !== undefined && item[key] !== null) ? item[key] : "";
           }
           valuesToWrite.push(rowValues);
         }
         
         if (valuesToWrite.length > 0) {
           var neededRows = valuesToWrite.length + 1;
           maxRows = sheet.getMaxRows();
           if (neededRows > maxRows) {
             sheet.insertRowsAfter(maxRows, neededRows - maxRows);
           }
           sheet.getRange(2, minColIdx + 1, valuesToWrite.length, numCols).setValues(valuesToWrite);
         }
       }
       
       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update' || action === 'delete') {
       var targetRowIdx = -1;
       var keyToMatch = type === 'service_request' ? payload.srNumber : (type === 'failure_information' ? payload.fiNumber : payload.mechanicName);
       var keyMappedName = type === 'service_request' ? 'srNumber' : (type === 'failure_information' ? 'fiNumber' : 'mechanicName');
       
       var headerKeyIdx = -1;
       for (var k = 0; k < targetCols.length; k++) {
         var hIdx = targetCols[k];
         var hMapped = mapHeaderToKey(headers[hIdx], type);
         if (hMapped === keyMappedName) {
           headerKeyIdx = hIdx;
           break;
         }
       }

       if (headerKeyIdx > -1) {
           for (var r = 1; r < rows.length; r++) {
               if (rows[r][headerKeyIdx] == keyToMatch) {
                   targetRowIdx = r + 1;
                   break;
               }
           }
       }

       if (targetRowIdx > -1) {
           if (action === 'delete') {
               var numRowsToShift = rows.length - targetRowIdx;
               if (numRowsToShift > 0) {
                  var blockValues = sheet.getRange(targetRowIdx + 1, minColIdx + 1, numRowsToShift, numCols).getValues();
                  sheet.getRange(targetRowIdx, minColIdx + 1, numRowsToShift, numCols).setValues(blockValues);
                  sheet.getRange(rows.length, minColIdx + 1, 1, numCols).clearContent();
               } else {
                  sheet.getRange(targetRowIdx, minColIdx + 1, 1, numCols).clearContent();
               }
           } else {
               for (var k = 0; k < targetCols.length; k++) {
                  var colIndex = targetCols[k] + 1;
                  var hName = headers[targetCols[k]];
                  var key = mapHeaderToKey(hName, type);
                  var val = (key && payload[key] !== undefined && payload[key] !== null) ? payload[key] : "";
                  sheet.getRange(targetRowIdx, colIndex).setValue(val);
               }
           }
           return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
       } else {
           return ContentService.createTextOutput(JSON.stringify({ status: 'not_found', msg: 'Baris tidak ditemukan' })).setMimeType(ContentService.MimeType.JSON);
       }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'invalid_action' })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

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
      `"${(item.leadJobDescription || '').replace(/"/g, '""')}"`
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
                Google Sheet target harus memiliki 1 baris pertama yang berisi nama-nama kolom/header (ex: SR Number, WO, Status). Anda bisa mengunduh file CSV di bawah dan menyalin baris pertamanya ke Sheet Anda agar struktur kolomnya bisa dibaca otomatis.
              </p>
              <button
                onClick={handleDownloadCSV}
                className="mt-3 inline-flex items-center space-x-2 px-3.5 py-2 bg-[#09090B] border border-[#27272A] hover:bg-zinc-800 hover:text-white transition rounded-xl text-xs font-semibold text-zinc-200 cursor-pointer"
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
