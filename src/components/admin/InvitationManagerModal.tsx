import React, { useState, useEffect } from 'react';
import { useAuth, InvitationItem, UserRole } from '../../context/AuthContext';
import {
  UserPlus,
  KeyRound,
  Copy,
  Check,
  Trash2,
  Clock,
  Shield,
  X,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';

interface InvitationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvitationManagerModal: React.FC<InvitationManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createInvitation, fetchInvitations, revokeInvitation, isAdmin } = useAuth();
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [division, setDivision] = useState('Divisi Acara');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchInvitations();
      setInvitations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const token = await createInvitation(name, email, role, division);
      setCreatedToken(token);
      setName('');
      setEmail('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menerbitkan undangan.');
    }
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Cabut akses kode undangan ini?')) {
      await revokeInvitation(id);
      await loadData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E8E6DF] shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#4A6B53]" />
            <h2 className="font-serif text-base font-semibold text-stone-900">
              Kelola Undangan Anggota & Hak Akses (Invitation-Only)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Issued Token Notice */}
        {createdToken && (
          <div className="p-4 rounded-lg bg-[#FAF9F5] border border-[#CCDCD0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#284230] text-xs">
                Kode Undangan Baru Berhasil Diterbitkan:
              </span>
              <button
                onClick={() => handleCopy(createdToken)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#4A6B53] bg-white px-2 py-1 rounded border border-stone-200 hover:bg-stone-50"
              >
                {copiedToken === createdToken ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin Kode</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-base font-bold text-stone-900 tracking-wider bg-white p-2.5 rounded border border-stone-200 text-center">
              {createdToken}
            </div>
            <p className="text-[11px] text-stone-500">
              Berikan kode token di atas kepada calon anggota. Calon anggota dapat mengaktifkan akun melalui menu "Aktivasi Undangan" di halaman login tanpa memerlukan akun dummy dari administrator.
            </p>
          </div>
        )}

        {/* Generate Invitation Form */}
        <form onSubmit={handleCreate} className="p-4 rounded-lg bg-[#FAF9F5] border border-stone-200/80 space-y-3">
          <span className="font-semibold text-stone-800 uppercase tracking-wider text-[11px] block">
            Terbitkan Undangan Baru
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-stone-600 font-medium">Nama Calon Anggota</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full px-2.5 py-1.5 rounded border border-[#D5D2C8] bg-white focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="space-y-1 sm:col-span-1">
              <label className="text-stone-600 font-medium">Email (Opsional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@ugm.ac.id"
                className="w-full px-2.5 py-1.5 rounded border border-[#D5D2C8] bg-white focus:outline-none focus:border-[#4A6B53]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-stone-600 font-medium">Hak Akses (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-2.5 py-1.5 rounded border border-[#D5D2C8] bg-white focus:outline-none focus:border-[#4A6B53]"
              >
                <option value="member">Anggota Tim (Member)</option>
                <option value="admin">Administrator / BPH</option>
                <option value="dpl">DPL (Supervisi Read-Only)</option>
                <option value="viewer">Pengamat / Tamu (Viewer)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-stone-600 font-medium">Penugasan Divisi</label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[#D5D2C8] bg-white focus:outline-none focus:border-[#4A6B53]"
              >
                <option value="Badan Pengurus Harian (BPH)">BPH</option>
                <option value="Divisi Acara">Divisi Acara</option>
                <option value="Divisi PDD">Divisi PDD</option>
                <option value="Divisi Humper">Divisi Humper</option>
                <option value="Divisi Konsumsi">Divisi Konsumsi</option>
                <option value="Dosen Pembimbing Lapangan (DPL)">DPL</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#4A6B53] text-white font-medium hover:bg-[#3B5643] transition-colors shadow-2xs"
            >
              Generate Kode Undangan
            </button>
          </div>
        </form>

        {/* Existing Invitations Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-800 uppercase tracking-wider text-[11px]">
              Daftar Undangan Terdaftar ({invitations.length} Anggota / DPL)
            </span>
            <button
              onClick={loadData}
              className="text-[11px] text-[#4A6B53] hover:underline"
            >
              Segarkan
            </button>
          </div>

          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="py-2 px-3">Nama & Email</th>
                  <th className="py-2 px-3">Divisi</th>
                  <th className="py-2 px-3">Kode Token</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-stone-900">{inv.name}</div>
                      <div className="text-[10px] text-stone-400">
                        {inv.email || 'Email diisi saat aktivasi'}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 truncate max-w-[140px]">
                      {inv.division}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-stone-800 text-[11px]">
                      {inv.token}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          inv.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : inv.role === 'dpl'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {inv.role === 'admin' ? 'Admin' : inv.role === 'dpl' ? 'DPL' : 'Anggota'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          inv.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : inv.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {inv.status === 'accepted' ? 'Aktif' : inv.status === 'pending' ? 'Pending Aktivasi' : 'Dicabut'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      {inv.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleCopy(inv.token)}
                            className="p-1 text-stone-500 hover:text-stone-800"
                            title="Salin Token Undangan"
                          >
                            <Copy className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Cabut Undangan"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-stone-400">
                      Belum ada undangan yang terdaftar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

