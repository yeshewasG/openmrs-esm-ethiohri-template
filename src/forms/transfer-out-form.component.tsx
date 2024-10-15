import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../root.scss';
import { OpenmrsDatePicker, ResponsiveWrapper, closeWorkspace, showSnackbar } from '@openmrs/esm-framework';
import type { CloseWorkspaceOptions } from '@openmrs/esm-framework';
import { Form } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { Select, SelectItem, Stack } from '@carbon/react';
import { TextInput } from '@carbon/react';
import { Button } from '@carbon/react';
import { fetchLocation, getPatientEncounters, getPatientInfo, saveEncounter } from '../api/api';
import {
  FOLLOWUP_ENCOUNTER_TYPE_UUID,
  TRANSFEROUT_ENCOUNTER_TYPE_UUID,
  TRANSFEROUT_FORM_UUID,
  transferOutFieldConcepts,
} from '../constants';
import dayjs from 'dayjs';
import { useEncounters } from '../transfer-out/transfer-out.resource';
import type { OpenmrsEncounter } from '../types';
import { getObsFromEncounter } from '../utils/encounter-utils';
import { ButtonSet } from '@carbon/react';

type FormInputs = {
  transferredFrom: string;
  transferredTo: string;
  name: string;
  mrn: string;
  artStarted: string;
  originalFirstLineRegimenDose: string;
  dateOfTransfer: string;
};

interface TransferOutFormProps {
  patientUuid: string;
  encounter?: OpenmrsEncounter; // If provided, it means we are editing an encounter
}

