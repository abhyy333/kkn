import React, { useState } from 'react';
import {
  WorkProgram,
  DocumentationPhoto,
  PublicFeedbackRecord,
  UnitConfig,
} from '../../types';
import { Transaction, calculateFinanceSummary, formatRupiah } from '../../utils/finance';
import {
  Globe,
  ArrowLeft,
  Sparkles,
  MapPin,
  Calendar,
  Send,
  CheckCircle2,
  Heart,
  MessageSquare,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface PublicPortalProps {
  config: UnitConfig;
  programs: WorkProgram[];
  documentation: DocumentationPhoto[];
  transactions: Transaction[];
  feedbackList: PublicFeedbackRecord[];
  onAddFeedback: (feedback: PublicFeedbackRecord) => void;
  onReturnToWorkspace: () => void;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  config,
  programs,
  documentation,
  transactions,
  feedbackList,
  onAddFeedback,
  onReturnToWorkspace,
}) => {
  // Feedback form state
  const [name, setName] = useState('');
  const [dusun, setDusun] = useState('Dusun Gubuk Lauk');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<PublicFeedbackRecord['category']>('Saran Program');
  const [message, setMessage] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState(false);

  const financeSummary = calculateFinanceSummary(transactions);
  const publicPrograms = programs.filter((p) => p.isFeaturedInPublic);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    const newRecord: PublicFeedbackRecord = {
      id: `pf-${Date.now()}`,
      name,
      dusun,
      role: role.trim() || `Warga ${dusun}`,
      message,
      date: new Date().toISOString().slice(0, 10),
      category,
      status: 'new',
    };

    onAddFeedback(newRecord);
    setName('');
    setRole('');
    setMessage('');
    setSubmittedNotice(true);
    setTimeout(() => setSubmittedNotice(false), 4000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2D3748] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E6DF] px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4A6B53] text-white flex items-center justify-center font-serif font-medium text-base shadow-xs">
            K
          </div>
          <div>
            <div className="font-serif font-semibold text-sm text-stone-900 tracking-tight">
              Portal Publik Desa Pringgasela Selatan
            </div>
            <div className="text-[11px] text-stone-500">
              KKN Pringgasela Selatan · Lombok Timur, NTB
            </div>
          </div>
        </div>

        <button
          onClick={onReturnToWorkspace}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Workspace Internal</span>
        </button>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 space-y-12">
        {/* Editorial Hero Banner */}
        <section className="space-y-4">
          <div className="h-44 sm:h-52 w-full rounded-2xl bg-gradient-to-r from-[#2F4735] via-[#4A6B53] to-[#608069] relative overflow-hidden shadow-xs flex items-end p-6 sm:p-8">
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="relative z-10 text-white space-y-1">
              <span className="text-xs uppercase tracking-widest text-[#CCDCD0] font-mono">
                PENGABDIAN MASYARAKAT 2026
              </span>
              <h1 className="font-serif text-2xl sm:text-4xl font-medium tracking-tight text-white">
                Sinergi Membangun {config.villageName}
              </h1>
              <p className="text-xs sm:text-sm text-stone-200 max-w-xl font-light">
                Transparansi progres program kerja pengabdian mahasiswa, publikasi kegiatan warga, dan kanal aspirasi interaktif masyarakat desa.
              </p>
            </div>
          </div>

          {/* Clean Metric Counters (Anti-slop, no pills) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
              <span className="text-xs text-stone-400 block mb-0.5">Waktu Pengabdian</span>
              <div className="text-2xl font-semibold text-stone-900">45 Hari</div>
              <span className="text-[11px] text-stone-500">Juli – Agustus 2026</span>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
              <span className="text-xs text-stone-400 block mb-0.5">Program Unggulan</span>
              <div className="text-2xl font-semibold text-[#385240]">
                {publicPrograms.length} Program
              </div>
              <span className="text-[11px] text-stone-500">Sentra Tenun, Gizi & Dusun</span>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
              <span className="text-xs text-stone-400 block mb-0.5">Wilayah Jangkauan</span>
              <div className="text-2xl font-semibold text-stone-900">7 Dusun</div>
              <span className="text-[11px] text-stone-500">Gubuk Lauk s.d. Pancor Kopong</span>
            </div>

            <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs">
              <span className="text-xs text-stone-400 block mb-0.5">Akuntabilitas Dana</span>
              <div className="text-2xl font-semibold text-stone-900">
                {formatRupiah(financeSummary.totalIncome)}
              </div>
              <span className="text-[11px] text-stone-500">Terbuka untuk Publik</span>
            </div>
          </div>
        </section>

        {/* Program Unggulan Showcase */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4A6B53]" />
              <h2 className="font-serif text-xl sm:text-2xl font-medium text-stone-900 tracking-tight">
                Capaian Program Kerja Bersama Warga
              </h2>
            </div>
            <p className="text-xs text-stone-500">
              Berikut perkembangan realisasi program pengabdian yang sedang dan telah dilaksanakan di Desa Pringgasela Selatan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {publicPrograms.map((prog) => (
              <div
                key={prog.id}
                className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-mono text-stone-600 font-semibold">{prog.code}</span>
                    <span className="text-[#4A6B53] font-medium">{prog.division}</span>
                  </div>

                  <h3 className="font-serif text-base font-semibold text-stone-900 leading-snug">
                    {prog.title}
                  </h3>

                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                    {prog.objective}
                  </p>

                  <div className="pt-2 text-xs text-stone-500 flex items-center justify-between border-t border-stone-100">
                    <span>Sasaran: {prog.targetAudience}</span>
                    <span className="font-semibold text-stone-900">{prog.progressPercent}% Selesai</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-[#EDEAE3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4A6B53] rounded-full"
                      style={{ width: `${prog.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                  <div className="font-semibold text-stone-700">Hasil Nyata (Output):</div>
                  <ul className="pl-4 list-disc space-y-0.5">
                    {prog.outputs.slice(0, 2).map((out, idx) => (
                      <li key={idx} className="line-clamp-1">{out}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transparansi Keuangan Terbuka */}
        <section className="p-6 rounded-xl bg-white border border-[#E8E6DF] shadow-2xs space-y-5">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-medium text-stone-900 tracking-tight">
              Laporan Akuntabilitas & Realisasi Dana Pengabdian
            </h2>
            <p className="text-xs text-stone-500">
              Sebagai wujud tanggung jawab moral kepada warga desa dan pihak sponsor, seluruh perputaran dana KKN dapat diakses secara transparan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200">
              <span className="text-stone-400 block mb-0.5">Dana Masuk Terhimpun</span>
              <span className="text-lg font-semibold text-[#385240]">
                {formatRupiah(financeSummary.totalIncome)}
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">
                Iuran Mandiri Mahasiswa & Kas Desa
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200">
              <span className="text-stone-400 block mb-0.5">Realisasi Belanja Program</span>
              <span className="text-lg font-semibold text-stone-900">
                {formatRupiah(financeSummary.totalExpense)}
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">
                Bibit, PMT Stunting, Plang Wisata & Kemasan
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#FAF9F5] border border-stone-200">
              <span className="text-stone-400 block mb-0.5">Sisa Saldo Kas Bersih</span>
              <span className="text-lg font-semibold text-stone-900">
                {formatRupiah(financeSummary.balance)}
              </span>
              <span className="text-[10px] text-stone-400 block mt-1">
                Dialokasikan untuk Festival Penutupan Desa
              </span>
            </div>
          </div>
        </section>

        {/* Galeri Kegiatan Bersama Warga */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-medium text-stone-900 tracking-tight">
              Galeri Dokumentasi Lapangan
            </h2>
            <p className="text-xs text-stone-500">
              Momen gotong royong dan kebersamaan mahasiswa bersama warga di 7 dusun Desa Pringgasela Selatan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {documentation.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                className="rounded-lg bg-white border border-[#E8E6DF] overflow-hidden shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="aspect-4/3 w-full bg-stone-100 overflow-hidden">
                  <img
                    src={doc.imageUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-1 text-xs">
                  <h3 className="font-semibold text-stone-900 line-clamp-1">{doc.title}</h3>
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {doc.caption}
                  </p>
                  <div className="text-[10px] text-stone-400 pt-1 flex items-center justify-between">
                    <span>{doc.location.split(',')[0]}</span>
                    <span>{doc.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Aspirasi & Saran Warga Interaktif */}
        <section className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#4A6B53]" />
              <h2 className="font-serif text-xl font-medium text-stone-900 tracking-tight">
                Kanal Aspirasi & Saran Masyarakat Desa
              </h2>
            </div>
            <p className="text-xs text-stone-500">
              Warga Desa Pringgasela Selatan dipersilakan menyampaikan masukan, permohonan bantuan kegiatan, atau tanggapan langsung kepada tim mahasiswa KKN.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Input Aspirasi (5 cols) */}
            <div className="lg:col-span-5 p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
              <h3 className="font-serif text-sm font-semibold text-stone-900">
                Kirim Masukan atau Saran
              </h3>

              {submittedNotice && (
                <div className="p-3 rounded-md bg-[#EBF1ED] border border-[#CCDCD0] text-xs text-[#284230] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4A6B53] shrink-0" />
                  <span>Terima kasih! Aspirasi Anda telah diterima oleh tim KKN.</span>
                </div>
              )}

              <form onSubmit={handleSubmitFeedback} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Pak Slamet / Ibu Warsinah"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-medium text-stone-700">Asal Dusun</label>
                    <select
                      value={dusun}
                      onChange={(e) => setDusun(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                    >
                      <option value="Dusun Gubuk Lauk">Dusun Gubuk Lauk</option>
                      <option value="Dusun Gubuk Rempung">Dusun Gubuk Rempung</option>
                      <option value="Dusun Sinar Sari">Dusun Sinar Sari</option>
                      <option value="Dusun Kedondong">Dusun Kedondong</option>
                      <option value="Dusun Timba Gerah">Dusun Timba Gerah</option>
                      <option value="Dusun Pancor Kopong">Dusun Pancor Kopong</option>
                      <option value="Dusun Pancor Kopong Utara">Dusun Pancor Kopong Utara</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-stone-700">Jenis Pesan</label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as PublicFeedbackRecord['category'])
                      }
                      className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                    >
                      <option value="Apresiasi">Apresiasi</option>
                      <option value="Saran Program">Saran Program</option>
                      <option value="Permintaan Bantuan">Permintaan Bantuan</option>
                      <option value="Pertanyaan">Pertanyaan</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Peran / Profesi (Opsional)</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Contoh: Petani Salak / Kader Posyandu / Ketua RT"
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Isi Pesan Aspirasi</label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tuliskan saran, kebutuhan pelatihan, atau tanggapan Anda..."
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Aspirasi ke Mahasiswa KKN</span>
                </button>
              </form>
            </div>

            {/* List Aspirasi Masuk (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="font-serif text-sm font-semibold text-stone-900">
                  Aspirasi & Suara Warga ({feedbackList.length})
                </span>
                <span className="text-[11px] text-stone-400">Dimoderasi secara terbuka</span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {feedbackList.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{fb.name}</span>
                        <span className="text-stone-300">·</span>
                        <span className="text-[11px] text-stone-500">{fb.role}</span>
                      </div>
                      <span className="text-[10px] text-stone-400">{fb.date}</span>
                    </div>

                    <p className="text-stone-700 leading-relaxed bg-[#FAF9F5] p-3 rounded border border-stone-100">
                      "{fb.message}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                      <span className="font-medium text-[#4A6B53]">{fb.category}</span>
                      <span>{fb.dusun}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-[#E8E6DF] bg-white py-6 text-center text-xs text-stone-500 space-y-1">
        <p className="font-medium text-stone-700">
          {config.unitName} · {config.villageName}, {config.district}, {config.regency}
        </p>
        <p className="text-[11px] text-stone-400">
          {config.university} · Dosen Pembimbing Lapangan: {config.dplName}
        </p>
        <div className="pt-2">
          <button
            onClick={onReturnToWorkspace}
            className="text-[11px] text-[#4A6B53] font-medium hover:underline"
          >
            Masuk ke Workspace Pengurus Internal →
          </button>
        </div>
      </footer>
    </div>
  );
};
