import { FormEvent, useState } from 'react';
import Modal from '@/components/Modal';
import FormField from '@/components/forms/FormField';
import { TextInput } from '@/components/inputs';

type RenameEntityModalProps = {
  entityLabel: string;
  currentName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
};

const RenameEntityModal = ({
  entityLabel,
  currentName,
  onConfirm,
  onCancel,
  title,
  description,
}: RenameEntityModalProps) => {
  const [name, setName] = useState(currentName);
  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && trimmed !== currentName.trim();

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal
      isOpen
      title={title ?? `Rename ${entityLabel}`}
      description={
        description ??
        `Update the ${entityLabel.toLowerCase()} label. The simulation facade validates naming rules and propagates the change to dependent records.`
      }
      onClose={onCancel}
      size="sm"
      actions={[
        {
          label: 'Cancel',
          onClick: onCancel,
          variant: 'secondary',
        },
        {
          label: 'Save name',
          onClick: () => handleSubmit(),
          variant: 'primary',
          disabled: !canSubmit,
        },
      ]}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label={`${entityLabel} name`} secondaryLabel={trimmed || undefined}>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`New ${entityLabel.toLowerCase()} name`}
            autoFocus
          />
        </FormField>
      </form>
    </Modal>
  );
};

export type { RenameEntityModalProps };
export default RenameEntityModal;
