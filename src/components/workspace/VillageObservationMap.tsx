import React, { useState } from 'react';
import {
  VillageDusun,
  SurveyRecord,
  DocumentationPhoto,
  VillageFacility,
} from '../../types';
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ClipboardList,
  Building2,
  Compass,
  Layers,
} from 'lucide-react';

interface VillageObservationMapProps {
  dusuns: VillageDusun[];
  surveys?: SurveyRecord[];
  photos?: DocumentationPhoto[];
  facilities?: VillageFacility[];
  onSelectDusun?: (dusunName: string) => void;
  onSelectSurvey?: (survey: SurveyRecord) => void;
  onSelectPhoto?: (photo: DocumentationPhoto) => void;
}

// Relative schematic layout of the Dusuns in Desa Pringgasela Selatan (Southern foothills of Mt. Rinjani)
const DUSUN_POSITIONS: Record<string, { x: number; y: number; zone: string }> = {
  'Dusun Pancor Kopong Utara': { x: 46, y: 18, zone: 'Wilayah Utara (Perbatasan Pringgasela Induk)' },
  'Dusun Pancor Kopong': { x: 68, y: 28, zone: 'Wilayah Timur Laut (Sentra Perkebunan)' },
  'Dusun Timba Gerah': { x: 24, y: 32, zone: 'Wilayah Barat Laut (Irigasi & Sawah)' },
  'Dusun Gubuk Rempung': { x: 54, y: 46, zone: 'Wilayah Tengah (Poros Utama Desa)' },
  'Dusun Gubuk Lauk': { x: 30, y: 56, zone: 'Wilayah Tengah-Barat (Sentra Tenun Gedogan)' },
  'Dusun Sinar Sari': { x: 74, y: 64, zone: 'Wilayah Tenggara (Permukiman & UMKM)' },
  'Dusun Kedondong': { x: 42, y: 80, zone: 'Wilayah Selatan (Lahan Pertanian & Hortikultura)' },
  'Dusun Gubuk Tengak': { x: 50, y: 48, zone: 'Wilayah Tengah Desa' },
  'Dusun Gubuk Baret': { x: 24, y: 50, zone: 'Wilayah Barat Desa' },
  'Dusun Gubuk Timuk': { x: 76, y: 46, zone: 'Wilayah Timur Desa' },
  'Dusun Dasan Sadar': { x: 54, y: 22, zone: 'Wilayah Utara Desa' },
  'Dusun Orong Boris': { x: 35, y: 76, zone: 'Wilayah Selatan Desa' },
};

