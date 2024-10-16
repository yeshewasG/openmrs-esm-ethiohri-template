import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { showSnackbar } from '@openmrs/esm-framework';
import { deleteEncounter, useEncounters } from './encounter.resource';

interface DeleteEncounterModalProps {
  closeDeleteModal: () => void;
  encounterUuid: string;
  patientUuid?: string;
}

const DeleteEncounterModal: React.FC<DeleteEncounterModalProps> = ({
  closeDeleteModal,
  encounterUuid,
  patientUuid,
}) => {
  const { t } = useTranslation();
  const { mutate } = useEncounters(patientUuid); // Hook to refresh encounters
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    const abortController = new AbortController(); // Ensure AbortController is instantiated

    deleteEncounter(patientUuid, encounterUuid, abortController) // Pass the abort controller
      .then((res) => {
        if (res.ok) {
          closeDeleteModal(); // Close the modal
          mutate(); // Refresh the encounters list
          showSnackbar({
            isLowContrast: true,
            kind: 'success',
            title: t('encounterDeleted', 'Encounter deleted successfully'),
          });
        }
      })
      .catch((error) => {
        console.error('Error deleting encounter: ', error);
        showSnackbar({
          isLowContrast: false,
          kind: 'error',
          title: t('errorDeletingEncounter', 'Error deleting encounter'),
          subtitle: error?.message,
        });
      })
      .finally(() => {
        setIsDeleting(false); // Reset the loading state
      });

    // Optional: Cleanup on unmount to abort the request
    return () => {
      abortController.abort();
    };
  }, [closeDeleteModal, encounterUuid, mutate, patientUuid, t]);

  return (
    <div>
      <ModalHeader closeModal={closeDeleteModal} title={t('deleteEncounter', 'Delete Encounter')} />
      <ModalBody>
        <p>{t('deleteEncounterConfirmation', 'Are you sure you want to delete this encounter?')}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={closeDeleteModal}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? (
            <InlineLoading description={t('deleting', 'Deleting') + '...'} />
          ) : (
            <span>{t('delete', 'Delete')}</span>
          )}
        </Button>
      </ModalFooter>
    </div>
  );
};

export default DeleteEncounterModal;
