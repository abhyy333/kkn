import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { OFFICIAL_PROJECT_ID, OFFICIAL_DPL_MEMBER_ID, DPL_SUPERVISOR } from '../data/mockData';

export interface DplAccountStatusData {
  supervisor: {
    id: string;
    name: string;
    nip: string;
    title: string;
    position: string;
    faculty: string;
    study_program: string;
    division: string;
    category: string;
  };
  account: {
    email_registered: boolean;
    email?: string | null;
    activation_status: 'activated' | 'active' | 'pending_activation' | 'not_registered' | 'disabled';
    is_active: boolean;
    role: string | null;
  };
  admin_private?: {
    email?: string;
    registered_at?: string;
    auth_user_id?: string | null;
  };
}

export function useDplAccountStatus(actorEmail?: string) {
  const [data, setData] = useState<DplAccountStatusData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDplStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: any = null;

      // 1. Try Supabase Edge Function `get-project-dpl-status`
      if (isSupabaseConfigured) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const { data: fnData, error: fnError } = await supabase.functions.invoke('get-project-dpl-status', {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: { project_id: OFFICIAL_PROJECT_ID },
          });

          if (!fnError && fnData && fnData.success) {
            result = fnData;
          }
        } catch (edgeErr) {
          console.warn('Edge Function get-project-dpl-status invoke notice (falling back to API proxy):', edgeErr);
        }
      }

      if (result) {
        setData(result as DplAccountStatusData);
      } else {
        setData(null);
        setError('Status akun DPL belum dapat diverifikasi dari Supabase. Coba muat ulang.');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat status akun DPL.');
    } finally {
      setIsLoading(false);
    }
  }, [actorEmail]);

  useEffect(() => {
    fetchDplStatus();
  }, [fetchDplStatus]);

  return {
    dplStatus: data,
    isLoading,
    error,
    refetch: fetchDplStatus,
  };
}
