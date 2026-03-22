import React from 'react'

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f9] px-4">
      {children}
    </div>
  )
}
