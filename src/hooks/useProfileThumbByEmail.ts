import { useEffect, useState } from 'react';

const PROFILE_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";
const PROFILE_THUMB_STORAGE_KEY = 'profileThumbByEmailCache.v1';

let profileThumbCache: Record<string, string> | null = null;
let inflightRequest: Promise<Record<string, string>> | null = null;

const pickPicture = (row: any) => {
  return String(
    row.ProfilePicture ||
      row.profilePicture ||
      row.Picture ||
      row.picture ||
      row.UserPicture ||
      row.userPicture ||
      ''
  ).trim();
};

// Profile_Pictures sheet uses the default Apps Script schema
// (id, tanggal, keterangan, kategori, type, ...). The picture URL is
// stored in `keterangan`, the email key in `kategori`, with type marker
// 'profile_picture'. Pull email/picture from those columns first; fall
// back to the rich-schema columns if they ever get added later.
const pickProfilePictureRow = (row: any): { email: string; picture: string } | null => {
  const type = String(row.type || row.Type || '').trim().toLowerCase();
  const isMarkedProfilePic = type === 'profile_picture';
  const idStr = String(row.ID || row.id || '');
  const looksLikeProfilePicId = /^pic-/i.test(idStr);

  if (!isMarkedProfilePic && !looksLikeProfilePicId) return null;

  const emailFromKategori = String(row.kategori || row.Kategori || '').trim().toLowerCase();
  const emailFromTyped = String(row.Email || row.email || '').trim().toLowerCase();
  const pictureFromKeterangan = String(row.keterangan || row.Keterangan || '').trim();
  const pictureFromTyped = pickPicture(row);

  const email = emailFromKategori || emailFromTyped;
  const picture = pictureFromKeterangan || pictureFromTyped;
  if (!email || !picture) return null;
  if (!/^https?:\/\//i.test(picture)) return null;
  return { email, picture };
};

const parseRowTimestamp = (row: any): number => {
  const raw = String(row.tanggal || row.Tanggal || row.Timestamp || row.timestamp || '').trim();
  if (raw) {
    const localeMatch = raw.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:,\s*|\s+)(\d{1,2})[.:](\d{1,2})[.:](\d{1,2})$/
    );
    if (localeMatch) {
      const day = parseInt(localeMatch[1], 10) || 1;
      const month = (parseInt(localeMatch[2], 10) || 1) - 1;
      const yearRaw = parseInt(localeMatch[3], 10) || 0;
      const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
      const hour = parseInt(localeMatch[4], 10) || 0;
      const minute = parseInt(localeMatch[5], 10) || 0;
      const second = parseInt(localeMatch[6], 10) || 0;
      return new Date(year, month, day, hour, minute, second).getTime();
    }
    const direct = new Date(raw).getTime();
    if (!Number.isNaN(direct)) return direct;
  }
  const id = String(row.ID || row.id || '');
  const idMatch = id.match(/^LOG-(\d+)-/i);
  if (idMatch) return Number(idMatch[1]) || 0;
  return 0;
};

const readCachedThumbMap = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_THUMB_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeCachedThumbMap = (map: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_THUMB_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
};

const fetchProfileThumbMap = async (forceRefresh = false) => {
  if (!forceRefresh && profileThumbCache) return profileThumbCache;
  if (inflightRequest) return inflightRequest;

  inflightRequest = (async () => {
    try {
      const [profileResp, logResp] = await Promise.all([
        fetch(`${PROFILE_API_URL}?sheetName=Profile_Pictures`).catch(() => null),
        fetch(`${PROFILE_API_URL}?sheetName=Log_Akses`).catch(() => null),
      ]);

      const profileData = profileResp ? await profileResp.json().catch(() => null) : null;
      const logData = logResp ? await logResp.json().catch(() => null) : null;

      const latestByEmail = new Map<string, { picture: string; ts: number }>();

      const ingestProfileSheet = (rows: any, baseTs: number) => {
        if (!Array.isArray(rows)) return;
        rows.forEach((row: any) => {
          const parsed = pickProfilePictureRow(row);
          if (!parsed) return;
          const ts = parseRowTimestamp(row) || baseTs;
          const existing = latestByEmail.get(parsed.email);
          if (!existing || ts >= existing.ts) {
            latestByEmail.set(parsed.email, { picture: parsed.picture, ts });
          }
        });
      };

      const ingestLogSheet = (rows: any, baseTs: number) => {
        if (!Array.isArray(rows)) return;
        rows.forEach((row: any) => {
          const email = String(row.Email || row.email || '').trim().toLowerCase();
          if (!email) return;
          const picture = pickPicture(row);
          if (!picture || !/^https?:\/\//i.test(picture)) return;
          const ts = parseRowTimestamp(row) || baseTs;
          const existing = latestByEmail.get(email);
          if (!existing || ts >= existing.ts) {
            latestByEmail.set(email, { picture, ts });
          }
        });
      };

      // Profile_Pictures takes priority via larger base timestamp
      ingestProfileSheet(profileData, Number.MAX_SAFE_INTEGER - 1);
      ingestLogSheet(logData, 0);

      const persisted = readCachedThumbMap();
      const map: Record<string, string> = { ...persisted };
      latestByEmail.forEach((value, email) => {
        map[email] = value.picture;
      });

      writeCachedThumbMap(map);
      profileThumbCache = map;
      return map;
    } catch (error) {
      console.error("Profile thumbs fetch error:", error);
      profileThumbCache = readCachedThumbMap();
      return profileThumbCache;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
};

export const upsertProfileThumbForEmail = (email: string, picture: string) => {
  const key = String(email || '').trim().toLowerCase();
  if (!key || !picture) return;
  const persisted = readCachedThumbMap();
  persisted[key] = picture;
  writeCachedThumbMap(persisted);
  if (profileThumbCache) {
    profileThumbCache = { ...profileThumbCache, [key]: picture };
  }
};

export const useProfileThumbByEmail = () => {
  const [profileThumbByEmail, setProfileThumbByEmail] = useState<Record<string, string>>(
    () => profileThumbCache || readCachedThumbMap()
  );

  useEffect(() => {
    let isMounted = true;

    fetchProfileThumbMap(true).then((map) => {
      if (!isMounted) return;
      setProfileThumbByEmail(map);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return profileThumbByEmail;
};

export const getDefaultAvatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;

export const resolveAvatarUrl = ({
  name,
  email,
  directPhoto,
  profileThumbByEmail
}: {
  name: string;
  email?: string;
  directPhoto?: string;
  profileThumbByEmail?: Record<string, string>;
}) => {
  const byEmail = email ? profileThumbByEmail?.[email.toLowerCase()] : '';
  return byEmail || directPhoto || getDefaultAvatarUrl(name);
};
