import { Context, Next } from 'hono';
import { isDevelopment } from '../utils';

// Disable playground in production
export const disablePlayground = async (c: Context, next: Next) => {
  if (isDevelopment()) {
    return await next();
  }

  const playgroundPaths = ['/workflows', '/tools', '/networks', '/agents'];

  for (const path of playgroundPaths) {
    if (c.req.path.startsWith(path) || c.req.path === '/') {
      return new Response('Not found', { status: 404 });
    }
  }

  await next();
};

// Disable swagger in production
export const disableSwagger = {
  handler: async (c: Context, next: Next) => {
    if (isDevelopment()) {
      return await next();
    }

    return new Response('Not found', { status: 404 });
  },
  path: '/swagger-ui',
};
