import { cn } from '@/lib/utils'

interface BgGradientProps {
  className?: string
  gradientFrom?: string
  gradientTo?: string
  gradientSize?: string
  gradientPosition?: string
  gradientStop?: string
}

export const BgGradient = ({
  className,
  gradientFrom = '#ffffff',
  gradientTo = '#003017',
  gradientSize = '90% 90%',
  gradientPosition = '60% 0%',
  gradientStop = '28%',
}: BgGradientProps) => {
  return (
    <div
      className={cn('absolute inset-0 w-full h-full -z-10', className)}
      style={{
        background: `radial-gradient(${gradientSize} at ${gradientPosition}, ${gradientFrom} ${gradientStop}, ${gradientTo} 100%)`,
      }}
    />
  )
}
