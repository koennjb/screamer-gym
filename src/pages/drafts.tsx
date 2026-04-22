import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import { Eye, Trash2, Send } from 'lucide-react';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/drafts');
      if (response.ok) {
        const data = await response.json();
        setDrafts(data);
      }
    } catch (error) {
      console.error('Fetch drafts error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uuid: string) => {
    try {
      const response = await fetch(`/api/drafts/${uuid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDrafts(drafts.filter(d => d.uuid !== uuid));
      }
    } catch (error) {
      console.error('Delete draft error:', error);
    }
  };

  const handlePublish = async (uuid: string) => {
    try {
      const response = await fetch(`/api/drafts/publish/${uuid}`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchDrafts();
      }
    } catch (error) {
      console.error('Publish draft error:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Drafts</h1>

        {loading ? (
          <div className="card p-8 text-center text-gray-500">Loading...</div>
        ) : drafts.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            No drafts yet. Start creating!
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <div key={draft.uuid} className="card p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 whitespace-pre-wrap mb-2">{draft.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Created: {new Date(draft.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(draft.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/drafts/${draft.uuid}`}
                      className="text-gray-600 hover:text-blue-600 transition-colors"
                      title="View"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      onClick={() => handlePublish(draft.uuid)}
                      className="text-gray-600 hover:text-green-600 transition-colors"
                      title="Publish"
                    >
                      <Send size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(draft.uuid)}
                      className="text-gray-600 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
