import React, { useState } from 'react';
import { UnitConfig } from '../../types';
import {
  Settings,
  Save,
  Download,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface SettingsViewProps {
  config: UnitConfig;
  onUpdateConfig: (newConfig: UnitConfig) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
  onResetData,
}) => {
  const [formData, setFormData] = useState<UnitConfig>(config);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(formData);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 3000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kkn-space-config-${formData.unitCode.toLowerCase()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-[#E8E6DF]">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="Settings">
            ⚙️
          </span>
          <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
            Settings & Pengaturan Unit KKN
          </h1>
        </div>
        <p className="text-xs text-stone-500">
          Kelola informasi identitas kelompok, universitas pengirim, Dosen Pembimbing Lapangan (DPL), dan ekspor data sistem.
        </p>
      </div>

      {showSavedFeedback && (
        <div className="p-3 rounded-md bg-[#EBF1ED] border border-[#CCDCD0] text-xs text-[#284230] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4A6B53]" />
          <span>Pengaturan unit berhasil disimpan.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-6 text-xs">
        <h2 className="font-serif text-base font-semibold text-stone-900 pb-2 border-b border-stone-100">
          Identitas Unit & Lokasi Pengabdian
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-medium text-stone-700">Kode Unit</label>
            <input
              type="text"
              value={formData.unitCode}
              onChange={(e) => setFormData({ ...formData, unitCode: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53] font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-stone-700">Nama Resmi Unit</label>
            <input
              type="text"
              value={formData.unitName}
              onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-stone-700">Perguruan Tinggi / Universitas</label>
            <input
              type="text"
              value={formData.university}
              onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-stone-700">Periode KKN</label>
            <input
              type="text"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
            />
          </div>
        </div>

        <h2 className="font-serif text-base font-semibold text-stone-900 pt-2 pb-2 border-b border-stone-100">
          Wilayah & Pembimbing
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="font-medium text-stone-700">Desa Penempatan</label>
            <input
              type="text"
              value={formData.villageName}
              onChange={(e) => setFormData({ ...formData, villageName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-stone-700">Kecamatan</label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-stone-700">Kabupaten</label>
            <input
              type="text"
              value={formData.regency}
              onChange={(e) => setFormData({ ...formData, regency: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-medium text-stone-700">Nama Lengkap DPL</label>
            <input
              type="text"
              value={formData.dplName}
              onChange={(e) => setFormData({ ...formData, dplName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-stone-700">NIP DPL</label>
            <input
              type="text"
              value={formData.dplNip}
              onChange={(e) => setFormData({ ...formData, dplNip: e.target.value })}
              className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53] font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-medium text-stone-700">Alamat Lengkap Rumah Posko KKN</label>
          <input
            type="text"
            value={formData.poskoAddress}
            onChange={(e) => setFormData({ ...formData, poskoAddress: e.target.value })}
            className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Backup and Data Management */}
      <div className="p-5 rounded-lg bg-[#FAF9F5] border border-[#E3E0D6] space-y-4 text-xs">
        <h3 className="font-serif text-sm font-semibold text-stone-900">
          Manajemen Data & Backup
        </h3>
        <p className="text-stone-600">
          Data saat ini disimpan dalam memori aplikasi lokal secara modular. Anda dapat mengunduh backup konfigurasi JSON atau mereset data contoh.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#D5D2C8] text-stone-700 font-medium hover:bg-stone-50"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Ekspor Konfigurasi JSON</span>
          </button>

          <button
            onClick={onResetData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-300 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Reset Data Mock ke Awal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
