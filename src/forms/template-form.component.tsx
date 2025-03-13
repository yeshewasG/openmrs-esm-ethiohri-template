import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './template-form.scss';
import {
  OpenmrsDatePicker,
  ResponsiveWrapper,
  closeWorkspace,
  showSnackbar,
  useLayoutType,
  usePatient,
} from '@openmrs/esm-framework';
import type { CloseWorkspaceOptions } from '@openmrs/esm-framework';
import { Form } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { Select, SelectItem, Stack } from '@carbon/react';
import { TextInput } from '@carbon/react';
import { Button } from '@carbon/react';
import { fetchLocation, getPatientEncounters, getPatientInfo, saveEncounter } from '../api/api';
import {
  FOLLOWUP_ENCOUNTER_TYPE_UUID,
  TEMPLATE_ENCOUNTER_TYPE_UUID,
  TEMPLATE_FORM_UUID,
  templateEsmFieldConcepts,
} from '../constants';
import dayjs from 'dayjs';

import type { OpenmrsEncounter } from '../types';
import { getObsFromEncounter } from '../utils/encounter-utils';
import { ButtonSet } from '@carbon/react';
import { NumberInput } from '@carbon/react';
import { Checkbox } from '@carbon/react';
import { useEncounters } from '../componets/data-table.resource';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  isTablet: boolean;
}
type FormInputs = Record<'sampleTextInput' | 'sampleNumber' | 'sampleDate' | 'sampleDropDown', string>;

interface TemplateFormProps {
  patientUuid: string;
  encounter?: OpenmrsEncounter; // If provided, it means we are editing an encounter
}

