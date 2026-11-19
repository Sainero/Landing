// Протокол окон Slideria: так сайт листает презентацию во фрейме и узнаёт, какой слайд открыт
import { describe, expect, it, vi } from 'vitest';
import { readEnvelope, send, type Envelope } from '@/entities/deck/lib/protocol';

const envelope = (over: Partial<Envelope> = {}): Envelope => ({ ns: 'htmlpptx', deck: 'slideria', id: 'x:1', from: 'deck-window', msg: { type: 'goto', index: 3 }, ...over });

describe('send', () => {
  it('конверт с отправителем: новый движок отвечает адресно и без него падает', () => {
    const win = { postMessage: vi.fn() } as unknown as Window;
    send(win, 'slideria', { type: 'hello' });
    const [env] = (win.postMessage as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(env).toMatchObject({ ns: 'htmlpptx', deck: 'slideria', msg: { type: 'hello' } });
    expect(typeof env.from).toBe('string');
    expect(env.id.startsWith(env.from + ':')).toBe(true);
  });

  it('без окна ничего не делает', () => {
    expect(() => send(null, 'slideria', { type: 'hello' })).not.toThrow();
  });
});

describe('readEnvelope', () => {
  it('принимает сообщение своей презентации', () => {
    expect(readEnvelope(envelope(), 'slideria')).toEqual({ type: 'goto', index: 3 });
  });

  it('отбрасывает чужое: другое пространство, другая презентация, не конверт', () => {
    expect(readEnvelope({ ...envelope(), ns: 'other' }, 'slideria')).toBeNull();
    expect(readEnvelope(envelope(), 'microclimate')).toBeNull();
    expect(readEnvelope('hello', 'slideria')).toBeNull();
    expect(readEnvelope(null, 'slideria')).toBeNull();
  });

  it('сообщение другому окну отбрасывает, адресованное сайту — принимает', () => {
    expect(readEnvelope(envelope({ to: 'presenter-window' }), 'slideria')).toBeNull();
    const win = { postMessage: vi.fn() } as unknown as Window;
    send(win, 'slideria', { type: 'hello' });
    const me = (win.postMessage as ReturnType<typeof vi.fn>).mock.calls[0][0].from;
    expect(readEnvelope(envelope({ to: me, msg: { type: 'state', index: 2, theme: 'dark', black: false } }), 'slideria'))
      .toEqual({ type: 'state', index: 2, theme: 'dark', black: false });
  });
});
