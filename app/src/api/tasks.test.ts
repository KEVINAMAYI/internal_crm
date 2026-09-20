import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildTask } from '@/test/factories'
import type { MockSupabaseClient } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', async () => {
  const { createSupabaseMock } = await import('@/test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '@/lib/supabase'
const mockSupabase = supabase as unknown as MockSupabaseClient

import { createTask, listTasks, updateTask } from './tasks'

beforeEach(() => mockSupabase.__reset())

describe('listTasks', () => {
  it('filters by assignee for the "mine" view', async () => {
    mockSupabase.__setTableResult('tasks', { data: [], error: null })
    const builder = mockSupabase.from('tasks')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listTasks({ view: 'mine', userId: 'user-1' })

    expect(builder._calls).toContainEqual({ method: 'eq', args: ['assignee_id', 'user-1'] })
  })

  it('filters by created_by for the "assignedByMe" view', async () => {
    mockSupabase.__setTableResult('tasks', { data: [], error: null })
    const builder = mockSupabase.from('tasks')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listTasks({ view: 'assignedByMe', userId: 'user-1' })

    expect(builder._calls).toContainEqual({ method: 'eq', args: ['created_by', 'user-1'] })
  })

  it('filters unlinked tasks with .is(merchant_id, null) for the "unlinked" view', async () => {
    mockSupabase.__setTableResult('tasks', { data: [], error: null })
    const builder = mockSupabase.from('tasks')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listTasks({ view: 'unlinked', userId: 'user-1' })

    expect(builder._calls).toContainEqual({ method: 'is', args: ['merchant_id', null] })
  })

  it('applies no assignee/created_by/unlinked filter for the "team" view', async () => {
    mockSupabase.__setTableResult('tasks', { data: [], error: null })
    const builder = mockSupabase.from('tasks')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listTasks({ view: 'team', userId: 'user-1' })

    expect(builder._calls.filter((c) => c.method === 'eq' || c.method === 'is')).toHaveLength(0)
  })

  it('applies optional status and merchantId filters', async () => {
    mockSupabase.__setTableResult('tasks', { data: [], error: null })
    const builder = mockSupabase.from('tasks')
    mockSupabase.from.mockReturnValueOnce(builder)

    await listTasks({ view: 'team', userId: 'user-1', status: 'done', merchantId: 'merchant-1' })

    expect(builder._calls).toContainEqual({ method: 'eq', args: ['status', 'done'] })
    expect(builder._calls).toContainEqual({ method: 'eq', args: ['merchant_id', 'merchant-1'] })
  })

  it('returns the task list on success', async () => {
    const task = buildTask()
    mockSupabase.__setTableResult('tasks', { data: [task], error: null })
    const result = await listTasks({ view: 'team', userId: 'user-1' })
    expect(result).toEqual([task])
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('tasks', { data: null, error: { message: 'denied' } })
    await expect(listTasks({ view: 'team', userId: 'user-1' })).rejects.toEqual({ message: 'denied' })
  })
})

describe('createTask', () => {
  it('inserts and returns the created task', async () => {
    const task = buildTask()
    mockSupabase.__setTableResult('tasks', { data: task, error: null })

    const result = await createTask({ title: task.title, created_by: 'user-1' })

    expect(result).toEqual(task)
  })

  it('throws on error', async () => {
    mockSupabase.__setTableResult('tasks', { data: null, error: { message: 'denied' } })
    await expect(createTask({ title: 'x', created_by: 'user-1' })).rejects.toEqual({ message: 'denied' })
  })
})

describe('updateTask', () => {
  it('updates and returns the patched task', async () => {
    const task = buildTask({ status: 'done' })
    mockSupabase.__setTableResult('tasks', { data: task, error: null })

    const result = await updateTask(task.id, { status: 'done' })

    expect(result).toEqual(task)
  })

  it('throws on error (e.g. an unrelated user updating someone else’s task)', async () => {
    mockSupabase.__setTableResult('tasks', { data: null, error: { message: 'denied' } })
    await expect(updateTask('id', { status: 'done' })).rejects.toEqual({ message: 'denied' })
  })
})
