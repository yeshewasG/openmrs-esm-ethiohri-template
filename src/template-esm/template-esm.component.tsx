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
import { useEncounters } from './template-esm.resource';
import { TEMPLATE_ENCOUNTER_TYPE_UUID, templateEsmFieldConcepts, templateEsmWorkspace } from '../constants';
import { getObsFromEncounter } from '../utils/encounter-utils';
import { EncounterActionMenu } from '../utils/encounter-action-menu';

interface HivCareAndTreatmentProps {
  patientUuid: string;
}

const TransferOutSummary: React.FC<HivCareAndTreatmentProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const displayText = 'Template ESM';
  const headerTitle = 'Template ESM';
  const { encounters, isError, isLoading, isValidating, mutate } = useEncounters(
    patientUuid,
    TEMPLATE_ENCOUNTER_TYPE_UUID,
  );
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const isDesktop = layout === 'small-desktop' || layout === 'large-desktop';

  const launchTemplateEsmForm = useCallback(() => launchPatientWorkspace(templateEsmWorkspace), []);

  const tableHeaders = [
    { key: 'sampleTextInput', header: 'temp_col_1' },
    { key: 'sampleDate', header: 'temp_col_2' },
    { key: 'sampleNumber', header: 'temp_col_3' },
  ];

  const tableRows = useMemo(() => {
    if (!Array.isArray(encounters)) return [];
    return encounters.map((encounter) => ({
      id: encounter.uuid,
      sampleTextInput: getObsFromEncounter(encounter, templateEsmFieldConcepts.sampleTextInput) ?? '--',
      sampleDate: getObsFromEncounter(encounter, templateEsmFieldConcepts.sampleDate, true) ?? '--',
      sampleNumber: getObsFromEncounter(encounter, templateEsmFieldConcepts.sampleNumber) ?? '--',      
      encounterDatetime: encounter.encounterDatetime,
    }));
  }, [encounters]);

  const sortedRows = useMemo(() => {
    return tableRows.sort((a, b) => {
      const dateA = new Date(a.encounterDatetime).getTime();
      const dateB = new Date(b.encounterDatetime).getTime();
      return dateB - dateA;
    });
  }, [tableRows]);

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 10;
  const totalRows = sortedRows.length;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedRows.slice(indexOfFirstRow, indexOfLastRow);

  const handleFilter = ({ rowIds, headers, cellsById, inputValue, getCellId }) => {
    return rowIds.filter((rowId) =>
      headers.some(({ key }) => {
        const cellId = getCellId(rowId, key);
        const filterableValue = cellsById[cellId]?.value;
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
          onClick={launchTemplateEsmForm}
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
                            <EncounterActionMenu
                              patientUuid={patientUuid}
                              encounter={foundEncounter}
                              mutateEncounters={mutate}
                            />
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
            pageSizes={[5, 10, 15]}
          />
        </>
      ) : (
        <EmptyState displayText={displayText} headerTitle={headerTitle} launchForm={launchTemplateEsmForm} />
      )}
    </div>
  );
};

export default TransferOutSummary;
