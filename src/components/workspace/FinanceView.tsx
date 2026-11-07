import React, { useState } from 'react';
import { Transaction, calculateFinanceSummary, formatRupiah } from '../../utils/finance';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

interface FinanceViewProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  onAddTransaction,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Program Kerja');
  const [amount, setAmount] = useState<number>(350000);
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('Kas Posko KKN');
  const [recordedBy, setRecordedBy] = useState('Tsaniatul Amni Alwan (Bendahara)');

  const summary = calculateFinanceSummary(transactions);

  const filtered = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.recordedBy.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: txType,
      category,
      amount: Number(amount),
      description,
      source: txType === 'income' ? source : undefined,
      recordedBy,
    };

    onAddTransaction(newTx);
    setIsModalOpen(false);
    setDescription('');
    setAmount(250000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Wallet">
              💰
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Buku Kas Umum (Finance Ledger)
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Pencatatan akuntansi transparan dana operasional mandiri, stimulan kas desa, sponsorship, dan belanja program.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Transaksi Kas</span>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Saldo */}
        <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <span className="text-xs text-stone-500">Sisa Saldo Kas Riil</span>
          <div className="text-2xl font-semibold text-[#284230]">
            {formatRupiah(summary.balance)}
          </div>
          <div className="text-[11px] text-stone-400 pt-1">
            Penyerapan: {summary.burnRatePercent}% dari total dana terhimpun
          </div>
        </div>

        {/* Total Masuk */}
        <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Total Pemasukan (Kas Masuk)</span>
            <ArrowDownLeft className="w-4 h-4 text-[#4A6B53]" />
          </div>
          <div className="text-2xl font-semibold text-stone-900">
            {formatRupiah(summary.totalIncome)}
          </div>
          <div className="text-[11px] text-stone-500 pt-1">
            Iuran Mandiri, Kas Desa & CSR Sponsor
          </div>
        </div>

        {/* Total Keluar */}
        <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Total Pengeluaran (Belanja)</span>
            <ArrowUpRight className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-semibold text-stone-900">
            {formatRupiah(summary.totalExpense)}
          </div>
          <div className="text-[11px] text-stone-500 pt-1">
            5 Divisi & Operasional Posko
          </div>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#E3E0D6] space-y-3">
        <span className="text-xs font-semibold tracking-wider text-stone-500 uppercase block">
          Alokasi Belanja Berdasarkan Kategori
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {Object.entries(summary.byCategory).map(([cat, total]) => (
            <div key={cat} className="p-2.5 rounded bg-white border border-stone-200">
              <span className="text-stone-500 block truncate text-[11px]">{cat}</span>
              <span className="font-semibold text-stone-900 mt-0.5 block">
                {formatRupiah(total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Table & Filter */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-[#EBF1ED] text-[#284230] font-semibold'
                  : 'text-stone-600 hover:bg-[#EFECE5]'
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterType === 'income'
                  ? 'bg-[#EBF1ED] text-[#284230] font-semibold'
                  : 'text-stone-600 hover:bg-[#EFECE5]'
              }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterType === 'expense'
                  ? 'bg-[#EBF1ED] text-[#284230] font-semibold'
                  : 'text-stone-600 hover:bg-[#EFECE5]'
              }`}
            >
              Pengeluaran
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari transaksi..."
              className="pl-8 pr-3 py-1.5 rounded-md text-xs bg-white border border-[#E0DED7] focus:outline-none focus:border-[#4A6B53] w-full sm:w-60"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-lg border border-[#E8E6DF] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] text-stone-500 border-b border-[#E8E6DF]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Tanggal</th>
                  <th className="py-2.5 px-4 font-medium">Keterangan</th>
                  <th className="py-2.5 px-4 font-medium">Kategori</th>
                  <th className="py-2.5 px-4 font-medium">Dicatat Oleh</th>
                  <th className="py-2.5 px-4 font-medium text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-500 text-[11px] whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-stone-900 max-w-sm">
                      <div>{t.description}</div>
                      {t.source && (
                        <div className="text-[10px] text-stone-400 mt-0.5">
                          Sumber: {t.source}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-600 whitespace-nowrap">{t.category}</td>
                    <td className="py-3 px-4 text-stone-500 text-[11px] whitespace-nowrap">
                      {t.recordedBy}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-medium whitespace-nowrap ${
                        t.type === 'income' ? 'text-[#385240]' : 'text-stone-800'
                      }`}
                    >
                      {t.type === 'income' ? '+ ' : '- '}
                      {formatRupiah(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Catat Transaksi Buku Kas
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
                <label className="font-medium text-stone-700">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('expense');
                      setCategory('Program Kerja');
                    }}
                    className={`py-2 rounded-md font-medium text-center border ${
                      txType === 'expense'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    Pengeluaran (Kas Keluar)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('income');
                      setCategory('Iuran Anggota');
                    }}
                    className={`py-2 rounded-md font-medium text-center border ${
                      txType === 'income'
                        ? 'bg-[#4A6B53] text-white border-[#4A6B53]'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    Pemasukan (Kas Masuk)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                >
                  {txType === 'expense' ? (
                    <>
                      <option value="Program Kerja">Program Kerja</option>
                      <option value="Logistik & Posko">Logistik & Posko</option>
                      <option value="Publikasi & Cetak">Publikasi & Cetak</option>
                      <option value="Konsumsi Rapat">Konsumsi Rapat</option>
                      <option value="Transportasi">Transportasi</option>
                      <option value="P3K & Medis">P3K & Medis</option>
                    </>
                  ) : (
                    <>
                      <option value="Iuran Anggota">Iuran Mandiri Mahasiswa</option>
                      <option value="Bantuan Desa">Bantuan Dana Pemerintah Desa</option>
                      <option value="Sponsorship">Sponsorship & Donatur</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Nominal (Rupiah)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53] font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Keterangan Transaksi</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Beli cat & pernis plang petunjuk Curug Silangit"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Dicatat Oleh</label>
                <input
                  type="text"
                  required
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
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
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
