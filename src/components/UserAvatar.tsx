import type { CSSProperties } from 'react';
import { getDefaultAvatarUrl, resolveAvatarUrl, useProfileThumbByEmail } from '../hooks/useProfileThumbByEmail';
import { getCurrentUser } from '../data/organization';

interface UserAvatarProps {
  name: string;
  email?: string;
  photoUrl?: string;
  profileThumbByEmail?: Record<string, string>;
  size?: number;
  style?: CSSProperties;
  imgStyle?: CSSProperties;
  border?: string;
  background?: string;
}

const UserAvatar = ({
  name,
  email,
  photoUrl,
  profileThumbByEmail: providedMap,
  size = 32,
  style,
  imgStyle,
  border = '1px solid var(--border-subtle)',
  background = 'var(--bg-primary)'
}: UserAvatarProps) => {
  const currentUser = getCurrentUser();
  const loggedInPic = localStorage.getItem('userPicture');
  const loggedInEmail = localStorage.getItem('userEmail')?.toLowerCase() || '';
  const globalThumbMap = useProfileThumbByEmail();

  const activeThumbMap = {
    ...globalThumbMap,
    ...(providedMap || {})
  };

  const normalizedEmail = email?.toLowerCase() || '';
  const normalizedCurrentEmail = currentUser?.email?.toLowerCase() || '';
  const normalizedName = name?.trim().toLowerCase() || '';
  const normalizedCurrentName = currentUser?.nama?.trim().toLowerCase() || '';
  const isSelf = Boolean(
    currentUser &&
      ((normalizedEmail && (normalizedEmail === normalizedCurrentEmail || normalizedEmail === loggedInEmail)) ||
        (normalizedName && normalizedCurrentName && normalizedCurrentName.includes(normalizedName)))
  );
  const finalPhotoUrl = isSelf && loggedInPic ? loggedInPic : photoUrl;

  const src = resolveAvatarUrl({
    name,
    email,
    directPhoto: finalPhotoUrl,
    profileThumbByEmail: activeThumbMap
  });

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        border,
        background,
        flexShrink: 0,
        ...style
      }}
    >
      <img
        src={src}
        alt={name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', ...imgStyle }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = getDefaultAvatarUrl(name);
        }}
      />
    </div>
  );
};

export default UserAvatar;
