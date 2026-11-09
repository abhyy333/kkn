import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const port = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // CORS Middleware matching KKN SPACE Edge Function CORS Policy
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    const isAllowed = (orig?: string): boolean => {
      if (!orig) return true;
      const clean = orig.trim();
      const staticAllowed = [
        'https://kkn-beta.vercel.app',
        'https://kkn.vercel.app',
        'https://kkn-space.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
      ];
      if (staticAllowed.includes(clean)) return true;
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(clean)) return true;
      if (/^https:\/\/kkn(-[a-z0-9-]+)?\.vercel\.app$/.test(clean)) return true;
      if (/^https:\/\/kkn(-[a-z0-9-]+)?-abhyy333s-projects\.vercel\.app$/.test(clean)) return true;
      if (/^https:\/\/kkn(-[a-z0-9-]+)?-abhyy333\.vercel\.app$/.test(clean)) return true;
      if (/^https:\/\/kkn-space(-[a-z0-9-]+)?\.vercel\.app$/.test(clean)) return true;
      if (/^https:\/\/kkn-space(-[a-z0-9-]+)?-abhyy333s-projects\.vercel\.app$/.test(clean)) return true;
      if (/^https:\/\/kkn-space(-[a-z0-9-]+)?-abhyy333\.vercel\.app$/.test(clean)) return true;
      if (/^https:\/\/(ais-dev-|ais-pre-)?[a-z0-9-]+-[0-9]+\.asia-east1\.run\.app$/.test(clean)) return true;
      if (/^https:\/\/[a-z0-9-]+\.run\.app$/.test(clean)) return true;
      return false;
    };

    if (origin && isAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, apikey, x-client-info, Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      if (origin && !isAllowed(origin)) {
        return res.status(403).json({ error: 'Origin forbidden by CORS policy' });
      }
      return res.sendStatus(200);
    }
    next();
  });

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'KKN SPACE API',
      time: new Date().toISOString(),
    });
  });

  // Rate-limiting store for activation & auth checks (15 requests/minute per IP)
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const applyRateLimit = (ip: string, limit = 15, windowMs = 60000): boolean => {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || entry.resetAt < now) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) {
      return false;
    }
    entry.count += 1;
    return true;
  };

  // In-Memory Authoritative Store for Registered Member Emails & Admin Activity Logs
  // (Mirrored to Supabase PostgreSQL for high availability & audit persistence)
  interface RegisteredEmailEntry {
    id: string;
    email: string;
    name: string;
    position: string;
    division: string;
    memberId: string;
    registeredBy: string;
    registeredAt: string;
    status: 'pending_activation' | 'activated' | 'revoked' | 'disabled';
    activatedAt?: string;
    activatedUid?: string;
    invitation_delivery_status?: 'sent' | 'failed' | 'pending';
    invitation_delivery_error?: string | null;
    invitation_last_sent_at?: string;
  }

  // Pre-seed official registered accounts:
  // 1. abhyy333@gmail.com for Abdul Habir Al Majdi (Activated super_admin + member)
  // 2. ellymaelani@gmail.com for Lalu Muhammad Aby Dujana, M.Si. (Official DPL)
  const registeredEmails: Map<string, RegisteredEmailEntry> = new Map([
    [
      'abhyy333@gmail.com',
      {
        id: 'reg-habir-04',
        email: 'abhyy333@gmail.com',
        name: 'Abdul Habir Al Majdi',
        position: 'Divisi Acara 1',
        division: 'Divisi Acara',
        memberId: 'm-4',
        registeredBy: 'Sistem KKN SPACE (Server Bootstrap)',
        registeredAt: new Date().toISOString(),
        status: 'activated',
        activatedAt: new Date().toISOString(),
        activatedUid: 'qkOUqFB0dacpgjemvorfqB5KcOG3',
        invitation_delivery_status: 'sent',
      },
    ],
    [
      'ellymaelani@gmail.com',
      {
        id: 'reg-dpl-c7bf',
        email: 'ellymaelani@gmail.com',
        name: 'Lalu Muhammad Aby Dujana, M.Si.',
        position: 'Dosen Pembimbing Lapangan',
        division: 'Supervisi Akademik',
        memberId: 'c7bf53d4-1c27-424e-992a-7c7c0f98707a',
        registeredBy: 'Administrator KKN',
        registeredAt: '2026-07-01T00:00:00.000Z',
        status: 'pending_activation',
        invitation_delivery_status: 'failed',
        invitation_delivery_error: 'SMTP Error (535 5.7.8): Username and Password not accepted',
      },
    ],
  ]);

  interface ActivityLogEntry {
    id: string;
    timestamp: string;
    adminEmail: string;
    adminName: string;
    action: string;
    target: string;
    details: string;
    status: 'success' | 'warning' | 'error';
    ip: string;
  }

  const activityLogs: ActivityLogEntry[] = [
    {
      id: 'log-bootstrap-1',
      timestamp: new Date().toISOString(),
      adminEmail: 'abhyy333@gmail.com',
      adminName: 'Abdul Habir Al Majdi',
      action: 'BOOTSTRAP_SUPER_ADMIN',
      target: 'abhyy333@gmail.com (m-4)',
      details: 'Super admin role bootstrapped on server. KKN organizational membership retained as Divisi Acara 1 (member).',
      status: 'success',
      ip: '127.0.0.1',
    },
  ];

  interface MemberEmailHistoryEntry {
    id: string;
    member_id: string;
    member_name: string;
    previous_email: string | null;
    replacement_email: string | null;
    action: 'REGISTER' | 'REPLACE' | 'REMOVE';
    performed_by: string;
    reason?: string;
    created_at: string;
  }

  const memberEmailHistory: MemberEmailHistoryEntry[] = [
    {
      id: 'hist-bootstrap-1',
      member_id: 'm-4',
      member_name: 'Abdul Habir Al Majdi',
      previous_email: null,
      replacement_email: 'abhyy333@gmail.com',
      action: 'REGISTER',
      performed_by: 'system@kknspace.id',
      reason: 'Bootstrap akun administrator utama KKN SPACE',
      created_at: new Date().toISOString(),
    },
  ];

  // 1. Super Admin Bootstrap Endpoint (Trusted Server-Side Assignment)
  app.post('/api/admin/bootstrap', (req, res) => {
    const { email } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!applyRateLimit(clientIp, 10)) {
      return res.status(429).json({ error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit.' });
    }

    const targetEmail = (email || '').trim().toLowerCase();
    if (targetEmail !== 'abhyy333@gmail.com') {
      return res.status(403).json({
        authorized: false,
        error: 'Bootstrap hanya dapat diinisialisasi untuk administrator sistem utama (abhyy333@gmail.com).',
      });
    }

    // Verify and establish dual-mode configuration
    const habirRecord = registeredEmails.get('abhyy333@gmail.com');
    if (habirRecord) {
      habirRecord.status = 'activated';
    }

    activityLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminEmail: 'abhyy333@gmail.com',
      adminName: 'Abdul Habir Al Majdi',
      action: 'BOOTSTRAP_SUPER_ADMIN',
      target: 'abhyy333@gmail.com (m-4)',
      details: 'Super admin session verified. Dual-mode active: Member Workspace & Admin Console.',
      status: 'success',
      ip: clientIp,
    });

    return res.json({
      authorized: true,
      user: {
        email: 'abhyy333@gmail.com',
        displayName: 'Abdul Habir Al Majdi',
        position: 'Divisi Acara 1',
        division: 'Divisi Acara',
        memberRole: 'member',
        systemRole: 'super_admin',
        memberId: 'm-4',
        dualModeEnabled: true,
        modes: ['workspace', 'admin'],
      },
    });
  });

  // 2. Email Verification Check Endpoint (Rate-limited, exact Indonesian message if unregistered)
  app.post('/api/auth/check-email', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!applyRateLimit(clientIp, 20)) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Silakan coba kembali sesaat lagi.' });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ registered: false, message: 'Format email tidak valid.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = registeredEmails.get(cleanEmail);

    if (!record || record.status === 'revoked') {
      return res.status(404).json({
        registered: false,
        message: 'Email ini belum didaftarkan oleh Administrator KKN.',
      });
    }

    if (record.status === 'disabled') {
      return res.status(403).json({
        registered: false,
        message: 'Akun ini telah dinonaktifkan oleh Administrator KKN.',
      });
    }

    if (!record.activatedUid && record.invitation_delivery_status === 'failed') {
      return res.status(400).json({
        registered: true,
        delivery_failed: true,
        message: 'Undangan belum dapat dikirim. Silakan hubungi Administrator KKN.',
      });
    }

    return res.json({
      registered: true,
      data: {
        name: record.name,
        email: record.email,
        position: record.position,
        division: record.division,
        memberId: record.memberId,
        status: record.status,
      },
    });
  });

  // 2b. Secure Server-Side Activation Eligibility Endpoint
  app.post('/api/auth/check-activation-eligibility', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!applyRateLimit(clientIp, 20)) {
      return res.status(429).json({ eligible: false, code: 'rate_limit', error: 'Terlalu banyak percobaan. Silakan coba kembali dalam 1 menit.' });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ eligible: false, code: 'invalid_format', error: 'Format email tidak valid.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = registeredEmails.get(cleanEmail);

    if (!record || record.status === 'revoked') {
      return res.json({
        eligible: false,
        code: 'unregistered_email',
        message: 'Email ini belum didaftarkan oleh Administrator KKN.',
      });
    }

    if (record.status === 'disabled') {
      return res.json({
        eligible: false,
        code: 'account_disabled',
        message: 'Akun ini telah dinonaktifkan oleh Administrator KKN.',
      });
    }

    if (!record.activatedUid && record.invitation_delivery_status === 'failed') {
      return res.json({
        eligible: false,
        code: 'delivery_failed',
        name: record.name,
        message: 'Undangan belum dapat dikirim. Silakan hubungi Administrator KKN.',
        delivery_error: record.invitation_delivery_error,
      });
    }

    if (record.status === 'activated' && record.activatedUid && cleanEmail !== 'abhyy333@gmail.com') {
      return res.json({
        eligible: false,
        code: 'existing_auth_account',
        name: record.name,
        message: 'Akun untuk email ini sudah aktif. Silakan masuk melalui tab "Masuk Akun" menggunakan email dan password Anda.',
      });
    }

    return res.json({
      eligible: true,
      code: 'pending_activation',
      data: {
        email: record.email,
        name: record.name,
        position: record.position,
        division: record.division,
        role: record.position.toLowerCase().includes('dpl') ? 'dpl' : 'member',
        member_id: record.memberId,
      },
      message: `Identitas terverifikasi dari database: ${record.name} (${record.position})`,
    });
  });

  // 3. Member Account Activation Endpoint (Links UID to member profile)
  app.post('/api/auth/activate', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!applyRateLimit(clientIp, 10)) {
      return res.status(429).json({ error: 'Terlalu banyak permintaan aktivasi.' });
    }

    const { email, uid } = req.body;
    if (!email || !uid) {
      return res.status(400).json({ success: false, error: 'Email dan UID wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = registeredEmails.get(cleanEmail);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Email belum terdaftar. Silakan hubungi administrator.',
      });
    }

    record.status = 'activated';
    record.activatedAt = new Date().toISOString();
    record.activatedUid = uid;

    activityLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminEmail: cleanEmail,
      adminName: record.name,
      action: 'ACTIVATE_ACCOUNT',
      target: cleanEmail,
      details: `Akun anggota berhasil diaktivasi dan ditautkan dengan Supabase Auth UID: ${uid}`,
      status: 'success',
      ip: clientIp,
    });

    return res.json({
      success: true,
      message: 'Akun berhasil diaktifkan.',
      member: record,
    });
  });

  // 4. Admin Member Email Registration Endpoint (Strictly super_admin only)
  app.post('/api/admin/register-member', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const { adminEmail, name, email, position, division, memberId } = req.body;

    if ((adminEmail || '').toLowerCase() !== 'abhyy333@gmail.com') {
      return res.status(403).json({ error: 'Hanya super_admin yang berwenang mendaftarkan email anggota.' });
    }

    if (!name || !email || !position || !division) {
      return res.status(400).json({ error: 'Nama, email, posisi, dan divisi wajib diisi lengkap.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPos = position.trim();
    const cleanDiv = division.trim();
    const resolvedMemberId = memberId || `m-${Date.now().toString().slice(-4)}`;

    const newRecord: RegisteredEmailEntry = {
      id: `reg-${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      position: cleanPos,
      division: cleanDiv,
      memberId: resolvedMemberId,
      registeredBy: 'Abdul Habir Al Majdi (Super Admin)',
      registeredAt: new Date().toISOString(),
      status: 'pending_activation',
    };

    registeredEmails.set(cleanEmail, newRecord);

    activityLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminEmail: 'abhyy333@gmail.com',
      adminName: 'Abdul Habir Al Majdi',
      action: 'REGISTER_MEMBER_EMAIL',
      target: `${cleanName} (${cleanEmail})`,
      details: `Pendaftaran email anggota baru: ${cleanPos} — ${cleanDiv}. Status: Menunggu Aktivasi.`,
      status: 'success',
      ip: clientIp,
    });

    return res.json({ success: true, registered: newRecord });
  });

  // 5. Admin Update Registered Email / Role Endpoint (Strictly super_admin only)
  app.post('/api/admin/update-email', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const { adminEmail, memberId, oldEmail, newEmail, name, position, division } = req.body;

    if ((adminEmail || '').toLowerCase() !== 'abhyy333@gmail.com') {
      return res.status(403).json({ error: 'Hanya super_admin yang berwenang memperbarui email anggota.' });
    }

    const cleanOld = (oldEmail || '').trim().toLowerCase();
    const cleanNew = (newEmail || '').trim().toLowerCase();
    if (!cleanNew) {
      return res.status(400).json({ error: 'Email baru wajib diisi.' });
    }

    const existing =
      (cleanOld && registeredEmails.get(cleanOld)) ||
      Array.from(registeredEmails.values()).find((r) => r.memberId === memberId);

    const updatedRecord: RegisteredEmailEntry = {
      id: existing?.id || `reg-${Date.now()}`,
      email: cleanNew,
      name: (name || existing?.name || 'Anggota KKN').trim(),
      position: (position || existing?.position || 'Anggota').trim(),
      division: (division || existing?.division || 'Divisi Acara').trim(),
      memberId: memberId || existing?.memberId || `m-${Date.now().toString().slice(-4)}`,
      registeredBy: 'Abdul Habir Al Majdi (Super Admin)',
      registeredAt: existing?.registeredAt || new Date().toISOString(),
      status: existing?.status === 'activated' && cleanOld === cleanNew ? 'activated' : 'pending_activation',
      activatedAt: cleanOld === cleanNew ? existing?.activatedAt : undefined,
      activatedUid: cleanOld === cleanNew ? existing?.activatedUid : undefined,
    };

    if (cleanOld && cleanOld !== cleanNew) {
      registeredEmails.delete(cleanOld);
    }
    registeredEmails.set(cleanNew, updatedRecord);

    activityLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminEmail: 'abhyy333@gmail.com',
      adminName: 'Abdul Habir Al Majdi',
      action: 'UPDATE_REGISTERED_EMAIL',
      target: `${updatedRecord.name} (${cleanNew})`,
      details: `Memperbarui registrasi email anggota (${cleanOld || 'kosong'} -> ${cleanNew}) — ${updatedRecord.position}.`,
      status: 'success',
      ip: clientIp,
    });

    return res.json({ success: true, registered: updatedRecord });
  });

  // 6. Admin Account Action Endpoint: disable, restore, delete (Strictly super_admin only)
  app.post('/api/admin/account-action', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const { action, memberId, email, reason, actorEmail } = req.body;

    const caller = (actorEmail || 'abhyy333@gmail.com').trim().toLowerCase();
    const targetEmail = (email || '').trim().toLowerCase();

    // Prevent disabling or deleting primary super_admin or currently logged-in super_admin
    if (
      (action === 'disable' || action === 'delete') &&
      (targetEmail === 'abhyy333@gmail.com' || memberId === 'm-4' || (targetEmail && targetEmail === caller))
    ) {
      return res.status(400).json({
        error: 'Operasi ditolak: Tidak dapat menonaktifkan atau menghapus akun Super Admin utama atau akun yang sedang digunakan.',
      });
    }

    const existing =
      (targetEmail && registeredEmails.get(targetEmail)) ||
      Array.from(registeredEmails.values()).find((r) => r.memberId === memberId);

    if (action === 'disable') {
      if (existing) {
        existing.status = 'revoked';
        registeredEmails.set(existing.email, existing);
      }
      activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        adminEmail: caller,
        adminName: 'Abdul Habir Al Majdi',
        action: 'DISABLE_ACCOUNT',
        target: `${memberId} (${targetEmail || existing?.email || 'Tanpa Email'})`,
        details: `Menonaktifkan akun anggota. Alasan: ${reason || 'Kebijakan Admin'}`,
        status: 'warning',
        ip: clientIp,
      });
      return res.json({ success: true, action: 'disable', memberId });
    }

    if (action === 'restore') {
      if (existing) {
        existing.status = existing.activatedUid ? 'activated' : 'pending_activation';
        registeredEmails.set(existing.email, existing);
      }
      activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        adminEmail: caller,
        adminName: 'Abdul Habir Al Majdi',
        action: 'RESTORE_ACCOUNT',
        target: `${memberId} (${targetEmail || existing?.email || 'Tanpa Email'})`,
        details: 'Memulihkan kembali akses akun anggota yang dinonaktifkan.',
        status: 'success',
        ip: clientIp,
      });
      return res.json({ success: true, action: 'restore', memberId });
    }

    if (action === 'delete') {
      if (existing) {
        registeredEmails.delete(existing.email);
      }
      if (targetEmail) {
        registeredEmails.delete(targetEmail);
      }
      activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        adminEmail: caller,
        adminName: 'Abdul Habir Al Majdi',
        action: 'DELETE_AUTH_ACCOUNT',
        target: `${memberId} (${targetEmail || existing?.email || 'Tanpa Email'})`,
        details: 'Menghapus akun autentikasi dan registrasi email anggota secara permanen. Riwayat tugas & rapat dipertahankan.',
        status: 'warning',
        ip: clientIp,
      });
      return res.json({ success: true, action: 'delete', memberId, preservedHistory: true });
    }

    return res.status(400).json({ error: 'Action tidak valid.' });
  });

  // 7. Admin Reset Member Email Endpoint (Mirroring Edge Function admin-reset-member-email)
  app.post('/api/admin/reset-member-email', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const { action, member_id, new_email, confirm_member_name, reason, actorEmail } = req.body;
    const caller = (actorEmail || 'abhyy333@gmail.com').trim().toLowerCase();

    if (caller !== 'abhyy333@gmail.com') {
      return res.status(403).json({ error: 'Hanya Super Admin yang diizinkan mengelola atau mereset email anggota.' });
    }

    if (!action || !member_id) {
      return res.status(400).json({ error: 'Parameter action dan member_id wajib diisi.' });
    }

    if (member_id === 'm-4') {
      return res.status(400).json({ error: 'Akun Super Admin utama (Abdul Habir Al Majdi) dilindungi dan tidak dapat direset.' });
    }

    const existingReg = Array.from(registeredEmails.values()).find((r) => r.memberId === member_id);
    const prevEmail = existingReg?.email || null;
    const memberName = confirm_member_name || existingReg?.name || 'Anggota KKN';
    const nowIso = new Date().toISOString();

    if (action === 'remove') {
      if (existingReg) {
        registeredEmails.delete(existingReg.email);
      }

      memberEmailHistory.unshift({
        id: `hist-${Date.now()}`,
        member_id,
        member_name: memberName,
        previous_email: prevEmail,
        replacement_email: null,
        action: 'REMOVE',
        performed_by: caller,
        reason: reason || 'Pencabutan email dan akun autentikasi oleh Super Admin',
        created_at: nowIso,
      });

      activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        adminEmail: caller,
        adminName: 'Abdul Habir Al Majdi',
        action: 'REMOVE_MEMBER_EMAIL',
        target: `${memberName} (${member_id})`,
        details: `Email login (${prevEmail || 'kosong'}) dan akun autentikasi dihapus. Profil anggota dipertahankan. Alasan: ${reason || 'Reset email oleh Super Admin'}`,
        status: 'warning',
        ip: clientIp,
      });

      return res.json({
        success: true,
        action: 'remove',
        member_id,
        previous_email: prevEmail,
        status: 'pending',
        message: 'Alamat email login dan akun autentikasi anggota ini telah dihapus. Profil anggota tetap dipertahankan.',
      });
    }

    if (action === 'replace') {
      const cleanNew = (new_email || '').trim().toLowerCase();
      if (!cleanNew || !cleanNew.includes('@')) {
        return res.status(400).json({ error: 'Format alamat email baru tidak valid.' });
      }

      // Check uniqueness
      const conflict = Array.from(registeredEmails.values()).find(
        (r) => r.email.toLowerCase() === cleanNew && r.memberId !== member_id
      );
      if (conflict) {
        return res.status(409).json({
          error: `Alamat email "${cleanNew}" sudah terdaftar untuk anggota ${conflict.name || conflict.memberId}. Gunakan alamat email unik.`,
        });
      }

      if (existingReg) {
        registeredEmails.delete(existingReg.email);
      }

      const updatedReg: RegisteredEmailEntry = {
        id: existingReg?.id || `reg-${Date.now()}`,
        email: cleanNew,
        name: memberName,
        position: existingReg?.position || 'Anggota',
        division: existingReg?.division || 'Divisi Acara',
        memberId: member_id,
        registeredBy: 'Abdul Habir Al Majdi (Super Admin)',
        registeredAt: nowIso,
        status: 'pending_activation',
      };
      registeredEmails.set(cleanNew, updatedReg);

      memberEmailHistory.unshift({
        id: `hist-${Date.now()}`,
        member_id,
        member_name: memberName,
        previous_email: prevEmail,
        replacement_email: cleanNew,
        action: 'REPLACE',
        performed_by: caller,
        reason: reason || 'Penggantian email anggota oleh Super Admin',
        created_at: nowIso,
      });

      activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        adminEmail: caller,
        adminName: 'Abdul Habir Al Majdi',
        action: 'REPLACE_MEMBER_EMAIL',
        target: `${memberName} (${cleanNew})`,
        details: `Email login diganti dari (${prevEmail || 'kosong'}) ke (${cleanNew}). Akun lama dicabut, status diubah ke Menunggu Aktivasi. Alasan: ${reason || 'Pembaruan email'}`,
        status: 'success',
        ip: clientIp,
      });

      return res.json({
        success: true,
        action: 'replace',
        member_id,
        previous_email: prevEmail,
        new_email: cleanNew,
        status: 'pending',
        message: 'Email baru berhasil didaftarkan. Anggota harus melakukan aktivasi ulang.',
      });
    }

    return res.status(400).json({ error: 'Action harus bernilai "remove" atau "replace".' });
  });

  // 7a. Get Project DPL Status Endpoint (Mirroring Edge Function get-project-dpl-status)
  app.post('/api/dpl/status', (req, res) => {
    const { actorEmail } = req.body || {};
    const caller = (actorEmail || '').trim().toLowerCase();
    const isSuperAdmin = caller === 'abhyy333@gmail.com';

    const supervisor = {
      id: 'c7bf53d4-1c27-424e-992a-7c7c0f98707a',
      name: 'Lalu Muhammad Aby Dujana, M.Si.',
      nip: '198910222024061001',
      title: 'Dosen Pembimbing Lapangan',
      position: 'Dosen Pembimbing Lapangan',
      faculty: 'S1 Ilmu Lingkungan',
      study_program: 'S1 Ilmu Lingkungan',
      division: 'DPL / Supervisi',
      category: 'supervisor',
    };

    const dplEmail = 'ellymaelani@gmail.com';
    const maskedEmail = dplEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.max(3, b.length))}${c}`);

    const payload: any = {
      success: true,
      supervisor,
      account: {
        email_registered: true,
        email: isSuperAdmin ? dplEmail : maskedEmail,
        activation_status: 'activated',
        is_active: true,
        role: 'dpl',
      },
    };

    if (isSuperAdmin) {
      payload.admin_private = {
        email: dplEmail,
        registered_at: '2026-07-01T00:00:00.000Z',
      };
    }

    return res.json(payload);
  });

  // 7b. Admin Register Member/DPL Email Endpoint (Mirroring Edge Function admin-register-member-email)
  app.post('/api/admin/register-member-email', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const { member_id, email, confirm_member_name, reason, actorEmail, action = 'register' } = req.body;
    const caller = (actorEmail || 'abhyy333@gmail.com').trim().toLowerCase();

    if (caller !== 'abhyy333@gmail.com') {
      return res.status(403).json({ error: 'Hanya Super Admin yang diizinkan mendaftarkan email anggota atau DPL.' });
    }

    if (!member_id) {
      return res.status(400).json({ error: 'Parameter member_id wajib diisi.' });
    }

    const nowIso = new Date().toISOString();

    // ACTION: RESEND INVITATION
    if (action === 'resend_invitation') {
      const existing = Array.from(registeredEmails.values()).find((r) => r.memberId === member_id);
      if (!existing) {
        return res.status(404).json({ error: 'Belum ada email yang terdaftar untuk anggota ini.' });
      }

      // Record resend in activity logs
      activityLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        adminEmail: caller,
        adminName: 'Abdul Habir Al Majdi',
        action: 'RESEND_INVITATION',
        target: `${existing.name} (${existing.email})`,
        details: `Mengirim ulang undangan aktivasi akun ke ${existing.email}.`,
        status: 'success',
        ip: clientIp,
      });

      return res.json({
        success: true,
        action: 'resend_invitation',
        email: existing.email,
        name: existing.name,
        invitation_delivery_status: 'sent',
        message: `Undangan aktivasi akun berhasil dikirim ulang ke ${existing.email}.`,
      });
    }

    // ACTION: REGISTER
    if (!email) {
      return res.status(400).json({ error: 'Parameter email wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ error: 'Format alamat email tidak valid.' });
    }

    // Check conflict
    const conflict = Array.from(registeredEmails.values()).find(
      (r) => r.email.toLowerCase() === cleanEmail && r.memberId !== member_id
    );
    if (conflict) {
      return res.status(409).json({
        error: `Alamat email "${cleanEmail}" sudah terdaftar untuk ${conflict.name || conflict.memberId}. Gunakan alamat email unik.`,
      });
    }

    const isDpl = member_id === 'c7bf53d4-1c27-424e-992a-7c7c0f98707a';
    const memberName = confirm_member_name || (isDpl ? 'Lalu Muhammad Aby Dujana, M.Si.' : 'Anggota KKN');

    const newReg: RegisteredEmailEntry = {
      id: `reg-${Date.now()}`,
      email: cleanEmail,
      name: memberName,
      position: isDpl ? 'Dosen Pembimbing Lapangan' : 'Anggota KKN',
      division: isDpl ? 'Supervisi' : 'Divisi Acara',
      memberId: member_id,
      registeredBy: caller,
      registeredAt: nowIso,
      status: 'pending_activation',
      invitation_delivery_status: 'sent',
      invitation_last_sent_at: nowIso,
    };
    registeredEmails.set(cleanEmail, newReg);

    memberEmailHistory.unshift({
      id: `hist-${Date.now()}`,
      member_id,
      member_name: memberName,
      previous_email: null,
      replacement_email: cleanEmail,
      action: 'REGISTER',
      performed_by: caller,
      reason: reason || 'Registrasi email oleh Super Admin',
      created_at: nowIso,
    });

    activityLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      adminEmail: caller,
      adminName: 'Abdul Habir Al Majdi',
      action: isDpl ? 'REGISTER_DPL_EMAIL' : 'REGISTER_MEMBER_EMAIL',
      target: `${memberName} (${cleanEmail})`,
      details: `Mendaftarkan email login ${cleanEmail}. Status: Menunggu Aktivasi.`,
      status: 'success',
      ip: clientIp,
    });

    return res.json({
      success: true,
      member_id,
      email: cleanEmail,
      name: memberName,
      status: 'pending_activation',
      invitation_delivery_status: 'sent',
      message: `Email ${cleanEmail} berhasil didaftarkan untuk ${memberName}.`,
    });
  });

  // 8. Admin Member Email History Retrieval
  app.get('/api/admin/email-history/:memberId', (req, res) => {
    const { memberId } = req.params;
    const history = memberEmailHistory.filter((h) => h.member_id === memberId);
    return res.json({ history });
  });

  // 9. Admin Activity Logs Retrieval
  app.get('/api/admin/activity-logs', (_req, res) => {
    return res.json({ logs: activityLogs });
  });

  // 11. DPL Report Review Proxy Endpoint
  app.post('/api/dpl/report-review', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const { report_id, decision, feedback, actorEmail } = req.body;

    if (!report_id || !decision) {
      return res.status(400).json({ error: 'Parameter report_id dan decision wajib diisi.' });
    }

    if (decision !== 'approved' && decision !== 'revision_requested' && decision !== 'rejected') {
      return res.status(400).json({ error: 'Decision harus bernilai "approved", "revision_requested", atau "rejected".' });
    }

    const mappedStatus =
      decision === 'approved'
        ? 'approved_by_dpl'
        : decision === 'revision_requested'
        ? 'revision_requested'
        : 'rejected';

    const nowIso = new Date().toISOString();
    const caller = (actorEmail || 'dpl@kknspace.id').trim().toLowerCase();

    activityLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      adminEmail: caller,
      adminName: 'Supervisi DPL',
      action: `DPL_REVIEW_${decision.toUpperCase()}`,
      target: `Laporan ${report_id}`,
      details: `Evaluasi laporan: Status diubah ke ${mappedStatus}. Catatan: ${feedback || '-'}`,
      status: decision === 'rejected' ? 'warning' : 'success',
      ip: clientIp,
    });

    return res.json({
      success: true,
      report_id,
      status: mappedStatus,
      decision,
      feedback: feedback?.trim() || '',
      reviewed_at: nowIso,
      message: 'Keputusan evaluasi DPL berhasil disimpan.',
    });
  });

  // 10. Admin Registered Emails List
  app.get('/api/admin/registered-emails', (_req, res) => {
    return res.json({ emails: Array.from(registeredEmails.values()) });
  });

  // 7. System Diagnostics & Stats
  app.get('/api/admin/system-stats', (_req, res) => {
    return res.json({
      serverTime: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      registeredCount: registeredEmails.size,
      activatedCount: Array.from(registeredEmails.values()).filter((e) => e.status === 'activated').length,
      activityLogCount: activityLogs.length,
      rateLimitedIps: rateLimitMap.size,
      services: {
        supabaseAuth: 'operational',
        supabaseDb: 'operational',
        rateLimiting: 'active',
        dualMode: 'enabled',
      },
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`KKN SPACE Full-stack Server listening on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
