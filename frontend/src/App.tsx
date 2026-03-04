import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface HealthStatus {
  status: string;
  timestamp: string;
  application: string;
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkHealth = useCallback((path: string) => {
    setLoading(true);
    apiClient
      .get<HealthStatus>(path)
      .then((data) => {
        if (data && typeof data === 'object') {
          setHealth(data);
        } else {
          setHealth(null);
        }
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
        setHealth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkHealth('/health');
  }, [checkHealth]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="rounded-lg border bg-card p-8 shadow-sm max-w-md w-full space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">TuneBoard</h1>
          <h2 className="text-lg font-semibold text-muted-foreground">
            System Health Check
          </h2>

          {/* Backend status */}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Connecting to backend...
            </div>
          )}

          {health && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium text-foreground">
                  Backend: {health.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Application: {health.application}
              </p>
              <p className="text-sm text-muted-foreground">
                Timestamp: {health.timestamp}
              </p>
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="font-medium text-destructive">
                  Backend: DOWN
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {/* Frontend status */}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="font-medium text-foreground">
              Frontend: Running
            </span>
          </div>
        </div>

        {/* Retry button */}
        <div className="space-x-2">
          <button
            onClick={() => checkHealth('/health')}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Re-check
          </button>
                  <button
            onClick={() => checkHealth('/health/error')}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Re-check-error
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
