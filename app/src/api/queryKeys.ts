export const queryKeys = {
  merchants: {
    list: (filters: { q?: string; status?: string; owner?: string; page: number }) =>
      ['merchants', 'list', filters] as const,
    detail: (id: string) => ['merchants', 'detail', id] as const,
    summary: (id: string) => ['merchants', 'summary', id] as const,
  },
  contacts: {
    list: (merchantId: string) => ['contacts', merchantId] as const,
  },
  transactions: {
    list: (merchantId: string, page: number, filters: { status?: string }) =>
      ['transactions', merchantId, page, filters] as const,
  },
  tickets: {
    forMerchant: (merchantId: string) => ['tickets', 'merchant', merchantId] as const,
    queue: (filters: Record<string, unknown>) => ['tickets', 'queue', filters] as const,
  },
  activities: {
    list: (merchantId: string) => ['activities', merchantId] as const,
  },
  tasks: {
    list: (filters: Record<string, unknown>) => ['tasks', 'list', filters] as const,
  },
  profiles: {
    all: () => ['profiles', 'all'] as const,
    me: (userId: string | undefined) => ['profiles', 'me', userId] as const,
  },
  search: {
    global: (q: string) => ['search', 'global', q] as const,
  },
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
    recentActivity: (limit: number) => ['dashboard', 'recent-activity', limit] as const,
  },
  settings: {
    system: () => ['settings', 'system'] as const,
  },
} as const
