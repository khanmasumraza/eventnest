import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';



function OrganizerPayouts() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

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

  // Calculate payout stats
  const payoutStats = useMemo(() => {
    const totalRevenue = events.reduce((sum, e) => sum + ((e.registered || 0) * (e.price || 0)), 0);
    const platformFee = totalRevenue * 0.1; // 10% platform fee
    const netEarnings = totalRevenue - platformFee;
    const pendingPayout = netEarnings * 0.3; // 30% pending

    return {
      totalRevenue,
      platformFee,
      netEarnings,
      pendingPayout,
      availablePayout: netEarnings - pendingPayout,
    };
  }, [events]);

  // Mock withdrawal history
  const withdrawalHistory = [
    { id: 1, amount: 5000, date: '2024-01-15', status: 'Completed' },
    { id: 2, amount: 3500, date: '2024-01-01', status: 'Completed' },
    { id: 3, amount: 7500, date: '2023-12-15', status: 'Completed' },
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleWithdraw = () => {
    alert('Withdrawal request submitted! This feature is coming soon.');
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
          <h1 className="text-[28px] font-semibold text-[#E5E7EB]">Payouts</h1>
          <p className="text-[14px] text-[#9CA3AF] mt-1">Manage your earnings and withdrawals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(payoutStats.totalRevenue), icon: '💰' },
            { label: 'Platform Fee', value: formatCurrency(payoutStats.platformFee), icon: '📋' },
            { label: 'Net Earnings', value: formatCurrency(payoutStats.netEarnings), icon: '✅' },
            { label: 'Pending Payout', value: formatCurrency(payoutStats.pendingPayout), icon: '⏳' },
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

        {/* Withdraw Section */}
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-medium">Available for Withdrawal</h2>
              <p className="text-[14px] text-[#9CA3AF] mt-1">
                {formatCurrency(payoutStats.availablePayout)} available
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={payoutStats.availablePayout < 1000}
              className="h-10 px-6 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Withdraw Funds
            </button>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#1F2937]">
            <h2 className="text-[18px] font-medium">Withdrawal History</h2>
          </div>
          
          {withdrawalHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1F2937]">
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Date</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Amount</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalHistory.map((withdrawal) => (
                    <tr key={withdrawal.id} className="border-b border-[#1F2937] hover:bg-[#1F2937]/30 transition-colors">
                      <td className="py-4 px-6">
                        <p className="text-[14px] text-[#E5E7EB]">
                          {new Date(withdrawal.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric' 
                          })}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-[14px] text-[#E5E7EB] font-medium">
                          {formatCurrency(withdrawal.amount)}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#22C55E]/20 text-[#22C55E]">
                          {withdrawal.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-[14px] text-[#9CA3AF]">No withdrawal history yet</p>
            </div>
          )}
        </div>

        {/* Empty State */}
        {events.length === 0 && (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#6366F1]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-medium mb-2">No payouts yet</h3>
            <p className="text-[14px] text-[#9CA3AF]">Create events and sell tickets to earn revenue</p>
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

export default OrganizerPayouts;

