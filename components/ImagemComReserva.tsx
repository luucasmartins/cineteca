'use client'

type Props = { src: string | null; reserva: string; alt: string; className?: string }

export function ImagemComReserva({ src, reserva, alt, className }: Props) {
  return (
    <img
      src={src ?? reserva}
      alt={alt}
      loading="lazy"
      className={className}
      onError={(e) => {
        const img = e.currentTarget
        if (!img.src.endsWith(reserva)) img.src = reserva
      }}
    />
  )
}
