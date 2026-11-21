import { MongoClient } from 'mongodb';

export async function connectDatabase({
  mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/notehub',
  dbName,
} = {}) {
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = dbName ? client.db(dbName) : client.db();
    await db.command({ ping: 1 });
    await Promise.all([
      db.collection('users').createIndex({ id: 1 }, { unique: true }),
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('users').createIndex({ studentIdKey: 1 }, { unique: true }),
      db.collection('notes').createIndex({ id: 1 }, { unique: true }),
      db.collection('notes').createIndex({ ownerId: 1, archived: 1 }),
      db.collection('comments').createIndex({ id: 1 }, { unique: true }),
      db.collection('comments').createIndex({ noteId: 1 }),
      db.collection('favorites').createIndex({ userId: 1 }, { unique: true }),
      db.collection('notifications').createIndex({ userId: 1, createdAt: -1 }),
      db.collection('passwordResets').createIndex({ email: 1 }, { unique: true }),
      db.collection('passwordResets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('loginAttempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
    return { client, db };
  } catch (error) {
    await client.close();
    throw error;
  }
}
