import * as admin from 'firebase-admin';
import { getEnv } from './env.js';

/**
 * Initialize Firebase Admin SDK
 * Handles FIREBASE_PRIVATE_KEY transformation for Render environment variables
 * Supports both Base64 encoded keys (preferred) and literal \n characters
 */
export function initializeFirebaseAdmin(): void {
  // Handle ESM/CJS interop issue where admin might be under .default
  const firebase = (admin as any).default || admin;

  // Check if already initialized
  if (firebase.apps.length > 0) {
    return;
  }

  const projectId = getEnv('FIREBASE_PROJECT_ID');

  // CHECK FOR EMULATOR MODE FIRST
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost) {
    console.log(`🧪 Detected FIREBASE_AUTH_EMULATOR_HOST=${emulatorHost}. Initializing in Emulator Mode.`);

    // In emulator mode, we don't need real credentials
    firebase.initializeApp({
      projectId: projectId || 'demo-project',
    });

    console.log('✅ Firebase Admin SDK initialized in EMULATOR mode');
    return;
  }

  const clientEmail = getEnv('FIREBASE_CLIENT_EMAIL');
  const rawPrivateKey = getEnv('FIREBASE_PRIVATE_KEY');

  if (!projectId || !clientEmail) {
    console.warn('⚠️  Firebase Admin SDK not initialized: Missing FIREBASE_PROJECT_ID or FIREBASE_CLIENT_EMAIL');
    return;
  }

  if (!rawPrivateKey || rawPrivateKey.length < 10) {
    console.error("CRITICAL ERROR: FIREBASE_PRIVATE_KEY is missing or too short. Admin SDK not initialized.");
    return;
  }

  let correctedPrivateKey = rawPrivateKey;

  // STRATEGY 1: Try Base64 decoding (Preferred)
  // Check if it looks like base64 (no spaces, reasonable length, valid chars)
  // A very simple check is to see if it DOESN'T contain spaces and DOESN'T contain -----BEGIN PRIVATE KEY-----
  const isLikelyBase64 = !rawPrivateKey.includes(' ') && !rawPrivateKey.includes('-----BEGIN');

  if (isLikelyBase64) {
    try {
      const decoded = Buffer.from(rawPrivateKey, 'base64').toString('utf-8');
      if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
        console.log('🔑 Detected Base64 encoded private key, decoding...');
        correctedPrivateKey = decoded;
      }
    } catch (e) {
      console.warn('⚠️ Failed to decode private key as Base64, falling back to string replacement');
    }
  }

  // STRATEGY 2: Handle literal \n characters (Render default behavior for some inputs)
  // If we haven't successfully decoded a valid key yet (or if it wasn't base64), ensure \n are real newlines
  if (!correctedPrivateKey.includes('\n') && correctedPrivateKey.includes('\\n')) {
    console.log('📝 Detected literal \\n characters in private key, replacing with actual newlines...');
    correctedPrivateKey = correctedPrivateKey.replace(/\\n/g, '\n');
  }

  try {
    firebase.initializeApp({
      credential: firebase.credential.cert({
        projectId,
        clientEmail,
        privateKey: correctedPrivateKey,
      }),
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    // Don't throw here to allow server to start without Firebase if needed, 
    // but in production this usually means auth won't work.
    // throw error; 
  }
}

/**
 * Get initialized Firebase Admin instance
 */
export function getFirebaseAdmin(): admin.app.App {
  const firebase = (admin as any).default || admin;

  if (firebase.apps.length === 0) {
    initializeFirebaseAdmin();
  }
  return firebase.app();
}

