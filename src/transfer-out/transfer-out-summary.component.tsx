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
  Pagination,
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
  const [refresh, setRefresh] = React.useState(false);
  const { encounters, isError, isLoading, isValidating } = useEncounters(patientUuid, TRANSFEROUT_ENCOUNTER_TYPE_UUID);
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const isDesktop = layout === 'small-desktop' || layout === 'large-desktop';

  const launchTransferOutForm = useCallback(() => launchPatientWorkspace(transferOutWorkspace), []);

  const tableHeaders = [
    { key: 'transferredTo', header: 'Transferred to' },
    { key: 'dateOfTransfer', header: 'Date of Transfer' },
    { key: 'name', header: 'Name' },
    { key: 'mrn', header: 'MRN' },
    { key: 'artStarted', header: 'ART Started' },
    { key: 'regimen', header: 'Regimen' },
  ];

  const tableRows = useMemo(() => {
    if (!Array.isArray(encounters)) return []; // Ensure encounters is an array
    return encounters.map((encounter) => ({
      id: encounter.uuid,
      transferredTo: getObsFromEncounter(encounter, transferOutFieldConcepts.transferredTo) ?? '--',
      dateOfTransfer: getObsFromEncounter(encounter, transferOutFieldConcepts.dateOfTransfer, true) ?? '--',
      name: getObsFromEncounter(encounter, transferOutFieldConcepts.name) ?? '--',
      mrn: getObsFromEncounter(encounter, transferOutFieldConcepts.mrn) ?? '--',
      artStarted: getObsFromEncounter(encounter, transferOutFieldConcepts.artStarted) ?? '--',
      regimen: getObsFromEncounter(encounter, transferOutFieldConcepts.originalFirstLineRegimenDose) ?? '--',
      encounterDatetime: encounter.encounterDatetime, // Add encounterDatetime for sorting
    }));
  }, [encounters]);

  // Sort rows by encounterDatetime in descending order
  const sortedRows = useMemo(() => {
    return tableRows.sort((a, b) => {
      const dateA = new Date(a.encounterDatetime).getTime();
      const dateB = new Date(b.encounterDatetime).getTime();
      return dateB - dateA; // Sort in descending order
    });
  }, [tableRows]);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10; // Adjust as needed
  const totalRows = sortedRows.length;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedRows.slice(indexOfFirstRow, indexOfLastRow);

  const handleFilter = ({ rowIds, headers, cellsById, inputValue, getCellId }) => {
    return rowIds.filter((rowId) =>
      headers.some(({ key }) => {
        const cellId = getCellId(rowId, key);
        const filterableValue = cellsById[cellId]?.value; // Use optional chaining to prevent errors
        const filterTerm = inputValue.toLowerCase();
        return ('' + filterableValue).toLowerCase().includes(filterTerm);
      }),
    );
  };

  // Error handling for loading and error states
  if (isLoading) return <DataTableSkeleton role="progressbar" compact={isDesktop} zebra />;
  if (isError) return <ErrorState error={isError} headerTitle={headerTitle} />;

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
      {currentRows.length > 0 ? (
        <>
          <DataTable
            filterRows={handleFilter}
            rows={currentRows}
            headers={tableHeaders}
            useZebraStyles
            size={isTablet ? 'lg' : 'sm'}
          >
            {({ rows, headers, getHeaderProps, getTableProps }) => (
              <TableContainer>
                <Table aria-label="Transfer Out" {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader
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
                    {rows.map((row) => {
                      const foundEncounter = encounters.find((encounter) => encounter.uuid === row.id);
                      return (
                        <TableRow key={row.id}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>{cell.value?.content ?? cell.value}</TableCell>
                          ))}
                          <TableCell className="cds--table-column-menu">
                            <EncounterActionMenu encounter={foundEncounter} patientUuid={patientUuid} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
          <Pagination
            page={currentPage}
            pageSize={rowsPerPage}
            totalItems={totalRows}
            onChange={({ page }) => setCurrentPage(page)}
            pageSizes={[5, 10, 15]} // Define page sizes explicitly
          />
        </>
      ) : (
        <EmptyState displayText={displayText} headerTitle={headerTitle} launchForm={launchTransferOutForm} />
      )}
    </div>
  );
};

export default TransferOutSummary;
