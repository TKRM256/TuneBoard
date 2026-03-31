import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { SettingSheetForm } from '@/features/setting-sheet/components/SettingSheetForm';
import { usePublicLiveData } from '../hooks/usePublicLiveData';

export const PublicLivePage = () => {
  const { publicToken, submissionId } = useParams<{ publicToken: string; submissionId?: string }>();
  const { errorMessage, isLoading, live, submission } = usePublicLiveData(publicToken, submissionId);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">公開ライブを読み込み中です...</div>;
  }

  if (!live) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <h1 className="text-2xl font-semibold">TuneBoard</h1>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!publicToken) {
    return null;
  }

  return <SettingSheetForm key={`${publicToken}:${submissionId ?? 'new'}`} publicToken={publicToken} live={live} submission={submission} />;
};