import React, { createContext, FC, PropsWithChildren, useContext, useEffect } from 'react';
import { useFetcher, useFetchers, useParams } from 'react-router-dom';
import { usePrevious } from 'react-use';



const AIContext = createContext({
  generating: false,
  generateTests: () => { },
  generateTestsFromSpec: () => { },
  access: {
    enabled: false,
    loading: false,
  },
  progress: {
    total: 0,
    progress: 0,
  },
});

export const AIProvider: FC<PropsWithChildren> = ({ children }) => {
  const {
    organizationId,
    projectId,
    workspaceId,
  } = useParams() as {
    organizationId: string;
    projectId: string;
    workspaceId: string;
  };

  const [progress, setProgress] = React.useState({
    total: 0,
    progress: 0,
  });
  const aiAccessFetcher = useFetcher();
  const aiGenerateTestsFetcher = useFetcher();
  const aiGenerateTestsFromSpecFetcher = useFetcher();
  const loading = useFetchers().filter(loader => loader.formAction?.includes('/ai/generate/')).some(loader => loader.state !== 'idle');

  const loggedIn = false

  const prevProjectId = usePrevious(projectId);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const fetcherHasNotRun = aiAccessFetcher.state === 'idle' && !aiAccessFetcher.data;
    const projectIdHasChanged = prevProjectId !== projectId;

    if (fetcherHasNotRun || projectIdHasChanged) {
      aiAccessFetcher.submit({}, {
        method: 'post',
        action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/ai/access`,
      });
    }
  }, [aiAccessFetcher, organizationId, projectId, workspaceId, loggedIn, prevProjectId]);

  const isAIEnabled = aiAccessFetcher.data?.enabled ?? false;

  const aiGenerateTestsProgressStream = aiGenerateTestsFetcher.data as TransformStream;

  useEffect(() => {
    if (aiGenerateTestsProgressStream) {
      const progress = aiGenerateTestsProgressStream.readable;

      progress.pipeTo(new WritableStream({
        write: (chunk: any) => {
          setProgress(chunk);
        },
      }));
    }
  }, [aiGenerateTestsProgressStream]);

  const aiGenerateTestsFromSpecProgressStream = aiGenerateTestsFromSpecFetcher.data as TransformStream;

  useEffect(() => {
    if (aiGenerateTestsFromSpecProgressStream) {
      const progress = aiGenerateTestsFromSpecProgressStream.readable;

      progress.pipeTo(new WritableStream({
        write: (chunk: any) => {
          setProgress(chunk);
        },
      }));
    }
  }, [aiGenerateTestsFromSpecProgressStream]);

  return (
    <AIContext.Provider
      value={{
        generating: loading || (progress.total > 0 && progress.progress < progress.total),
        progress,
        generateTests: () => {
          aiGenerateTestsFetcher.submit({}, {
            method: 'post',
            action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/ai/generate/tests`,
          });
        },
        generateTestsFromSpec: () => {
          aiGenerateTestsFromSpecFetcher.submit({}, {
            method: 'post',
            action: `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/ai/generate/collection-and-tests`,
          });
        },
        access: {
          enabled: isAIEnabled,
          loading: aiAccessFetcher.state !== 'idle',
        },
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAIContext = () => useContext(AIContext);
