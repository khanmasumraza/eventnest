import { motion } from 'framer-motion'

function Card({
  children,
  className = '',
  hover = false,
  elevated = false,
  surface = false,
  onClick,
  ...props
}) {
  const baseClasses = 'rounded-xl p-6 border'
  
  const variantClasses = elevated
    ? 'bg-card border-border shadow-lg'
    : surface
    ? 'bg-[#0B1220] border-[#1F2937]'
    : 'bg-card border-border'
  
  const hoverClasses = hover
    ? 'hover:border-primary/50 hover:shadow-glow cursor-pointer transition-all duration-300'
    : ''
  
  const clickableClasses = onClick ? 'cursor-pointer' : ''

  const CardComponent = onClick ? motion.div : 'div'

  const motionProps = onClick
    ? {
        whileHover: { y: -4 },
        transition: { duration: 0.2 },
      }
    : {}

  return (
    <CardComponent
      className={`${baseClasses} ${variantClasses} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </CardComponent>
  )
}

// Card Header Component
Card.Header = function CardHeader({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  )
}

// Card Title Component
Card.Title = function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-lg font-semibold text-text-primary ${className}`}>
      {children}
    </h3>
  )
}

// Card Description Component
Card.Description = function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-text-secondary mt-1 ${className}`}>
      {children}
    </p>
  )
}

// Card Content Component
Card.Content = function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>
}

// Card Footer Component
Card.Footer = function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-border ${className}`}>
      {children}
    </div>
  )
}

export default Card

