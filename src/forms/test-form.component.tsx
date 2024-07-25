/**
 * From here, the application is pretty typical React, but with lots of
 * support from `@openmrs/esm-framework`. Check out `Greeter` to see
 * usage of the configuration system, and check out `PatientGetter` to
 * see data fetching using the OpenMRS FHIR API.
 *
 * Check out the Config docs:
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './root.scss';
import { ResponsiveWrapper, closeWorkspace } from '@openmrs/esm-framework';
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
import { saveEncounter } from '../api/api';

type FormInputs = {
  //   location: string;
  //   testInput: string;
  appointmentNote: string;
  appointmentDateTime: Date;
};

const Root: React.FC = () => {
  const { t } = useTranslation();

  const onError = (error) => console.error(error);

  const { control, handleSubmit } = useForm<FormInputs>();

  const encounterDatetime = '2024-07-24T11:57:37.991Z';
  const encounterProviders = [
    { provider: 'caa66686-bde7-4341-a330-91b7ad0ade07', encounterRole: 'a0b03050-c99b-11e0-9572-0800200c9a66' },
  ];
  const encounterType = 'f1b397c1-46bd-43e6-a23d-ae2cedaec881';
  const form = { uuid: 'e270770f-19bf-3d32-baaf-4b677983dec3' };
  const location = '44c3efb0-2583-4c80-a79e-1f756a03c0a1';
  const patient = 'e70d161e-9d7c-417d-b516-935aa9938d2b';
  const orders = [];

  const [pickedDate, setPickedDate] = useState<Date | null>(null); // Added state for pickedDate

  const conceptObject = {
    appointmentNote: '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    appointmentDateTime: '2c4db7e7-1ece-49a6-a075-d466e6d9b27d',
  };

  const obs = [];

  const formatValue = (value) => {
    console.log(value instanceof Object);

    return value instanceof Object
      ? new Date(value.startDate.getTime() - value.startDate?.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      : value;
  };

  const handleFormSubmit = async (data: FormInputs) => {
    Object.keys(data).forEach((key) => {
      console.log(`${key}: ${typeof data[key]}`);
      obs.push({
        concept: conceptObject[key],
        formFieldNamespace: 'rfe-forms',
        formFieldPath: `rfe-forms-${key}`,
        value: formatValue(data[key]),
      });
    });

    console.log(obs);

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

    console.log(await saveEncounter(new AbortController(), payload));

    return true;

    // console.log(payload);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.welcome}>{t('welcomeText', 'Welcome to the O3 Template app')}</h3>
      <p className={styles.explainer}>
        {t('explainer', 'The following examples demonstrate some key features of the O3 framework')}.
      </p>

      <Form onSubmit={handleSubmit(handleFormSubmit, onError)}>
        <Stack gap={4}>
          {/* <section className={styles.formGroup}>
            <span className={styles.heading}>{t('location', 'Location')}</span>
            <ResponsiveWrapper>
              <Controller
                name="location"
                control={control}
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <Select
                    id="location"
                    invalidText="Required"
                    labelText={t('selectLocation', 'Select a location')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                  >
                    <SelectItem text={t('chooseLocation', 'Choose a location')} value="" />

                    <SelectItem key={1} text={'location 1'} value={1}>
                      Location 1
                    </SelectItem>
                    <SelectItem key={2} text={'location 2'} value={2}>
                      Location 2
                    </SelectItem>
                    <SelectItem key={3} text={'location 3'} value={3}>
                      Location 3
                    </SelectItem>
                  </Select>
                )}
              />
            </ResponsiveWrapper>
          </section> */}

          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <Controller
                name="appointmentDateTime"
                control={control}
                render={({ field: { onChange, value, ref } }) => (
                  <DatePicker
                    datePickerType="single"
                    //   dateFormat={datePickerFormat}
                    // value={pickedDate || value.startDate}
                    onChange={([date]) => {
                      if (date) {
                        onChange({ ...value, startDate: date });
                      }
                    }}
                    //   minDate={minAllowedDate} // Set the minimum allowed date
                  >
                    <DatePickerInput
                      id="datePickerInput"
                      labelText={t('date', 'Date')}
                      style={{ width: '100%' }}
                      // placeholder={datePickerPlaceHolder}
                      ref={ref}
                    />
                  </DatePicker>
                )}
              />
            </ResponsiveWrapper>
          </section>

          {/* <section className={styles.formGroup}>
            <span className={styles.heading}>{t('note', 'Text')}</span>
            <ResponsiveWrapper>
              <Controller
                name="testInput"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="testInput"
                    value={value}
                    labelText={t('appointmentNoteLabel', 'Test input')}
                    placeholder={t('appointmentNotePlaceholder', 'test text')}
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </section> */}

          <section className={styles.formGroup}>
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
          </section>
        </Stack>

        <ButtonSet>
          <Button className={styles.button} onClick={closeWorkspace} kind="secondary">
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

export default Root;
