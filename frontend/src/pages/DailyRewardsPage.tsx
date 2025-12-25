import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDailyRewardStore } from '@/stores/useDailyRewardStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function DailyRewardsPage() {
  const { status, isLoading, isClaiming, error, claimResult, fetchStatus, claimReward, clearClaimResult } = useDailyRewardStore();
  const { refreshProfile } = useAuthStore();
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Show celebration animation when claim is successful
  useEffect(() => {
    if (claimResult) {
      setShowCelebration(true);
      refreshProfile(); // Update user resources in header
      
      const timer = setTimeout(() => {
        setShowCelebration(false);
        clearClaimResult();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [claimResult, refreshProfile, clearClaimResult]);

  const handleClaim = async () => {
    try {
      await claimReward();
    } catch (err) {
      // Error is handled in store
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Celebration Overlay */}
      {showCelebration && claimResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl p-8 text-center transform animate-bounce-in">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-4">Day {claimResult.day} Reward!</h2>
            <div className="flex gap-6 justify-center mb-4">
              {claimResult.reward.gold > 0 && (
                <div className="text-2xl text-amber-100">
                  🪙 +{claimResult.reward.gold.toLocaleString()} Gold
                </div>
              )}
              {claimResult.reward.gems > 0 && (
                <div className="text-2xl text-yellow-100">
                  💎 +{claimResult.reward.gems} Gems
                </div>
              )}
            </div>
            <p className="text-amber-100">Come back tomorrow for Day {claimResult.nextDay}!</p>
          </div>
        </div>
      )}

      {/* Header */}
      <nav className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <Link to="/lobby" className="text-white text-3xl font-bold hover:text-purple-300 transition">
          ← Back to Lobby
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎁 Daily Rewards</h1>
          <p className="text-gray-300">Login every day to collect rewards!</p>
          {status && (
            <p className="text-yellow-400 mt-2">
              Total Claims: {status.totalClaims} | Gold Earned: {status.totalGoldEarned.toLocaleString()} | Gems Earned: {status.totalGemsEarned}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* 7-Day Reward Grid */}
        {status && (
          <div className="grid grid-cols-7 gap-3 mb-8">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const reward = status.allRewards[day];
              const isClaimed = status.claimedDays.includes(day);
              const isCurrentDay = status.currentDay === day && status.canClaim;
              
              let cardStyle = 'bg-white/5 border-white/10';
              if (isClaimed) {
                cardStyle = 'bg-green-600/30 border-green-500';
              } else if (isCurrentDay) {
                cardStyle = 'bg-yellow-500/30 border-yellow-400 ring-2 ring-yellow-400 animate-pulse';
              }

              return (
                <div
                  key={day}
                  className={`relative rounded-xl border-2 p-4 text-center transition-all ${cardStyle}`}
                >
                  {/* Day Label */}
                  <div className={`text-sm font-bold mb-2 ${isClaimed ? 'text-green-300' : isCurrentDay ? 'text-yellow-300' : 'text-gray-400'}`}>
                    Day {day}
                  </div>

                  {/* Reward Display */}
                  <div className="space-y-1">
                    <div className={`text-lg font-bold ${isClaimed ? 'text-green-200' : 'text-amber-300'}`}>
                      🪙 {reward.gold}
                    </div>
                    {reward.gems > 0 && (
                      <div className={`text-sm ${isClaimed ? 'text-green-200' : 'text-yellow-300'}`}>
                        💎 {reward.gems}
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  {isClaimed && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      ✓
                    </div>
                  )}
                  
                  {day === 7 && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                      Weekly Bonus!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Claim Button */}
        {status && (
          <div className="text-center">
            {status.canClaim ? (
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 
                           text-white text-2xl font-bold px-12 py-4 rounded-xl shadow-lg 
                           transform hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClaiming ? (
                  <span className="animate-pulse">Claiming...</span>
                ) : (
                  <>
                    🎁 Claim Day {status.currentDay} Reward!
                  </>
                )}
              </button>
            ) : (
              <div className="bg-gray-600/50 text-gray-300 text-xl font-bold px-12 py-4 rounded-xl">
                ✓ Already Claimed Today!
                <p className="text-sm font-normal mt-1 text-gray-400">
                  Come back tomorrow for Day {status.currentDay >= 7 ? 1 : status.currentDay + 1}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-white/5 backdrop-blur-md rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">📋 How it works</h3>
          <ul className="text-gray-300 space-y-2 list-disc list-inside">
            <li>Login daily to claim rewards</li>
            <li>Rewards increase each day up to Day 7</li>
            <li>Day 7 has a special Weekly Bonus!</li>
            <li>After Day 7, the cycle resets to Day 1</li>
            <li>Missing a day resets your streak to Day 1</li>
          </ul>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-bounce-in {
          animation: bounceIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
