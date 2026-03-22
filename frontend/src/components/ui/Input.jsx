function Input({
  label,
  error,
  className = '',
  id,
  type = 'text',
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary mb-2"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`
          w-full bg-[#0B1220] border border-border rounded-lg
          px-4 py-2.5 text-text-primary
          placeholder-text-secondary
          focus:outline-none focus:ring-1
          transition-all duration-200
          ${error
            ? 'border-danger focus:border-danger focus:ring-danger/50'
            : 'border-border focus:border-primary focus:ring-primary/50'
          }
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      )}
    </div>
  )
}

// Textarea Component
function Textarea({
  label,
  error,
  className = '',
  id,
  rows = 4,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary mb-2"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={`
          w-full bg-[#0B1220] border border-border rounded-lg
          px-4 py-2.5 text-text-primary
          placeholder-text-secondary
          focus:outline-none focus:ring-1
          transition-all duration-200
          resize-none
          ${error
            ? 'border-danger focus:border-danger focus:ring-danger/50'
            : 'border-border focus:border-primary focus:ring-primary/50'
          }
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      )}
    </div>
  )
}

// Select Component
function Select({
  label,
  error,
  options = [],
  className = '',
  id,
  placeholder,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary mb-2"
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`
          w-full bg-[#0B1220] border border-border rounded-lg
          px-4 py-2.5 text-text-primary
          focus:outline-none focus:ring-1
          transition-all duration-200
          ${error
            ? 'border-danger focus:border-danger focus:ring-danger/50'
            : 'border-border focus:border-primary focus:ring-primary/50'
          }
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" className="text-text-secondary">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      )}
    </div>
  )
}

export { Input, Textarea, Select }
export default Input

