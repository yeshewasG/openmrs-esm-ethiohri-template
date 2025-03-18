import { TabList } from '@carbon/react';
import { TabPanels } from '@carbon/react';
import { TabPanel } from '@carbon/react';
import { Tab } from '@carbon/react';
import { Tabs } from '@carbon/react';
import React from 'react';
import DynamicDataTable from '../componets/data-table';
import { usePatient } from '@openmrs/esm-framework';
import styles from './styles.scss';
import { useTranslation } from 'react-i18next';

const Root: React.FC = () => {
  const { t } = useTranslation();

  const patient = usePatient();
  const columns = [
    { key: 'encounterType', header: 'Type', transform: (value) => value.display },
    { key: 'encounterDatetime', header: 'Date', transform: (value) => new Date(value).toLocaleDateString() },
    { key: 'location', header: 'location', transform: (value) => value.name },
  ];

  const config = {
    patientUuid: patient.patientUuid,
    headerTitle: 'Key and Priority Population',
    encounterTypeUuid: 'TEMPLATE_ENCOUNTER_TYPE_UUID',
    workspaceName: 'kpp-form-workspace',
    fieldConcepts: {
      sampleTextInput: 'TEXT_CONCEPT_UUID',
      sampleDate: 'DATE_CONCEPT_UUID',
      sampleNumber: 'NUMBER_CONCEPT_UUID',
    },
  };
  const columnSns = [
    { key: 'encounterType', header: 'Type', transform: (value) => value.display },
    { key: 'encounterDatetime', header: 'Date', transform: (value) => new Date(value).toLocaleDateString() },
    { key: 'location', header: 'location', transform: (value) => value.name },
    { key: 'location', header: 'Coupons Given', transform: (value) => value.name },
  ];

  const configSns = {
    patientUuid: patient.patientUuid,
    headerTitle: 'Social Network Service',
    encounterTypeUuid: 'TEMPLATE_ENCOUNTER_TYPE_UUID',
    workspaceName: 'sns-form-workspace',
    fieldConcepts: {
      sampleTextInput: 'TEXT_CONCEPT_UUID',
      sampleDate: 'DATE_CONCEPT_UUID',
      sampleNumber: 'NUMBER_CONCEPT_UUID',
    },
  };
  return (
    <div>
      <div className={styles.kpp}>
        <h4>{t('kpp', 'Key and Priority Population')}</h4>
      </div>
      <Tabs>
        <TabList contained className={styles.tabs}>
          <Tab>Key and Priority Population</Tab>
          <Tab>Social Network Service</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <DynamicDataTable columns={columns} config={config} />
          </TabPanel>
          <TabPanel>
            <DynamicDataTable columns={columnSns} config={configSns} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};
export default Root;
