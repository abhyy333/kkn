import React, { useState } from 'react';
import { ArchiveRecord } from '../../types';
import {
  Archive,
  Plus,
  FileText,
  FileArchive,
  Download,
  Search,
  ExternalLink,
} from 'lucide-react';

interface ArchiveViewProps {
  records: ArchiveRecord[];
  onAddArchive: (record: ArchiveRecord) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ records, onAddArchive }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ArchiveRecord['category']>('Legalitas & Izin');
  const [fileFormat, setFileFormat] = useState<ArchiveRecord['fileFormat']>('PDF');
  const [referenceNumber, setReferenceNumber] = useState('');

  const filtered = records.filter((r) => {
    const matchesFilter = filter === 'all' || r.category === filter;
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.referenceNumber && r.referenceNumber.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newRecord: ArchiveRecord = {
      id: `arc-${Date.now()}`,
      title,
      category,
      fileFormat,
      dateUploaded: new Date().toISOString().slice(0, 10),
      size: '1.8 MB',
      referenceNumber: referenceNumber || undefined,
    };

    onAddArchive(newRecord);
    setIsModalOpen(false);
    setTitle('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Archive">
              🗄️
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Archive & Berkas Administrasi
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Penyimpanan dokumen legalitas resmi, SK penugasan rektor, perizinan desa dan Bakesbangpol, template surat, dan logo unit.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Arsip Dokumen</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'Legalitas & Izin', 'Proposal & Kerangka Acuan', 'Template & Kop'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  filter === cat
                    ? 'bg-[#EBF1ED] text-[#284230] font-semibold'
                    : 'text-stone-600 hover:bg-[#EFECE5]'
                }`}
              >
                {cat === 'all' ? 'Semua Berkas' : cat}
              </button>
            )
          )}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama berkas atau nomor SK..."
            className="pl-8 pr-3 py-1.5 rounded-md text-xs bg-white border border-[#E0DED7] focus:outline-none focus:border-[#4A6B53] w-full sm:w-64"
          />
        </div>
      </div>

      {/* Archive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((record) => (
          <div
            key={record.id}
            className="p-4 rounded-lg bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] shadow-2xs space-y-3 transition-colors flex items-start justify-between gap-3"
          >
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <span className="font-semibold text-stone-700 bg-stone-100 px-1.5 py-0.2 rounded font-mono">
                  {record.fileFormat}
                </span>
                <span>·</span>
                <span className="text-[#4A6B53]">{record.category}</span>
              </div>

              <h3 className="font-medium text-xs text-stone-900 leading-snug">
                {record.title}
              </h3>

              <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
                <span>Diunggah: {record.dateUploaded}</span>
                <span>·</span>
                <span>Ukuran: {record.size}</span>
                {record.referenceNumber && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-stone-500 truncate">{record.referenceNumber}</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => alert(`Mengunduh berkas arsip: ${record.title}`)}
              className="p-2 rounded-md hover:bg-stone-100 text-stone-600 transition-colors shrink-0"
              title="Unduh Berkas"
              aria-label={`Unduh ${record.title}`}
            >
              <Download className="w-4 h-4 text-stone-600" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Upload Dokumen Arsip
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Nama Dokumen</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Berita Acara Musyawarah Balai Desa"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kategori Berkas</label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ArchiveRecord['category'])
                    }
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="Legalitas & Izin">Legalitas & Izin</option>
                    <option value="Proposal & Kerangka Acuan">Proposal & Kerangka Acuan</option>
                    <option value="Template & Kop">Template & Kop</option>
                    <option value="Laporan Final">Laporan Final</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Format File</label>
                  <select
                    value={fileFormat}
                    onChange={(e) =>
                      setFileFormat(e.target.value as ArchiveRecord['fileFormat'])
                    }
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX</option>
                    <option value="XLSX">XLSX</option>
                    <option value="ZIP">ZIP</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Nomor Surat / Referensi (Opsional)</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Contoh: 005/KKN-104/SKM/2026"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643]"
                >
                  Simpan ke Arsip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