const TemplateForm: React.FC<TemplateFormProps> = ({ patientUuid, encounter }) => {
  const { t } = useTranslation();
  const [transferOutDate, setTransferOutDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const { control, handleSubmit, setValue, watch } = useForm<FormInputs>();
  const [facilityLocationUUID, setFacilityLocationUUID] = useState('');
  const [facilityLocationName, setFacilityLocationName] = useState('');
  const [selectedField, setSelectedField] = useState<keyof FormInputs | null>(null);

  const encounterDatetime = new Date().toISOString();

  const encounterProviders = [
    { provider: 'caa66686-bde7-4341-a330-91b7ad0ade07', encounterRole: 'a0b03050-c99b-11e0-9572-0800200c9a66' },
  ];
  const encounterType = TEMPLATE_ENCOUNTER_TYPE_UUID;
  const form = { uuid: TEMPLATE_FORM_UUID };
  const location = facilityLocationUUID;
  const patient = patientUuid;
  const orders = [];
  // Fetch patient encounters
  const { encounters, isError, isLoading, mutate } = useEncounters(patientUuid, TEMPLATE_ENCOUNTER_TYPE_UUID);

  useEffect(() => {
    (async function () {
      const facilityInformation = await fetchLocation();
      facilityInformation.data.results.forEach((element) => {
        if (element.tags.some((x) => x.display === 'Facility Location')) {
          setFacilityLocationUUID(element.uuid);
          setFacilityLocationName(element.display);
        }
      });
    })();
  }, []);

  // Load existing encounter data if editing
  useEffect(() => {
    if (encounter) {
      const dateOfTransferObs = getObsFromEncounter(encounter, templateEsmFieldConcepts.sampleDate);
      if (dateOfTransferObs && dayjs(dateOfTransferObs).isValid()) {
        setValue('sampleDate', dayjs(dateOfTransferObs).format('YYYY-MM-DD'));
        setTransferOutDate(
          dayjs(getObsFromEncounter(encounter, templateEsmFieldConcepts.sampleDate)).format('YYYY-MM-DD'),
        );
      } else {
        setValue('sampleDate', ''); // or any default value like null or empty string
      }
      setValue('sampleTextInput', getObsFromEncounter(encounter, templateEsmFieldConcepts.sampleTextInput));
    }
  }, [encounter, setValue]);

  type DateFieldKey = 'sampleDate';

  const onDateChange = (value: any, dateField: DateFieldKey) => {
    try {
      const jsDate = new Date(value);
      if (isNaN(jsDate.getTime())) {
        throw new Error('Invalid Date');
      }
      const formattedDate = dayjs(jsDate).format('YYYY-MM-DD');
      setValue(dateField, formattedDate);
      setError(null);
    } catch (e) {
      setError('Invalid date format');
    }
  };

  const closeWorkspaceHandler = (name: string) => {
    const options: CloseWorkspaceOptions = {
      ignoreChanges: false,
      onWorkspaceClose: () => {},
    };
    closeWorkspace(name, options);
  };

  const formatValue = (value) => {
    return value instanceof Object
      ? new Date(value.startDate.getTime() - value.startDate?.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      : value;
  };

  const handleFormSubmit = async (fieldValues: FormInputs) => {
    const obs = [];

    // Prepare observations from field values
    Object.keys(fieldValues).forEach((key) => {
      if (fieldValues[key]) {
        obs.push({
          concept: templateEsmFieldConcepts[key],
          formFieldNamespace: 'rfe-forms',
          formFieldPath: `rfe-forms-${key}`,
          value: formatValue(fieldValues[key]),
        });
      }
    });

    // Construct the base payload
    const payload = {
      encounterDatetime,
      encounterProviders,
      encounterType,
      form,
      location,
      patient,
      orders,
      obs: obs,
    };

    try {
      if (encounter?.uuid) {
        // Update the existing encounter
        await updateEncounter(encounter.uuid, payload); // Pass UUID first, then payload
        showSnackbar({
          isLowContrast: true,
          title: t('updatedEntry', 'Record Updated'),
          kind: 'success',
          subtitle: t('transferOutEncounterUpdatedSuccessfully', 'The patient encounter was updated'),
        });
      } else {
        // Create a new encounter if none exists
        await createEncounter(payload);
        showSnackbar({
          isLowContrast: true,
          title: t('saveEntry', 'Record Saved'),
          kind: 'success',
          subtitle: t('transferOutEncounterCreatedSuccessfully', 'A new encounter was created'),
        });
      }

      mutate();
      closeWorkspaceHandler('template-esm-workspace');
      return true;
    } catch (error) {
      console.error('Error saving encounter:', error);
    }
  };

  // Function to create a new encounter
  const createEncounter = async (payload) => {
    return await saveEncounter(new AbortController(), payload);
  };

  // Function to update an existing encounter
  const updateEncounter = async (uuid, payload) => {
    if (!uuid || !payload) {
      throw new Error('Both UUID and payload are required to update an encounter.'); // Ensure UUID and payload are provided
    }
    return await saveEncounter(new AbortController(), payload, uuid); // Use saveEncounter for updating
  };
  const patientt = usePatient();
  return (
    <Form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)} data-testid="template-form">
      <Stack gap={1} className={styles.container}>
        <section>
          <ResponsiveWrapper>
            <TextInput
              id="facilityName"
              value={facilityLocationName}
              labelText="Facility Name"
              placeholder="Facility Name"
            />
          </ResponsiveWrapper>
        </section>
        <section className={` ${styles.row}`}>
          <div className={styles.dateTimeSection}>
            <ResponsiveWrapper>
              <Controller
                name="sampleTextInput"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="sampleTextInput"
                    value={value}
                    labelText="Text-Input:"
                    placeholder="Text Input"
                    onChange={onChange}
                    onBlur={onBlur}
                    //helperText="Helper text"
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="sampleNumber"
                control={control}
                //defaultValue={defaultDuration}
                render={({ field: { onChange, onBlur, value, ref }, fieldState }) => (
                  <NumberInput
                    hideSteppers
                    disableWheel
                    id="duration"
                    min={0}
                    max={999999}
                    label={t('sampleNumber', 'Number-Input:')}
                    invalidText={t('invalidNumber', 'Number is not valid')}
                    size="md"
                    onBlur={onBlur}
                    onChange={(event) => onChange(Number(event.target.value))}
                    value={value}
                    ref={ref}
                    invalid={fieldState?.error?.message}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>
        <section className={styles.formGroup}>
          <ResponsiveWrapper>
            <Controller
              name="sampleDate"
              control={control}
              render={({ field: { onChange, value, ref } }) => (
                <OpenmrsDatePicker
                  id="sampleDate"
                  labelText={t('sampleDate', 'Ethio-Date')}
                  value={transferOutDate}
                  maxDate={today}
                  onChange={(date) => onDateChange(date, 'sampleDate')}
                  ref={ref}
                  invalidText={error}
                />
              )}
            />
          </ResponsiveWrapper>
        </section>
        <section className={styles.formGroup}>
          <span className={styles.heading}>{t('location', 'Drop Down')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="sampleDropDown"
                control={control}
                render={({ field: { onChange, value, onBlur, ref }, fieldState }) => (
                  <Select
                    id="sampleDropDown"
                    labelText={t('selectSampleDropDown', '(Drop-Down))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                    invalid={!!fieldState?.error?.message}
                    invalidText={fieldState?.error?.message}
                  >
                    <SelectItem text={t('chooseBaselineWHOStage', 'Choose Baseline WHO Stage')} value="" />
                    <SelectItem key={1} text={'Opt-1'} value={'2798d3bc-2e0a-459c-b249-9516b380a69e'}>
                      Stage One
                    </SelectItem>
                    <SelectItem key={2} text={'Opt-2'} value={'3495d89f-4d46-44d8-b1c9-d101bc9f15d4'}>
                      Stage Two
                    </SelectItem>
                    <SelectItem key={3} text={'Opt-3'} value={'a9da3e97-3916-4834-854c-6bcbc5142aca'}>
                      Stage Three
                    </SelectItem>
                    <SelectItem key={4} text={'Opt-4'} value={'b5951dd9-6bb2-4b63-af20-0707500108ea'}>
                      Stage Four
                    </SelectItem>
                  </Select>
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section className={styles.fieldGroup}>
          <span className={styles.heading}>{t('location', 'Check-Box:')}</span>
          <Checkbox
            //checked={value}
            id="option1"
            labelText={t('isDeadInputLabel', 'Opt-1')}
            //onChange={(event, { checked, id }) => setFieldValue(id, checked)}
          />
          <Checkbox
            //checked={value}
            id="option2"
            labelText={t('isDeadInputLabel', 'Opt-2')}
            //onChange={(event, { checked, id }) => setFieldValue(id, checked)}
          />
          <div className={styles.pmtctSection}>
            <Checkbox
              //checked={value}
              id="option3"
              labelText={t('isDeadInputLabel', 'Opt-3')}
              //onChange={(event, { checked, id }) => setFieldValue(id, checked)}
            />
          </div>
          <div className={styles.pmtctSection}>
            <Checkbox
              //checked={value}
              id="option4"
              labelText={t('isDeadInputLabel', 'Opt-4')}
              //onChange={(event, { checked, id }) => setFieldValue(id, checked)}
            />
          </div>
          {/* {values.isDead ? fields.map((field) => <Field key={`death-info-${field}`} name={field} />) : null} */}
        </section>
        <ButtonSet className={styles.buttonSet}>
          <Button
            onClick={() => closeWorkspaceHandler('template-esm-workspace')}
            style={{ maxWidth: 'none', width: '50%' }}
            className={styles.button}
            kind="secondary"
          >
            {t('discard', 'Discard')}
          </Button>
          <Button style={{ maxWidth: 'none', width: '50%' }} className={styles.button} kind="primary" type="submit">
            {encounter ? t('saveAndClose', 'update and close') : t('saveAndClose', 'Save and close')}
          </Button>
        </ButtonSet>
      </Stack>
    </Form>
  );
};

export default TemplateForm;
