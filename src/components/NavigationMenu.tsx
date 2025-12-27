'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

interface NavigationMenuProps {
  currentPage?: string;
}

export default function NavigationMenu({ currentPage }: NavigationMenuProps) {
  const [showNavMenu, setShowNavMenu] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="relative nav-dropdown">
      <button
        onClick={() => setShowNavMenu(!showNavMenu)}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2"
      >
        📱 Menu
        <span className="text-xs">{showNavMenu ? '▲' : '▼'}</span>
      </button>

      {showNavMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-black z-50">
          <div className="py-2">
            {currentPage !== 'dashboard' && (
              <button
                onClick={() => {
                  router.push('/');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                🏠 Dashboard
              </button>
            )}
            {currentPage !== 'calendar' && (
              <button
                onClick={() => {
                  router.push('/calendar');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                📅 Calendar
              </button>
            )}
            {currentPage !== 'pending-policies' && (
              <button
                onClick={() => {
                  router.push('/pending-policies');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                ⏳ Pending Policies
              </button>
            )}
            {currentPage !== 'clients' && (
              <button
                onClick={() => {
                  router.push('/clients');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                👥 Clients
              </button>
            )}
            {currentPage !== 'follow-ups' && (
              <button
                onClick={() => {
                  router.push('/follow-ups');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                📋 Follow-Ups
              </button>
            )}
            {/* TEMPORARILY HIDDEN - Email/Seminar Features - Can be restored later */}
            {/* {currentPage !== 'emails' && (
              <button
                onClick={() => {
                  router.push('/emails');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                📧 Emails
              </button>
            )}
            {currentPage !== 'seminars' && (
              <button
                onClick={() => {
                  router.push('/seminars');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                🎥 Seminars
              </button>
            )} */}

            {/* Analytics Section */}
            <div className="border-t border-gray-200 my-2"></div>
            <div className="px-4 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Analytics</div>
            {currentPage !== 'analytics' && (
              <button
                onClick={() => {
                  router.push('/analytics');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                📊 Overview
              </button>
            )}
            {session && (session.user as any).role === 'admin' && currentPage !== 'platform-insights' && (
              <button
                onClick={() => {
                  router.push('/admin/platform-insights');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                📈 Platform Insights
              </button>
            )}
            {/* TEMPORARILY HIDDEN - Email/Seminar Analytics - Can be restored later */}
            {/* {currentPage !== 'email-analytics' && (
              <button
                onClick={() => {
                  router.push('/email-analytics');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                📈 Email Analytics
              </button>
            )}
            {currentPage !== 'seminar-analytics' && (
              <button
                onClick={() => {
                  router.push('/seminar-analytics');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                🎯 Seminar Analytics
              </button>
            )} */}

            {/* Settings - Available to all users */}
            <div className="border-t border-gray-200 my-2"></div>
            {currentPage !== 'settings' && (
              <button
                onClick={() => {
                  router.push('/settings');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                ⚙️ Settings
              </button>
            )}
            {/* Admin Settings - Admin only */}
            {session && (session.user as any).role === 'admin' && currentPage !== 'admin-settings' && (
              <button
                onClick={() => {
                  router.push('/admin/settings');
                  setShowNavMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black font-semibold transition-colors flex items-center gap-2"
              >
                🔧 Admin Settings
              </button>
            )}
            <div className="border-t border-gray-200 my-2"></div>
            <button
              onClick={() => {
                signOut({ callbackUrl: '/login' });
                setShowNavMenu(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-semibold transition-colors flex items-center gap-2"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
