import { useQuery, useMutation } from '@tanstack/react-query';
import { getCities, postPredict } from '../api/forecasts';

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: getCities,
  });
}

export function usePredict() {
  return useMutation({
    mutationFn: (city: string) => postPredict(city),
  });
}
