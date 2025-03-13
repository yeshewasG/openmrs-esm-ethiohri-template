import React, { useCallback, useMemo, useState } from 'react';
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
import styles from './data-table.scss';
import { EncounterActionMenu } from '../utils/encounter-action-menu';
import { getObsFromEncounter } from '../utils/encounter-utils';
import { useEncounters } from './data-table.resource';

// Types
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

// Generic Table Header Component
const TableHeaderRow: React.FC<{
  columns: TableColumn[];
  getHeaderProps: (props: any) => any;
}> = ({ columns, getHeaderProps }) => (
  <TableRow>
    {columns.map((column) => (
      <TableHeader key={column.key} {...getHeaderProps({ header: column, isSortable: true })}>
        {column.header}
      </TableHeader>
    ))}
    <TableHeader />
  </TableRow>
);

// Generic Table Body Component
const TableBodyRows: React.FC<{
  rows: any[];
  columns: TableColumn[];
  data: any[];
  patientUuid: string;
  mutate: () => void;
}> = ({ rows, columns, data, patientUuid, mutate }) => (
  <TableBody>
    {rows.map((row) => {
      const item = data.find((d) => d.uuid === row.id);
      return (
        <TableRow key={row.id}>
          {columns.map((column) => (
            <TableCell key={`${row.id}-${column.key}`}>
              {column.transform
                ? column.transform(row.cells.find((c: any) => c.id.includes(column.key))?.value, item)
                : row.cells.find((c: any) => c.id.includes(column.key))?.value}
            </TableCell>
          ))}
          <TableCell className="cds--table-column-menu">
            {item && <EncounterActionMenu patientUuid={patientUuid} encounter={item} mutateEncounters={mutate} />}
          </TableCell>
        </TableRow>
      );
    })}
  </TableBody>
);

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
    // Assuming this is imported from somewhere
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

  const filterRows = useCallback(({ rowIds, headers, cellsById, inputValue, getCellId }) => {
    const filterTerm = inputValue.toLowerCase();
    return rowIds.filter((rowId) =>
      headers.some(({ key }) => {
        const cellId = getCellId(rowId, key);
        const value = cellsById[cellId]?.value;
        return String(value).toLowerCase().includes(filterTerm);
      }),
    );
  }, []);

  if (isLoading) return <DataTableSkeleton role="progressbar" compact={isDesktop} zebra />;
  if (isError) return <ErrorState error={isError} headerTitle={config.headerTitle} />;

  return (
    <div className={styles.widgetCard}>
      <CardHeader title={config.headerTitle}>
        {isValidating && <InlineLoading />}
        <Button kind="ghost" renderIcon={Add} iconDescription={t('add', 'Add')} onClick={launchForm}>
          {t('add', 'Add')}
        </Button>
      </CardHeader>

      {sortedRows.length > 0 ? (
        <>
          <DataTable
            filterRows={filterRows}
            rows={paginatedRows}
            headers={columns}
            useZebraStyles
            size={isTablet ? 'lg' : 'sm'}
          >
            {({ rows, headers, getHeaderProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()} aria-label={config.headerTitle}>
                  <TableHead>
                    <TableHeaderRow columns={columns} getHeaderProps={getHeaderProps} />
                  </TableHead>
                  <TableBodyRows
                    rows={rows}
                    columns={columns}
                    data={encounters}
                    patientUuid={config.patientUuid}
                    mutate={mutate}
                  />
                </Table>
              </TableContainer>
            )}
          </DataTable>
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
