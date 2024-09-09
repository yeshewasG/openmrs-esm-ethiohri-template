import React, { useCallback, useMemo } from 'react';
import {
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { DataTableSkeleton, InlineLoading } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useLayoutType } from '@openmrs/esm-framework';
import { CardHeader, EmptyState, ErrorState, launchPatientWorkspace } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';
import styles from './hiv-care-and-treatment.scss';
import { useEncounters } from './transfer-out.resource';
import { TRANSFEROUT_ENCOUNTER_TYPE_UUID, transferOutFieldConcepts, transferOutWorkspace } from '../constants';
import { getObsFromEncounter } from '../utils/encounter-utils';
import { EncounterActionMenu } from '../utils/encounter-action-menu';

interface HivCareAndTreatmentProps {
  patientUuid: string;
}


const TransferOutSummary: React.FC<HivCareAndTreatmentProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const displayText = 'Transfer Out';
  const headerTitle = 'Transfer Out';
  const { encounters, isError, isLoading, isValidating } = useEncounters(patientUuid, TRANSFEROUT_ENCOUNTER_TYPE_UUID);
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const isDesktop = layout === 'small-desktop' || layout === 'large-desktop';

  const launchTransferOutForm = useCallback(() => launchPatientWorkspace(transferOutWorkspace), []);

  const tableHeaders = [
    { key: 'transferredTo', header: 'Transferred to' },
    {
      key: 'dateOfTransfer',
      header: 'Date of Transfer',
    },
    {
      key: 'name',
      header: 'Name',
    },
    {
      key: 'mrn',
      header: 'MRN',
    },
    {
      key: 'artStarted',
      header: 'ART Started',
    },
    {
      key: 'regimen',
      header: 'Regimen',
    },
  ];

  const tableRows = useMemo(() => {
    return encounters?.map((encounter) => ({
      id: encounter.uuid,
      transferredTo: getObsFromEncounter(encounter, transferOutFieldConcepts.transferredTo) ?? '--',
      dateOfTransfer: getObsFromEncounter(encounter, transferOutFieldConcepts.dateOfTransfer, true) ?? '--',
      name: getObsFromEncounter(encounter, transferOutFieldConcepts.name) ?? '--',
      mrn: getObsFromEncounter(encounter, transferOutFieldConcepts.mrn) ?? '--',
      artStarted: getObsFromEncounter(encounter, transferOutFieldConcepts.artStarted) ?? '--',
      regimen: getObsFromEncounter(encounter, transferOutFieldConcepts.originalFirstLineRegimenDose) ?? '--',
    }));
  }, [encounters]);
  

  console.log(tableRows);

  if (isLoading) return <DataTableSkeleton role="progressbar" compact={isDesktop} zebra />;
  if (isError) return <ErrorState error={isError} headerTitle={headerTitle} />;

  if (encounters?.length) {
    return (
      <div className={styles.widgetCard}>
        <CardHeader title={headerTitle}>
          <span>{isValidating ? <InlineLoading /> : null}</span>
          <Button
            kind="ghost"
            renderIcon={(props) => <Add size={16} {...props} />}
            iconDescription="Add"
            onClick={launchTransferOutForm}
          >
            {t('add', 'Add')}
          </Button>
        </CardHeader>
        <DataTable rows={tableRows} headers={tableHeaders} isSortable useZebraStyles size={isTablet ? 'lg' : 'sm'}>
          {({ rows, headers, getHeaderProps, getTableProps }) => (
            <TableContainer>
              <Table aria-label="Transfer Out" {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader
                        //   className={classNames(styles.productiveHeading01, styles.text02)}
                        {...getHeaderProps({
                          header,
                          isSortable: header.isSortable,
                        })}
                      >
                        {header.header?.content ?? header.header}
                      </TableHeader>
                    ))}
                    <TableHeader />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value?.content ?? cell.value}</TableCell>
                      ))}
                      <TableCell className="cds--table-column-menu">
                        <EncounterActionMenu
                          encounter={encounters.find((encounter) => encounter.uuid === row.id)}
                          patientUuid={patientUuid}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      </div>
    );
  }
  return <EmptyState displayText={displayText} headerTitle={headerTitle} launchForm={launchTransferOutForm} />;
};

export default TransferOutSummary;
