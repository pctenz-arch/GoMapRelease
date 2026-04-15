import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Send, Loader2, X, MessageCircle, MapPin, Plus, Users, ChevronLeft, Image as ImageIcon, Calendar, Search, HeartHandshake, MessageSquare, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';
import { ConfirmModal } from './components/ConfirmModal';

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
  lastMessage?: string;
  members: string[];
  isPublic?: boolean;
  participantDetails?: Record<string, { name: string, avatar: string }>;
}

interface GroupMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  imageUrl?: string;
  createdAt: any;
}

const CATEGORIES = [
  { id: 'women', label: 'Phụ nữ', color: 'bg-pink-500' },
  { id: 'lgbt', label: 'LGBTQ+', color: 'bg-purple-500' },
  { id: 'pwd', label: 'Người khuyết tật', color: 'bg-blue-500' },
  { id: 'general', label: 'Chung', color: 'bg-gray-500' }
];

const MOCK_EVENTS = [
  { id: '1', title: 'Hội thảo trực tuyến: Chăm sóc sức khỏe tinh thần', date: '15/04/2026', time: '19:00', location: 'Online (Zoom)', category: 'general', attendees: 120 },
  { id: '2', title: 'Gặp mặt cộng đồng LGBTQ+ Hà Nội', date: '18/04/2026', time: '14:00', location: 'The Coffee House, Hai Bà Trưng', category: 'lgbt', attendees: 45 },
  { id: '3', title: 'Workshop: Kỹ năng tự vệ cho phái nữ', date: '20/04/2026', time: '09:00', location: 'Nhà văn hóa Thanh Niên', category: 'women', attendees: 80 },
  { id: '4', title: 'Ngày hội việc làm hòa nhập', date: '25/04/2026', time: '08:00', location: 'Trung tâm triển lãm SECC', category: 'pwd', attendees: 300 },
];

