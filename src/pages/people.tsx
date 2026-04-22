import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function PeoplePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const usersPerPage = 12;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.handle.toLowerCase().includes(query) ||
          user.display_name.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
    setPage(1);
  }, [searchQuery, users]);

  useEffect(() => {
    const startIndex = 0;
    const endIndex = page * usersPerPage;
    setDisplayedUsers(filteredUsers.slice(startIndex, endIndex));
  }, [filteredUsers, page]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users/all');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">People</h1>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or handle..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-gray-500">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            {searchQuery ? 'No users found matching your search.' : 'No users yet.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`}
                  className="card p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                      {user.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {user.display_name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">@{user.handle}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {user.total_screams} screams
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {displayedUsers.length < filteredUsers.length && (
              <div className="card p-6 text-center mt-4">
                <button
                  onClick={() => setPage(page + 1)}
                  className="btn-primary"
                >
                  Load More ({filteredUsers.length - displayedUsers.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
