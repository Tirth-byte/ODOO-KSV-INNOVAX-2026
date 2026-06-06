import React from 'react';

export function LogoIcon({ size = 32, white = false }: { size?: number, white?: boolean }) {
  const color = white ? '#FFFFFF' : '#F97316'
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background rounded square */}
      <rect width="44" height="44" rx="10" fill={white ? 'rgba(255,255,255,0.15)' : '#FFF7ED'}/>
      {/* Bridge cable arc - thick main */}
      <path d="M7 28 Q22 8 37 28" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
      {/* Left tower */}
      <rect x="9" y="22" width="4" height="14" rx="2" fill={color}/>
      {/* Right tower */}
      <rect x="31" y="22" width="4" height="14" rx="2" fill={color}/>
      {/* Suspender 1 */}
      <line x1="15" y1="18" x2="15" y2="28" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      {/* Suspender 2 */}
      <line x1="22" y1="11" x2="22" y2="28" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      {/* Suspender 3 */}
      <line x1="29" y1="18" x2="29" y2="28" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      {/* Road deck */}
      <rect x="6" y="30" width="32" height="4" rx="2" fill={color}/>
      {/* Top node circle */}
      <circle cx="22" cy="11" r="3.5" fill={color}/>
      <circle cx="22" cy="11" r="1.5" fill={white ? 'rgba(255,255,255,0.3)' : '#FFF7ED'}/>
    </svg>
  )
}

export function LogoWordmark({ white = false, size = 'md' }: { white?: boolean, size?: 'sm'|'md'|'lg' }) {
  const sizes = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl' }
  const subSizes = { sm: 'text-[8px]', md: 'text-[9px]', lg: 'text-[10px]' }
  return (
    <div className="flex flex-col leading-none">
      <div className={`${sizes[size]} font-black tracking-tight leading-none`}>
        <span className={white ? 'text-white' : 'text-gray-900'}>Vendor</span>
        <span className={white ? 'text-white/80' : 'text-orange-500'}>Bridge</span>
      </div>
      <span className={`${subSizes[size]} font-semibold tracking-[0.2em] uppercase mt-1 ${white ? 'text-white/50' : 'text-gray-400'}`}>
        Enterprise Suite
      </span>
    </div>
  )
}

export function LogoFull({ white = false, iconSize = 44, wordSize = 'md' }: { white?: boolean, iconSize?: number, wordSize?: 'sm'|'md'|'lg' }) {
  return (
    <div className="flex items-center gap-3">
      <LogoIcon size={iconSize} white={white} />
      <LogoWordmark white={white} size={wordSize} />
    </div>
  )
}
