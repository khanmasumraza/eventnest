import { motion } from 'framer-motion'

function Skeleton({
  className = '',
  variant = 'rect',
  width,
  height,
  animation = 'pulse',
}) {
  const variants = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4',
  }

  const animations = {
    pulse: {
      opacity: [0.5, 1, 0.5],
    },
    wave: {
      x: [-100, 100],
    },
  }

  return (
    <motion.div
      className={`
        bg-border
        ${variants[variant]}
        ${className}
      `}
      style={{ width, height }}
      animate={animations[animation]}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

// Skeleton Card Component
Skeleton.Card = function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="rect" width={120} height={20} />
        <Skeleton variant="circle" width={32} height={32} />
      </div>
      <Skeleton variant="text" width="60%" height={32} className="mb-2" />
      <Skeleton variant="text" width="40%" height={16} />
    </div>
  )
}

// Skeleton Table Row
Skeleton.TableRow = function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <Skeleton variant="text" width="80%" height={16} />
        </td>
      ))}
    </tr>
  )
}

// Skeleton Table Component
Skeleton.Table = function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="text-left py-3 px-4">
                <Skeleton variant="text" width={80} height={16} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton.TableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Skeleton Stats Grid
Skeleton.StatsGrid = function SkeletonStatsGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.Card key={i} />
      ))}
    </div>
  )
}

// Skeleton List
Skeleton.List = function SkeletonList({ items = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <Skeleton variant="circle" width={40} height={40} />
          <div className="flex-1">
            <Skeleton variant="text" width="60%" height={16} className="mb-1" />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton Chart
Skeleton.Chart = function SkeletonChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton variant="rect" width={150} height={24} />
        <Skeleton variant="rect" width={100} height={32} />
      </div>
      <div className="flex items-end justify-between gap-2 h-48">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rect"
            width="12%"
            height={`${Math.random() * 60 + 20}%`}
          />
        ))}
      </div>
    </div>
  )
}

export default Skeleton

