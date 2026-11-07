import React from 'react';
import { VillageResearchData } from '../../types';
import {
  MapPin,
  Users,
  Compass,
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

interface VillageResearchViewProps {
  data: VillageResearchData;
}

export const VillageResearchView: React.FC<VillageResearchViewProps> = ({ data }) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-[#E8E6DF]">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label="Compass">
            🧭
          </span>
          <h1 className="font-serif text-2xl font-medium text-stone-900 tracking-tight">
            Village Research & Monografi Desa
          </h1>
        </div>
        <p className="text-xs text-stone-500">
          Dossier riset partisipatif (PRA), analisis SWOT sentra tenun tradisional, data demografi 7 dusun, dan pemetaan potensi wilayah Desa Pringgasela Selatan.
        </p>
      </div>

      {/* Field Survey State Banner */}
      <div className="p-3.5 rounded-lg bg-[#FAF8F2] border border-[#E8E2D2] text-xs flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-[#8C7A4B] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-stone-800">Status Data Monografi: Estimasi Awal Menunggu Validasi Survei Lapangan</span>
          <p className="text-stone-600 text-[11px] leading-relaxed">
            Data kependudukan, batas dusun, dan komoditas di bawah ini merupakan data sekunder dan estimasi awal. Tim KKN Pringgasela Selatan sedang melakukan survei faktual lapangan bersama para Kepala Wilayah 7 Dusun untuk memastikan keakuratan data.
          </p>
        </div>
      </div>

      {/* Village Snapshot Banner */}
      <div className="p-5 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              {data.villageName}, {data.district}
            </h2>
            <p className="text-xs text-stone-500">
              {data.regency}, Provinsi {data.province} · Koordinat: {data.coordinates}
            </p>
          </div>
          <div className="text-xs text-stone-600 bg-[#FAF9F5] px-3 py-1.5 rounded border border-[#E0DED7]">
            Kepala Desa: <span className="font-medium text-stone-900">{data.villageHead}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-md bg-[#FAF9F5] border border-stone-200/60">
            <span className="text-stone-400 block mb-0.5">Jumlah Penduduk</span>
            <span className="font-semibold text-base text-stone-900">
              {data.totalPopulation.toLocaleString('id-ID')} jiwa
            </span>
          </div>
          <div className="p-3 rounded-md bg-[#FAF9F5] border border-stone-200/60">
            <span className="text-stone-400 block mb-0.5">Kepala Keluarga (KK)</span>
            <span className="font-semibold text-base text-stone-900">
              {data.totalHouseholds} KK
            </span>
          </div>
          <div className="p-3 rounded-md bg-[#FAF9F5] border border-stone-200/60">
            <span className="text-stone-400 block mb-0.5">Luas Wilayah</span>
            <span className="font-semibold text-base text-stone-900">
              {data.totalAreaHectares} Ha
            </span>
          </div>
          <div className="p-3 rounded-md bg-[#FAF9F5] border border-stone-200/60">
            <span className="text-stone-400 block mb-0.5">Tipologi Desa</span>
            <span className="font-semibold text-base text-stone-900">Perkebunan & Wisata</span>
          </div>
        </div>
      </div>

      {/* 3 Dusun Details */}
      <div className="space-y-4">
        <h2 className="font-serif text-base font-semibold text-stone-900">
          Profil Administrasi {data.dusunList.length} Dusun
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.dusunList.map((dusun, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="font-serif font-semibold text-stone-900">{dusun.name}</span>
                <span className="text-[11px] text-stone-500">Kadus: {dusun.headName}</span>
              </div>

              <div className="space-y-1 text-xs text-stone-600">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-400">Populasi:</span>
                  <span className="font-medium text-stone-800">{dusun.population} Jiwa ({dusun.households} KK)</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed pt-2 border-t border-stone-100">
                  {dusun.characteristics}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Potensi Desa */}
      <div className="space-y-4">
        <h2 className="font-serif text-base font-semibold text-stone-900">
          Potensi Unggulan Komoditas & Wilayah
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.potencies.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-2.5"
            >
              <span className="text-[11px] font-semibold tracking-wider text-[#4A6B53] uppercase">
                {p.sector}
              </span>
              <h3 className="text-sm font-semibold text-stone-900">{p.title}</h3>
              <p className="text-xs text-stone-600 leading-relaxed">{p.description}</p>
              <div className="p-2.5 rounded bg-[#FAF9F5] border border-stone-200/70 text-[11px] text-stone-700">
                <span className="font-medium text-[#4A6B53]">Peluang KKN: </span>
                {p.opportunity}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SWOT Matrix */}
      <div className="space-y-4">
        <h2 className="font-serif text-base font-semibold text-stone-900">
          Analisis SWOT Wilayah Desa
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Strengths */}
          <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-2">
            <h3 className="font-serif font-semibold text-stone-900 text-sm flex items-center gap-1.5 text-[#385240]">
              <span>Kekuatan (Strengths)</span>
            </h3>
            <ul className="space-y-1.5 text-stone-600 pl-4 list-disc">
              {data.swot.strengths.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-2">
            <h3 className="font-serif font-semibold text-stone-900 text-sm flex items-center gap-1.5 text-amber-800">
              <span>Kelemahan (Weaknesses)</span>
            </h3>
            <ul className="space-y-1.5 text-stone-600 pl-4 list-disc">
              {data.swot.weaknesses.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Opportunities */}
          <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-2">
            <h3 className="font-serif font-semibold text-stone-900 text-sm flex items-center gap-1.5 text-[#385240]">
              <span>Peluang (Opportunities)</span>
            </h3>
            <ul className="space-y-1.5 text-stone-600 pl-4 list-disc">
              {data.swot.opportunities.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Threats */}
          <div className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs space-y-2">
            <h3 className="font-serif font-semibold text-stone-900 text-sm flex items-center gap-1.5 text-stone-700">
              <span>Tantangan (Threats)</span>
            </h3>
            <ul className="space-y-1.5 text-stone-600 pl-4 list-disc">
              {data.swot.threats.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Participatory Priority Needs */}
      <div className="space-y-4">
        <h2 className="font-serif text-base font-semibold text-stone-900">
          Kebutuhan Prioritas Hasil Penilaian Partisipatif (PRA)
        </h2>

        <div className="space-y-3">
          {data.priorityNeeds.map((need) => (
            <div
              key={need.rank}
              className="p-4 rounded-lg bg-white border border-[#E8E6DF] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-semibold text-[#4A6B53]">
                    Prioritas #{need.rank}
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="font-medium text-stone-800">{need.title}</span>
                </div>
                <p className="text-stone-600 leading-relaxed">{need.description}</p>
              </div>

              <div className="shrink-0 p-2 rounded bg-[#FAF9F5] border border-stone-200 text-stone-700 text-[11px]">
                <span className="text-stone-400 block text-[10px]">Dijawab oleh Program:</span>
                <span className="font-medium text-[#4A6B53]">{need.addressedByProgram}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
