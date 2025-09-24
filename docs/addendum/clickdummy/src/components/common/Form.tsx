/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const FormInput = ({ label, ...props }: InputProps) => (
  <div>
    <label className="block text-sm font-medium text-stone-300 mb-1">{label}</label>
    <input
      className="w-full bg-stone-900 border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none"
      {...props}
    />
  </div>
);

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: React.ReactNode;
};

export const FormSelect = ({ label, children, ...props }: SelectProps) => (
  <div>
    <label className="block text-sm font-medium text-stone-300 mb-1">{label}</label>
    <select
      className="w-full bg-stone-900 border border-stone-700 rounded-md px-3 py-2 text-stone-100 focus:ring-2 focus:ring-lime-500 focus:border-lime-500 outline-none"
      {...props}
    >
      {children}
    </select>
  </div>
);

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const FormCheckbox = ({ label, ...props }: CheckboxProps) => (
  <label className="flex items-center space-x-2 text-sm text-stone-300">
    <input
      type="checkbox"
      className="h-4 w-4 rounded bg-stone-700 border-stone-600 text-lime-600 focus:ring-lime-500"
      {...props}
    />
    <span>{label}</span>
  </label>
);
