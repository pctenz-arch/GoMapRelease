import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Map, Users, ShieldAlert, User as UserIcon, MessageCircleHeart, Loader2, Check } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import MapScreen from './MapScreen';
import CommunityScreen from './CommunityScreen';
import ProfileScreen from './ProfileScreen';

function TopNavBar() {
  const location = useLocation();
  const { t } = useTranslation();
  
  return (
    <header className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-[0_4px_24px_-1px_rgba(26,115,232,0.08)] pt-safe">
      <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300 bg-clip-text text-transparent font-['Plus_Jakarta_Sans']">GoMap</span>
          <nav className="hidden md:flex gap-6 items-center">
            <Link to="/" className={`font-bold font-['Plus_Jakarta_Sans'] tracking-tight transition-all duration-300 ${location.pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-full'}`}>{t('nav.home')}</Link>
            <Link to="/map" className={`font-bold font-['Plus_Jakarta_Sans'] tracking-tight transition-all duration-300 ${location.pathname === '/map' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-full'}`}>{t('nav.map')}</Link>
            <Link to="/profile" className={`font-bold font-['Plus_Jakarta_Sans'] tracking-tight transition-all duration-300 ${location.pathname === '/profile' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-full'}`}>{t('nav.profile')}</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input className="bg-slate-100 dark:bg-slate-800 border-none rounded-full py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 w-64 placeholder:text-slate-500 outline-none transition-all" placeholder={t('home.search_placeholder')} type="text"/>
          </div>
          <Link to="/profile" className="material-symbols-outlined text-slate-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 p-2 rounded-full transition-all" data-icon="account_circle">account_circle</Link>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const location = useLocation();
  const { t } = useTranslation();
  
  const navItems = [
    { path: '/', icon: 'home', label: t('nav.home') },
    { path: '/map', icon: 'map', label: t('nav.map') },
    { path: '/profile', icon: 'person', label: t('nav.profile') },
  ];

  return (
    <nav className="md:hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-md rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex justify-around items-center px-4 py-2 z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path}
            className={`flex flex-col items-center justify-center w-12 h-12 hover:scale-110 transition-transform ${isActive ? 'bg-blue-600 text-white rounded-full' : 'text-slate-500 dark:text-slate-400'}`}
          >
            <span className="material-symbols-outlined" data-icon={item.icon}>{item.icon}</span>
            <span className="font-['Plus_Jakarta_Sans'] text-[10px] uppercase tracking-widest font-bold sr-only">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MainLayout() {
  const { user, loading, signIn, isSigningIn } = useAuth();
  const { t } = useTranslation();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);

  useEffect(() => {
    if (user) {
      const checkProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists() || !userDoc.data().primaryIdentity) {
            setNeedsOnboarding(true);
          }
        } catch (error) {
          console.error("Error checking profile:", error);
        } finally {
          setCheckingProfile(false);
        }
      };
      checkProfile();
    } else {
      setCheckingProfile(false);
      setNeedsOnboarding(false);
    }
  }, [user]);

  const handleSaveIdentity = async () => {
    if (!user || !selectedIdentity) return;
    setSavingIdentity(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          primaryIdentity: selectedIdentity,
          identities: [selectedIdentity]
        });
      } else {
        await setDoc(userRef, {
          primaryIdentity: selectedIdentity,
          identities: [selectedIdentity],
          nickname: user.displayName || 'Người dùng mới'
        });
      }
      setNeedsOnboarding(false);
    } catch (error) {
      console.error("Error saving identity:", error);
    } finally {
      setSavingIdentity(false);
    }
  };

  if (loading || checkingProfile) {
    return <div className="h-screen flex items-center justify-center bg-[#F2F2F7]"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>;
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F2F2F7] p-6 text-center">
        <ShieldAlert size={64} className="text-[#007AFF] mb-6" />
        <h1 className="text-3xl font-bold text-black mb-2">SafeHaven</h1>
        <p className="text-[#8E8E93] mb-8">Cộng đồng an toàn và bảo vệ lẫn nhau.</p>
        <button 
          onClick={signIn}
          disabled={isSigningIn}
          className="bg-white text-black px-6 py-3 rounded-[20px] font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:bg-gray-50 flex items-center gap-3 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningIn ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          )}
          {isSigningIn ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
        </button>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F2F2F7] p-6 text-center">
        <h1 className="text-2xl font-bold text-black mb-2">Chào mừng đến với SafeHaven</h1>
        <p className="text-[#8E8E93] mb-8">Để chúng tôi có thể hỗ trợ bạn tốt nhất, vui lòng cho biết bạn thuộc nhóm nào?</p>
        
        <div className="w-full max-w-sm space-y-3 mb-8">
          {[
            { id: 'general', label: 'Người dùng chung', desc: 'Sử dụng các tính năng an toàn cơ bản' },
            { id: 'pwd', label: 'Người khuyết tật', desc: 'Hỗ trợ tìm đường đi xe lăn, tránh đường gồ ghề' },
            { id: 'lgbt', label: 'Cộng đồng LGBTQ+', desc: 'Kết nối cộng đồng, tìm địa điểm thân thiện' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => setSelectedIdentity(option.id)}
              className={`w-full p-4 rounded-[20px] border-2 text-left transition-all ${selectedIdentity === option.id ? 'border-[#007AFF] bg-[#007AFF]/5' : 'border-transparent bg-white hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[16px] text-black">{option.label}</span>
                {selectedIdentity === option.id && <Check size={20} className="text-[#007AFF]" />}
              </div>
              <p className="text-[13px] text-gray-500">{option.desc}</p>
            </button>
          ))}
        </div>

        <button 
          onClick={handleSaveIdentity}
          disabled={!selectedIdentity || savingIdentity}
          className="w-full max-w-sm bg-[#007AFF] text-white py-3.5 rounded-[20px] font-bold disabled:opacity-50 transition-opacity flex justify-center items-center"
        >
          {savingIdentity ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bắt đầu sử dụng'}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <TopNavBar />
      <div className="flex-1 overflow-hidden relative pt-[calc(5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Routes>
          <Route path="/" element={<CommunityScreen />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  React.useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    window.addEventListener('resize', setAppHeight);
    setAppHeight();

    // Theme initialization
    const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    return () => window.removeEventListener('resize', setAppHeight);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <MainLayout />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
