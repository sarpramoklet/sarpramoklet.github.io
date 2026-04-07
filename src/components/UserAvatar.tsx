import type { CSSProperties } from 'react';
import { getDefaultAvatarUrl, resolveAvatarUrl } from '../hooks/useProfileThumbByEmail';

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
  profileThumbByEmail,
  size = 32,
  style,
  imgStyle,
  border = '1px solid var(--border-subtle)',
  background = 'var(--bg-primary)'
}: UserAvatarProps) => {
  const src = resolveAvatarUrl({
    name,
    email,
    directPhoto: photoUrl,
    profileThumbByEmail
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

