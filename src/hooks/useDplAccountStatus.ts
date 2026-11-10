import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { OFFICIAL_PROJECT_ID } from '../data/mockData';

export type DplActivationStatus =
  | 'not_registered'
  | 'pending_activation'
  | 'confirmation_pending'
  | 'account_reconciliation_required'
  | 'activated';

export interface DplAccountStatusData {
  success: true;
  supervisor: {
    id: string;
    name: string;
    nip: string | null;
    title: string;
    position: string;
    faculty: string | null;
    study_program: string | null;
    division: string;
    category: string;
  };
  account: {
    email_registered: boolean;
    activation_status: DplActivationStatus;
    is_active: boolean;
    role: 'dpl' | null;
  };
  admin_private?: {
    email: string | null;
    registered_at: string | null;
    activated_at: string | null;
    auth_user_id: string | null;
  };
}

export function useDplAccountStatus(_actorEmail?: string) {
  const [data, setData] = useState<DplAccountStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDplStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Konfigurasi Supabase belum tersedia.');
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');

      const { data: result, error: functionError } = await supabase.functions.invoke(
        'get-project-dpl-status',
        {
          headers: { Authorization: `Bearer ${token}` },
          body: { project_id: OFFICIAL_PROJECT_ID },
        }
      );

      if (functionError) throw functionError;
      if (!result?.success || !result?.supervisor || !result?.account) {
        throw new Error(result?.error || 'Respons status DPL dari server tidak valid.');
      }

      setData(result as DplAccountStatusData);
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'Gagal memuat status akun DPL dari database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDplStatus();
  }, [fetchDplStatus]);

  return { dplStatus: data, isLoading, error, refetch: fetchDplStatus };
}
