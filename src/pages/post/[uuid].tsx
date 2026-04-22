import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import PostCard from '../../components/PostCard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PostDetailPage() {
  const router = useRouter();
  const { uuid } = router.query;
  const [post, setPost] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (uuid) {
      fetchPost();
    }
  }, [uuid]);

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

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/uuid/${uuid}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Fetch post error:', error);
    } finally {
      setLoading(false);
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

  if (!post) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 text-center text-gray-500">Post not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Feed
        </Link>

        <PostCard 
          post={post} 
          currentUserId={currentUser?.id}
          onUpdate={fetchPost}
        />
      </div>
    </Layout>
  );
}