export const VillageObservationMap: React.FC<VillageObservationMapProps> = ({
  dusuns,
  surveys = [],
  photos = [],
  facilities = [],
  onSelectDusun,
  onSelectSurvey,
  onSelectPhoto,
}) => {
  const [activeLayer, setActiveLayer] = useState<'all' | 'surveys' | 'photos' | 'facilities'>('all');
  const [selectedDusunName, setSelectedDusunName] = useState<string>(
    dusuns[0]?.name || 'Dusun Gubuk Lauk'
  );

  const selectedDusun = dusuns.find((d) => d.name === selectedDusunName) || dusuns[0];
  const dusunSurveys = surveys.filter(
    (s) =>
      s.dusun === selectedDusunName ||
      s.location.toLowerCase().includes(selectedDusunName.replace('Dusun ', '').toLowerCase())
  );
  const dusunPhotos = photos.filter(
    (p) =>
      p.dusun === selectedDusunName ||
      p.location.toLowerCase().includes(selectedDusunName.replace('Dusun ', '').toLowerCase())
  );
  const dusunFacilities = facilities.filter((f) => f.dusun === selectedDusunName);

  const handleDusunClick = (dusunName: string) => {
    setSelectedDusunName(dusunName);
    if (onSelectDusun) onSelectDusun(dusunName);
  };

  return (
    <div className="rounded-lg bg-white border border-[#E8E6DF] shadow-2xs overflow-hidden">
      {/* Map Top Controls */}
      <div className="p-4 border-b border-[#E8E6DF] bg-[#F7F6F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#EBF1ED] text-[#284230] flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-semibold text-stone-900">
              Peta Sebaran Dusun & Lokasi Observasi Desa Pringgasela Selatan
            </h3>
            <p className="text-[11px] text-stone-500">
              Kec. Pringgasela, Kab. Lombok Timur, NTB • Pemetaan 7 Wilayah Dusun
            </p>
          </div>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Lapisan:
          </span>
          {(
            [
              { id: 'all', label: 'Semua Lokasi' },
              { id: 'surveys', label: `Survei (${surveys.length})` },
              { id: 'photos', label: `Foto (${photos.length})` },
              { id: 'facilities', label: `Fasilitas (${facilities.length})` },
            ] as const
          ).map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                activeLayer === layer.id
                  ? 'bg-[#284230] text-white'
                  : 'bg-white border border-[#E8E6DF] text-stone-600 hover:bg-stone-50'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid: Schematic Map Canvas + Dusun Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left 7 Cols: Interactive Topographic Schematic Canvas */}
        <div className="lg:col-span-7 relative bg-[#F2F5F1] min-h-[380px] p-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E8E6DF] select-none overflow-hidden">
          {/* Background SVG Contours & River/Road Network */}
          <svg
            viewBox="0 0 600 400"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-65"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#DCE5DD"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>
            <rect width="600" height="400" fill="url(#grid)" />

            {/* Northern Foothill Elevation Contours (Lereng Selatan Rinjani) */}
            <path
              d="M -20 60 Q 180 95 360 55 T 620 80"
              fill="none"
              stroke="#C5D6C9"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <path
              d="M -20 120 Q 220 150 400 115 T 620 135"
              fill="none"
              stroke="#CFDDD2"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />

            {/* Village Boundary Polygon */}
            <polygon
              points="70,45 520,40 555,190 500,350 130,360 55,210"
              fill="#E5EDE7"
              fillOpacity="0.55"
              stroke="#6B8E76"
              strokeWidth="2"
              strokeDasharray="8 4"
            />

            {/* Irrigation & River Stream (Aliran Sungai & Irigasi Pertanian) */}
            <path
              d="M 140 40 C 165 130, 190 210, 210 360"
              fill="none"
              stroke="#7FAAC9"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 330 42 C 320 140, 380 230, 410 355"
              fill="none"
              stroke="#7FAAC9"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="3 2"
            />

            {/* Main Village Road Network (Poros Pringgasela - Pringgasela Selatan) */}
            <path
              d="M 300 40 L 300 192 L 150 200 M 300 192 L 455 184 M 300 192 L 395 296 M 300 192 L 210 304"
              fill="none"
              stroke="#D6CFC2"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M 300 40 L 300 192 L 150 200 M 300 192 L 455 184 M 300 192 L 395 296 M 300 192 L 210 304"
              fill="none"
              stroke="#A39B8B"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          </svg>

          {/* Compass & Cardinal Labels */}
          <div className="relative z-10 flex items-center justify-between text-[10px] font-medium text-stone-500">
            <span className="px-2 py-0.5 rounded bg-white/90 border border-[#E8E6DF] text-[#284230] font-semibold">
              ↑ Utara: Desa Pringgasela Induk / Lereng Rinjani
            </span>
            <span className="px-2 py-0.5 rounded bg-white/90 border border-[#E8E6DF] font-mono">
              Peta Skematik 7 Dusun
            </span>
          </div>

          {/* Interactive Dusun Pins */}
          <div className="relative z-10 flex-1 my-4">
            {dusuns.map((dusun) => {
              const pos = DUSUN_POSITIONS[dusun.name] || {
                x: 50,
                y: 50,
                zone: 'Wilayah Desa Pringgasela Selatan',
              };
              const isSelected = selectedDusunName === dusun.name;
              const dSurveys = surveys.filter(
                (s) =>
                  s.dusun === dusun.name ||
                  s.location.toLowerCase().includes(dusun.name.replace('Dusun ', '').toLowerCase())
              );
              const dPhotos = photos.filter(
                (p) =>
                  p.dusun === dusun.name ||
                  p.location.toLowerCase().includes(dusun.name.replace('Dusun ', '').toLowerCase())
              );
              const dFacilities = facilities.filter((f) => f.dusun === dusun.name);
              const isVerified = dusun.verificationStatus === 'verified';

              return (
                <button
                  key={dusun.name}
                  type="button"
                  onClick={() => handleDusunClick(dusun.name)}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group text-left transition-all ${
                    isSelected ? 'z-30 scale-105' : 'z-20 hover:scale-105'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border shadow-sm transition-all ${
                      isSelected
                        ? 'bg-[#284230] text-white border-[#1B2E20] ring-4 ring-[#4A6B53]/25'
                        : 'bg-white/95 text-stone-800 border-[#D5D2C8] hover:border-[#4A6B53]'
                    }`}
                  >
                    <MapPin
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected
                          ? 'text-emerald-300'
                          : isVerified
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    />
                    <div>
                      <div className="text-[11px] font-semibold leading-tight whitespace-nowrap">
                        {dusun.name.replace('Dusun ', '')}
                      </div>
                      <div
                        className={`text-[9px] flex items-center gap-1.5 mt-0.5 ${
                          isSelected ? 'text-stone-200' : 'text-stone-500'
                        }`}
                      >
                        {(activeLayer === 'all' || activeLayer === 'surveys') && (
                          <span title="Rekaman Survei">📋 {dSurveys.length}</span>
                        )}
                        {(activeLayer === 'all' || activeLayer === 'photos') && (
                          <span title="Foto Dokumentasi">📷 {dPhotos.length}</span>
                        )}
                        {(activeLayer === 'all' || activeLayer === 'facilities') && (
                          <span title="Fasilitas Terpetakan">🏛️ {dFacilities.length}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Map Legend Footer */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DCE5DD] text-[10px] text-stone-600 bg-white/85 px-3 py-1.5 rounded">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                Terverifikasi
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Observasi Belum Diverifikasi
              </span>
            </div>
            <span className="text-stone-500">
              Klik nama dusun untuk melihat rincian lokasi & temuan
            </span>
          </div>
        </div>

        {/* Right 5 Cols: Selected Dusun Observation & Field Detail */}
        <div className="lg:col-span-5 p-4 bg-white flex flex-col justify-between space-y-4">
          {selectedDusun ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#EBF1ED] text-[#284230] font-semibold">
                      Wilayah Dusun
                    </span>
                    {selectedDusun.verificationStatus === 'verified' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Observasi Lapangan
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif text-base font-semibold text-stone-900 mt-1">
                    {selectedDusun.name}
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    {selectedDusun.addressDetail ||
                      DUSUN_POSITIONS[selectedDusun.name]?.zone ||
                      'Desa Pringgasela Selatan, Kec. Pringgasela'}
                  </p>
                </div>
              </div>

              {/* Fokus / Karakteristik Dusun */}
              <div className="p-3 rounded-md bg-[#F7F6F2] border border-[#E8E6DF] space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-500">Kepala Kewilayahan (Kadus):</span>
                  <span className="font-medium text-stone-800">{selectedDusun.headOfDusun}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-500">Data Populasi / KK:</span>
                  <span className="font-medium text-stone-700">
                    {selectedDusun.population !== null
                      ? `${selectedDusun.population} Jiwa (${selectedDusun.households ?? '-'} KK)`
                      : 'Belum Diverifikasi'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 pt-1 border-t border-stone-200/70 leading-relaxed">
                  {selectedDusun.keyFocus}
                </p>
              </div>

              {/* Linked Surveys in this Dusun */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-[#4A6B53]" />
                     Survei di {selectedDusun.name.replace('Dusun ', '')}
                  </span>
                  <span className="text-stone-400">{dusunSurveys.length} Rekaman</span>
                </h5>
                {dusunSurveys.length === 0 ? (
                  <p className="text-[11px] text-stone-400 italic py-2">
                    Belum ada rekaman survei yang ditautkan ke dusun ini.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {dusunSurveys.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onSelectSurvey && onSelectSurvey(s)}
                        className="p-2.5 rounded border border-[#E8E6DF] hover:border-[#4A6B53] bg-stone-50/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-[#4A6B53]">
                            {s.category}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              s.verificationStatus === 'verified'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {s.verificationStatus === 'verified'
                              ? 'Terverifikasi'
                              : 'Observasi'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-stone-900 mt-0.5 line-clamp-1">
                          {s.title}
                        </p>
                        <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                          {s.findings}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Field Photos in this Dusun */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#4A6B53]" />
                    Dokumentasi Lapangan
                  </span>
                  <span className="text-stone-400">{dusunPhotos.length} Foto</span>
                </h5>
                {dusunPhotos.length === 0 ? (
                  <p className="text-[11px] text-stone-400 italic py-1">
                    Belum ada foto dokumentasi pada wilayah dusun ini.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {dusunPhotos.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onSelectPhoto && onSelectPhoto(p)}
                        className="group relative rounded overflow-hidden border border-[#E8E6DF] aspect-16/10 bg-stone-100 cursor-pointer"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-stone-900/75 p-1 text-[9px] text-white truncate">
                          {p.title}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Facilities in this Dusun */}
              {dusunFacilities.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-stone-100">
                  <h5 className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#4A6B53]" /> Fasilitas Terpetakan ({dusunFacilities.length})
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {dusunFacilities.map((f) => (
                      <span
                        key={f.id}
                        className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200"
                      >
                        {f.name} ({f.category})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
