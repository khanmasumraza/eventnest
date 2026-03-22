const variants = {
  primary: 'bg-primary/20 text-primary',
  secondary: 'bg-secondary/20 text-secondary',
  accent: 'bg-accent/20 text-accent',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-danger/20 text-danger',
  default: 'bg-white/10 text-text-secondary',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
}

function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full
            ${variant === 'success' ? 'bg-success' : ''}
            ${variant === 'warning' ? 'bg-warning' : ''}
            ${variant === 'danger' ? 'bg-danger' : ''}
            ${variant === 'primary' ? 'bg-primary' : ''}
            ${variant === 'secondary' ? 'bg-secondary' : ''}
            ${variant === 'accent' ? 'bg-accent' : ''}
            ${variant === 'default' ? 'bg-text-secondary' : ''}
          `}
        />
      )}
      {children}
    </span>
  )
}

// Status Badge Helper
Badge.Status = function StatusBadge({ status }) {
  const statusConfig = {
    upcoming: { variant: 'primary', label: 'Upcoming', dot: true },
    ongoing: { variant: 'success', label: 'Ongoing', dot: true },
    completed: { variant: 'secondary', label: 'Completed', dot: true },
    cancelled: { variant: 'danger', label: 'Cancelled', dot: true },
    draft: { variant: 'default', label: 'Draft', dot: true },
    active: { variant: 'success', label: 'Active', dot: true },
    inactive: { variant: 'danger', label: 'Inactive', dot: true },
    pending: { variant: 'warning', label: 'Pending', dot: true },
    confirmed: { variant: 'success', label: 'Confirmed', dot: true },
    paid: { variant: 'success', label: 'Paid', dot: true },
    free: { variant: 'accent', label: 'Free', dot: true },
  }

  const config = statusConfig[status?.toLowerCase()] || {
    variant: 'default',
    label: status,
    dot: false,
  }

  return (
    <Badge variant={config.variant} dot={config.dot}>
      {config.label}
    </Badge>
  )
}

// Price Badge Helper
Badge.Price = function PriceBadge({ price }) {
  if (price === 0 || price === '0') {
    return <Badge variant="accent">Free</Badge>
  }
  return <Badge variant="primary">₹{Number(price).toLocaleString()}</Badge>
}

export default Badge

