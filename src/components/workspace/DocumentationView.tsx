import React, { useState } from 'react';
import { DocumentationPhoto } from '../../types';
import {
  Camera,
  Plus,
  MapPin,
  Calendar,
  User,
  ExternalLink,
  Download,
} from 'lucide-react';

interface DocumentationViewProps {
  photos: DocumentationPhoto[];
  onAddPhoto: (photo: DocumentationPhoto) => void;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({
  photos,
  onAddPhoto,
}) => {
  const [filter, setFilter] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState<DocumentationPhoto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New photo state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentationPhoto['category']>('Program Kerja');
  const [location, setLocation] = useState('Dusun Gubuk Lauk, Desa Pringgasela Selatan');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80');
  const [caption, setCaption] = useState('');
  const [photographer, setPhotographer] = useState('Muhammad Agits Haibatulloh');

  const filtered = photos.filter((p) => filter === 'all' || p.category === filter);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newPhoto: DocumentationPhoto = {
      id: `doc-${Date.now()}`,
      title,
      category,
      date: new Date().toISOString().slice(0, 10),
      location,
      imageUrl,
      caption: caption || title,
      photographer,
      tags: ['Dokumentasi', category],
    };

    onAddPhoto(newPhoto);
    setIsModalOpen(false);
    setTitle('');
    setCaption('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6DF]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Camera">
              📸
            </span>
            <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
              Documentation & Galeri Posko
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Arsip fotografi resolusi tinggi kegiatan pengabdian masyarakat, pelaksanaan program unggulan, dan potret warga desa.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#4A6B53] text-white text-xs font-medium hover:bg-[#3B5643] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Foto Kegiatan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['all', 'Program Kerja', 'Sosialisasi', 'Kegiatan Harian'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
              filter === cat
                ? 'bg-[#EBF1ED] text-[#284230] font-semibold'
                : 'text-stone-600 hover:bg-[#EFECE5]'
            }`}
          >
            {cat === 'all' ? 'Semua Album' : cat}
          </button>
        ))}
      </div>

      {/* Photo Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="group rounded-lg bg-white border border-[#E8E6DF] hover:border-[#CCDCD0] shadow-2xs overflow-hidden cursor-pointer flex flex-col justify-between transition-all"
          >
            <div className="aspect-4/3 w-full bg-stone-100 overflow-hidden relative">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                loading="lazy"
              />
              <span className="absolute bottom-2 left-2 text-[10px] bg-stone-900/70 text-white backdrop-blur-xs px-2 py-0.5 rounded font-medium">
                {photo.category}
              </span>
            </div>

            <div className="p-3.5 space-y-2">
              <h3 className="font-medium text-xs text-stone-900 line-clamp-1 group-hover:text-[#4A6B53] transition-colors">
                {photo.title}
              </h3>
              <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                {photo.caption}
              </p>

              <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100">
                <span className="flex items-center gap-1 truncate max-w-[150px]">
                  <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                  <span className="truncate">{photo.location.split(',')[0]}</span>
                </span>
                <span>{photo.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg border border-[#E8E6DF] shadow-2xl max-w-2xl w-full overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[60vh] bg-stone-900 flex items-center justify-center overflow-hidden">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.title}
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-stone-500 text-[11px]">
                <span className="font-semibold text-[#4A6B53] uppercase tracking-wider">
                  {selectedPhoto.category}
                </span>
                <span className="text-stone-400">{selectedPhoto.date}</span>
              </div>

              <h2 className="font-serif text-base font-semibold text-stone-900">
                {selectedPhoto.title}
              </h2>

              <p className="text-stone-600 leading-relaxed text-xs">{selectedPhoto.caption}</p>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {selectedPhoto.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    Fotografer: {selectedPhoto.photographer}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="px-3 py-1 rounded bg-stone-100 text-stone-700 hover:bg-stone-200"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-semibold text-stone-900">
                Upload Foto Dokumentasi
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
                <label className="font-medium text-stone-700">Judul Kegiatan</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Panen Raya Salak Bersama Kelompok Tani"
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Kategori Album</label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as DocumentationPhoto['category'])
                    }
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  >
                    <option value="Program Kerja">Program Kerja</option>
                    <option value="Sosialisasi">Sosialisasi</option>
                    <option value="Kegiatan Harian">Kegiatan Harian</option>
                    <option value="Kunjungan Tokoh">Kunjungan Tokoh</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Fotografer</label>
                  <input
                    type="text"
                    required
                    value={photographer}
                    onChange={(e) => setPhotographer(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Lokasi Kegiatan</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">URL Foto (Unsplash / Cloud)</label>
                <input
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-[#D5D2C8] focus:outline-none focus:border-[#4A6B53]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Keterangan / Caption Foto</label>
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ceritakan momen dalam foto tersebut..."
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
                  Simpan Foto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
