import { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Button from './Button';
import IconButton from './IconButton';
import TextInput from './TextInput';

type InlineEditSize = 'sm' | 'md';

type InlineEditProps = {
  value: string;
  onSubmit: (nextValue: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  editLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  size?: InlineEditSize;
  leadingIcon?: ReactNode;
  className?: string;
  inputClassName?: string;
};

const InlineEdit = ({
  value,
  onSubmit,
  onCancel,
  placeholder = 'Enter value',
  editLabel = 'Edit value',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  size = 'sm',
  leadingIcon,
  className,
  inputClassName,
}: InlineEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSubmit = (next: string) => {
    onSubmit(next);
    setIsEditing(false);
  };

  const handleConfirm = () => {
    handleSubmit(draft);
  };

  const handleCancel = () => {
    setDraft(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleConfirm();
  };

  if (isEditing) {
    return (
      <form
        className={['flex items-center gap-2', className].filter(Boolean).join(' ')}
        onSubmit={handleFormSubmit}
      >
        {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
        <TextInput
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          size={size === 'sm' ? 'sm' : 'md'}
          className={inputClassName}
        />
        <Button variant="solid" tone="accent" size={size} type="submit">
          {confirmLabel}
        </Button>
        <Button variant="ghost" tone="default" size={size} type="button" onClick={handleCancel}>
          {cancelLabel}
        </Button>
      </form>
    );
  }

  return (
    <div className={['inline-flex items-center gap-2', className].filter(Boolean).join(' ')}>
      {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
      <span className="text-sm font-medium text-text-primary">{value || placeholder}</span>
      <IconButton
        variant="ghost"
        tone="default"
        size={size === 'sm' ? 'sm' : 'md'}
        aria-label={editLabel}
        onClick={() => setIsEditing(true)}
      >
        ✎
      </IconButton>
    </div>
  );
};

export type { InlineEditProps, InlineEditSize };
export default InlineEdit;
