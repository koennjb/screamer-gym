import db from './db';
import bcrypt from 'bcryptjs';
import { generateUUID } from './uuid';
import seedUsers from '../data/seed-users.json';
import seedPosts from '../data/seed-posts.json';
import seedComments from '../data/seed-comments.json';

export function seedDatabase() {
  // Check if data already exists
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };
  if (existingUsers.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database with dummy data...');

  // Insert users
  const userIds: number[] = [];
  for (const user of seedUsers) {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    const result = db.prepare(`
      INSERT INTO accounts (username, password, handle, display_name, emoji)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.username, hashedPassword, user.handle, user.display_name, user.emoji);
    
    userIds.push(result.lastInsertRowid as number);
  }

  console.log(`Seeded ${userIds.length} users`);

  // Insert posts - each user creates multiple posts
  const postIds: number[] = [];
  let postIndex = 0;
  
  for (let i = 0; i < 200; i++) {
    const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
    const content = seedPosts[postIndex % seedPosts.length];
    const uuid = generateUUID();
    
    const result = db.prepare(`
      INSERT INTO posts (uuid, content, author_id, created_at)
      VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'))
    `).run(uuid, content, randomUserId, Math.floor(Math.random() * 720)); // Posts from last 30 days
    
    postIds.push(result.lastInsertRowid as number);
    postIndex++;
  }

  console.log(`Seeded ${postIds.length} posts`);

  // Update total_screams for each user
  db.prepare(`
    UPDATE accounts SET total_screams = (
      SELECT COUNT(*) FROM posts WHERE posts.author_id = accounts.id
    )
  `).run();

  // Insert comments - random comments on random posts
  for (let i = 0; i < 300; i++) {
    const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
    const randomPostId = postIds[Math.floor(Math.random() * postIds.length)];
    const comment = seedComments[Math.floor(Math.random() * seedComments.length)];
    
    db.prepare(`
      INSERT INTO comments (content, author_id, post_id, created_at)
      VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'))
    `).run(comment, randomUserId, randomPostId, Math.floor(Math.random() * 720));
  }

  // Update comment counts
  db.prepare(`
    UPDATE posts SET comment_count = (
      SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id
    )
  `).run();

  console.log('Seeded 300 comments');

  // Insert likes - random likes on random posts
  const likeSet = new Set<string>();
  let likesAdded = 0;
  
  while (likesAdded < 500) {
    const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
    const randomPostId = postIds[Math.floor(Math.random() * postIds.length)];
    const key = `${randomUserId}-${randomPostId}`;
    
    // Check if user is not liking their own post
    const post = db.prepare('SELECT author_id FROM posts WHERE id = ?').get(randomPostId) as { author_id: number };
    
    if (!likeSet.has(key) && post.author_id !== randomUserId) {
      try {
        db.prepare(`
          INSERT INTO likes (post_id, user_id, liked_at)
          VALUES (?, ?, datetime('now', '-' || ? || ' hours'))
        `).run(randomPostId, randomUserId, Math.floor(Math.random() * 720));
        
        likeSet.add(key);
        likesAdded++;
      } catch (err) {
        // Duplicate, skip
      }
    }
  }

  // Update like counts
  db.prepare(`
    UPDATE posts SET like_count = (
      SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id
    )
  `).run();

  console.log('Seeded 500 likes');

  // Create some follower relationships
  const followerSet = new Set<string>();
  let followersAdded = 0;
  
  while (followersAdded < 100) {
    const follower = userIds[Math.floor(Math.random() * userIds.length)];
    const following = userIds[Math.floor(Math.random() * userIds.length)];
    const key = `${follower}-${following}`;
    
    if (follower !== following && !followerSet.has(key)) {
      try {
        db.prepare(`
          INSERT INTO followers (follower_id, following_id)
          VALUES (?, ?)
        `).run(follower, following);
        
        followerSet.add(key);
        followersAdded++;
      } catch (err) {
        // Duplicate, skip
      }
    }
  }

  console.log('Seeded 100 follower relationships');
  console.log('Database seeding complete! 🎉');
}
