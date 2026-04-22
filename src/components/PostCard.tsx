import { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Trash2, ExternalLink } from 'lucide-react';

interface PostCardProps {
  post: any;
  currentUserId?: number;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export default function PostCard({ post, currentUserId, onDelete, onUpdate }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);

  const isOwner = currentUserId === post.author_id;

  const handleLike = async () => {
    // Don't allow liking own posts
    if (isOwner) {
      return;
    }

    try {
      if (isLiked) {
        await fetch(`/api/posts/${post.id}/like`, { method: 'DELETE' });
        setIsLiked(false);
        setLikeCount((prev: number) => prev - 1);
      } else {
        await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
        setIsLiked(true);
        setLikeCount((prev: number) => prev + 1);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setComments([newComment, ...comments]);
        setCommentText('');
        setCommentCount((prev: number) => prev + 1);
      }
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    try {
      const response = await fetch(`/api/posts/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
        setShowComments(true);
      }
    } catch (error) {
      console.error('Load comments error:', error);
    }
  };

  const handleDeletePost = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (response.ok && onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-lg flex-shrink-0">
          {post.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <Link href={`/profile/${post.author_id}`} className="hover:underline">
              <span className="font-medium text-gray-900">{post.display_name}</span>
              <span className="text-gray-500 ml-2 text-sm">@{post.handle}</span>
            </Link>
            <div className="flex items-center gap-2">
              {post.uuid && (
                <Link 
                  href={`/post/${post.uuid}`} 
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="View post"
                >
                  <ExternalLink size={16} />
                </Link>
              )}
              {isOwner && (
                <button 
                  onClick={handleDeletePost} 
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 text-gray-900 whitespace-pre-wrap">{post.content}</p>

          <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
            <button
              onClick={handleLike}
              disabled={isOwner}
              className={`flex items-center gap-1.5 transition-colors ${
                isOwner 
                  ? 'cursor-not-allowed opacity-50' 
                  : isLiked 
                    ? 'text-red-600 hover:text-red-700' 
                    : 'hover:text-red-600'
              }`}
              title={isOwner ? "Can't like your own post" : ''}
            >
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
              <span>{likeCount}</span>
            </button>
            <button
              onClick={loadComments}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
            >
              <MessageCircle size={18} />
              <span>{commentCount}</span>
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          {showComments && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <form onSubmit={handleComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="input text-sm"
                  maxLength={280}
                />
                <button type="submit" className="btn-primary text-sm">
                  Post
                </button>
              </form>

              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{comment.emoji}</span>
                      <span className="font-semibold text-sm">{comment.display_name}</span>
                      <span className="text-gray-500 text-xs">@{comment.handle}</span>
                    </div>
                    <p className="mt-1 text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
