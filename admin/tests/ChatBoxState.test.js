import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatBoxState from '../src/common/stores/ChatBoxState.js';
import BackendHostURLState from '../src/common/stores/BackendHostURLState.js';

describe('ChatBoxState.sendChat', () => {
  beforeEach(() => {
    ChatBoxState.setState({
      history: [],
      question: '',
      isOpen: false,
      isLoading: false,
      streamingAnswer: null,
    });
  });

  it('uses the current BackendHostURLState value for the fetch URL', async () => {
    BackendHostURLState.getState().setBackendHost('https://chat.example/api/v1');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          releaseLock: vi.fn(),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await ChatBoxState.getState().sendChat('hello');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://chat.example/api/v1/chat/stream');

    vi.unstubAllGlobals();
  });

  it('picks up host changes between calls (no stale const)', async () => {
    BackendHostURLState.getState().setBackendHost('https://first.example/api/v1');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          releaseLock: vi.fn(),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await ChatBoxState.getState().sendChat('first');
    BackendHostURLState.getState().setBackendHost('https://second.example/api/v1');
    await ChatBoxState.getState().sendChat('second');

    expect(fetchMock.mock.calls[0][0]).toBe('https://first.example/api/v1/chat/stream');
    expect(fetchMock.mock.calls[1][0]).toBe('https://second.example/api/v1/chat/stream');

    vi.unstubAllGlobals();
  });
});
