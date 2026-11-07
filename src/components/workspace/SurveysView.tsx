import React, { useState } from 'react';
import { SurveyRecord } from '../../types';
import {
  ClipboardList,
  Plus,
  Users,
  CheckCircle2,
  Calendar,
  Search,
} from 'lucide-react';

interface SurveysViewProps {
  surveys: SurveyRecord[];
  onAddSurvey: (survey: SurveyRecord) => void;
}

export const SurveysView: React.FC<SurveysViewProps> = ({ surveys, onAddSurvey }) => {
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New survey state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SurveyRecord['category']>('Kesehatan & Stunting');
  const [targetRespondents, setTargetRespondents] = useState(40);
  const [completedRespondents, setCompletedRespondents] = useState(38);
  const [location, setLocation] = useState('Dusun Krajan');
  const [pic, setPic] = useState('Nabila Zahra Putri');
  const [findingsText, setFindingsText] = useState('Sebagian besar warga belum terbiasa memilah sampah organik\nMembutuhkan demonstrasi praktis');

  const filtered = surveys.filter((s) => filter === 'all' || s.category === filter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newSurvey: SurveyRecord = {
      id: `srv-${Date.now()}`,
      title,
      category,
      date: new Date().toISOString().slice(0, 10),
      targetRespondents: Number(targetRespondents),
      completedRespondents: Number(completedRespondents),
      location,
      pic,
      keyFindings: findingsText.split('\n').filter((l) => l.trim().length > 0),
      status: 'completed',
    };

    onAddSurvey(newSurvey);
    setIsModalOpen(false);
    setTitle('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Survey">
              📊
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Surveys & Temuan Lapangan
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Hasil kuesioner dan wawancara lapangan (survei stunting, kesiapan UMKM, pengelolaan sampah, dan literasi).
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Data Survei</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['all', 'Kesehatan & Stunting', 'Ekonomi & UMKM', 'Lingkungan & Sampah', 'Pendidikan & Literasi'].map(
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
              {cat === 'all' ? 'Semua Kategori' : cat}
            </button>
          )
        )}
      </div>

      {/* Survey Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((survey) => {
          const percent = Math.round(
            (survey.completedRespondents / (survey.targetRespondents || 1)) * 100
          );

          return (
            <div
              key={survey.id}
              className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-medium text-[#4A6B53]">{survey.category}</span>
                  <span className="flex items-center gap-1 text-stone-400">
                    <Calendar className="w-3 h-3" />
                    {survey.date}
                  </span>
                </div>

                <h3 className="font-serif text-base font-semibold text-stone-900 leading-snug">
                  {survey.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-stone-600">
                  <span>Lokasi: {survey.location}</span>
                  <span>·</span>
                  <span>PIC: {survey.pic}</span>
                </div>

                {/* Completion Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Responden Tercapai</span>
                    <span className="font-medium text-stone-900">
                      {survey.completedRespondents} / {survey.targetRespondents} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EDEAE3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4A6B53] rounded-full"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Key Findings List */}
                <div className="space-y-1.5 pt-3 border-t border-stone-100">
                  <span className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                    Poin Temuan Kunci
                  </span>
                  <ul className="space-y-1 text-xs text-stone-700 pl-4 list-disc">
                    {survey.keyFindings.map((finding, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Survey Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Tambah Rekap Survei Lapangan
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Judul Survei</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Survei Pola MPASI Balita Posyandu Mawar"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SurveyRecord['category'])}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="Kesehatan & Stunting">Kesehatan & Stunting</option>
                    <option value="Ekonomi & UMKM">Ekonomi & UMKM</option>
                    <option value="Lingkungan & Sampah">Lingkungan & Sampah</option>
                    <option value="Pendidikan & Literasi">Pendidikan & Literasi</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Lokasi Dusun</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Target Responden</label>
                  <input
                    type="number"
                    required
                    value={targetRespondents}
                    onChange={(e) => setTargetRespondents(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Selesai Diwawancara</label>
                  <input
                    type="number"
                    required
                    value={completedRespondents}
                    onChange={(e) => setCompletedRespondents(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">
                  Temuan Kunci (1 baris per poin)
                </label>
                <textarea
                  rows={3}
                  value={findingsText}
                  onChange={(e) => setFindingsText(e.target.value)}
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
                  Simpan Survei
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
