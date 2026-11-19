interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  inverted?: boolean;
}

export function Logo({ size = 32, showWordmark = true, inverted = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          width="64"
          height="64"
          rx="16"
          fill={inverted ? '#F4F1EA' : '#2F3E34'}
        />
        <rect
          x="6"
          y="6"
          width="52"
          height="52"
          rx="11"
          stroke="#C9A24B"
          strokeOpacity={inverted ? '0.55' : '0.35'}
          strokeWidth="1.5"
        />
        <path
          d="M22 18H42V23C42 28.5 36.5 31.2 32 32C27.5 31.2 22 28.5 22 23V18Z"
          stroke={inverted ? '#2F3E34' : '#F4F1EA'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M22 46H42V41C42 35.5 36.5 32.8 32 32C27.5 32.8 22 35.5 22 41V46Z"
          stroke={inverted ? '#2F3E34' : '#F4F1EA'}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="32" r="4" fill="#C9A24B" />
        <path d="M18 18H46" stroke="#C9A24B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M18 46H46" stroke="#C9A24B" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {showWordmark && (
        <span
          className={`text-lg font-semibold tracking-[-0.02em] ${
            inverted ? 'text-[#F4F1EA]' : 'text-[#2F3E34]'
          }`}
        >
          Sertyme
        </span>
      )}
    </span>
  );
}