const TransferOutForm: React.FC<TransferOutFormProps> = ({ patientUuid, encounter }) => {
  const { t } = useTranslation();
  const [transferOutDate, setTransferOutDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const { control, handleSubmit, setValue } = useForm<FormInputs>();
  const [facilityLocationUUID, setFacilityLocationUUID] = useState('');
  const [facilityLocationName, setFacilityLocationName] = useState('');

  const encounterDatetime = new Date().toISOString();

  const encounterProviders = [
    { provider: 'caa66686-bde7-4341-a330-91b7ad0ade07', encounterRole: 'a0b03050-c99b-11e0-9572-0800200c9a66' },
  ];
  const encounterType = TRANSFEROUT_ENCOUNTER_TYPE_UUID;
  const form = { uuid: TRANSFEROUT_FORM_UUID };
  const location = facilityLocationUUID;
  const patient = patientUuid;
  const orders = [];

  // Fetch patient encounters
  const { encounters, isError, isLoading, mutate } = useEncounters(patientUuid, TRANSFEROUT_ENCOUNTER_TYPE_UUID);

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

  // Fetch patient information
  useEffect(() => {
    (async function () {
      const patientInfo = await getPatientInfo(patientUuid);
      const { givenName, middleName, familyName } = patientInfo.person?.preferredName;
      const mrn = patientInfo?.identifiers?.find((e) => e.identifierType?.display === 'MRN')?.identifier;
      setValue('name', `${givenName} ${middleName} ${familyName}`);
      setValue('mrn', mrn);
    })();
  }, [patientUuid, setValue]);

  // Load existing encounter data if editing
  useEffect(() => {
    if (encounter) {
      const dateOfTransferObs = getObsFromEncounter(encounter, transferOutFieldConcepts.dateOfTransfer);
      if (dateOfTransferObs && dayjs(dateOfTransferObs).isValid()) {
        setValue('dateOfTransfer', dayjs(dateOfTransferObs).format('YYYY-MM-DD'));
        setTransferOutDate(
          dayjs(getObsFromEncounter(encounter, transferOutFieldConcepts.dateOfTransfer)).format('YYYY-MM-DD'),
        );
      } else {
        setValue('dateOfTransfer', ''); // or any default value like null or empty string
      }
      setValue(
        'transferredTo',
        encounter?.obs?.find((e) => e?.concept?.uuid === transferOutFieldConcepts.transferredTo)?.value || '',
      );
      setValue(
        'artStarted',
        encounter?.obs?.find((e) => e?.concept?.uuid === transferOutFieldConcepts.artStarted)?.value?.uuid || '',
      );
      setValue(
        'originalFirstLineRegimenDose',
        encounter?.obs?.find((e) => e?.concept?.uuid === transferOutFieldConcepts.originalFirstLineRegimenDose)?.value
          ?.uuid || '',
      );
    }
  }, [encounter, setValue]);

  const onDateChange = (value: any) => {
    try {
      const jsDate = new Date(value);
      if (isNaN(jsDate.getTime())) {
        throw new Error('Invalid Date');
      }
      const formattedDate = dayjs(jsDate).format('YYYY-MM-DD');
      setValue('dateOfTransfer', formattedDate);
      setTransferOutDate(formattedDate);
      setError(null);
      setNotification({ message: 'Date selected successfully.', type: 'success' });
    } catch (e) {
      setError('Invalid date format');
      setNotification({ message: 'Invalid date format.', type: 'error' });
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
          concept: transferOutFieldConcepts[key],
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
      // Check if we are editing an existing encounter
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
      closeWorkspaceHandler('transfer-out-workspace');
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

  return (
    <div className={styles.container}>
      <Form onSubmit={handleSubmit(handleFormSubmit)}>
        <Stack gap={4}>
          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <TextInput
                id="transferredFrom"
                value={facilityLocationName}
                labelText="Transferred From"
                placeholder="Facility Name"
                helperText="Helper text"
              />
            </ResponsiveWrapper>
          </section>

          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <Controller
                name="transferredTo"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="transferredTo"
                    value={value}
                    labelText="Transferred To"
                    placeholder="Facility Name"
                    onChange={onChange}
                    onBlur={onBlur}
                    helperText="Helper text"
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </section>

          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <Controller
                name="dateOfTransfer"
                control={control}
                render={({ field: { onChange, value, ref } }) => (
                  <OpenmrsDatePicker
                    id="dateOfTransfer"
                    labelText={t('transferOutDate', 'Transfer Out Date')}
                    value={transferOutDate}
                    maxDate={today}
                    onChange={onDateChange}
                    ref={ref}
                    invalidText={error}
                  />
                )}
              />
            </ResponsiveWrapper>
          </section>

          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <Controller
                name="name"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="name"
                    value={value}
                    labelText="Name"
                    placeholder="Patient Name"
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </section>

          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <Controller
                name="mrn"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput id="mrn" value={value} labelText="MRN" placeholder="MRN" onBlur={onBlur} ref={ref} />
                )}
              />
            </ResponsiveWrapper>
          </section>

          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <Controller
                name="artStarted"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <Select
                    id="artStarted"
                    labelText="ART Started"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  >
                    <SelectItem key={1} text={''} value={''}></SelectItem>
                    <SelectItem key={1} text={'Yes'} value={'1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}>
                      Yes
                    </SelectItem>
                    <SelectItem key={2} text={'No'} value={'1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}>
                      No
                    </SelectItem>
                  </Select>
                )}
              />
            </ResponsiveWrapper>
          </section>

          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <Controller
                name="originalFirstLineRegimenDose"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <Select
                    id="originalFirstLineRegimenDose"
                    labelText="Original First Line Regimen Dose"
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  >
                    <SelectItem key={1} text={''} value={''}></SelectItem>
                    <SelectItem key={1} text={'1a30 - D4T(30)+3TC+NVP'} value={'2798d3bc-2e0a-459c-b249-9516b380a69e'}>
                      1a30 - D4T(30)+3TC+NVP
                    </SelectItem>
                    <SelectItem key={2} text={'1a40 - D4T(40)+3TC+NVP'} value={'3495d89f-4d46-44d8-b1c9-d101bc9f15d4'}>
                      1a40 - D4T(40)+3TC+NVP
                    </SelectItem>
                    <SelectItem key={1} text={'1c - AZT+3TC+NVP'} value={'a9da3e97-3916-4834-854c-6bcbc5142aca'}>
                      1c - AZT+3TC+NVP
                    </SelectItem>
                    <SelectItem key={1} text={'1d - AZT+3TC+EFV'} value={'b5951dd9-6bb2-4b63-af20-0707500108ea'}>
                      1d - AZT+3TC+EFV
                    </SelectItem>
                  </Select>
                )}
              />
            </ResponsiveWrapper>
          </section>

          <ButtonSet style={{ marginTop: '20px' }}>
            <Button
              className={styles.button}
              onClick={() => closeWorkspaceHandler('transfer-out-workspace')}
              kind="secondary"
            >
              {t('discard', 'Discard')}
            </Button>
            <Button className={styles.button} type="submit">
              {/* {t('saveAndClose', 'Save and close')} */}
              {encounter ? t('saveAndClose', 'update and close') : t('saveAndClose', 'Save and close')}
            </Button>
          </ButtonSet>
          {notification && (
            <div className={notification.type === 'error' ? styles.error : styles.success}>{notification.message}</div>
          )}
        </Stack>
      </Form>
    </div>
  );
};

export default TransferOutForm;
