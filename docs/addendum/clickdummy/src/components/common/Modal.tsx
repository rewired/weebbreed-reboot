/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const Modal = ({ title, children, onClose }: ModalProps) => (
  <div
    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
  >
    <div className="bg-stone-800 border border-stone-700 rounded-lg shadow-xl w-full max-w-md m-4">
      <header className="flex items-center justify-between p-4 border-b border-stone-700">
        <h2 className="text-lg font-semibold text-stone-100">{title}</h2>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <XIcon />
        </button>
      </header>
      <div className="p-6">{children}</div>
    </div>
  </div>
);
