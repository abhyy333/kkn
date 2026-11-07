import React, { useState } from 'react';
import { InventoryRecord } from '../../types';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  User,
} from 'lucide-react';

interface InventoryViewProps {
  inventory: InventoryRecord[];
  onAddItem: (item: InventoryRecord) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onAddItem,
}) => {
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryRecord['category']>('Peralatan Posko');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Unit');
  const [condition, setCondition] = useState<InventoryRecord['condition']>('Baik');
  const [ownership, setOwnership] = useState<InventoryRecord['ownership']>('Milik Unit');
  const [storageLocation, setStorageLocation] = useState('Ruang Tengah Posko');
  const [pic, setPic] = useState('Dini Aminarti');

  const filtered = inventory.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.pic.toLowerCase().includes(search.toLowerCase()) ||
      item.storageLocation.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: InventoryRecord = {
      id: `inv-${Date.now()}`,
      name,
      category,
      quantity: Number(quantity),
      unit,
      condition,
      ownership,
      storageLocation,
      pic,
      lastChecked: new Date().toISOString().slice(0, 10),
    };

    onAddItem(newItem);
    setIsModalOpen(false);
    setName('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Package">
              📦
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Inventory & Logistik Posko
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Daftar inventaris aset posko KKN, barang pinjaman desa, peralatan P3K, sound system, dan status kondisi alat.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Barang Logistik</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua Barang' },
            { id: 'Elektronik & IT', label: 'Elektronik & IT' },
            { id: 'Peralatan Posko', label: 'Posko' },
            { id: 'Medis & P3K', label: 'Medis & P3K' },
            { id: 'Protokol & Acara', label: 'Protokol & Acara' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                filterCategory === cat.id
                  ? 'bg-[#EBF1ED] text-[#284230] font-semibold'
                  : 'text-stone-600 hover:bg-[#EFECE5]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barang atau PIC..."
            className="pl-8 pr-3 py-1.5 rounded-md text-xs bg-white border border-[#E0DED7] focus:outline-none focus:border-[#4A6B53] w-full sm:w-60"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-[#E8E6DF] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F5] text-stone-500 border-b border-[#E8E6DF]">
              <tr>
                <th className="py-2.5 px-4 font-medium">Nama Barang</th>
                <th className="py-2.5 px-4 font-medium">Kategori</th>
                <th className="py-2.5 px-4 font-medium">Jumlah</th>
                <th className="py-2.5 px-4 font-medium">Kepemilikan</th>
                <th className="py-2.5 px-4 font-medium">Kondisi</th>
                <th className="py-2.5 px-4 font-medium">Lokasi Simpan</th>
                <th className="py-2.5 px-4 font-medium">PIC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-stone-900">{item.name}</td>
                  <td className="py-3 px-4 text-stone-600">{item.category}</td>
                  <td className="py-3 px-4 font-semibold text-stone-800">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-stone-600">
                    <span className="text-[11px] text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                      {item.ownership}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 ${
                        item.condition === 'Baik'
                          ? 'text-[#385240]'
                          : item.condition === 'Cukup'
                          ? 'text-amber-800'
                          : 'text-red-700'
                      }`}
                    >
                      {item.condition === 'Baik' && <CheckCircle2 className="w-3 h-3" />}
                      {item.condition !== 'Baik' && <AlertTriangle className="w-3 h-3" />}
                      <span>{item.condition}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-500 truncate max-w-[180px]">
                    {item.storageLocation}
                  </td>
                  <td className="py-3 px-4 text-stone-700 font-medium">{item.pic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Tambah Barang Logistik
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
                <label className="font-medium text-stone-700">Nama Barang</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kabel Roll 20 Meter"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InventoryRecord['category'])}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="Elektronik & IT">Elektronik & IT</option>
                    <option value="Peralatan Posko">Peralatan Posko</option>
                    <option value="Medis & P3K">Medis & P3K</option>
                    <option value="Protokol & Acara">Protokol & Acara</option>
                    <option value="Perkakas Lapangan">Perkakas Lapangan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Status Kepemilikan</label>
                  <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value as InventoryRecord['ownership'])}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="Milik Unit">Milik Unit</option>
                    <option value="Pinjaman Desa">Pinjaman Desa</option>
                    <option value="Sewa">Sewa</option>
                    <option value="Milik Pribadi">Milik Pribadi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Jumlah & Satuan</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                    />
                    <input
                      type="text"
                      required
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="Unit / Buah"
                      className="flex-1 px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kondisi</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as InventoryRecord['condition'])}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Cukup">Cukup</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Lokasi Simpan</label>
                  <input
                    type="text"
                    required
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">PIC Penanggung Jawab</label>
                  <input
                    type="text"
                    required
                    value={pic}
                    onChange={(e) => setPic(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
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
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
