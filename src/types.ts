/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ServiceRequest {
  id: string; // Internal unique ID
  customerName?: string;
  srNumber: string;
  woNumber: string;
  uc3Number: string;
  uc3Status: string;
  srDate: string;
  srAging: number;
  planningDate: string;
  actionDate: string;
  rfuDate: string;
  unitCondition: string; // e.g. "Breakdown" | "Running Without Trouble"
  snUnit: string;
  model: string;
  issueDescription: string;
  location: string;
  labour1: string;
  labour2: string;
  labour3?: string;
  labour4?: string;
  labour5?: string;
  labour6?: string;
  status: string; // e.g. "Inprogress" | "Delay Labour" | "RFU_LEAD J"
  leadJobDescription: string;
  ticketId?: string;
  aksi?: string;
}

export interface SpreadsheetConfig {
  scriptUrl: string;
  sheetName: string;
  lastSynced: string | null;
}

export interface FailureInformation {
  id: string;
  customer: string;
  fiNumber: string;
  fiDate: string;
  fiStatus: string;
  fiAging: number;
  evidentPm: string;
  createBy: string;
  partStatus?: string;
  planningProgress?: string;
}

export interface SuratTugas {
  mechanicName: string;
  startDate: string; // YYYY-MM-DD or empty
  endDate: string;   // YYYY-MM-DD or empty
  lastDateDeclaration?: string;
  statusTugas?: 'Surat Tugas' | 'Lumpsum';
}
