import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Users, Ban, Trash2, Activity, MessageSquare, Heart, FileText, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banHandle, setBanHandle] = useState('');
  const [deletePostId, setDeletePostId] = useState('');
  const [actionResult, setActionResult] = useState('');

  useEffect(() => {
    fetchStats();
    fetchActivities();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/admin/activity?limit=50');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Fetch activities error:', error);
    }
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banHandle.trim()) return;

    try {
      const response = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: banHandle.trim(), banned: true }),
      });

      const data = await response.json();
      if (response.ok) {
        setActionResult(`✅ Successfully banned @${banHandle}`);
        setBanHandle('');
        fetchStats();
        fetchActivities();
      } else {
        setActionResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setActionResult('❌ Network error');
    }
  };

  const handleUnbanUser = async (handle: string) => {
    try {
      const response = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, banned: false }),
      });

      if (response.ok) {
        setActionResult(`✅ Successfully unbanned @${handle}`);
        fetchStats();
        fetchActivities();
      }
    } catch (error) {
      setActionResult('❌ Network error');
    }
  };

  const handleDeletePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePostId.trim()) return;

    try {
      const response = await fetch('/api/admin/delete-post', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: parseInt(deletePostId) }),
      });

      const data = await response.json();
      if (response.ok) {
        setActionResult(`✅ Successfully deleted post #${deletePostId}`);
        setDeletePostId('');
        fetchStats();
        fetchActivities();
      } else {
        setActionResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setActionResult('❌ Network error');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-blue-600" />
              <span className="text-xs text-gray-600">Users</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.stats?.total_users}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ban size={18} className="text-red-600" />
              <span className="text-xs text-gray-600">Banned</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.stats?.banned_users}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-green-600" />
              <span className="text-xs text-gray-600">Posts</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.stats?.total_posts}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={18} className="text-purple-600" />
              <span className="text-xs text-gray-600">Comments</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.stats?.total_comments}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={18} className="text-pink-600" />
              <span className="text-xs text-gray-600">Likes</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.stats?.total_likes}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={18} className="text-gray-600" />
              <span className="text-xs text-gray-600">Activity</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats?.stats?.total_activities}</div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Ban size={18} />
              <h2 className="text-lg font-semibold text-gray-900">Ban User</h2>
            </div>
            <form onSubmit={handleBanUser} className="space-y-3">
              <input
                type="text"
                value={banHandle}
                onChange={(e) => setBanHandle(e.target.value)}
                placeholder="Enter user handle"
                className="input"
              />
              <button type="submit" className="btn-danger w-full">
                Ban User
              </button>
            </form>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 size={18} />
              <h2 className="text-lg font-semibold text-gray-900">Delete Post</h2>
            </div>
            <form onSubmit={handleDeletePost} className="space-y-3">
              <input
                type="number"
                value={deletePostId}
                onChange={(e) => setDeletePostId(e.target.value)}
                placeholder="Enter post ID"
                className="input"
              />
              <button type="submit" className="btn-danger w-full">
                Delete Post
              </button>
            </form>
          </div>
        </div>

        {actionResult && (
          <div className={`card p-4 text-center text-sm ${
            actionResult.includes('✅') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {actionResult}
          </div>
        )}

        {/* Recent Users */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Username</th>
                  <th className="px-4 py-2 text-left">Handle</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recent_users?.map((user: any) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-2">{user.id}</td>
                    <td className="px-4 py-2">{user.username}</td>
                    <td className="px-4 py-2">@{user.handle}</td>
                    <td className="px-4 py-2">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      {user.is_banned === 1 ? (
                        <span className="text-red-600 font-semibold">BANNED</span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                      {user.is_admin === 1 && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {user.is_banned === 1 ? (
                        <button
                          onClick={() => handleUnbanUser(user.handle)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setBanHandle(user.handle);
                          }}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Log */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
            <span className="text-xs text-gray-500">Last 50 actions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Resource</th>
                  <th className="px-4 py-2 text-left">Details</th>
                  <th className="px-4 py-2 text-left">IP</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity: any) => (
                  <tr key={activity.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {new Date(activity.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {activity.username || <span className="text-gray-400">anonymous</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        activity.action.includes('admin') 
                          ? 'bg-red-100 text-red-800'
                          : activity.action.includes('delete')
                            ? 'bg-orange-100 text-orange-800'
                            : activity.action.includes('create')
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}>
                        {activity.action}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {activity.resource_type && (
                        <>
                          {activity.resource_type} #{activity.resource_id}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 max-w-md truncate">
                      {activity.details}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {activity.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Posters */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Posters</h2>
          <div className="space-y-2">
            {stats?.top_posters?.map((user: any, index: number) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                  <div className="text-2xl">{user.emoji}</div>
                  <div>
                    <div className="font-semibold">{user.display_name}</div>
                    <div className="text-sm text-gray-500">@{user.handle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{user.total_screams}</div>
                    <div className="text-xs text-gray-500">screams</div>
                  </div>
                  {user.is_banned === 1 && (
                    <span className="text-red-600 text-xs font-semibold">BANNED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
