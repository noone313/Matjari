import { describe, it, expect } from 'vitest';
import { reducer } from './use-toast';

// ─── use-toast reducer ──────────────────────────────────────────────────────
describe('toast reducer', () => {
  const makeToast = (id: string) => ({ id, open: true, title: `Toast ${id}` } as any);

  it('ADD_TOAST يضيف toast ويحدّد العدد', () => {
    const state = { toasts: [] };
    const result = reducer(state, { type: 'ADD_TOAST', toast: makeToast('1') });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('1');
  });

  it('ADD_TOAST يقصّ على TOAST_LIMIT (1)', () => {
    const state = { toasts: [makeToast('old')] };
    const result = reducer(state, { type: 'ADD_TOAST', toast: makeToast('new') });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('new');
  });

  it('UPDATE_TOAST يحدث toast موجود', () => {
    const state = { toasts: [makeToast('1')] };
    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'Updated' },
    });
    expect(result.toasts[0].title).toBe('Updated');
  });

  it('UPDATE_TOAST لا ي affect toast غير موجود', () => {
    const state = { toasts: [makeToast('1')] };
    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '999', title: 'Updated' },
    });
    expect(result.toasts[0].title).toBe('Toast 1');
  });

  it('DISMISS_TOAST يغلق toast محدد', () => {
    const state = { toasts: [makeToast('1'), makeToast('2')] };
    const result = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(result.toasts.find((t) => t.id === '1')?.open).toBe(false);
  });

  it('DISMISS_TOAST بدون toastId يغلق كل الـ toasts', () => {
    const state = { toasts: [makeToast('1'), makeToast('2')] };
    const result = reducer(state, { type: 'DISMISS_TOAST' });
    result.toasts.forEach((t) => expect(t.open).toBe(false));
  });

  it('REMOVE_TOAST يحذف toast محدد', () => {
    const state = { toasts: [makeToast('1'), makeToast('2')] };
    const result = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('2');
  });

  it('REMOVE_TOAST بدون toastId يحذف كل الـ toasts', () => {
    const state = { toasts: [makeToast('1')] };
    const result = reducer(state, { type: 'REMOVE_TOAST' });
    expect(result.toasts).toHaveLength(0);
  });
});
