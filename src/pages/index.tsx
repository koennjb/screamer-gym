import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newScream, setNewScream] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 20;

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPosts(1);
  }, [feedType]);

  useEffect(() => {
    if (page > 1) {
      fetchPosts(page);
    }
  }, [page]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  };

  const fetchPosts = async (currentPage: number) => {
    try {
      const endpoint = feedType === 'all' ? '/api/feed/global' : '/api/feed/following';
      const response = await fetch(`${endpoint}?page=${currentPage}&limit=${postsPerPage}`);
      if (response.ok) {
        const data = await response.json();
        if (currentPage === 1) {
          setPosts(data);
        } else {
          setPosts([...posts, ...data]);
        }
        setHasMore(data.length === postsPerPage);
      }
    } catch (error) {
      console.error('Fetch posts error:', error);
    }
  };

  const handlePostScream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScream.trim() || loading) return;

    // Client-side check for banned users (intentionally weak)
    if (currentUser?.is_banned === 1) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newScream }),
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts([newPost, ...posts]);
        setNewScream('');
        setPage(1);
      }
    } catch (error) {
      console.error('Post error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!newScream.trim() || loading) return;

    // Client-side check for banned users
    if (currentUser?.is_banned === 1) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newScream }),
      });

      if (response.ok) {
        setNewScream('');
      }
    } catch (error) {
      console.error('Save draft error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Feed Type Selector */}
        <div className="card p-3">
          <div className="flex gap-2">
            <button
              onClick={() => setFeedType('all')}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                feedType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Screams
            </button>
            <button
              onClick={() => setFeedType('following')}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                feedType === 'following'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Following
            </button>
          </div>
        </div>

        {/* New Scream Form */}
        <div className="card p-4">
          {currentUser?.is_banned === 1 ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm text-center">
              You are banned and cannot scream.
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={newScream}
                onChange={(e) => setNewScream(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                maxLength={280}
              />
              <div className="flex justify-between items-center">
                <span className={`text-sm ${newScream.length > 240 ? 'text-red-600' : 'text-gray-500'}`}>
                  {newScream.length}/280
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDraft}
                    disabled={!newScream.trim() || loading}
                    className="btn-secondary disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save for Later'}
                  </button>
                  <button
                    onClick={handlePostScream}
                    disabled={!newScream.trim() || loading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {loading ? 'Screaming...' : 'Scream! 📢'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              {feedType === 'following'
                ? 'No screams from people you follow. Try following some users!'
                : 'No screams yet. Be the first to scream!'}
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUser?.id}
                  onDelete={() => setPosts(posts.filter((p) => p.id !== post.id))}
                />
              ))}
              
              {hasMore && (
                <div className="card p-6 text-center">
                  <button
                    onClick={() => setPage(page + 1)}
                    className="btn-primary"
                  >
                    Load More Screams
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
