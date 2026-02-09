
import React, { useState, useEffect } from 'react';
import { Search, MoreHorizontal, UserMinus, UserPlus, Plus, Users, Loader2, Bell } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';
import { useAuth } from '../src/contexts/AuthContext';
import * as friendsApi from '../src/lib/friends-api';
import { NotificationListModal } from './NotificationListModal';
import { fetchNotifications, subscribeToNotifications } from '../src/lib/notifications-api';

interface FriendWithStatus {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  handle: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export const FriendsScreen: React.FC = () => {
  const { t, friends, refreshFriends, accentColor } = useCalendar();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [suggestedFriends, setSuggestedFriends] = useState<any[]>([]);

  // Check for notifications and load suggestions
  useEffect(() => {
    if (!user) return;
    const checkNotifs = async () => {
      const data = await fetchNotifications(user.id);
      const unread = data.filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);
      setHasUnread(unread > 0);
    };

    const loadSuggestions = async () => {
      try {
        const suggestions = await friendsApi.getSuggestedFriends(user.id);
        setSuggestedFriends(suggestions);
      } catch (err) {
        console.error('Error loading suggestions:', err);
      }
    };

    checkNotifs();
    loadSuggestions();

    // Subscribe to realtime notifications
    const unsubscribe = subscribeToNotifications(user.id, {
      onInsert: () => {
        setHasUnread(true);
        setUnreadCount(prev => prev + 1);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Search users when search term changes
  useEffect(() => {
    if (!search || search.length < 2 || !user) {
      setSearchResults([]);
      return;
    }

    const searchForUsers = async () => {
      setSearchLoading(true);
      try {
        const results = await friendsApi.searchUsers(search, user.id);
        setSearchResults(results);
      } catch (error) {
        console.error('[Friends] Error searching users:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchForUsers, 300);
    return () => clearTimeout(debounce);
  }, [search, user]);

  const handleSendRequest = async (userId: string) => {
    if (!user) return;
    try {
      await friendsApi.sendFriendRequest(user.id, userId);
      // Optimistically update search results and suggestions
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      setSuggestedFriends(prev => prev.filter(u => u.id !== userId));
      await refreshFriends();
    } catch (error) {
      console.error('[Friends] Error sending request:', error);
      alert('Error al enviar solicitud de amistad');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    if (!user) return;
    try {
      await friendsApi.acceptFriendRequest(friendshipId, user.id);
      await refreshFriends();
    } catch (error) {
      console.error('[Friends] Error accepting request:', error);
      alert('Error al aceptar solicitud');
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    if (!user) return;
    try {
      await friendsApi.rejectFriendRequest(friendshipId, user.id);
      await refreshFriends();
    } catch (error) {
      console.error('[Friends] Error declining request:', error);
      alert('Error al rechazar solicitud');
    }
  };

  const handleUnfriend = async (friendshipId: string) => {
    if (!user) return;
    try {
      await friendsApi.removeFriend(friendshipId, user.id);
      await refreshFriends();
      setActiveMenuId(null);
    } catch (error) {
      console.error('[Friends] Error removing friend:', error);
      alert('Error al eliminar amigo');
    }
  };

  const incomingRequests = friends.filter(f => f.status === 'suggested'); // From our API logic
  const myNetwork = friends.filter(f => f.status === 'friend' || f.status === 'pending'); // Show accepted AND outgoing

  // Show search results if searching, otherwise show friends
  const displayList = search.length >= 2 ? searchResults : [];

  return (
    <>
      <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black transition-colors duration-300" onClick={() => setActiveMenuId(null)}>
        <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-30">
          <div className="w-10"></div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{t.friends_tab}</h1>
          <button
            onClick={() => setShowNotifications(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm active:scale-95 transition-all relative"
          >
            <Bell size={20} className="text-gray-900 dark:text-white" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-black">
                <span className="text-[10px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </div>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-40">
          <div className="px-6 mb-8">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t.friends_search}
                className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl py-4 pl-12 pr-4 shadow-sm text-sm focus:ring-0 dark:text-white outline-none placeholder:text-gray-400"
              />
              {searchLoading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={18} />
              )}
            </div>
          </div>



          {/* Suggested Friends (Persistent) */}
          {search.length < 2 && suggestedFriends.length > 0 && (
            <section className="px-6 mb-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[17px] font-black text-gray-900 dark:text-white tracking-tight">Sugerencias</h2>
              </div>
              <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 px-1">
                {suggestedFriends.map(friend => (
                  <div key={friend.id} className="flex flex-col items-center shrink-0 w-[80px]">
                    <div className="relative mb-2">
                      <img
                        src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || 'User')}&background=FF7566&color=fff`}
                        alt={friend.name}
                        className="w-16 h-16 rounded-full object-cover bg-gray-50 dark:bg-gray-800 border-2 border-white dark:border-black"
                      />
                      <button
                        onClick={() => handleSendRequest(friend.id)}
                        style={{ backgroundColor: accentColor }}
                        className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-black shadow-sm active:scale-90 transition-transform"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>

                    <h3 className="font-black text-gray-900 dark:text-white text-[13px] leading-tight text-center truncate w-full">{friend.name || 'Usuario'}</h3>

                    {friend.mutualFriends > 0 ? (
                      <p className="text-[9px] text-gray-400 font-bold text-center leading-tight mt-0.5">
                        {friend.mutualFriends} en común
                      </p>
                    ) : (
                      <p className="text-[9px] text-gray-400 font-bold text-center leading-tight mt-0.5">
                        Sugerencia
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Search Results */}
          {search.length >= 2 && displayList.length > 0 && (
            <section className="px-6 mb-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[17px] font-black text-gray-900 dark:text-white uppercase tracking-tight">Resultados</h2>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{displayList.length}</span>
              </div>
              <div className="space-y-3">
                {displayList.map(user => (
                  <div key={user.id} className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=FF7566&color=fff`}
                      alt={user.name}
                      className="w-14 h-14 rounded-full object-cover bg-gray-50 dark:bg-gray-800"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 dark:text-white text-[15px] leading-tight truncate">{user.name || 'Usuario'}</h3>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">{user.handle || `@${user.id.slice(0, 8)}`}</p>
                      {user.mutualFriends && user.mutualFriends > 0 && (
                        <p className="text-[10px] text-gray-500 font-bold mt-1.5 flex items-center gap-1">
                          <Users size={10} className="text-gray-400" />
                          {user.mutualFriends} {user.mutualFriends === 1 ? 'amigo en común' : 'amigos en común'}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest bg-[#FF7566] text-white shadow-lg active:scale-95 transition-all flex items-center gap-2"
                    >
                      <UserPlus size={14} />
                      Añadir
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Incoming Requests */}
          {search.length < 2 && incomingRequests.length > 0 && (
            <section className="px-6 mb-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[17px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{t.friends_requests}</h2>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{incomingRequests.length} {t.friends_received}</span>
              </div>
              <div className="space-y-4">
                {incomingRequests.map(request => (
                  <div key={request.id} className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex gap-4 mb-6">
                      <img
                        src={request.avatar_url || request.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.name)}&background=FF7566&color=fff`}
                        alt={request.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-black text-gray-900 dark:text-white text-base leading-tight">{request.name}</h3>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium mt-1">
                          {request.handle}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleAcceptRequest(request.friendshipId || request.id)} className="py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-[#FF7566] text-white shadow-lg active:scale-95 transition-all">{t.friends_accept}</button>
                      <button onClick={() => handleDeclineRequest(request.friendshipId || request.id)} className="py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-gray-50 dark:bg-gray-800 text-gray-400 active:scale-95 transition-all">{t.friends_ignore}</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* My Network */}
          {search.length < 2 && (
            <section className="px-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[17px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{t.friends_network}</h2>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{myNetwork.length} {t.friends_tab.toUpperCase()}</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : myNetwork.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center text-gray-200 dark:text-gray-800 mb-6 border border-gray-100 dark:border-gray-800">
                    <Users size={40} />
                  </div>
                  <p className="text-gray-400 text-sm font-black uppercase tracking-widest">{t.friends_empty}</p>
                  <p className="text-gray-300 dark:text-gray-600 text-[11px] mt-2 px-12 leading-relaxed">{t.friends_empty_desc}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myNetwork.map(friend => (
                    <div key={friend.id} className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 relative">
                      <img
                        src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=FF7566&color=fff`}
                        alt={friend.name}
                        className="w-14 h-14 rounded-full object-cover bg-gray-50 dark:bg-gray-800"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-gray-900 dark:text-white text-[15px] leading-tight truncate">{friend.name}</h3>
                          {friend.status === 'pending' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[8px] font-black uppercase tracking-widest">{t.friends_pending || 'Pendiente'}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">{friend.handle}</p>
                      </div>
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === friend.id ? null : friend.id); }} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 text-gray-400 active:scale-95">
                          <MoreHorizontal size={18} />
                        </button>
                        {activeMenuId === friend.id && (
                          <div className="absolute right-0 top-12 z-[110]" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleUnfriend(friend.friendshipId || friend.id)} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl rounded-2xl py-3.5 px-6 flex items-center gap-3 whitespace-nowrap active:scale-95 transition-transform">
                              <UserMinus size={18} className="text-rose-500" />
                              <span className="text-xs font-black text-rose-500 uppercase tracking-widest">{t.friends_remove}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main >
      </div >
      {showNotifications && (
        <NotificationListModal
          onClose={() => setShowNotifications(false)}
          onNotificationUpdate={async () => {
            const data = await fetchNotifications(user.id);
            const unread = data.filter((n: any) => !n.is_read).length;
            setUnreadCount(unread);
            setHasUnread(unread > 0);
          }}
        />
      )}
    </>
  );
};
