import React from 'react';
import { usePatient } from '@openmrs/esm-framework';
import DynamicDataTable from '../componets/data-table';

const Root: React.FC = () => {
  const patient = usePatient();
  const columns = [
    { key: 'encounterType', header: 'Type', transform: (value) => value.display },
    { key: 'encounterDatetime', header: 'Date', transform: (value) => new Date(value).toLocaleDateString() },
    { key: 'location', header: 'location', transform: (value) => value.name },
    { key: 'location', header: 'Coupons Given', transform: (value) => value.name },
  ];

  const config = {
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

  return <DynamicDataTable columns={columns} config={config} />;
};

export default Root;
