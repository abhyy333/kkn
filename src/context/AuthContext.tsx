import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export type UserRole = 'admin' | 'member' | 'dpl' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  division?: string;
  nim?: string;
  phone?: string;
  photoURL?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface InvitationItem {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  division: string;
  token: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'revoked';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: any;
  acceptedByUid?: string;
}

// 10 Official Team Member Profiles + 1 DPL Profile as Pending Invitations (No fake login credentials)
export const PRE_SEEDED_TEAM_INVITATIONS: InvitationItem[] = [
  {
    id: 'inv-josua-ujung',
    name: 'Josua Ujung',
    email: '',
    role: 'admin',
    division: 'Badan Pengurus Harian (BPH)',
    token: 'KKN-PRG-JOSUA-01',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-mulia-oktaviani',
    name: 'Mulia Oktaviani',
    email: '',
    role: 'admin',
    division: 'Badan Pengurus Harian (BPH)',
    token: 'KKN-PRG-MULIA-02',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-tsaniatul-amni',
    name: 'Tsaniatul Amni Alwan',
    email: '',
    role: 'admin',
    division: 'Badan Pengurus Harian (BPH)',
    token: 'KKN-PRG-AMNI-03',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-abdul-habir',
    name: 'Abdul Habir Al Majdi',
    email: '',
    role: 'member',
    division: 'Divisi Acara',
    token: 'KKN-PRG-HABIR-04',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-asma-nadiya',
    name: 'Asma Nadiya',
    email: '',
    role: 'member',
    division: 'Divisi Acara',
    token: 'KKN-PRG-NADIYA-05',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-agits-haibatulloh',
    name: 'Muhammad Agits Haibatulloh',
    email: '',
    role: 'member',
    division: 'Divisi PDD',
    token: 'KKN-PRG-AGITS-06',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-nurul-ainun',
    name: 'Nurul Ainun',
    email: '',
    role: 'member',
    division: 'Divisi PDD',
    token: 'KKN-PRG-AINUN-07',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-zidane-athoriq',
    name: 'Zidane Ath Thoriq',
    email: '',
    role: 'member',
    division: 'Divisi Humper',
    token: 'KKN-PRG-ZIDANE-08',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-dini-aminarti',
    name: 'Dini Aminarti',
    email: '',
    role: 'member',
    division: 'Divisi Humper',
    token: 'KKN-PRG-DINI-09',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-putu-sri',
    name: 'Putu Sri Astiningsih',
    email: '',
    role: 'member',
    division: 'Divisi Konsumsi',
    token: 'KKN-PRG-PUTU-10',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
  {
    id: 'inv-dpl-syamsuddin',
    name: 'Dr. Lalu Syamsuddin, M.Si.',
    email: '',
    role: 'dpl',
    division: 'Dosen Pembimbing Lapangan (DPL)',
    token: 'KKN-PRG-DPL-00',
    invitedBy: 'Sistem KKN SPACE (Administrator)',
    status: 'pending',
    createdAt: '2026-07-01',
    expiresAt: '2026-08-30',
  },
];

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isDpl: boolean;
  canWrite: boolean;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  lookupInvitationToken: (token: string) => Promise<InvitationItem | null>;
  signUpWithInvitation: (
    token: string,
    email: string,
    pass: string,
    displayName?: string
  ) => Promise<void>;
  activateWithGoogle: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  createInvitation: (
    name: string,
    email: string,
    role: UserRole,
    division: string
  ) => Promise<string>;
  fetchInvitations: () => Promise<InvitationItem[]>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  updateMemberRole: (userId: string, newRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial bootstrap administrator email
const BOOTSTRAP_ADMIN_EMAILS = ['abhyy333@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile from Firestore or bootstrap admin
  const loadProfile = async (fbUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      const isBootstrapAdmin =
        BOOTSTRAP_ADMIN_EMAILS.includes(fbUser.email?.toLowerCase() || '');

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        // Ensure bootstrap admin maintains admin role
        if (isBootstrapAdmin && data.role !== 'admin') {
          await updateDoc(userDocRef, { role: 'admin' });
          await setDoc(doc(db, 'admins', fbUser.uid), { uid: fbUser.uid, email: fbUser.email });
          data.role = 'admin';
        }
        setProfile(data);
      } else {
        // Create initial profile for user
        const newProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Anggota KKN',
          role: isBootstrapAdmin ? 'admin' : 'member',
          division: isBootstrapAdmin ? 'Badan Pengurus Harian (BPH)' : 'Divisi Mahasiswa',
          photoURL: fbUser.photoURL || undefined,
        };

        await setDoc(userDocRef, {
          ...newProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (isBootstrapAdmin) {
          await setDoc(doc(db, 'admins', fbUser.uid), {
            uid: fbUser.uid,
            email: fbUser.email,
          });
        }

        setProfile(newProfile);
      }
    } catch (err) {
      console.error('Error loading or creating user profile:', err);
      // Fallback profile from auth
      setProfile({
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || 'Anggota KKN',
        role: BOOTSTRAP_ADMIN_EMAILS.includes(fbUser.email?.toLowerCase() || '') ? 'admin' : 'member',
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await loadProfile(cred.user);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await loadProfile(cred.user);
  };

  // Real-time lookup of token for instant validation in UI
  const lookupInvitationToken = async (rawToken: string): Promise<InvitationItem | null> => {
    const cleanToken = rawToken.trim().toUpperCase();
    if (!cleanToken) return null;

    try {
      const invQuery = query(
        collection(db, 'invitations'),
        where('token', '==', cleanToken),
        where('status', '==', 'pending')
      );
      const invSnap = await getDocs(invQuery);
      if (!invSnap.empty) {
        return invSnap.docs[0].data() as InvitationItem;
      }
    } catch (err) {
      console.warn('Firestore lookup warning, checking pre-seeded list:', err);
    }

    // Fallback to pre-seeded list
    const found = PRE_SEEDED_TEAM_INVITATIONS.find(
      (inv) => inv.token === cleanToken && inv.status === 'pending'
    );
    return found || null;
  };

  // Invitation-only registration flow with Email & Password
  const signUpWithInvitation = async (
    token: string,
    email: string,
    pass: string,
    displayName?: string
  ) => {
    const trimmedEmail = email.trim().toLowerCase();
    const cleanToken = token.trim().toUpperCase();

    // 1. Verify invitation validity
    const invData = await lookupInvitationToken(cleanToken);
    if (!invData) {
      throw new Error('Kode undangan tidak valid atau sudah digunakan.');
    }

    if (invData.email && invData.email.toLowerCase() !== trimmedEmail) {
      throw new Error(`Kode undangan ini dikhususkan untuk email: ${invData.email}`);
    }

    // 2. Create Firebase Auth user with the user's authentic credentials
    const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
    const resolvedName = displayName?.trim() || invData.name || 'Anggota KKN';
    await updateProfile(cred.user, { displayName: resolvedName });

    // 3. Create Firestore profile with the server-assigned invitation role (No self-assignment)
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: trimmedEmail,
      displayName: resolvedName,
      role: invData.role,
      division: invData.division,
    };

    await setDoc(doc(db, 'users', cred.user.uid), {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (newProfile.role === 'admin') {
      await setDoc(doc(db, 'admins', cred.user.uid), {
        uid: cred.user.uid,
        email: trimmedEmail,
      });
    }

    // 4. Mark invitation as accepted
    try {
      await setDoc(
        doc(db, 'invitations', invData.id),
        {
          ...invData,
          status: 'accepted',
          email: trimmedEmail,
          acceptedAt: serverTimestamp(),
          acceptedByUid: cred.user.uid,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Invitation status update notice:', err);
    }

    setProfile(newProfile);
  };

  // Activation with Google Sign-In and Invitation Token
  const activateWithGoogle = async (token: string) => {
    const cleanToken = token.trim().toUpperCase();
    const invData = await lookupInvitationToken(cleanToken);
    if (!invData) {
      throw new Error('Kode undangan tidak valid atau sudah digunakan.');
    }

    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const googleUser = cred.user;
    const realEmail = googleUser.email?.toLowerCase() || '';

    if (invData.email && invData.email.toLowerCase() !== realEmail) {
      throw new Error(`Kode undangan ini terdaftar untuk: ${invData.email}, akun Google Anda adalah: ${realEmail}`);
    }

    const resolvedName = invData.name || googleUser.displayName || 'Anggota KKN';

    const newProfile: UserProfile = {
      uid: googleUser.uid,
      email: realEmail,
      displayName: resolvedName,
      role: invData.role,
      division: invData.division,
      photoURL: googleUser.photoURL || undefined,
    };

    await setDoc(doc(db, 'users', googleUser.uid), {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (newProfile.role === 'admin') {
      await setDoc(doc(db, 'admins', googleUser.uid), {
        uid: googleUser.uid,
        email: realEmail,
      });
    }

    try {
      await setDoc(
        doc(db, 'invitations', invData.id),
        {
          ...invData,
          status: 'accepted',
          email: realEmail,
          acceptedAt: serverTimestamp(),
          acceptedByUid: googleUser.uid,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Invitation update notice:', err);
    }

    setProfile(newProfile);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  // Admin Invitation Management
  const createInvitation = async (
    targetName: string,
    targetEmail: string,
    assignedRole: UserRole,
    targetDivision: string
  ): Promise<string> => {
    if (!profile || profile.role !== 'admin') {
      throw new Error('Hanya administrator berwenang yang dapat menerbitkan undangan.');
    }

    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const token = `KKN-PRG-${randomSuffix}`;
    const id = `inv-${Date.now()}`;

    const newInvitation: InvitationItem = {
      id,
      name: targetName.trim(),
      email: targetEmail.trim().toLowerCase(),
      role: assignedRole,
      division: targetDivision,
      token,
      invitedBy: profile.displayName || profile.email,
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };

    try {
      await setDoc(doc(db, 'invitations', id), newInvitation);
      return token;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invitations/${id}`);
      return token;
    }
  };

  const fetchInvitations = async (): Promise<InvitationItem[]> => {
    try {
      const q = query(collection(db, 'invitations'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docs = snap.docs.map((d) => d.data() as InvitationItem);
        // Combine with pre-seeded if not in Firestore
        const combined = [...docs];
        for (const pre of PRE_SEEDED_TEAM_INVITATIONS) {
          if (!combined.some((item) => item.token === pre.token || item.id === pre.id)) {
            combined.push(pre);
          }
        }
        return combined;
      }
    } catch (err) {
      console.warn('Cannot fetch invitations from cloud, using authentic pre-seeded list:', err);
    }
    return PRE_SEEDED_TEAM_INVITATIONS;
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!profile || profile.role !== 'admin') {
      throw new Error('Hanya administrator yang dapat mencabut undangan.');
    }
    try {
      await updateDoc(doc(db, 'invitations', invitationId), { status: 'revoked' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `invitations/${invitationId}`);
    }
  };

  const updateMemberRole = async (userId: string, newRole: UserRole) => {
    if (!profile || profile.role !== 'admin') {
      throw new Error('Hanya administrator yang dapat mengubah hak akses anggota.');
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });

      if (newRole === 'admin') {
        await setDoc(doc(db, 'admins', userId), { uid: userId });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const role = profile?.role || 'viewer';
  const isAdmin = role === 'admin';
  const isDpl = role === 'dpl';
  const canWrite = !!user && role !== 'dpl' && role !== 'viewer';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isDpl,
        canWrite,
        loading,
        signInWithEmail,
        signInWithGoogle,
        lookupInvitationToken,
        signUpWithInvitation,
        activateWithGoogle,
        signOut,
        createInvitation,
        fetchInvitations,
        revokeInvitation,
        updateMemberRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
