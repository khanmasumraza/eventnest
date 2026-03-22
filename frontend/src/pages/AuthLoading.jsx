import { motion } from 'framer-motion'

const AuthLoading = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md mx-auto"
      >
        {/* Logo */}
        <motion.div 
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8"
        >
          <div className="text-6xl mx-auto w-24 h-24 bg-gradient-to-r from-accent to-accent-400 rounded-2xl flex items-center justify-center shadow-2xl mb-4">
            🎪
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent mb-4">
            EventNest
          </h1>
        </motion.div>

        {/* Loading text */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-3">
            Signing you in with Google...
          </h2>
          <p className="text-gray-400 text-sm md:text-base mb-8">
            Please wait while we verify your account and prepare your dashboard.
          </p>
        </motion.div>

        {/* Spinner */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full mx-auto mb-8"
        />

        <div className="space-y-1 text-xs text-gray-500">
          <p>• Securely connecting to Google</p>
          <p>• Fetching your profile</p>
          <p>• Loading EventNest dashboard</p>
        </div>
      </motion.div>
    </div>
  )
}

export default AuthLoading
