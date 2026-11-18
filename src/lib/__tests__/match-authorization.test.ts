import { beforeEach, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ user: 'alice' as string | null, owner: 'bob', filters: {} as Record<string, string>, from: vi.fn(), match: vi.fn(() => []), email: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null } }) } }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: state.from }) }));
vi.mock('@/lib/matching', () => ({ matchItemAgainstRecalls: state.match, getSeverity: () => 'high' }));
vi.mock('@/lib/notifications', () => ({ sendRecallAlertEmail: state.email }));
import { POST } from '@/app/api/match/route';
const itemId = '11111111-1111-4111-8111-111111111111';
const request = (authorization?: string) => new NextRequest('https://example.test/api/match', {
  method: 'POST', headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) }, body: JSON.stringify({ inventory_item_id: itemId }),
});
beforeEach(() => {
  vi.clearAllMocks(); state.user = 'alice'; state.owner = 'bob'; state.filters = {};
  vi.stubEnv('CRON_SECRET', 'synthetic-cron');
  state.from.mockImplementation((table: string) => {
    if (table === 'active_recalls') return { select: async () => ({ data: [], error: null }) };
    if (table !== 'user_inventory') throw new Error('Unexpected side effect');
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { state.filters[key] = value; return query; },
      single: async () => ({ data: state.filters.user_id && state.filters.user_id !== state.owner ? null : { id: itemId, user_id: state.owner }, error: null }),
    };
    return query;
  });
});
test('unauthenticated request cannot read inventory', async () => {
  state.user = null;
  expect((await POST(request())).status).toBe(401);
  expect(state.from).not.toHaveBeenCalled();
});
test('another user cannot process victim inventory or trigger side effects', async () => {
  expect((await POST(request())).status).toBe(404);
  expect(state.filters).toEqual({ id: itemId, user_id: 'alice' });
  expect(state.match).not.toHaveBeenCalled(); expect(state.email).not.toHaveBeenCalled();
});
test('owner can match their own item', async () => {
  state.owner = 'alice';
  expect((await POST(request())).status).toBe(200); expect(state.match).toHaveBeenCalledOnce();
});
test('authorized internal cron keeps cross-user matching', async () => {
  state.user = null;
  expect((await POST(request('Bearer synthetic-cron'))).status).toBe(200);
  expect(state.filters).toEqual({ id: itemId }); expect(state.match).toHaveBeenCalledOnce();
});
