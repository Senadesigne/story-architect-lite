import * as admin from 'firebase-admin';
import { getEnv } from './env';

/**
 * Initialize Firebase Admin SDK
 * Handles FIREBASE_PRIVATE_KEY transformation for Render environment variables
 * where \n characters are stored as literal \\n strings
 */
export function initializeFirebaseAdmin(): void {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return;
  }

  const projectId = getEnv('FIREBASE_PROJECT_ID');
  const clientEmail = getEnv('FIREBASE_CLIENT_EMAIL');
  const rawPrivateKey = getEnv('FIREBASE_PRIVATE_KEY');

  if (!projectId || !clientEmail) {
    console.warn('⚠️  Firebase Admin SDK not initialized: Missing FIREBASE_PROJECT_ID or FIREBASE_CLIENT_EMAIL');
    return;
  }

  if (!rawPrivateKey || rawPrivateKey.length < 100) {
    console.error("CRITICAL ERROR: FIREBASE_PRIVATE_KEY is missing. Admin SDK not initialized.");
    return;
  }

  // Transform literal \n characters to actual newlines
  // Render stores environment variables with literal \n as \\n
  const correctedPrivateKey = rawPrivateKey.replace(/\\n/g, '\n');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: correctedPrivateKey,
      }),
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Get initialized Firebase Admin instance
 */
export function getFirebaseAdmin(): admin.app.App {
  if (admin.apps.length === 0) {
    initializeFirebaseAdmin();
  }
  return admin.app();
}

