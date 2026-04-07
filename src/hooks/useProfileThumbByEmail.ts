import { useEffect, useState } from 'react';

const PROFILE_API_URL = "https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec";

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

const fetchProfileThumbMap = async (forceRefresh = false) => {
  if (!forceRefresh && profileThumbCache) return profileThumbCache;
  if (inflightRequest) return inflightRequest;

  inflightRequest = (async () => {
    try {
      const resp = await fetch(`${PROFILE_API_URL}?sheetName=Log_Akses`);
      const data = await resp.json();
      if (!data || !Array.isArray(data)) {
        profileThumbCache = {};
        return profileThumbCache;
      }

      const map: Record<string, string> = {};
      data.forEach((row: any) => {
        const email = String(row.Email || row.email || '').trim().toLowerCase();
        if (!email) return;
        const picture = pickPicture(row);
        if (picture) map[email] = picture;
      });

      profileThumbCache = map;
      return map;
    } catch (error) {
      console.error("Profile thumbs fetch error:", error);
      profileThumbCache = {};
      return profileThumbCache;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
};

export const useProfileThumbByEmail = () => {
  const [profileThumbByEmail, setProfileThumbByEmail] = useState<Record<string, string>>(profileThumbCache || {});

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
