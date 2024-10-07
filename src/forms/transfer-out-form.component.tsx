import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../root.scss';
import { OpenmrsDatePicker, ResponsiveWrapper, closeWorkspace } from '@openmrs/esm-framework';
import type { CloseWorkspaceOptions } from '@openmrs/esm-framework';
import { Form } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { Select, SelectItem, Toggle, Stack } from '@carbon/react';
import { TextArea } from '@carbon/react';
import { DatePicker } from '@carbon/react';
import { DatePickerInput } from '@carbon/react';
import { Text } from '@carbon/react/lib/components/Text';
import { TextInput } from '@carbon/react';
import { ButtonSet } from '@carbon/react';
import { Button } from '@carbon/react';
import { fetchLocation, getPatientEncounters, getPatientInfo, saveEncounter } from '../api/api';
import {
  FOLLOWUP_ENCOUNTER_TYPE_UUID,
  TRANSFEROUT_ENCOUNTER_TYPE_UUID,
  TRANSFEROUT_FORM_UUID,
  transferOutFieldConcepts,
} from '../constants';
import dayjs from 'dayjs';

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
}

const TransferOutForm: React.FC = ({ patientUuid }: TransferOutFormProps) => {
  const { t } = useTranslation();
  const [transferOutDate, setTransferOutDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const onError = (error) => console.error(error);
  const { control, handleSubmit, setValue } = useForm<FormInputs>();
  const [facilityLocationUUID, setFacilityLocationUUID] = useState('');
  const [facilityLocationName, setFacilityLocationName] = useState('');

  // const encounterDatetime = '2024-07-24T11:57:37.991Z';
  //const encounterDatetime = new Date(new Date().toString().split('GMT')[0] + ' UTC').toISOString();
  const encounterDatetime = new Date().toISOString();

  const encounterProviders = [
    { provider: 'caa66686-bde7-4341-a330-91b7ad0ade07', encounterRole: 'a0b03050-c99b-11e0-9572-0800200c9a66' },
  ];
  const encounterType = TRANSFEROUT_ENCOUNTER_TYPE_UUID;
  const form = { uuid: TRANSFEROUT_FORM_UUID };
  const location = facilityLocationUUID;
  const patient = patientUuid;
  const orders = [];

  const [pickedDate, setPickedDate] = useState<Date | null>(null); // Added state for pickedDate

  const onDateChange = (value: any) => {
    try {
      const jsDate = new Date(value);
      if (isNaN(jsDate.getTime())) {
        throw new Error('Invalid Date');
      }

      const formattedDate = dayjs(jsDate).format('YYYY-MM-DD');
      setValue('dateOfTransfer', formattedDate); // Set dateOfTransfer in form
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
      onWorkspaceClose: () => {
        // console.log('Workspace closed successfully');
      },
    };
    closeWorkspace(name, options);
  };

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

  useEffect(() => {
    (async function () {
      const patientInfo = await getPatientInfo(patientUuid);
      const { givenName, middleName, familyName } = patientInfo.person?.preferredName;
      const mrn = patientInfo?.identifiers?.find((e) => e.identifierType?.display === 'MRN')?.identifier;
      setValue('name', `${givenName} ${middleName} ${familyName}`);
      setValue('mrn', mrn);
    })();
  }, [patientUuid, setValue]);

  useEffect(() => {
    (async function () {
      const encounters = await getPatientEncounters(patientUuid, FOLLOWUP_ENCOUNTER_TYPE_UUID);
      const firstEncounterWithRegimen = encounters?.find((encounter) =>
        encounter?.obs?.find((e) => e?.concept?.uuid === transferOutFieldConcepts.originalFirstLineRegimenDose),
      );
      const originalRegimen = firstEncounterWithRegimen?.obs?.find(
        (e) => e?.concept?.uuid === transferOutFieldConcepts.originalFirstLineRegimenDose,
      )?.value?.uuid;
      setValue('originalFirstLineRegimenDose', originalRegimen);
    })();
  }, [patientUuid, setValue]);

  const formatValue = (value) => {
    return value instanceof Object
      ? new Date(value.startDate.getTime() - value.startDate?.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      : value;
  };

  const handleFormSubmit = async (fieldValues: FormInputs) => {
    const obs = [];
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

    await saveEncounter(new AbortController(), payload);
    closeWorkspaceHandler('transfer-out-workspace');
    return true;
  };

  return (
    <div className={styles.container}>
      <Form onSubmit={handleSubmit(handleFormSubmit, onError)}>
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
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <Select
                    id="artStarted"
                    invalidText="Required"
                    labelText="ART Started"
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
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
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <Select
                    id="originalFirstLineRegimenDose"
                    invalidText="Required"
                    labelText="Original First Line Regimen Dose"
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
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

          {/* <section className={styles.formGroup}>
            <span className={styles.heading}>{t('note', 'Note')}</span>
            <ResponsiveWrapper>
              <Controller
                name="appointmentNote"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextArea
                    id="appointmentNote"
                    value={value}
                    labelText={t('appointmentNoteLabel', 'Write an additional note')}
                    placeholder={t('appointmentNotePlaceholder', 'Write any additional points here')}
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </section> */}
        </Stack>

        <ButtonSet style={{ marginTop: '20px' }}>
          <Button
            className={styles.button}
            onClick={() => closeWorkspaceHandler('transfer-out-workspace')}
            kind="secondary"
          >
            {t('discard', 'Discard')}
          </Button>
          <Button className={styles.button} type="submit">
            {t('saveAndClose', 'Save and close')}
          </Button>
        </ButtonSet>
      </Form>
    </div>
  );
};

export default TransferOutForm;
