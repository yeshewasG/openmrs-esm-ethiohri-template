import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableExpandHeader,
  TableHeader,
  TableBody,
  TableCell,
  TableExpandRow,
  TableExpandedRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Pagination,
} from '@carbon/react';
import { DataTableSkeleton, InlineLoading } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { useLayoutType } from '@openmrs/esm-framework';
import { CardHeader, EmptyState, ErrorState, launchPatientWorkspace } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';
import styles from './data-table.scss';
import { EncounterActionMenu } from '../utils/encounter-action-menu';
import { getObsFromEncounter } from '../utils/encounter-utils';
import { useEncounters } from './data-table.resource';

// Types remain the same
interface TableColumn {
  key: string;
  header: string;
  transform?: (value: any, row: any) => any;
}

interface DataTableConfig {
  patientUuid: string;
  headerTitle: string;
  encounterTypeUuid: string;
  workspaceName: string;
  fieldConcepts: Record<string, string>;
  defaultRowsPerPage?: number;
  rowsPerPageOptions?: number[];
}

interface DataTableProps {
  columns: TableColumn[];
  config: DataTableConfig;
}

const DynamicDataTable: React.FC<DataTableProps> = ({ columns, config }) => {
  const { t } = useTranslation();
  const { encounters, isError, isLoading, isValidating, mutate } = useEncounters(
    config.patientUuid,
    config.encounterTypeUuid,
  );
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const isDesktop = layout === 'small-desktop' || layout === 'large-desktop';

  // Config defaults
  const ROWS_PER_PAGE = config.defaultRowsPerPage || 10;
  const ROWS_PER_PAGE_OPTIONS = config.rowsPerPageOptions || [5, 10, 15];

  const [currentPage, setCurrentPage] = useState(1);

  const launchForm = useCallback(() => {
    launchPatientWorkspace(config.workspaceName);
  }, [config.workspaceName]);

  const tableRows = useMemo(() => {
    if (!Array.isArray(encounters)) return [];

    return encounters.map((item) => ({
      id: item.uuid,
      ...columns.reduce(
        (acc, column) => ({
          ...acc,
          [column.key]: config.fieldConcepts[column.key]
            ? getObsFromEncounter(item, config.fieldConcepts[column.key]) || '--'
            : item[column.key] || '--',
        }),
        {},
      ),
      encounterDatetime: item.encounterDatetime,
    }));
  }, [encounters, columns, config.fieldConcepts]);

  const sortedRows = useMemo(() => {
    return [...tableRows].sort(
      (a, b) => new Date(b.encounterDatetime).getTime() - new Date(a.encounterDatetime).getTime(),
    );
  }, [tableRows]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedRows.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [sortedRows, currentPage, ROWS_PER_PAGE]);

  if (isLoading) return <DataTableSkeleton role="progressbar" compact={isDesktop} zebra />;
  if (isError) return <ErrorState error={isError} headerTitle={config.headerTitle} />;

  return (
    <div className={styles.widgetCard}>
      {sortedRows.length > 0 ? (
        <>
          <DataTable
            rows={paginatedRows}
            headers={columns}
            useZebraStyles
            size={isTablet ? 'lg' : 'sm'}
            render={({
              rows,
              headers,
              getHeaderProps,
              getRowProps,
              getExpandedRowProps,
              getTableProps,
              getTableContainerProps,
              onInputChange,
            }) => (
              <TableContainer
                title={config.headerTitle}
                description={isValidating && <InlineLoading />}
                {...getTableContainerProps()}
              >
                <TableToolbar>
                  <TableToolbarContent>
                    <Button kind="ghost" renderIcon={Add} iconDescription={t('add', 'Add')} onClick={launchForm}>
                      {t('add', 'Add')}
                    </Button>
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()} aria-label={config.headerTitle}>
                  <TableHead>
                    <TableRow>
                      <TableExpandHeader aria-label="expand row" />
                      {headers.map((header) => (
                        <TableHeader key={header.key} {...getHeaderProps({ header, isSortable: true })}>
                          {header.header}
                        </TableHeader>
                      ))}
                      <TableHeader />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const item = encounters.find((d) => d.uuid === row.id);
                      return (
                        <React.Fragment key={row.id}>
                          <TableExpandRow {...getRowProps({ row })}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>
                                {columns.find((col) => cell.id.includes(col.key))?.transform
                                  ? columns.find((col) => cell.id.includes(col.key))?.transform(cell.value, item)
                                  : cell.value}
                              </TableCell>
                            ))}
                            <TableCell className="cds--table-column-menu">
                              {item && (
                                <EncounterActionMenu
                                  patientUuid={config.patientUuid}
                                  encounter={item}
                                  mutateEncounters={mutate}
                                />
                              )}
                            </TableCell>
                          </TableExpandRow>
                          <TableExpandedRow
                            colSpan={headers.length + 2}
                            className="demo-expanded-td"
                            {...getExpandedRowProps({ row })}
                          >
                            <h6>Encounter Details</h6>
                            <div>
                              <p>Date: {new Date(item?.encounterDatetime).toLocaleString()}</p>
                              {/* <p>Location: {item?.location?.display || '--'}</p> */}
                              {/* <p>Provider: {item?.encounterProviders?.[0]?.provider?.display || '--'}</p> */}
                            </div>
                          </TableExpandedRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          />
          <Pagination
            page={currentPage}
            pageSize={ROWS_PER_PAGE}
            pageSizes={ROWS_PER_PAGE_OPTIONS}
            totalItems={sortedRows.length}
            onChange={({ page }) => setCurrentPage(page)}
          />
        </>
      ) : (
        <EmptyState displayText={t('noData', 'No Data')} headerTitle={config.headerTitle} launchForm={launchForm} />
      )}
    </div>
  );
};

export default DynamicDataTable;
