import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { LogOut, AlertTriangle, MessageSquare } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDraftCount();
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        fetchDraftCount();
      } else {
        router.push('/auth');
      }
    } catch (error) {
      router.push('/auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchDraftCount = async () => {
    try {
      const response = await fetch('/api/drafts/count');
      if (response.ok) {
        const data = await response.json();
        setDraftCount(data.count);
      }
    } catch (error) {
      console.error('Fetch draft count error:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banned User Banner */}
      {user && user.is_banned === 1 && (
        <div className="bg-red-600 text-white px-4 py-3 text-center text-sm flex items-center justify-center gap-2">
          <AlertTriangle size={16} />
          <span>Your account has been banned. You cannot post, comment, or interact with content.</span>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-3xl">📢</span>
                <span className="text-xl font-semibold text-gray-900">Screamer</span>
              </Link>
              {user && (
                <>
                  <Link 
                    href="/people" 
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    People
                  </Link>
                  <Link 
                    href="/drafts" 
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Saved Screams {draftCount > 0 && <span className="ml-1 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">{draftCount}</span>}
                  </Link>
                  <Link
                    href="/threads"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                  >
                    <MessageSquare size={14} />
                    <span>Threads</span>
                  </Link>
                </>
              )}
            </div>

            {user && (
              <div className="flex items-center gap-4">
                <Link
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <span>{user.display_name}</span>
                  {user.is_admin === 1 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </Link>
                <button onClick={handleLogout} className="btn-secondary text-sm flex items-center gap-1.5">
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
