import React, { useState } from 'react';
import { DecisionLogRecord } from '../../types';
import {
  Scale,
  Plus,
  CheckCircle,
  FileCheck,
  Calendar,
  Users,
} from 'lucide-react';

interface DecisionLogViewProps {
  decisions: DecisionLogRecord[];
  onAddDecision: (decision: DecisionLogRecord) => void;
}

export const DecisionLogView: React.FC<DecisionLogViewProps> = ({
  decisions,
  onAddDecision,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [optionsStr, setOptionsStr] = useState('Opsi A: Di Balai Desa\nOpsi B: Di Lapangan Dusun');
  const [consensusDecision, setConsensusDecision] = useState('');
  const [rationale, setRationale] = useState('');
  const [consequences, setConsequences] = useState('');
  const [signedByStr, setSignedByStr] = useState('Josua Ujung (Ketua), Mulia Oktaviani (Sekretaris)');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newDecision: DecisionLogRecord = {
      id: `dec-${Date.now()}`,
      decisionNumber: `KEP-00${decisions.length + 1}/KKN-PRG-SEL/VIII/2026`,
      title,
      date: new Date().toISOString().slice(0, 10),
      context,
      optionsConsidered: optionsStr.split('\n').filter((l) => l.trim().length > 0),
      consensusDecision,
      rationale,
      consequences,
      signedBy: signedByStr.split(',').map((s) => s.trim()).filter(Boolean),
      status: 'Ratified',
    };

    onAddDecision(newDecision);
    setIsModalOpen(false);
    setTitle('');
    setContext('');
    setConsensusDecision('');
    setRationale('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Scale">
              ⚖️
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Decision Log & Buku Keputusan Bersama
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Pencatatan formal musyawarah posko untuk menghindari konflik tim, mendokumentasikan pertimbangan alternatif, serta penandatanganan kesepakatan.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Keputusan Musyawarah</span>
        </button>
      </div>

      {/* Decisions List */}
      <div className="space-y-5">
        {decisions.map((dec) => (
          <div
            key={dec.id}
            className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-stone-500 font-semibold">{dec.decisionNumber}</span>
                <span className="text-stone-300">·</span>
                <span className="flex items-center gap-1 text-stone-500">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  {dec.date}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#284230] bg-[#EBF1ED] px-2 py-0.5 rounded flex items-center gap-1 self-start sm:self-auto">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Status: Disepakati & Disahkan (Ratified)</span>
              </span>
            </div>

            <div>
              <h2 className="font-serif text-base font-semibold text-stone-900">
                {dec.title}
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed mt-1">
                <span className="font-medium text-stone-800">Konteks Permasalahan: </span>
                {dec.context}
              </p>
            </div>

            {/* Options considered */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-stone-500 uppercase tracking-wider text-[11px]">
                Alternatif yang Dipertimbangkan:
              </span>
              <ul className="space-y-1 pl-4 list-disc text-stone-600">
                {dec.optionsConsidered.map((opt, idx) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
            </div>

            {/* Result & Rationale */}
            <div className="p-3.5 rounded-md bg-[#FAF9F5] border border-[#E8E6DF] space-y-2 text-xs">
              <div>
                <span className="font-semibold text-[#385240] block mb-0.5">
                  Keputusan Musyawarah:
                </span>
                <p className="text-stone-900 font-medium">{dec.consensusDecision}</p>
              </div>
              <div>
                <span className="font-medium text-stone-500 block text-[11px]">
                  Alasan & Dasar Pertimbangan:
                </span>
                <p className="text-stone-600 leading-relaxed">{dec.rationale}</p>
              </div>
            </div>

            {/* Signatories */}
            <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-500">
              <div className="flex items-center gap-1.5 truncate">
                <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">Penandatangan Kesepakatan: {dec.signedBy.join(', ')}</span>
              </div>
              <span className="text-stone-400 font-mono text-[10px]">Arsip Berita Acara</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Catat Keputusan Musyawarah Posko
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Perihal / Judul Keputusan</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Penentuan Jadwal Penutupan Festival Desa"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Konteks / Latar Belakang Masalah</label>
                <textarea
                  rows={2}
                  required
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Mengapa keputusan ini perlu dimusyawarahkan secara resmi?"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">
                  Opsi Alternatif yang Dibahas (1 per baris)
                </label>
                <textarea
                  rows={2}
                  value={optionsStr}
                  onChange={(e) => setOptionsStr(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Keputusan Final yang Disepakati</label>
                <input
                  type="text"
                  required
                  value={consensusDecision}
                  onChange={(e) => setConsensusDecision(e.target.value)}
                  placeholder="Contoh: Sepakat memilih opsi B..."
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Dasar Alasan & Pertimbangan</label>
                <textarea
                  rows={2}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">
                  Pihak yang Menandatangani (pisahkan koma)
                </label>
                <input
                  type="text"
                  value={signedByStr}
                  onChange={(e) => setSignedByStr(e.target.value)}
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
                  Sahkan Keputusan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
