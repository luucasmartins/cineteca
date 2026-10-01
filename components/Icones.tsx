type Props = { className?: string }

function base(className?: string) {
  return {
    className: className ?? 'h-5 w-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
}

export const IconeBusca = ({ className }: Props) => (
  <svg {...base(className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconeMenu = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export const IconeFechar = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconeSetaEsquerda = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)

export const IconeSetaDireita = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const IconeChevronBaixo = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconeInfo = ({ className }: Props) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
)

export const IconeMais = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconeCheck = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const IconePlay = ({ className }: Props) => (
  <svg {...base(className)} fill="currentColor" stroke="none">
    <path d="M7 4.5v15l13-7.5z" />
  </svg>
)

export const IconeCoracao = ({ className, preenchido = false }: Props & { preenchido?: boolean }) => (
  <svg {...base(className)} fill={preenchido ? 'currentColor' : 'none'}>
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.4 1 4.8 2.7 1.4-1.7 2.8-2.7 4.8-2.7 3.6 0 5.7 3.5 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
  </svg>
)

export const IconeCurti = ({ className, preenchido = false }: Props & { preenchido?: boolean }) => (
  <svg {...base(className)} fill={preenchido ? 'currentColor' : 'none'}>
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
)

export const IconeNaoCurti = ({ className, preenchido = false }: Props & { preenchido?: boolean }) => (
  <svg {...base(className)} fill={preenchido ? 'currentColor' : 'none'}>
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
)

export const IconeBolha = ({ className }: Props) => (
  <svg {...base(className)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M8.5 10a4 4 0 0 1 3-3" />
    <path d="M19 5l2-2M21 7h-1.5M17 3V1.5" />
  </svg>
)

export const IconeSom = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
  </svg>
)

export const IconeSomDesligado = ({ className }: Props) => (
  <svg {...base(className)}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </svg>
)
