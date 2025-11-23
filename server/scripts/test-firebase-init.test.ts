
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as admin from 'firebase-admin';

// Mock getEnv
const mocks = vi.hoisted(() => ({
    getEnv: vi.fn(),
}));

vi.mock('../src/lib/env', () => ({
    getEnv: mocks.getEnv,
}));

// Mock firebase-admin
vi.mock('firebase-admin', () => {
    const initializeApp = vi.fn();
    const credential = {
        cert: vi.fn((creds) => creds),
    };
    return {
        default: {
            apps: [],
            initializeApp,
            credential,
            app: vi.fn(),
        },
        apps: [],
        initializeApp,
        credential,
        app: vi.fn(),
    };
});

import { initializeFirebaseAdmin } from '../src/lib/firebase-admin';

describe('initializeFirebaseAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset apps array
        (admin as any).default.apps = [];
    });

    it('should handle Base64 encoded private key', () => {
        const realKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZ\n-----END PRIVATE KEY-----';
        const base64Key = Buffer.from(realKey).toString('base64');

        mocks.getEnv.mockImplementation((key) => {
            if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
            if (key === 'FIREBASE_CLIENT_EMAIL') return 'test@example.com';
            if (key === 'FIREBASE_PRIVATE_KEY') return base64Key;
            return undefined;
        });

        initializeFirebaseAdmin();

        expect((admin as any).default.initializeApp).toHaveBeenCalledWith({
            credential: expect.objectContaining({
                privateKey: realKey,
            }),
        });
    });

    it('should handle literal \\n characters (legacy behavior)', () => {
        const rawKey = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZ\\n-----END PRIVATE KEY-----';
        const expectedKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZ\n-----END PRIVATE KEY-----';

        mocks.getEnv.mockImplementation((key) => {
            if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
            if (key === 'FIREBASE_CLIENT_EMAIL') return 'test@example.com';
            if (key === 'FIREBASE_PRIVATE_KEY') return rawKey;
            return undefined;
        });

        initializeFirebaseAdmin();

        expect((admin as any).default.initializeApp).toHaveBeenCalledWith({
            credential: expect.objectContaining({
                privateKey: expectedKey,
            }),
        });
    });

    it('should handle normal newlines', () => {
        const realKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZ\n-----END PRIVATE KEY-----';

        mocks.getEnv.mockImplementation((key) => {
            if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
            if (key === 'FIREBASE_CLIENT_EMAIL') return 'test@example.com';
            if (key === 'FIREBASE_PRIVATE_KEY') return realKey;
            return undefined;
        });

        initializeFirebaseAdmin();

        expect((admin as any).default.initializeApp).toHaveBeenCalledWith({
            credential: expect.objectContaining({
                privateKey: realKey,
            }),
        });
    });
});
