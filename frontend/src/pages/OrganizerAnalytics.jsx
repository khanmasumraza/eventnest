import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';



function OrganizerAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('30');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'organizer') {
      navigate('/dashboard');
      return;
    }

    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
const res = await api.get('/events/my-events');
      setEvents(res.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalTickets = events.reduce((sum, e) => sum + (e.registered || 0), 0);
    const totalRevenue = events.reduce((sum, e) => sum + ((e.registered || 0) * (e.price || 0)), 0);
    const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const conversionRate = totalCapacity > 0 ? ((totalTickets / totalCapacity) * 100).toFixed(1) : 0;

    return {
      totalTickets,
      totalRevenue,
      totalCapacity,
      conversionRate,
      avgTicketPrice: totalTickets > 0 ? (totalRevenue / totalTickets).toFixed(0) : 0,
    };
  }, [events]);

  // Generate chart data
  const chartData = useMemo(() => {
    const days = parseInt(timeFilter);
    const now = new Date();
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Mock data
      const mockTickets = Math.floor(Math.random() * 15) + 1;
      const mockRevenue = mockTickets * (Math.floor(Math.random() * 500) + 200);

      data.push({
        date: dateStr,
        tickets: mockTickets,
        revenue: mockRevenue,
      });
    }

    return data;
  }, [timeFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <OrganizerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout>
      <div className="space-y-10">
        {/* Page Header */}
        <div>
          <h1 className="text-[28px] font-semibold text-[#E5E7EB]">Analytics</h1>
          <p className="text-[14px] text-[#9CA3AF] mt-1">Track your event performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tickets Sold', value: stats.totalTickets, icon: '🎫' },
            { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: '💰' },
            { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: '📊' },
            { label: 'Avg. Ticket Price', value: formatCurrency(stats.avgTicketPrice), icon: '💵' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-[#121826] border border-[#1F2937] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] text-[#9CA3AF]">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Ticket Sales Trend */}
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[18px] font-medium">Ticket Sales Trend</h2>
              <p className="text-[14px] text-[#9CA3AF]">Number of tickets sold over time</p>
            </div>
            <div className="flex gap-2">
              {['7', '30', '90'].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeFilter(days)}
                  className={`px-3 py-1.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${
                    timeFilter === days
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#0B0F19] text-[#9CA3AF] hover:text-[#E5E7EB] border border-[#1F2937]'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="h-64 flex items-end gap-1">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-[#6366F1] rounded-t transition-all duration-300 hover:brightness-110"
                  style={{ height: `${Math.max((data.tickets / 15) * 100, 4)}%` }}
                  title={`${data.tickets} tickets`}
                ></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[12px] text-[#6B7280]">
            <span>{chartData[0]?.date}</span>
            <span>{chartData[chartData.length - 1]?.date}</span>
          </div>
        </div>

        {/* Revenue Growth */}
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-[18px] font-medium">Revenue Growth</h2>
            <p className="text-[14px] text-[#9CA3AF]">Revenue generated over time</p>
          </div>

          {/* Simple Line Visualization */}
          <div className="h-48 relative">
            <div className="absolute inset-0 flex items-end gap-2">
              {chartData.map((data, idx) => {
                const maxRevenue = Math.max(...chartData.map(d => d.revenue));
                const height = (data.revenue / maxRevenue) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[#22C55E] rounded-t transition-all duration-300 opacity-80"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-[12px] text-[#6B7280]">
            <span>{chartData[0]?.date}</span>
            <span>{chartData[chartData.length - 1]?.date}</span>
          </div>
        </div>

        {/* Empty State */}
        {events.length === 0 && (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#6366F1]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-medium mb-2">No data yet</h3>
            <p className="text-[14px] text-[#9CA3AF]">Create events to see your analytics</p>
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

export default OrganizerAnalytics;

