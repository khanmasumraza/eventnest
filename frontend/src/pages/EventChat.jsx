import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChatBox from '../components/Chat/ChatBox';
import api from '../utils/api';
import EventCard from '../components/EventCard';

const API_URL = 'http://localhost:5000/api';

function EventChat() {
  console.log("🧭 EventChat loaded");
  console.log("🧭 Route params:", useParams());
  const { eventId } = useParams();
  console.log("eventId:", eventId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected, joinChat } = useSocket();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const scrollRef = useRef();

  useEffect(() => {
    if (!eventId) {
      setError('No event ID');
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${eventId}`);
        setEvent(res.data.event || res.data);
      } catch (err) {
        setError('Event not found');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (socket && connected && eventId && user?.id) {
      joinChat({ eventId, userId: user.id });
    }
  }, [socket, connected, eventId, user]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [event]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-[calc(100vh-88px)]">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-[calc(100vh-88px)]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Chat not available</h2>
          <p className="text-gray-400 mb-4">Event not found or access denied</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-h-[calc(100vh-88px)] max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-slate-800 p-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors -ml-2"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-white truncate">{event.title}</h1>
            <p className="text-sm text-gray-400">Chat with organizer • {connected ? 'Online' : 'Connecting...'}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 space-y-4 pb-24">
          <ChatBox 
            eventId={eventId} 
            receiverId={event?.organiser}
            fullPage={true}
            scrollToBottom={scrollToBottom}
          />
          <div ref={scrollRef} />
        </div>
      </div>
    </div>
  );
}

export default EventChat;

