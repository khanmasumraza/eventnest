import React from 'react'
import { useAuth } from '../../context/AuthContext'

/* ============================================================ */
/* TICK ICONS — clean, theme-matched                            */
/* single gray = sent | double gray = delivered | double blue = seen */
/* ============================================================ */

const TickSent = () => (
  <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 4L4.5 7.5L11 1" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TickDelivered = () => (
  <svg width="18" height="9" viewBox="0 0 18 9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 4L4.5 7.5L11 1"  stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 4L10.5 7.5L17 1" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const TickSeen = () => (
  <svg width="18" height="9" viewBox="0 0 18 9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 4L4.5 7.5L11 1"  stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 4L10.5 7.5L17 1" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* ============================================================ */
/* MESSAGE BUBBLE */
/* ============================================================ */

const MessageBubble = ({ message, isOwn, isSystem, showAvatar, showName }) => {
  const { user } = useAuth()

  const sentAt = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const getStatusIcon = () => {
    if (!isOwn) return null
    if (message.status === 'seen')      return <TickSeen />
    if (message.status === 'delivered') return <TickDelivered />
    return <TickSent />
  }

  const getInitial = (name) => name?.[0]?.toUpperCase() || 'U'

  const getAvatarColor = (name) => {
    const colors = [
      'bg-pink-500', 'bg-yellow-500', 'bg-green-500',
      'bg-blue-500', 'bg-orange-500', 'bg-teal-500', 'bg-purple-500',
    ]
    return colors[(name?.charCodeAt(0) || 0) % colors.length]
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="bg-slate-700/60 text-gray-400 text-xs px-4 py-1.5 rounded-full">
          {message.message}
        </span>
      </div>
    )
  }

  const senderName = message.senderName || (isOwn ? user?.name : 'User')
  const isImage = message.type === 'image' || message.fileType?.startsWith('image/')
  const isFile = message.type === 'file' && !isImage

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} mb-1`}>

      {/* AVATAR */}
      <div className="w-7 flex-shrink-0 mb-1">
        {showAvatar && !isOwn && (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(senderName)}`}>
            {getInitial(senderName)}
          </div>
        )}
      </div>

      {/* BUBBLE */}
      <div className={`flex flex-col max-w-xs lg:max-w-sm ${isOwn ? 'items-end' : 'items-start'}`}>

        {showName && !isOwn && (
          <span className="text-xs text-gray-400 mb-1 ml-1">{senderName}</span>
        )}

        <div className={`px-4 py-2.5 shadow-md ${
          isOwn
            ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-slate-700 text-white rounded-2xl rounded-bl-sm'
        }`}>

          {/* IMAGE */}
          {isImage && message.fileUrl && (
            <img
              src={message.fileUrl}
              alt="sent"
              className="rounded-xl max-w-full mb-1 cursor-pointer"
              style={{ maxHeight: '200px' }}
              onClick={() => window.open(message.fileUrl, '_blank')}
            />
          )}

          {/* FILE */}
          {isFile && message.fileUrl && (
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl mb-1 hover:bg-white/20 transition"
            >
              <span className="text-xl">📎</span>
              <span className="text-xs truncate max-w-xs">
                {message.fileName || 'File'}
              </span>
            </a>
          )}

          {/* TEXT */}
          {message.message && (
            <p className="text-sm leading-relaxed break-words">{message.message}</p>
          )}

          {/* TIME + TICK */}
          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs opacity-50">{sentAt}</span>
            {getStatusIcon()}
          </div>

        </div>
      </div>
    </div>
  )
}

export default MessageBubble