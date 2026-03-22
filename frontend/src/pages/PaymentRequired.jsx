import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function PaymentRequired() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background flex items-center justify-center px-6 py-12"
    >
      <div className="max-w-md mx-auto text-center">
        <div className="w-24 h-24 bg-error/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <svg className="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Payment Required
        </h1>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Your ticket is not available until payment is verified. Complete payment or contact the organizer.
        </p>
        <div className="space-y-3">
          <Link 
            to="/dashboard" 
            className="w-full block py-3 px-6 bg-accent hover:bg-accent/90 rounded-xl font-semibold text-white text-center transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link 
            to="/explore" 
            className="w-full block py-3 px-6 bg-secondary hover:bg-secondary/80 rounded-xl font-semibold text-text-primary text-center transition-colors border border-border"
          >
            Browse Events
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default PaymentRequired

