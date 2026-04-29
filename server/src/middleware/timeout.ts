import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

const REQUEST_TIMEOUT_MS = 120000; // 120 seconds

export const requestTimeout = () => {
    return createMiddleware(async (c, next) => {
        let timeoutId: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(
                    new HTTPException(504, {
                        message: 'Gateway Timeout: Request took too long to process (Soft Limit)',
                    })
                );
            }, REQUEST_TIMEOUT_MS);
        });

        try {
            await Promise.race([next(), timeoutPromise]);
        } finally {
            clearTimeout(timeoutId!);
        }
    });
};
