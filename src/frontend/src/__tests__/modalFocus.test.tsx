// @vitest-environment jsdom
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ModalFrame } from '@/components/modals/ModalFrame';

const createModalRoot = () => {
  const existing = document.getElementById('modal-root');
  if (existing) {
    return existing;
  }
  const root = document.createElement('div');
  root.id = 'modal-root';
  document.body.append(root);
  return root;
};

describe('ModalFrame focus management', () => {
  beforeEach(() => {
    createModalRoot();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('traps focus within the modal and closes on escape', () => {
    const onClose = vi.fn();
    const { getByText, getByLabelText } = render(
      <ModalFrame title="Test Modal" onClose={onClose}>
        <button type="button">First Action</button>
        <button type="button">Second Action</button>
      </ModalFrame>,
    );

    const close = getByLabelText('Close modal');
    getByText('First Action');
    const second = getByText('Second Action');
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(second);

    second.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
