import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { launchPatientWorkspace } from '@openmrs/esm-patient-common-lib';
import { showModal, useLayoutType } from '@openmrs/esm-framework';
import styles from './encounter-action-menu.scss';
import { type OpenmrsEncounter } from '../types';
import { transferOutWorkspace } from '../constants';

interface encounterActionMenuProps {
  encounter: OpenmrsEncounter;
  patientUuid?: string;
}

export const EncounterActionMenu = ({ encounter, patientUuid }: encounterActionMenuProps) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const launchEditEncounterForm = useCallback(() => {
    launchPatientWorkspace(transferOutWorkspace, {
      workspaceTitle: t('editEncounter', 'Edit Encounter'),
      encounter,
      formContext: 'editing',
    });
  }, [encounter, t]);

  const launchDeleteEncounterDialog = (encounterUuid: string) => {
    const dispose = showModal('encounter-delete-confirmation-dialog', {
      closeDeleteModal: () => dispose(),
      encounterUuid,
      patientUuid,
    });
  };

  return (
    <Layer className={styles.layer}>
      <OverflowMenu
        aria-label={t('editOrDeleteEncounter', 'Edit or delete Encounter')}
        size={isTablet ? 'lg' : 'sm'}
        flipped
        align="left"
      >
        <OverflowMenuItem
          className={styles.menuItem}
          id="editEncounter"
          onClick={launchEditEncounterForm}
          itemText={t('edit', 'Edit')}
        />
        <OverflowMenuItem
          className={styles.menuItem}
          id="deleteEncounter"
          itemText={t('delete', 'Delete')}
          onClick={() => launchDeleteEncounterDialog(encounter.uuid)}
          isDelete
          hasDivider
        />
      </OverflowMenu>
    </Layer>
  );
};
