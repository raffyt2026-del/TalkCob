import React, { useEffect, useState } from 'react';
import { AvatarDecorationId, UserStatus } from '../types/talkcob';
import { getAvatarDecorationMeta } from '../utils/nitro';
import { TalkcobIcon } from './TalkcobIcon';

interface AvatarProps {
  name: string;
  src?: string;
  accentColor: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: UserStatus;
  showStatus?: boolean;
  speaking?: boolean;
  statusBorderClass?: string;
  isCurrentUser?: boolean;
  decoration?: AvatarDecorationId;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

const STATUS_DOT_MAP = {
  xs: 'w-2 h-2 -bottom-0.5 -right-0.5 border',
  sm: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-2',
  md: 'w-3 h-3 -bottom-0.5 -right-0.5 border-2',
  lg: 'w-4 h-4 bottom-0 right-0 border-[3px]',
  xl: 'w-5 h-5 bottom-0.5 right-0.5 border-[3px]',
};

const STATUS_COLOR: Record<UserStatus, string> = {
  online: 'bg-[#23A55A]',
  idle: 'bg-[#F0B232]',
  dnd: 'bg-[#F23F43]',
  offline: 'bg-[#80848E]',
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  accentColor,
  size = 'md',
  status = 'online',
  showStatus = false,
  speaking = false,
  statusBorderClass = 'border-[#2B2D31]',
  isCurrentUser = false,
  decoration,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const deco = decoration && decoration !== 'none' ? getAvatarDecorationMeta(decoration) : null;

  return (
    <div className="relative inline-flex shrink-0 select-none">
      <div
        className={`${SIZE_MAP[size]} rounded-full overflow-hidden flex items-center justify-center font-display font-bold text-white transition-shadow duration-150 ${
          speaking
            ? 'ring-[2.5px] ring-[#23A55A] ring-offset-2 ring-offset-[#2B2D31]'
            : deco
            ? deco.ringStyle
            : ''
        }`}
        style={{ backgroundColor: accentColor }}
      >
        {src && !imgFailed ? (
          <img
            src={src}
            alt={`${name}'s avatar`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : isCurrentUser ? (
          <TalkcobIcon
            size={size === 'xl' ? 44 : size === 'lg' ? 32 : size === 'md' ? 24 : 18}
            animated={speaking}
            mascotColor="#FFFFFF"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {deco?.badgeText && (size === 'lg' || size === 'xl' || size === 'md') && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -top-1 -right-1 leading-none drop-shadow ${
            size === 'xl' ? 'text-base' : size === 'lg' ? 'text-sm' : 'text-[10px]'
          }`}
        >
          {deco.badgeText}
        </span>
      )}

      {showStatus && (
        <span
          aria-label={`Status: ${status}`}
          className={`absolute rounded-full ${STATUS_DOT_MAP[size]} ${STATUS_COLOR[status]} ${statusBorderClass}`}
        />
      )}
    </div>
  );
};
