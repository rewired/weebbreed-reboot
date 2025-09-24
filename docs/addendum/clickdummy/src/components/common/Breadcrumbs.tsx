/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { ChevronRightIcon } from './Icons';

interface BreadcrumbItem {
  level: string;
  id: string;
  name: string;
  parentId?: string;
  grandParentId?: string;
}

interface BreadcrumbsProps {
  path: BreadcrumbItem[];
  onNavigate: (
    level: string,
    id: string,
    parentId?: string | null,
    grandParentId?: string | null,
  ) => void;
}

export const Breadcrumbs = ({ path, onNavigate }: BreadcrumbsProps) => (
  <nav className="flex items-center text-sm text-stone-400 mb-4" aria-label="Breadcrumb">
    {path.map((item, index) => (
      <React.Fragment key={item.id}>
        {index > 0 && <ChevronRightIcon className="mx-1" />}
        <button
          onClick={() => onNavigate(item.level, item.id, item.parentId, item.grandParentId)}
          className="hover:text-stone-100 transition-colors"
        >
          {item.name}
        </button>
      </React.Fragment>
    ))}
  </nav>
);