export default function CommunityScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'forum' | 'groups' | 'events' | 'messages'>('forum');
  const [activeForumFilter, setActiveForumFilter] = useState<string>('all');
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [directChats, setDirectChats] = useState<ChatGroup[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('general');
  const [postCategory, setPostCategory] = useState('general');
  
  const [userNickname, setUserNickname] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [activePostMenu, setActivePostMenu] = useState<string | null>(null);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'comment', id: string, parentId?: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReportPost = async () => {
    if (!user || !reportingPostId) return;
    setIsReporting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        postId: reportingPostId,
        reporterId: user.uid,
        createdAt: serverTimestamp()
      });
      alert('Báo cáo của bạn đã được gửi thành công. Chúng tôi sẽ xem xét sớm nhất có thể.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
      alert('Có lỗi xảy ra khi gửi báo cáo. Vui lòng thử lại sau.');
    } finally {
      setIsReporting(false);
      setReportingPostId(null);
      setActivePostMenu(null);
    }
  };

  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          if (docSnap.data().nickname) setUserNickname(docSnap.data().nickname);
          if (docSnap.data().customAvatar) setUserAvatar(docSnap.data().customAvatar);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    const qGroups = query(collection(db, 'chat_groups'), orderBy('createdAt', 'desc'));
    const unsubGroups = onSnapshot(qGroups, (snapshot) => {
      const allGroups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatGroup));
      setGroups(allGroups.filter(g => g.category !== 'direct'));
      
      const dChats = allGroups.filter(g => g.category === 'direct' && g.members?.includes(user?.uid || ''));
      // Sort direct chats by updatedAt descending
      dChats.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setDirectChats(dChats);
    });

    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
    });

    return () => {
      unsubGroups();
      unsubPosts();
    };
  }, []);

  useEffect(() => {
    if (selectedPost) {
      const q = query(collection(db, 'posts', selectedPost.id, 'comments'), orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPostComments(commentsData);
      });
      return () => unsubscribe();
    }
  }, [selectedPost]);

  useEffect(() => {
    if (selectedGroup) {
      const q = query(
        collection(db, 'chat_groups', selectedGroup.id, 'messages'),
        orderBy('createdAt', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage));
        setMessages(msgs);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsubscribe();
    }
  }, [selectedGroup]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'chat_groups'), {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        category: newGroupCategory,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        isPublic: true
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setIsCreatingGroup(false);
      setSelectedGroup({ id: docRef.id, name: newGroupName.trim(), description: newGroupDesc.trim(), category: newGroupCategory, createdBy: user.uid, members: [user.uid], createdAt: new Date() } as ChatGroup);
    } catch (error) {
      console.error("Error creating group", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (group: ChatGroup) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'chat_groups', group.id), {
        members: arrayUnion(user.uid)
      });
      setSelectedGroup(group);
    } catch (error) {
      console.error("Error joining group", error);
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
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
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
        setImage(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newPostContent.trim() && !image)) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: userNickname || user.displayName || 'Anonymous',
        authorPhoto: userAvatar || user.photoURL || '',
        content: newPostContent.trim(),
        imageUrl: image || '',
        category: postCategory,
        createdAt: serverTimestamp()
      });
      setNewPostContent('');
      setImage(null);
      setIsCreatingPost(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPost || !newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    try {
      await addDoc(collection(db, 'posts', selectedPost.id, 'comments'), {
        authorId: user.uid,
        authorName: userNickname || user.displayName || 'Anonymous',
        authorPhoto: userAvatar || user.photoURL || '',
        text,
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'posts', selectedPost.id), {
        commentCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `posts/${selectedPost.id}/comments`);
    }
  };

  const handleToggleSupport = async (post: any) => {
    if (!user) return;
    const isSupported = post.supports?.includes(user.uid);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        supports: isSupported ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const handleStartDirectChat = async (otherUserId: string, otherUserName: string, otherUserAvatar: string) => {
    if (!user || user.uid === otherUserId) return;
    
    // Check if chat already exists
    const existingChat = directChats.find(c => c.members.includes(otherUserId));
    if (existingChat) {
      setSelectedGroup(existingChat);
      setActiveTab('messages');
      return;
    }

    // Create new direct chat
    try {
      const docRef = await addDoc(collection(db, 'chat_groups'), {
        name: `Chat with ${otherUserName}`,
        description: 'Direct message',
        category: 'direct',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: [user.uid, otherUserId],
        isPublic: false,
        participantDetails: {
          [user.uid]: { name: userNickname || user?.displayName || 'Anonymous', avatar: userAvatar || user?.photoURL || '' },
          [otherUserId]: { name: otherUserName, avatar: otherUserAvatar }
        }
      });
      
      const newChat = {
        id: docRef.id,
        name: `Chat with ${otherUserName}`,
        description: 'Direct message',
        category: 'direct',
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [user.uid, otherUserId],
        isPublic: false,
        participantDetails: {
          [user.uid]: { name: userNickname || user?.displayName || 'Anonymous', avatar: userAvatar || user?.photoURL || '' },
          [otherUserId]: { name: otherUserName, avatar: otherUserAvatar }
        }
      } as ChatGroup;
      
      setSelectedGroup(newChat);
      setActiveTab('messages');
    } catch (error) {
      console.error("Error starting direct chat", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroup || (!newMessage.trim() && !image)) return;
    
    const msgText = newMessage.trim();
    const msgImage = image;
    setNewMessage('');
    setImage(null);
    
    try {
      await addDoc(collection(db, 'chat_groups', selectedGroup.id, 'messages'), {
        authorId: user.uid,
        authorName: userNickname || user.displayName || 'Anonymous',
        authorPhoto: userAvatar || user.photoURL || '',
        text: msgText,
        imageUrl: msgImage || '',
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'chat_groups', selectedGroup.id), {
        lastMessage: msgText || 'Hình ảnh đính kèm',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chat_groups/${selectedGroup.id}/messages`);
    }
  };

  if (selectedGroup) {
    const isDirect = selectedGroup.category === 'direct';
    const otherUserId = isDirect ? (selectedGroup.members.find(id => id !== user?.uid) || user?.uid) : null;
    const otherUser = isDirect && otherUserId ? selectedGroup.participantDetails?.[otherUserId] : null;
    const displayName = isDirect ? (otherUser?.name || 'Người dùng') : selectedGroup.name;
    const displayAvatar = isDirect ? (otherUser?.avatar || `https://ui-avatars.com/api/?name=${displayName}`) : null;

    return (
      <div className="flex flex-col h-full bg-[#F2F2F7] relative">
        <div className="p-4 bg-white/90 backdrop-blur-xl border-b border-gray-200 z-10 sticky top-0 flex items-center justify-between">
          <button onClick={() => { setSelectedGroup(null); setImage(null); }} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 flex flex-col items-center justify-center">
            {isDirect && displayAvatar && (
              <img src={displayAvatar} className="w-8 h-8 rounded-full mb-1 object-cover" />
            )}
            <h1 className="text-[17px] font-semibold text-black leading-tight">{displayName}</h1>
            {!isDirect && <p className="text-[13px] text-gray-500">{selectedGroup.members?.length || 1} thành viên</p>}
          </div>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => {
            const isMe = msg.authorId === user?.uid;
            return (
              <div key={msg.id || idx} className={`flex gap-2 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                {!isMe && (
                  <img 
                    src={msg.authorPhoto || `https://ui-avatars.com/api/?name=${msg.authorName}`} 
                    alt={msg.authorName} 
                    className="w-8 h-8 rounded-full object-cover mt-auto flex-shrink-0"
                  />
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[11px] text-gray-500 ml-1 mb-1">{msg.authorName}</span>}
                  <div className={`p-3 rounded-[18px] ${isMe ? 'bg-[#007AFF] text-white rounded-br-sm' : 'bg-white text-black shadow-sm rounded-bl-sm'}`}>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Attached" className="max-w-full h-auto rounded-xl mb-2 object-cover" />
                    )}
                    {msg.text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.text}</p>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-t border-gray-200 pb-safe">
          {image && (
            <div className="mb-3 relative inline-block">
              <img src={image} alt="Preview" className="h-20 rounded-xl object-cover shadow-sm" />
              <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-black/70 text-white p-1 rounded-full shadow-lg">
                <X size={14} />
              </button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end max-w-4xl mx-auto w-full">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-500 hover:text-[#007AFF] rounded-full transition-colors mb-0.5">
              <ImageIcon size={22} />
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
              placeholder="Nhắn tin..."
              className="flex-1 max-h-32 min-h-[40px] py-2.5 px-4 bg-gray-100 border-none rounded-[20px] focus:ring-2 focus:ring-[#007AFF]/20 outline-none transition-all resize-none text-[15px]"
              rows={1}
            />
            <button type="submit" disabled={!newMessage.trim() && !image} className="w-10 h-10 bg-[#007AFF] text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50 hover:opacity-90 transition-opacity mb-0.5">
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative">
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
      
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 max-w-4xl mx-auto w-full">
        {/* Tab Navigation System */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-full flex gap-1 shadow-sm border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setActiveTab('forum')}
              className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all ${activeTab === 'forum' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Diễn đàn
            </button>
            <button 
              onClick={() => setActiveTab('groups')}
              className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all ${activeTab === 'groups' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Nhóm
            </button>
            <button 
              onClick={() => setActiveTab('events')}
              className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all ${activeTab === 'events' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Sự kiện
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide transition-all ${activeTab === 'messages' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              Tin nhắn
            </button>
          </div>
        </div>

        {activeTab === 'forum' && (
          <div className="space-y-6">
            {/* Post Creation Card */}
            <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-blue-100 dark:border-slate-700">
                  <img src={userAvatar || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => setIsCreatingPost(true)}>
                  <div className="relative">
                    <div className="w-full bg-transparent border-none text-lg font-medium text-slate-500 dark:text-slate-400 py-2">
                      Chia sẻ câu chuyện hoặc tìm sự giúp đỡ...
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full text-blue-600 dark:text-blue-400 transition-all flex items-center gap-1">
                        <span className="material-symbols-outlined text-xl">image</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Photo</span>
                      </button>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Posts */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
              <button
                onClick={() => setActiveForumFilter('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeForumFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
              >
                Tất cả
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveForumFilter(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeForumFilter === cat.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {posts.filter(post => activeForumFilter === 'all' || post.category === activeForumFilter).map(post => {
                const category = CATEGORIES.find(c => c.id === post.category) || CATEGORIES[3];
                return (
                  <div key={post.id} className="md:col-span-12 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`} className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-50 dark:ring-slate-800" />
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{post.authorName}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{category.label} • {post.createdAt?.toDate?.().toLocaleString('vi-VN') || 'Vừa xong'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setActivePostMenu(activePostMenu === post.id ? null : post.id)}
                          className="material-symbols-outlined text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          more_horiz
                        </button>
                        {activePostMenu === post.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-10 py-1">
                            {post.authorId === user?.uid ? (
                              <button 
                                onClick={() => {
                                  setDeleteTarget({ type: 'post', id: post.id });
                                  setActivePostMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                Xóa bài viết
                              </button>
                            ) : (
                              <button 
                                onClick={() => {
                                  setReportingPostId(post.id);
                                  setActivePostMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[18px]">flag</span>
                                Báo cáo bài viết
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-body leading-relaxed mb-6 whitespace-pre-wrap">{post.content}</p>
                    {post.imageUrl && (
                      <div className="mb-6">
                        <img src={post.imageUrl} className="rounded-xl w-full max-h-96 object-cover border border-slate-100 dark:border-slate-800" />
                      </div>
                    )}
                    <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => handleToggleSupport(post)}
                        className={`flex items-center gap-2 transition-colors ${post.supports?.includes(user?.uid) ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
                      >
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: post.supports?.includes(user?.uid) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                        <span className="text-sm font-bold">{post.supports?.length || 0}</span>
                      </button>
                      <button onClick={() => setSelectedPost(post)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-xl">chat_bubble</span>
                        <span className="text-sm font-bold">{post.commentCount || 0}</span>
                      </button>
                      {post.authorId !== user?.uid && (
                        <button onClick={() => handleStartDirectChat(post.authorId, post.authorName, post.authorPhoto)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors ml-auto">
                          <span className="material-symbols-outlined text-xl">chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-headline">Nhóm thảo luận</h2>
              <button onClick={() => setIsCreatingGroup(true)} className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-lg">add</span> Tạo nhóm
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map(group => {
                const category = CATEGORIES.find(c => c.id === group.category) || CATEGORIES[3];
                const isMember = group.members?.includes(user?.uid || '');
                return (
                  <div key={group.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 ${category.color}`}>
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{group.name}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-2">{group.description}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider`}>
                            {category.label}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-bold">
                            <span className="material-symbols-outlined text-[14px]">group</span> {group.members?.length || 1}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isMember ? (
                      <button onClick={() => setSelectedGroup(group)} className="w-full py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Vào nhóm
                      </button>
                    ) : (
                      <button onClick={() => handleJoinGroup(group)} className="w-full py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20">
                        Tham gia
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="bg-blue-600 p-6 rounded-2xl shadow-sm relative overflow-hidden group mb-6">
              <div className="relative z-10 text-white">
                <h3 className="text-xl font-bold tracking-tight mb-2">Lịch sự kiện cộng đồng</h3>
                <p className="text-white/80 text-sm mb-4">Tham gia các buổi gặp mặt, hội thảo và hoạt động dành riêng cho bạn.</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                <span className="material-symbols-outlined text-[120px]">event</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MOCK_EVENTS.map(event => {
                const category = CATEGORIES.find(c => c.id === event.category) || CATEGORIES[3];
                return (
                  <div key={event.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex gap-4">
                    <div className="flex flex-col items-center justify-center w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shrink-0">
                      <span className="text-red-500 dark:text-red-400 text-[11px] font-bold uppercase">{event.date.split('/')[1]}</span>
                      <span className="text-slate-900 dark:text-white text-[22px] font-bold leading-none mt-0.5">{event.date.split('/')[0]}</span>
                    </div>
                    <div className="flex-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white mb-2 inline-block ${category.color}`}>
                        {category.label}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-tight">{event.title}</h4>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-[16px]">schedule</span> {event.time}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="material-symbols-outlined text-[16px]">location_on</span> {event.location}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            {directChats.length === 0 ? (
              <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                <p>Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện với mọi người từ diễn đàn!</p>
              </div>
            ) : (
              directChats.map(chat => {
                const otherUserId = chat.members.find(id => id !== user?.uid) || user?.uid;
                const otherUser = chat.participantDetails?.[otherUserId || ''] || { name: 'Người dùng', avatar: '' };
                
                return (
                  <div key={chat.id} onClick={() => setSelectedGroup(chat)} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <img src={otherUser.avatar || `https://ui-avatars.com/api/?name=${otherUser.name}`} className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 object-cover ring-2 ring-slate-50 dark:ring-slate-800" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{otherUser.name}</h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {chat.updatedAt?.toDate?.().toLocaleDateString('vi-VN') || chat.createdAt?.toDate?.().toLocaleDateString('vi-VN') || ''}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
                        {chat.lastMessage || 'Chưa có tin nhắn'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Create Post Modal */}
      {isCreatingPost && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[24px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">Tạo bài viết</h3>
              <button onClick={() => { setIsCreatingPost(false); setImage(null); }} className="text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-2">Chủ đề / Cộng đồng</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPostCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${postCategory === cat.id ? `bg-blue-600 text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Bạn muốn chia sẻ điều gì?"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none text-[15px] text-slate-900 dark:text-white placeholder:text-slate-500"
                rows={4}
              />
              {image && (
                <div className="relative inline-block">
                  <img src={image} alt="Preview" className="h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                  <button type="button" onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-slate-900/90 text-white p-1 rounded-full shadow-lg">
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <ImageIcon size={20} />
                </button>
                <button 
                  type="submit"
                  disabled={loading || (!newPostContent.trim() && !image)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Đăng bài'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-[100] flex justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-300 sm:rounded-t-3xl sm:mt-12 overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
              <button onClick={() => setSelectedPost(null)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h3 className="font-bold text-slate-900 dark:text-white text-[17px] font-['Plus_Jakarta_Sans'] tracking-tight">Thảo luận</h3>
              <div className="w-10"></div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
              {/* Original Post */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <img src={selectedPost.authorPhoto} className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-50 dark:ring-slate-700" />
                  <div>
                    <span className="font-bold text-[16px] text-slate-900 dark:text-white block">{selectedPost.authorName}</span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">{selectedPost.createdAt?.toDate?.().toLocaleString('vi-VN') || 'Vừa xong'}</span>
                  </div>
                </div>
                <p className="text-[16px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedPost.content}</p>
                {selectedPost.imageUrl && <img src={selectedPost.imageUrl} className="mt-4 rounded-xl w-full object-cover max-h-80 border border-slate-100 dark:border-slate-700" />}
              </div>
              
              <div className="flex items-center gap-2 px-2">
                <MessageCircle size={18} className="text-slate-400" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Bình luận ({postComments.length})</h4>
              </div>

              {/* Comments List */}
              <div className="space-y-5 px-2">
                {postComments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p>Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ ý kiến!</p>
                  </div>
                ) : (
                  postComments.map(comment => (
                    <div key={comment.id} className="flex gap-3 group">
                      <img src={comment.authorPhoto || `https://ui-avatars.com/api/?name=${comment.authorName}`} className="w-9 h-9 rounded-full object-cover shrink-0 mt-1 ring-2 ring-white dark:ring-slate-800 shadow-sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700 inline-block max-w-[90%]">
                            <p className="font-bold text-[14px] text-slate-900 dark:text-white mb-1">{comment.authorName}</p>
                            <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed break-words">{comment.text}</p>
                          </div>
                          {comment.authorId === user?.uid && (
                            <button 
                              onClick={() => setDeleteTarget({ type: 'comment', id: comment.id, parentId: selectedPost.id })}
                              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                              title="Xóa bình luận"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1.5 ml-2 font-medium">{comment.createdAt?.toDate?.().toLocaleString('vi-VN') || 'Vừa xong'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 pb-safe">
              <form onSubmit={handleAddPostComment} className="flex gap-3 items-end">
                <img src={userAvatar || user?.photoURL || `https://ui-avatars.com/api/?name=${userNickname || user?.displayName}`} className="w-10 h-10 rounded-full object-cover shrink-0 mb-1 ring-2 ring-slate-50 dark:ring-slate-800" />
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Viết bình luận của bạn..."
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-full pl-5 pr-12 py-3.5 text-[15px] text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-500"
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()} 
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-0 disabled:scale-75 hover:bg-blue-700 transition-all duration-200"
                  >
                    <Send size={16} className="ml-0.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isCreatingGroup && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[24px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">Tạo nhóm mới</h3>
              <button onClick={() => setIsCreatingGroup(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Tên nhóm</label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="VD: Hội chị em thích nấu ăn"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-[15px] text-slate-900 dark:text-white placeholder:text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Mô tả</label>
                <textarea 
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Nhóm này dành cho ai, mục đích gì?"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none text-[15px] text-slate-900 dark:text-white placeholder:text-slate-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-2">Cộng đồng</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewGroupCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${newGroupCategory === cat.id ? `bg-blue-600 text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading || !newGroupName.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Tạo nhóm'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Report Confirmation Dialog */}
      {reportingPostId && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">flag</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Báo cáo bài viết này?</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                Bạn có chắc chắn muốn báo cáo bài viết này không? Quản trị viên sẽ xem xét và xử lý nếu bài viết vi phạm tiêu chuẩn cộng đồng.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setReportingPostId(null)}
                  disabled={isReporting}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleReportPost}
                  disabled={isReporting}
                  className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isReporting ? <Loader2 size={18} className="animate-spin" /> : 'Báo cáo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.type === 'post' ? 'Xóa bài viết' : 'Xóa bình luận'}
        message={deleteTarget?.type === 'post' ? 'Bạn có chắc chắn muốn xóa bài viết này?' : 'Bạn có chắc chắn muốn xóa bình luận này?'}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            if (deleteTarget.type === 'post') {
              await deleteDoc(doc(db, 'posts', deleteTarget.id));
            } else if (deleteTarget.type === 'comment' && deleteTarget.parentId) {
              await deleteDoc(doc(db, `posts/${deleteTarget.parentId}/comments`, deleteTarget.id));
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, deleteTarget.type === 'post' ? `posts/${deleteTarget.id}` : `posts/${deleteTarget.parentId}/comments/${deleteTarget.id}`);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
