import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';

export default function DraftDetailPage() {
  const router = useRouter();
  const { uuid } = router.query;
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uuid) {
      fetchDraft();
    }
  }, [uuid]);

  const fetchDraft = async () => {
    try {
      // INTENTIONALLY VULNERABLE: No IDOR protection - anyone can view any draft
      const response = await fetch(`/api/drafts/${uuid}`);
      if (response.ok) {
        const data = await response.json();
        setDraft(data);
      } else {
        router.push('/drafts');
      }
    } catch (error) {
      console.error('Fetch draft error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/drafts/publish/${uuid}`, {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/');
      } else {
        const error = await response.json();
      }
    } catch (error) {
      console.error('Publish draft error:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/drafts/${uuid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/drafts');
      } else {
        const error = await response.json();
      }
    } catch (error) {
      console.error('Delete draft error:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 text-center text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!draft) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 text-center text-gray-500">Draft not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/drafts"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Drafts
        </Link>

        <div className="card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-lg flex-shrink-0">
              {draft.emoji}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{draft.display_name}</div>
              <div className="text-sm text-gray-500">@{draft.handle}</div>
            </div>
          </div>

          <p className="text-gray-900 whitespace-pre-wrap mb-4">{draft.content}</p>

          <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
            <div>Created: {new Date(draft.created_at).toLocaleString()}</div>
            <div>Updated: {new Date(draft.updated_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handlePublish} className="btn-primary flex items-center gap-2">
            <Send size={16} />
            Publish Draft
          </button>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
            <Trash2 size={16} />
            Delete Draft
          </button>
        </div>
      </div>
    </Layout>
  );
}
