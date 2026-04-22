import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import PostCard from '../../components/PostCard';

export default function ProfilePage() {
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchStats();
      fetchPosts();
      fetchCurrentUser();
      fetchFollowStatus();
      fetchFollowers();
      fetchFollowing();
    }
  }, [id]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/users/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditName(data.display_name);
        setEditEmoji(data.emoji);
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/users/${id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/posts/user/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Fetch posts error:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
      }
    } catch (error) {
      console.error('Fetch current user error:', error);
    }
  };

  const fetchFollowStatus = async () => {
    try {
      const response = await fetch(`/api/users/${id}/follow-status`);
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.following);
      }
    } catch (error) {
      console.error('Fetch follow status error:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/users/${id}/follow`, { method });
      if (response.ok) {
        setIsFollowing(!isFollowing);
        fetchStats();
        fetchFollowers();
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: editName, emoji: editEmoji }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Update profile error:', error);
    }
  };

  const fetchFollowers = async () => {
    try {
      const response = await fetch(`/api/users/${id}/followers`);
      if (response.ok) {
        const data = await response.json();
        setFollowers(data);
      }
    } catch (error) {
      console.error('Load followers error:', error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const response = await fetch(`/api/users/${id}/following`);
      if (response.ok) {
        const data = await response.json();
        setFollowing(data);
      }
    } catch (error) {
      console.error('Load following error:', error);
    }
  };

  if (!profile || !stats) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="text-6xl">{profile.emoji}</div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input"
                    placeholder="Display name"
                  />
                  <input
                    type="text"
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    className="input"
                    placeholder="Emoji"
                    maxLength={2}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleUpdateProfile} className="btn-primary">
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                  <p className="text-gray-500">@{profile.handle}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-4 mt-4">
                    <div className="text-sm">
                      <span className="font-bold">{stats.followers}</span> Followers
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">{stats.following}</span> Following
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">{stats.total_posts}</span> Screams
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">{stats.total_likes}</span> Likes
                    </div>
                  </div>

                  <div className="mt-4">
                    {isOwnProfile ? (
                      <button onClick={() => setIsEditing(true)} className="btn-secondary">
                        Edit Profile
                      </button>
                    ) : (
                      <button
                        onClick={handleFollow}
                        className={isFollowing ? 'btn-secondary' : 'btn-primary'}
                      >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Social Connections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Followers */}
          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4">Followers ({stats?.followers || 0})</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {followers.length === 0 ? (
                <p className="text-gray-500 text-sm">No followers yet</p>
              ) : (
                followers.map((follower) => (
                  <Link
                    key={follower.id}
                    href={`/profile/${follower.id}`}
                    className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <span className="text-2xl">{follower.emoji}</span>
                    <div>
                      <p className="font-semibold">{follower.display_name}</p>
                      <p className="text-sm text-gray-500">@{follower.handle}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Following */}
          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4">Following ({stats?.following || 0})</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {following.length === 0 ? (
                <p className="text-gray-500 text-sm">Not following anyone yet</p>
              ) : (
                following.map((followed) => (
                  <Link
                    key={followed.id}
                    href={`/profile/${followed.id}`}
                    className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <span className="text-2xl">{followed.emoji}</span>
                    <div>
                      <p className="font-semibold">{followed.display_name}</p>
                      <p className="text-sm text-gray-500">@{followed.handle}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Screams</h2>
          {posts.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">No screams yet</div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
                onDelete={() => setPosts(posts.filter((p) => p.id !== post.id))}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
