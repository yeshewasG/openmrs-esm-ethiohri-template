import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePatient } from '@openmrs/esm-framework';
import DynamicDataTable from '../componets/data-table';
import VitalSignsForm from '../forms/form';

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

  return (
    <>
      <VitalSignsForm />
      <DynamicDataTable columns={columns} config={config} />;
    </>
  );
};

export default Root;
