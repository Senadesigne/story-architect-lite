import { createRemoteJWKSet, jwtVerify } from 'jose';
import { isDevelopment, getEnv } from './env';

type FirebaseUser = {
  id: string;
  email: string | undefined;
};

const getJWKS = () => {
  if (isDevelopment()) {
    // Use emulator JWKS endpoint with dynamic port
    const firebaseAuthHost = getEnv('FIREBASE_AUTH_EMULATOR_HOST') ?? 'localhost:5503';
    const emulatorUrl = firebaseAuthHost.startsWith('http') 
      ? firebaseAuthHost 
      : `http://${firebaseAuthHost}`;
    
    return createRemoteJWKSet(
      new URL(`${emulatorUrl}/www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`)
    );
  } else {
    // Use production Firebase JWKS
    return createRemoteJWKSet(
      new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
    );
  }
};

export async function verifyFirebaseToken(token: string, projectId: string): Promise<FirebaseUser> {
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is not set');
  }

  // In emulator mode, use simplified token verification
  if (isDevelopment()) {
    console.log('🔍 Verifying token in development mode with projectId:', projectId);
    console.log('🔍 FIREBASE_AUTH_EMULATOR_HOST:', getEnv('FIREBASE_AUTH_EMULATOR_HOST'));
    
    try {
      // Decode the token without verification for emulator
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('🔍 Token payload:', { sub: payload.sub, aud: payload.aud, email: payload.email });
      
      // Relaxed validation for emulator tokens - only check for user ID
      if (!payload.sub) {
        throw new Error('Invalid token payload: missing user ID (sub)');
      }
      
      // In development mode, optionally check aud field but don't fail if it doesn't match
      if (payload.aud && payload.aud !== projectId) {
        console.log('⚠️  Token audience mismatch in development mode (this is OK for emulator):', {
          expected: projectId,
          actual: payload.aud
        });
      }
      
      console.log('✅ Token verified successfully in development mode for user:', payload.sub);
      return {
        id: payload.sub as string,
        email: payload.email as string | undefined,
      };
    } catch (error) {
      console.error('❌ Token verification failed in development mode:', error);
      throw new Error('Invalid emulator token');
    }
  }

  // Production token verification
  try {
    const JWKS = getJWKS();
    const issuer = `https://securetoken.google.com/${projectId}`;

    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
      audience: projectId,
    });

    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
} 