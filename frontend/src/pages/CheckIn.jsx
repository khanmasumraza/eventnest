import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

function CheckIn() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'organiser') {
      navigate('/login');
      return;
    }
    fetchEvents();
    
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [user, navigate]);

  const fetchEvents = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${API_URL}/events/my-events`, config);
      setEvents(res.data || []);
      if (res.data?.length > 0) {
        setSelectedEvent(res.data[0]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const startScanning = async () => {
    if (!scannerRef.current) return;
    
    try {
      setScanning(true);
      setError(null);
      setResult(null);
      
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
      }
      
      html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);
      
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Stop scanning after successful detection
          await handleScan(decodedText);
        },
        () => {} // Ignore errors during scanning
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setError('Failed to start camera. Please ensure camera permissions are granted.');
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  const handleScan = async (ticketId) => {
    try {
      // Stop scanning temporarily
      await stopScanning();
      
      setLastScanned(ticketId);
      
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post(
        `${API_URL}/events/checkin`,
        { ticketId },
        config
      );
      
      setResult({
        success: true,
        ...res.data
      });
      
      // Auto-clear result after 5 seconds
      setTimeout(() => {
        setResult(null);
        setLastScanned(null);
      }, 5000);
      
    } catch (err) {
      console.error('Check-in error:', err);
      setResult({
        success: false,
        message: err.response?.data?.message || 'Check-in failed'
      });
      
      // Auto-clear error after 3 seconds
      setTimeout(() => {
        setResult(null);
        setLastScanned(null);
      }, 3000);
    }
  };

  const handleManualCheckIn = async () => {
    const ticketId = prompt('Enter Ticket ID:');
    if (ticketId) {
      await handleScan(ticketId.trim());
    }
  };

  if (!user || user.role !== 'organiser') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-400">Only organizers can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/organiser"
              className="text-slate-400 hover:text-white"
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-2">QR Check-In</h1>
          <p className="text-slate-400">Scan attendee tickets to check in</p>
        </div>

        {/* Event Selector */}
        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-2">Select Event</label>
          <select
            value={selectedEvent?._id || ''}
            onChange={(e) => {
              const event = events.find(ev => ev._id === e.target.value);
              setSelectedEvent(event);
            }}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {events.map(event => (
              <option key={event._id} value={event._id}>
                {event.title} ({event.registered || 0} registered)
              </option>
            ))}
          </select>
        </div>

        {/* Scanner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <div 
            ref={scannerRef} 
            id="qr-scanner"
            className="w-full aspect-square bg-slate-800 rounded-lg overflow-hidden mb-4"
          >
            {!scanning && (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p>Click "Start Scanning" to begin</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`mb-4 p-6 rounded-lg text-center ${
                  result.success 
                    ? 'bg-emerald-500/20 border border-emerald-500/30' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}
              >
                {result.success ? (
                  <>
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-emerald-400 mb-2">Check-In Successful!</h3>
                    <p className="text-white font-medium">{result.attendee?.name}</p>
                    <p className="text-slate-400 text-sm">{result.attendee?.email}</p>
                    <p className="text-slate-500 text-xs mt-2">{result.attendee?.event}</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Check-In Failed</h3>
                    <p className="text-white">{result.message}</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex gap-4">
            {!scanning ? (
              <button
                onClick={startScanning}
                disabled={!selectedEvent}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Scanning
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition-colors"
              >
                Stop Scanning
              </button>
            )}
            
            <button
              onClick={handleManualCheckIn}
              className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
            >
              Manual
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold mb-4">How to use:</h3>
          <ol className="space-y-3 text-slate-400">
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
              <span>Select the event from the dropdown above</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
              <span>Click "Start Scanning" and allow camera access</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
              <span>Point the camera at the attendee's QR code</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-sm flex-shrink-0">4</span>
              <span>The system will automatically check them in</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default CheckIn;

