import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ctor: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  getStore: vi.fn(),
}));

vi.mock('@mastra/loggers', () => ({
  PinoLogger: class PinoLogger {
    constructor(options: any) {
      mocks.ctor(options);
    }
    info(message: string, context: Record<string, unknown>) {
      mocks.info(message, context);
    }
    warn(message: string, context: Record<string, unknown>) {
      mocks.warn(message, context);
    }
    error(message: string, context: Record<string, unknown>) {
      mocks.error(message, context);
    }
    debug(message: string, context: Record<string, unknown>) {
      mocks.debug(message, context);
    }
  },
}));

vi.mock('./request-storage', () => ({
  requestStorage: {
    getStore: mocks.getStore,
  },
}));

describe('logger.ts coverage branches', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('resolveLogLevel returns debug in development and info otherwise', async () => {
    delete process.env.LOG_LEVEL;
    process.env.NODE_ENV = 'development';
    vi.resetModules();
    const devModule = await import('./logger');
    expect(devModule.resolveLogLevel()).toBe('debug');

    process.env.NODE_ENV = 'test';
    vi.resetModules();
    const testModule = await import('./logger');
    expect(testModule.resolveLogLevel()).toBe('info');
  });

  it('resolveLogLevel ignores invalid LOG_LEVEL and falls back to NODE_ENV', async () => {
    process.env.LOG_LEVEL = 'invalid-level';
    process.env.NODE_ENV = 'development';
    vi.resetModules();
    const mod = await import('./logger');
    expect(mod.resolveLogLevel()).toBe('debug');

    process.env.NODE_ENV = 'production';
    vi.resetModules();
    const mod2 = await import('./logger');
    expect(mod2.resolveLogLevel()).toBe('info');
    delete process.env.LOG_LEVEL;
  });

  it('resolveLogLevel uses LOG_LEVEL env when set', async () => {
    process.env.LOG_LEVEL = 'warn';
    process.env.NODE_ENV = 'development';
    vi.resetModules();
    const mod = await import('./logger');
    expect(mod.resolveLogLevel()).toBe('warn');

    process.env.LOG_LEVEL = 'error';
    vi.resetModules();
    const mod2 = await import('./logger');
    expect(mod2.resolveLogLevel()).toBe('error');

    delete process.env.LOG_LEVEL;
  });

  it('getLogger caches PinoLogger instance per module name', async () => {
    process.env.NODE_ENV = 'test';
    vi.resetModules();
    const { getLogger } = await import('./logger');

    const l1 = getLogger('ModuleA');
    const l2 = getLogger('ModuleA');
    const l3 = getLogger('ModuleB');

    expect(l1).toBeDefined();
    expect(l2).toBeDefined();
    expect(l3).toBeDefined();
    expect(mocks.ctor).toHaveBeenCalledTimes(2); // ModuleA + ModuleB
  });

  it('injects correlationId into log context when request store has id', async () => {
    process.env.NODE_ENV = 'test';
    vi.resetModules();
    mocks.getStore.mockReturnValue({ correlationId: 'cid-123' });
    const { getLogger } = await import('./logger');
    const logger = getLogger('ModuleCID');

    logger.info('hello', { userId: 'u1' });

    expect(mocks.info).toHaveBeenCalledWith('hello', {
      userId: 'u1',
      correlationId: 'cid-123',
    });
  });

  it('overwrites context correlationId with request-store correlationId', async () => {
    process.env.NODE_ENV = 'test';
    vi.resetModules();
    mocks.getStore.mockReturnValue({ correlationId: 'cid-storage' });
    const { getLogger } = await import('./logger');
    const logger = getLogger('ModuleOverwrite');

    logger.warn('warn-msg', { correlationId: 'cid-context', feature: 'x' });

    expect(mocks.warn).toHaveBeenCalledWith('warn-msg', {
      correlationId: 'cid-storage',
      feature: 'x',
    });
  });

  it('uses empty object when no context and no correlation id', async () => {
    process.env.NODE_ENV = 'test';
    vi.resetModules();
    mocks.getStore.mockReturnValue(undefined);
    const { getLogger } = await import('./logger');
    const logger = getLogger('ModuleEmpty');

    logger.error('err-msg');
    logger.debug('dbg-msg', undefined);

    expect(mocks.error).toHaveBeenCalledWith('err-msg', {});
    expect(mocks.debug).toHaveBeenCalledWith('dbg-msg', {});
  });

  it('passes computed default level to PinoLogger constructor', async () => {
    process.env.NODE_ENV = 'development';
    vi.resetModules();
    const { getLogger } = await import('./logger');

    getLogger('DevModule');
    expect(mocks.ctor).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'DevModule',
        level: 'debug',
        formatters: expect.any(Object),
      })
    );

    process.env.NODE_ENV = 'production';
    vi.resetModules();
    const prodModule = await import('./logger');
    prodModule.getLogger('ProdModule');
    expect(mocks.ctor).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'ProdModule',
        level: 'info',
        formatters: expect.any(Object),
      })
    );
  });

  it('startTimer end returns elapsed milliseconds as number', async () => {
    process.env.NODE_ENV = 'test';
    vi.resetModules();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1250);

    const { startTimer } = await import('./logger');
    const timer = startTimer();

    expect(timer.end()).toBe(250);
    nowSpy.mockRestore();
  });

  it('STRUCTURED_LOG_FORMATTERS uses development when NODE_ENV is empty', async () => {
    process.env.NODE_ENV = '';
    vi.resetModules();
    const { STRUCTURED_LOG_FORMATTERS } = await import('./logger');
    const result = STRUCTURED_LOG_FORMATTERS.log({ msg: 'test' });
    expect(result.env).toBe('development');
  });

  it('startTimer endMs returns elapsed milliseconds as suffixed string', async () => {
    process.env.NODE_ENV = 'test';
    vi.resetModules();
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(2000).mockReturnValueOnce(2460);

    const { startTimer } = await import('./logger');
    const timer = startTimer();

    expect(timer.endMs()).toBe('460ms');
    nowSpy.mockRestore();
  });
});
