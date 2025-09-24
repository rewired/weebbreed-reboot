/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export const PrimaryButton = ({ children, ...props }: ButtonProps) => (
  <button
    className="w-full bg-lime-600 hover:bg-lime-700 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-stone-600 disabled:cursor-not-allowed"
    {...props}
  >
    {children}
  </button>
);

export const DangerButton = ({ children, ...props }: ButtonProps) => (
  <button
    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
    {...props}
  >
    {children}
  </button>
);
