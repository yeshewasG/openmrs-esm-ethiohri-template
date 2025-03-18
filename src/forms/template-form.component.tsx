import React, { useEffect, useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './template-form.scss';
import { OpenmrsDatePicker, ResponsiveWrapper, closeWorkspace, showSnackbar, usePatient } from '@openmrs/esm-framework';
import { Form, ButtonSet, Button, Select, SelectItem, Stack, TextInput, NumberInput, Checkbox } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { fetchLocation, saveEncounter } from '../api/api';
import { TEMPLATE_ENCOUNTER_TYPE_UUID, TEMPLATE_FORM_UUID, templateEsmFieldConcepts } from '../constants';
import dayjs from 'dayjs';
import { getObsFromEncounter } from '../utils/encounter-utils';
import { useEncounters } from '../componets/data-table.resource';

type FormInputs = {
  sampleTextInput: string;
  sampleNumber: string;
  sampleDate: string;
  sampleDropDown: string;
};

interface TemplateFormProps {
  patientUuid: string;
  encounter?: any;
}

const selectOptions = [
  { text: 'Opt-1', value: '2798d3bc-2e0a-459c-b249-9516b380a69e' },
  { text: 'Opt-2', value: '3495d89f-4d46-44d8-b1c9-d101bc9f15d4' },
  { text: 'Opt-3', value: 'a9da3e97-3916-4834-854c-6bcbc5142aca' },
  { text: 'Opt-4', value: 'b5951dd9-6bb2-4b63-af20-0707500108ea' },
];

const TemplateForm: React.FC<TemplateFormProps> = memo(({ patientUuid, encounter }) => {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty },
  } = useForm<FormInputs>({
    defaultValues: {
      sampleTextInput: '',
      sampleNumber: '',
      sampleDate: '',
      sampleDropDown: '',
    },
  });

  const [facilityInfo, setFacilityInfo] = useState({ uuid: '', name: '' });
  const [transferOutDate, setTransferOutDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { mutate } = useEncounters(patientUuid, TEMPLATE_ENCOUNTER_TYPE_UUID);

  const basePayload = {
    encounterDatetime: new Date().toISOString(),
    encounterProviders: [
      {
        provider: 'caa66686-bde7-4341-a330-91b7ad0ade07',
        encounterRole: 'a0b03050-c99b-11e0-9572-0800200c9a66',
      },
    ],
    encounterType: TEMPLATE_ENCOUNTER_TYPE_UUID,
    form: { uuid: TEMPLATE_FORM_UUID },
    location: facilityInfo.uuid,
    patient: patientUuid,
    orders: [],
  };

  useEffect(() => {
    fetchLocation().then(({ data }) => {
      const facility = data.results.find((element) => element.tags.some((x) => x.display === 'Facility Location'));
      if (facility) {
        setFacilityInfo({ uuid: facility.uuid, name: facility.display });
      }
    });
  }, []);

  useEffect(() => {
    if (encounter) {
      const dateObs = getObsFromEncounter(encounter, templateEsmFieldConcepts.sampleDate);
      const textObs = getObsFromEncounter(encounter, templateEsmFieldConcepts.sampleTextInput);

      if (dateObs && dayjs(dateObs).isValid()) {
        const formattedDate = dayjs(dateObs).format('YYYY-MM-DD');
        setValue('sampleDate', formattedDate);
        setTransferOutDate(formattedDate);
      }
      if (textObs) setValue('sampleTextInput', textObs);
    }
  }, [encounter, setValue]);

  const onDateChange = useCallback(
    (value: any, fieldName: keyof FormInputs) => {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) throw new Error('Invalid Date');
        const formattedDate = dayjs(date).format('YYYY-MM-DD');
        setValue(fieldName, formattedDate);
        setTransferOutDate(formattedDate);
        setError(null);
      } catch {
        setError('Invalid date format');
      }
    },
    [setValue],
  );

  const handleFormSubmit = useCallback(
    async (fieldValues: FormInputs) => {
      const obs = Object.entries(fieldValues)
        .filter(([, value]) => value)
        .map(([key, value]) => ({
          concept: templateEsmFieldConcepts[key],
          formFieldNamespace: 'rfe-forms',
          formFieldPath: `rfe-forms-${key}`,
          value: dayjs.isDayjs(value) ? value.format('YYYY-MM-DD') : value,
        }));

      const payload = { ...basePayload, obs };

      try {
        const response = await saveEncounter(new AbortController(), payload, encounter?.uuid);

        showSnackbar({
          isLowContrast: true,
          title: encounter ? t('updatedEntry', 'Record Updated') : t('saveEntry', 'Record Saved'),
          kind: 'success',
          subtitle: encounter
            ? t('transferOutEncounterUpdatedSuccessfully', 'The patient encounter was updated')
            : t('transferOutEncounterCreatedSuccessfully', 'A new encounter was created'),
        });

        mutate();
        closeWorkspace('template-esm-workspace', { ignoreChanges: false });
        return true;
      } catch (error) {
        console.error('Error saving encounter:', error);
        showSnackbar({
          title: t('error', 'Error'),
          kind: 'error',
          subtitle: t('errorSavingEncounter', 'Failed to save encounter'),
        });
      }
    },
    [encounter, mutate, t],
  );

  return (
    <Form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)}>
      <Stack gap={1} className={styles.container}>
        <ResponsiveWrapper>
          <TextInput
            id="facilityName"
            value={facilityInfo.name}
            labelText={t('facilityName', 'Facility Name')}
            readOnly
          />
        </ResponsiveWrapper>

        <section className={styles.row}>
          <Controller
            name="sampleTextInput"
            control={control}
            render={({ field }) => (
              <ResponsiveWrapper>
                <TextInput
                  {...field}
                  id="sampleTextInput"
                  labelText={t('textInput', 'Text-Input:')}
                  placeholder={t('textInputPlaceholder', 'Text Input')}
                />
              </ResponsiveWrapper>
            )}
          />
          <Controller
            name="sampleNumber"
            control={control}
            render={({ field }) => (
              <ResponsiveWrapper>
                <NumberInput
                  {...field}
                  hideSteppers
                  disableWheel
                  id="duration"
                  min={0}
                  max={999999}
                  label={t('sampleNumber', 'Number-Input:')}
                  invalidText={t('invalidNumber', 'Number is not valid')}
                />
              </ResponsiveWrapper>
            )}
          />
        </section>

        <Controller
          name="sampleDate"
          control={control}
          render={({ field }) => (
            <ResponsiveWrapper>
              <OpenmrsDatePicker
                {...field}
                id="sampleDate"
                labelText={t('sampleDate', 'Ethio-Date')}
                value={transferOutDate}
                maxDate={new Date()}
                onChange={(date) => onDateChange(date, 'sampleDate')}
                invalidText={error}
              />
            </ResponsiveWrapper>
          )}
        />

        <section className={styles.formGroup}>
          <span className={styles.heading}>{t('location', 'Drop Down')}</span>
          <Controller
            name="sampleDropDown"
            control={control}
            render={({ field }) => (
              <ResponsiveWrapper>
                <Select {...field} id="sampleDropDown" labelText={t('selectSampleDropDown', '(Drop-Down)')}>
                  <SelectItem text={t('chooseBaselineWHOStage', 'Choose Baseline WHO Stage')} value="" />
                  {selectOptions.map((option) => (
                    <SelectItem key={option.value} text={option.text} value={option.value} />
                  ))}
                </Select>
              </ResponsiveWrapper>
            )}
          />
        </section>

        <section className={styles.fieldGroup}>
          <span className={styles.heading}>{t('checkBox', 'Check-Box:')}</span>
          {[1, 2, 3, 4].map((num) => (
            <Checkbox key={`option${num}`} id={`option${num}`} labelText={t('isDeadInputLabel', `Opt-${num}`)} />
          ))}
        </section>

        <ButtonSet className={styles.buttonSet}>
          <Button
            kind="secondary"
            onClick={() => closeWorkspace('template-esm-workspace', { ignoreChanges: !isDirty })}
            className={styles.button}
          >
            {t('discard', 'Discard')}
          </Button>
          <Button kind="primary" type="submit" className={styles.button}>
            {encounter ? t('saveAndClose', 'Update and close') : t('saveAndClose', 'Save and close')}
          </Button>
        </ButtonSet>
      </Stack>
    </Form>
  );
});

export default TemplateForm;
