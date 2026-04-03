/**
 * 簡易ロガー。開発時はすべてのレベルを出力し、本番では warn 以上のみ出力する。
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = import.meta.env.DEV;
const minLevel: LogLevel = isDev ? 'debug' : 'warn';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function createLogger(prefix: string) {
  const tag = `[${prefix}]`;

  return {
    debug(...args: unknown[]) {
      if (shouldLog('debug')) console.debug(tag, ...args);
    },
    info(...args: unknown[]) {
      if (shouldLog('info')) console.info(tag, ...args);
    },
    warn(...args: unknown[]) {
      if (shouldLog('warn')) console.warn(tag, ...args);
    },
    error(...args: unknown[]) {
      if (shouldLog('error')) console.error(tag, ...args);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
export { createLogger };
