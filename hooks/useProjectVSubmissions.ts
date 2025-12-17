import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useToast } from '@/components/ToastContainer';




export function useProjectVSubmissions(search?: string) {
  return useQuery({
    queryKey: queryKeys.projectV.submissions(search),
    queryFn: () => apiClient.getProjectVSubmissions({ search }),
    staleTime: 30000, 
  });
}




export function useProjectVSubmission(id: string) {
  return useQuery({
    queryKey: queryKeys.projectV.submission(id),
    queryFn: () => apiClient.getProjectVSubmission(id),
    enabled: !!id, 
  });
}




export function useUpdateProjectVStatus() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, status, accountPostedIn }: {
      id: string;
      status: string;
      accountPostedIn?: string;
    }) => apiClient.updateProjectVStatus(id, status, accountPostedIn),

    
    onMutate: async ({ id, status }) => {
      
      await queryClient.cancelQueries({ queryKey: queryKeys.projectV.all });

      
      const previousSubmissions = queryClient.getQueryData(
        queryKeys.projectV.submissions()
      );

      
      queryClient.setQueryData(
        queryKeys.projectV.submissions(),
        (old: any) => {
          if (!old) return old;
          return old.map((s: any) =>
            s.id === id ? { ...s, status } : s
          );
        }
      );

      return { previousSubmissions };
    },

    onSuccess: () => {
      
      queryClient.invalidateQueries({ queryKey: queryKeys.projectV.all });
      showToast('Status updated successfully!', 'success');
    },

    onError: (error: any, variables, context) => {
      
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          queryKeys.projectV.submissions(),
          context.previousSubmissions
        );
      }
      showToast(error.response?.data?.error || 'Failed to update status', 'error');
    },
  });
}




export function useMarkChangesRequested() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) =>
      apiClient.markChangesRequested(id, feedback),

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectV.all });

      const previousSubmissions = queryClient.getQueryData(
        queryKeys.projectV.submissions()
      );

      queryClient.setQueryData(
        queryKeys.projectV.submissions(),
        (old: any) => {
          if (!old) return old;
          return old.map((s: any) =>
            s.id === id
              ? { ...s, hasChangesRequested: true, changesDone: false }
              : s
          );
        }
      );

      return { previousSubmissions };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectV.all });
      showToast('Changes requested successfully!', 'success');
    },

    onError: (error: any, variables, context) => {
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          queryKeys.projectV.submissions(),
          context.previousSubmissions
        );
      }
      showToast(error.response?.data?.error || 'Failed to request changes', 'error');
    },
  });
}




export function useMarkFinalChecks() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.markFinalChecks(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectV.all });

      const previousSubmissions = queryClient.getQueryData(
        queryKeys.projectV.submissions()
      );

      queryClient.setQueryData(
        queryKeys.projectV.submissions(),
        (old: any) => {
          if (!old) return old;
          return old.map((s: any) =>
            s.id === id ? { ...s, status: 'FINAL_CHECKS' } : s
          );
        }
      );

      return { previousSubmissions };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectV.all });
      showToast('Marked for final checks successfully!', 'success');
    },

    onError: (error: any, variables, context) => {
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          queryKeys.projectV.submissions(),
          context.previousSubmissions
        );
      }
      showToast(error.response?.data?.error || 'Failed to mark for final checks', 'error');
    },
  });
}




export function useDeleteProjectVSubmission() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteProjectVSubmission(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projectV.all });

      const previousSubmissions = queryClient.getQueryData(
        queryKeys.projectV.submissions()
      );

      
      queryClient.setQueryData(
        queryKeys.projectV.submissions(),
        (old: any) => {
          if (!old) return old;
          return old.filter((s: any) => s.id !== id);
        }
      );

      return { previousSubmissions, deletedId: id };
    },

    onSuccess: (_, deletedId, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projectV.all });

      
      const deletedSubmission = (context.previousSubmissions as any)?.find(
        (s: any) => s.id === deletedId
      );

      if (deletedSubmission) {
        showToast('Submission deleted', 'success', {
          label: 'Undo',
          onClick: () => {
            
            queryClient.setQueryData(
              queryKeys.projectV.submissions(),
              context.previousSubmissions
            );
            showToast('Deletion cancelled', 'info');
          }
        }, 10000); 
      }
    },

    onError: (error: any, variables, context) => {
      if (context?.previousSubmissions) {
        queryClient.setQueryData(
          queryKeys.projectV.submissions(),
          context.previousSubmissions
        );
      }
      showToast(error.response?.data?.error || 'Failed to delete submission', 'error');
    },
  });
}
