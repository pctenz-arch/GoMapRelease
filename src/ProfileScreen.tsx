import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { LogOut, MapPin, MessageSquare, Edit2, Check, X, Camera, Image as ImageIcon, Loader2, Globe, Heart, Shield, ChevronRight, Moon, Sun } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useTranslation } from 'react-i18next';

const IDENTITY_OPTIONS = [
  { id: 'women', label: 'Phụ nữ' },
  { id: 'lgbt', label: 'LGBTQ+' },
  { id: 'pwd', label: 'Người khuyết tật' },
  { id: 'ally', label: 'Người ủng hộ (Ally)' }
];

const NEED_OPTIONS = [
  { id: 'support', label: 'Hỗ trợ tâm lý' },
  { id: 'accessibility', label: 'Thông tin tiếp cận' },
  { id: 'career', label: 'Tư vấn nghề nghiệp' },
  { id: 'legal', label: 'Hỗ trợ pháp lý' },
  { id: 'social', label: 'Giao lưu kết bạn' }
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const [postCount, setPostCount] = useState(0);
  const [placeCount, setPlaceCount] = useState(0);
  
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [identities, setIdentities] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempNickname, setTempNickname] = useState('');
  const [tempBio, setTempBio] = useState('');
  const [tempIdentities, setTempIdentities] = useState<string[]>([]);
  const [tempNeeds, setTempNeeds] = useState<string[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);

  const [customAvatar, setCustomAvatar] = useState('');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const presetAvatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Molly&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&backgroundColor=ffdfbf',
  ];

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const postsQ = query(collection(db, 'posts'), where('authorId', '==', user.uid));
        const placesQ = query(collection(db, 'safe_places'), where('addedBy', '==', user.uid));
        
        const [postsSnap, placesSnap] = await Promise.all([
          getDocs(postsQ),
          getDocs(placesQ)
        ]);
        
        setPostCount(postsSnap.size);
        setPlaceCount(placesSnap.size);

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.nickname) setNickname(data.nickname);
          if (data.bio) setBio(data.bio);
          if (data.identities) setIdentities(data.identities);
          if (data.needs) setNeeds(data.needs);
          if (data.customAvatar) setCustomAvatar(data.customAvatar);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        nickname: tempNickname.trim(),
        bio: tempBio.trim(),
        identities: tempIdentities,
        needs: tempNeeds
      });
      setNickname(tempNickname.trim());
      setBio(tempBio.trim());
      setIdentities(tempIdentities);
      setNeeds(tempNeeds);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Có lỗi xảy ra khi lưu hồ sơ.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvatar = async (avatarUrl: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        customAvatar: avatarUrl
      });
      setCustomAvatar(avatarUrl);
      setShowAvatarModal(false);
    } catch (error) {
      console.error("Error saving avatar:", error);
      alert("Có lỗi xảy ra khi lưu ảnh đại diện.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        handleSaveAvatar(base64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEditing = () => {
    setTempNickname(nickname || user?.displayName || '');
    setTempBio(bio || '');
    setTempIdentities([...identities]);
    setTempNeeds([...needs]);
    setIsEditingProfile(true);
  };

  const toggleIdentity = (id: string) => {
    setTempIdentities(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleNeed = (id: string) => {
    setTempNeeds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 pb-32 max-w-7xl mx-auto w-full">
        {/* Hero Section: Profile Header */}
        <header className="relative mb-12 flex flex-col md:flex-row items-end gap-8 p-8 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 overflow-hidden shadow-md">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <img src="https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop" alt="" className="w-full h-full object-cover" />
          </div>
          
          <div className="relative z-10 w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-800 group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
            <img 
              src={customAvatar || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={32} />
            </div>
          </div>
          
          <div className="relative z-10 flex-1 space-y-2 pb-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white font-headline">{nickname || user.displayName}</h1>
            <p className="text-lg text-blue-100 font-body max-w-lg">{user.email}</p>
            <div className="flex gap-4 pt-3">
              <span className="px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">Thành viên SafeHaven</span>
            </div>
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* Stats Module */}
          <div className="md:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t('profile.stats.saved')}</div>
                <div className="text-4xl font-bold text-slate-900 dark:text-white">{placeCount}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t('profile.stats.posts')}</div>
                <div className="text-4xl font-bold text-slate-900 dark:text-white">{postCount}</div>
              </div>
            </div>
            <button onClick={startEditing} className="mt-8 w-full py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300 active:scale-95">
              {t('profile.edit_profile')}
            </button>
          </div>

          {/* About Me / Info Grid */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 font-headline">Giới thiệu</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 min-h-[3rem]">
              {bio || "Chưa có thông tin giới thiệu. Hãy cập nhật hồ sơ để mọi người hiểu thêm về bạn nhé."}
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <Shield className="text-blue-500 mb-3" size={24} />
                <div className="text-slate-900 dark:text-white font-bold mb-2">Cộng đồng của tôi</div>
                <div className="flex flex-wrap gap-2">
                  {identities.length > 0 ? identities.map(id => {
                    const opt = IDENTITY_OPTIONS.find(o => o.id === id);
                    return opt ? <span key={id} className="text-slate-600 dark:text-slate-300 text-sm bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600">{opt.label}</span> : null;
                  }) : <span className="text-slate-400 dark:text-slate-500 text-sm">Chưa cập nhật</span>}
                </div>
              </div>
              
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                <Heart className="text-pink-500 mb-3" size={24} />
                <div className="text-slate-900 dark:text-white font-bold mb-2">Quan tâm & Tìm kiếm</div>
                <div className="flex flex-wrap gap-2">
                  {needs.length > 0 ? needs.map(id => {
                    const opt = NEED_OPTIONS.find(o => o.id === id);
                    return opt ? <span key={id} className="text-slate-600 dark:text-slate-300 text-sm bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600">{opt.label}</span> : null;
                  }) : <span className="text-slate-400 dark:text-slate-500 text-sm">Chưa cập nhật</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{t('home.quick_actions')}</h3>
            <div className="space-y-2 flex-1">
              <button onClick={startEditing} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <Edit2 className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" size={20} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white">{t('profile.edit_profile')}</span>
                </div>
                <ChevronRight className="text-slate-400" size={18} />
              </button>

              <button onClick={toggleTheme} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Sun className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" size={20} />
                  ) : (
                    <Moon className="text-slate-400 group-hover:text-blue-600 transition-colors" size={20} />
                  )}
                  <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-white">Giao diện ({isDark ? 'Tối' : 'Sáng'})</span>
                </div>
                <ChevronRight className="text-slate-400" size={18} />
              </button>
            </div>
            
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={signOut} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-red-600 dark:text-red-400 font-bold transition-all duration-300 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95">
                <LogOut size={20} />
                {t('profile.logout')}
              </button>
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="md:col-span-3 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-headline">Hoạt động gần đây</h3>
              <button className="text-blue-600 dark:text-blue-400 text-sm font-bold uppercase tracking-widest hover:underline">Xem tất cả</button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <MapPin size={24} />
                </div>
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-white font-bold">Đã lưu địa điểm an toàn mới</div>
                  <div className="text-slate-500 dark:text-slate-400 text-sm">Gần đây</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <MessageSquare size={24} />
                </div>
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-white font-bold">Đã tham gia thảo luận trên diễn đàn</div>
                  <div className="text-slate-500 dark:text-slate-400 text-sm">Gần đây</div>
                </div>
              </div>
            </div>
          </div>

          {/* Showcase Card */}
          <div className="md:col-span-1 rounded-2xl overflow-hidden relative group border border-slate-200 dark:border-slate-800 shadow-sm h-64 md:h-auto">
            <img 
              src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=1000&auto=format&fit=crop" 
              alt="Community" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent p-6 flex flex-col justify-end">
              <div className="text-white font-bold text-lg">Thành viên tích cực</div>
              <div className="text-slate-300 text-sm">SafeHaven • 2026</div>
            </div>
          </div>

        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden relative max-h-[90vh] border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Chỉnh sửa hồ sơ</h2>
              <button onClick={() => setIsEditingProfile(false)} className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Biệt danh</label>
                <input 
                  type="text" 
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  className="w-full border-b-2 border-blue-600 outline-none text-lg font-bold text-slate-900 dark:text-white bg-transparent py-1 focus:ring-0 placeholder:text-slate-400"
                  placeholder="Nhập biệt danh..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Giới thiệu bản thân</label>
                <textarea 
                  value={tempBio}
                  onChange={(e) => setTempBio(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none text-sm text-slate-900 dark:text-white resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400"
                  placeholder="Chia sẻ một chút về bạn..."
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Tôi là / Thuộc cộng đồng</label>
                <div className="flex flex-wrap gap-2">
                  {IDENTITY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleIdentity(opt.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${tempIdentities.includes(opt.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Tôi quan tâm / Tìm kiếm</label>
                <div className="flex flex-wrap gap-2">
                  {NEED_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => toggleNeed(opt.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${tempNeeds.includes(opt.id) ? 'bg-pink-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900">
              <button onClick={() => setIsEditingProfile(false)} disabled={isSaving} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                Hủy
              </button>
              <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[24px] w-full max-w-sm flex flex-col shadow-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Đổi ảnh đại diện</h2>
              <button onClick={() => setShowAvatarModal(false)} className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              <div>
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white mb-3">Tải ảnh lên</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  <ImageIcon size={20} />
                  <span className="font-medium text-[15px]">Chọn ảnh từ thiết bị</span>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                />
              </div>

              <div>
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white mb-3">Hoặc chọn ảnh có sẵn</p>
                <div className="grid grid-cols-3 gap-3">
                  {presetAvatars.map((url, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSaveAvatar(url)}
                      className="aspect-square rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-blue-500 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all bg-slate-50 dark:bg-slate-800"
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {isSaving && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                <Loader2 size={32} className="animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

