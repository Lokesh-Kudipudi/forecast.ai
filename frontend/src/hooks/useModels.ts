import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getModels, promoteModel } from '../api/models';

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: getModels,
  });
}

export function usePromoteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, version }: { name: string; version: string }) =>
      promoteModel(name, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}
