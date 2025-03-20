import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './kpp-follow-up-form.scss';
import { OpenmrsDatePicker, ResponsiveWrapper, closeWorkspace, showSnackbar } from '@openmrs/esm-framework';
import {
  Form,
  ButtonSet,
  Button,
  Select,
  SelectItem,
  Stack,
  TextInput,
  NumberInput,
  RadioButtonGroup,
  RadioButton,
  Checkbox,
} from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { fetchLocation, getPatientEncounters, getPatientInfo, saveEncounter } from '../api/api';
import {
  FOLLOWUP_ENCOUNTER_TYPE_UUID,
  TRANSFEROUT_ENCOUNTER_TYPE_UUID,
  TRANSFEROUT_FORM_UUID,
  transferOutFieldConcepts,
} from '../constants';
import dayjs from 'dayjs';
import { useEncounters } from './form-resources';
import { getObsFromEncounter } from '../utils/encounter-utils';

// Update FormInputs to make all fields optional
type FormInputs = {
  [K in keyof Record<
    | 'transferredFrom'
    | 'transferredTo'
    | 'clinicianName'
    | 'mrn'
    | 'artStarted'
    | 'originalFirstLineRegimenDose'
    | 'dateOfTransfer'
    | 'refNumber'
    | 'sideEffects'
    | 'rxFailure'
    | 'otherSpecify'
    | 'whoStage'
    | 'childPMTCT'
    | 'emailAddress'
    | 'providerTelephoneNumber'
    | 'dateMotherPMTCT'
    | 'motherPMTCT'
    | 'dateChildPMTCT'
    | 'arvUsedforPMTCT'
    | 'baselineLFT'
    | 'currentLFT'
    | 'baselineRFT'
    | 'currentRFT'
    | 'baselineTLC'
    | 'currentTLC'
    | 'baselineCD4'
    | 'currentCD4'
    | 'baselineVL'
    | 'currentVL'
    | 'baselineWeight'
    | 'currentWeight'
    | 'baselineHeight'
    | 'currentHeight'
    | 'baselineBodySurfaceArea'
    | 'currentBodySurfaceArea'
    | 'baselineWHOStage'
    | 'currentWHOStage'
    | 'baselineFunctionalStatus'
    | 'currentFunctionalStatus'
    | 'betterManagementReasonSpecify'
    | 'otherReasonSpecify',
    string
  >]?: string;
};

interface TransferOutFormProps {
  patientUuid: string;
  encounter?: any;
}

// Define the validation schema with all fields as optional except required ones
const schema = Yup.object().shape({
  transferredFrom: Yup.string(),
  transferredTo: Yup.string().required('Transferred to facility is required'),
  clinicianName: Yup.string().required('Clinician name is required'),
  mrn: Yup.string(),
  artStarted: Yup.string(),
  originalFirstLineRegimenDose: Yup.string(),
  dateOfTransfer: Yup.string().required('Transfer date is required'),
  refNumber: Yup.string(),
  sideEffects: Yup.string(),
  rxFailure: Yup.string(),
  otherSpecify: Yup.string(),
  whoStage: Yup.string(),
  childPMTCT: Yup.string().when('$isMale', {
    is: false,
    then: (schema) => schema.required('Child PMTCT status is required'),
    otherwise: (schema) => schema,
  }),
  emailAddress: Yup.string().email('Invalid email format'),
  providerTelephoneNumber: Yup.string()
    .matches(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .required('Telephone number is required'),
  dateMotherPMTCT: Yup.string().when('motherPMTCT', {
    is: '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    then: (schema) => schema.required('Date for Mother PMTCT is required when "Yes" is selected'),
    otherwise: (schema) => schema,
  }),
  motherPMTCT: Yup.string().when('$isMale', {
    is: false,
    then: (schema) => schema.required('Mother PMTCT status is required'),
    otherwise: (schema) => schema,
  }),
  dateChildPMTCT: Yup.string().when('childPMTCT', {
    is: '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    then: (schema) => schema.required('Date for Child PMTCT is required when "Yes" is selected'),
    otherwise: (schema) => schema,
  }),
  arvUsedforPMTCT: Yup.string().when('$isMale', {
    is: false,
    then: (schema) => schema.required('ARV used for PMTCT is required'),
    otherwise: (schema) => schema,
  }),
  baselineLFT: Yup.string(),
  currentLFT: Yup.string(),
  baselineRFT: Yup.string(),
  currentRFT: Yup.string(),
  baselineTLC: Yup.string(),
  currentTLC: Yup.string(),
  baselineCD4: Yup.string(),
  currentCD4: Yup.string(),
  baselineVL: Yup.string(),
  currentVL: Yup.string(),
  baselineWeight: Yup.string(),
  currentWeight: Yup.string(),
  baselineHeight: Yup.string(),
  currentHeight: Yup.string(),
  baselineBodySurfaceArea: Yup.string(),
  currentBodySurfaceArea: Yup.string(),
  baselineWHOStage: Yup.string(),
  currentWHOStage: Yup.string(),
  baselineFunctionalStatus: Yup.string(),
  currentFunctionalStatus: Yup.string(),
  betterManagementReasonSpecify: Yup.string().when('$checkedState.betterManagement', {
    is: true,
    then: (schema) => schema.required('Please specify reason for better management'),
    otherwise: (schema) => schema,
  }),
  otherReasonSpecify: Yup.string().when('$checkedState.otherReason', {
    is: true,
    then: (schema) => schema.required('Please specify other reason'),
    otherwise: (schema) => schema,
  }),
});

const TransferOutForm: React.FC<TransferOutFormProps> = ({ patientUuid, encounter }) => {
  const { t } = useTranslation();
  const [transferOutDate, setTransferOutDate] = useState<string | null>(null);
  const [dateMotherPMTCT, setDateMotherPMTCT] = useState<string | null>(null);
  const today = new Date();
  const [isMale, setIsMale] = useState(false);
  const [checkedState, setCheckedState] = useState({
    betterManagement: false,
    otherReason: false,
  });
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInputs>({
    resolver: yupResolver(schema),
    context: { isMale, checkedState },
    defaultValues: {
      transferredFrom: '',
      transferredTo: '',
      clinicianName: '',
      mrn: '',
      artStarted: '',
      originalFirstLineRegimenDose: '',
      dateOfTransfer: '',
      refNumber: '',
      sideEffects: '',
      rxFailure: '',
      otherSpecify: '',
      whoStage: '',
      childPMTCT: '',
      emailAddress: '',
      providerTelephoneNumber: '',
      dateMotherPMTCT: '',
      motherPMTCT: '',
      dateChildPMTCT: '',
      arvUsedforPMTCT: '',
      baselineLFT: '',
      currentLFT: '',
      baselineRFT: '',
      currentRFT: '',
      baselineTLC: '',
      currentTLC: '',
      baselineCD4: '',
      currentCD4: '',
      baselineVL: '',
      currentVL: '',
      baselineWeight: '',
      currentWeight: '',
      baselineHeight: '',
      currentHeight: '',
      baselineBodySurfaceArea: '',
      currentBodySurfaceArea: '',
      baselineWHOStage: '',
      currentWHOStage: '',
      baselineFunctionalStatus: '',
      currentFunctionalStatus: '',
      betterManagementReasonSpecify: '',
      otherReasonSpecify: '',
    },
  });
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showChildDatePicker, setShowChildDatePicker] = useState(false);
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  const handleARVChange = (newValue: string) => {
    const isOther = newValue === '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    setIsOtherSelected(isOther);
    if (!isOther) {
      setValue('sideEffects', '');
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    if (!checked && checkedState[id as keyof typeof checkedState]) {
      if (id === 'betterManagement') {
        setValue('betterManagementReasonSpecify', '');
      } else if (id === 'otherReason') {
        setValue('otherReasonSpecify', '');
      }
    }
    setCheckedState((prevState) => ({
      ...prevState,
      [id]: checked,
    }));
  };

  const { encounters, mutate } = useEncounters(patientUuid, TRANSFEROUT_ENCOUNTER_TYPE_UUID);

  useEffect(() => {
    (async () => {
      const facilityInformation = await fetchLocation();
      facilityInformation.data.results.forEach((element: any) => {
        if (element.tags.some((x: any) => x.display === 'Facility Location')) {
          setFacilityLocationUUID(element.uuid);
          setFacilityLocationName(element.display);
          setValue('transferredFrom', element.display);
        }
      });
    })();
  }, [setValue]);

  useEffect(() => {
    (async () => {
      const patientInfo = await getPatientInfo(patientUuid);
      const mrn = patientInfo?.identifiers?.find((e: any) => e.identifierType?.display === 'MRN')?.identifier;
      const gender = patientInfo?.person?.gender;
      setIsMale(gender === 'M');
      setValue('mrn', mrn || '');
    })();
  }, [patientUuid, setValue]);

  useEffect(() => {
    (async () => {
      const encounters = await getPatientEncounters(patientUuid, FOLLOWUP_ENCOUNTER_TYPE_UUID);
      const firstEncounterWithRegimen = encounters?.find((encounter: any) =>
        encounter?.obs?.find((e: any) => e?.concept?.uuid === transferOutFieldConcepts.originalFirstLineRegimenDose),
      );
      const originalRegimen = firstEncounterWithRegimen?.obs?.find(
        (e: any) => e?.concept?.uuid === transferOutFieldConcepts.originalFirstLineRegimenDose,
      )?.value?.uuid;
      setValue('originalFirstLineRegimenDose', originalRegimen || '');
    })();
  }, [patientUuid, setValue]);

  useEffect(() => {
    if (encounter) {
      const dateOfTransferObs = getObsFromEncounter(encounter, transferOutFieldConcepts.dateOfTransfer);
      if (dateOfTransferObs && dayjs(dateOfTransferObs).isValid()) {
        setValue('dateOfTransfer', dayjs(dateOfTransferObs).format('YYYY-MM-DD'));
        setTransferOutDate(dayjs(dateOfTransferObs).format('YYYY-MM-DD'));
      }

      setValue('transferredTo', getObsFromEncounter(encounter, transferOutFieldConcepts.transferredTo) || '');
      setValue('clinicianName', getObsFromEncounter(encounter, transferOutFieldConcepts.ClinicianName) || '');
      setValue(
        'providerTelephoneNumber',
        getObsFromEncounter(encounter, transferOutFieldConcepts.providerTelephoneNumber) || '',
      );
      setValue(
        'artStarted',
        encounter?.obs?.find((e: any) => e?.concept?.uuid === transferOutFieldConcepts.artStarted)?.value?.uuid || '',
      );
    }
  }, [encounter, setValue]);

  const childPMTCT = watch('childPMTCT');
  const motherPMTCT = watch('motherPMTCT');

  type DateFieldKey = 'dateMotherPMTCT' | 'dateOfTransfer' | 'dateChildPMTCT';

  const onDateChange = (value: any, dateField: DateFieldKey) => {
    const jsDate = new Date(value);
    if (isNaN(jsDate.getTime())) {
      return;
    }
    const formattedDate = dayjs(jsDate).format('YYYY-MM-DD');
    setValue(dateField, formattedDate);
    if (dateField === 'dateOfTransfer') {
      setTransferOutDate(formattedDate);
    } else if (dateField === 'dateMotherPMTCT') {
      setDateMotherPMTCT(formattedDate);
    }
  };

  const closeWorkspaceHandler = (name: string) => {
    closeWorkspace(name, { ignoreChanges: false });
  };

  const formatValue = (value: any) => {
    return value instanceof Object
      ? new Date(value.startDate.getTime() - value.startDate?.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      : value;
  };

  const handleFormSubmit = async (fieldValues: FormInputs) => {
    const obs = [];

    Object.keys(fieldValues).forEach((key) => {
      if (fieldValues[key as keyof FormInputs]) {
        obs.push({
          concept: transferOutFieldConcepts[key as keyof typeof transferOutFieldConcepts],
          formFieldNamespace: 'rfe-forms',
          formFieldPath: `rfe-forms-${key}`,
          value: formatValue(fieldValues[key as keyof FormInputs]),
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
      obs,
    };

    try {
      if (encounter?.uuid) {
        await saveEncounter(new AbortController(), payload, encounter.uuid);
        showSnackbar({
          isLowContrast: true,
          title: t('updatedEntry', 'Record Updated'),
          kind: 'success',
          subtitle: t('transferOutEncounterUpdatedSuccessfully', 'The patient encounter was updated'),
        });
      } else {
        await saveEncounter(new AbortController(), payload);
        showSnackbar({
          isLowContrast: true,
          title: t('saveEntry', 'Record Saved'),
          kind: 'success',
          subtitle: t('transferOutEncounterCreatedSuccessfully', 'A new encounter was created'),
        });
      }

      mutate();
      closeWorkspaceHandler('transfer-out-workspace');
    } catch (error) {
      console.error('Error saving encounter:', error);
    }
  };

  return (
    <Form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)} data-testid="transfer-out-form">
      <Stack gap={1} className={styles.container}>
        <section>
          <ResponsiveWrapper>
            <Controller
              name="transferredFrom"
              control={control}
              render={({ field: { value, ref } }) => (
                <TextInput
                  id="transferredFrom"
                  value={value}
                  labelText="Transferred From"
                  placeholder="Facility Name"
                  disabled
                  ref={ref}
                />
              )}
            />
          </ResponsiveWrapper>
        </section>

        <section className={styles.row}>
          <div className={styles.dateTimeSection}>
            <ResponsiveWrapper>
              <Controller
                name="transferredTo"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="transferredTo"
                    value={value}
                    labelText="Transferred To:"
                    placeholder="Facility Name"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                    invalid={!!errors.transferredTo}
                    invalidText={errors.transferredTo?.message}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="refNumber"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <NumberInput
                    hideSteppers
                    disableWheel
                    id="duration"
                    min={0}
                    max={999999}
                    label={t('refNumber', 'Referral Number:')}
                    invalidText={t('invalidNumber', 'Number is not valid')}
                    size="md"
                    onBlur={onBlur}
                    onChange={(event) => onChange(Number(event.target.value))}
                    value={value}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
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
                  onChange={(date) => onDateChange(date, 'dateOfTransfer')}
                  ref={ref}
                  invalid={!!errors.dateOfTransfer}
                  invalidText={errors.dateOfTransfer?.message}
                />
              )}
            />
          </ResponsiveWrapper>
        </section>

        <section>
          <ResponsiveWrapper>
            <Controller
              name="sideEffects"
              control={control}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <TextInput
                  id="sideEffects"
                  value={value}
                  labelText="Side Effects:"
                  placeholder="Side Effects"
                  onChange={onChange}
                  onBlur={onBlur}
                  ref={ref}
                />
              )}
            />
          </ResponsiveWrapper>
        </section>

        <section>
          <ResponsiveWrapper>
            <Controller
              name="rxFailure"
              control={control}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <TextInput
                  id="rxFailure"
                  value={value}
                  labelText="Rx Failure (Specify Criteria):"
                  placeholder="Specify Criteria"
                  onChange={onChange}
                  onBlur={onBlur}
                  ref={ref}
                />
              )}
            />
          </ResponsiveWrapper>
        </section>

        <section>
          <ResponsiveWrapper>
            <Controller
              name="otherSpecify"
              control={control}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <TextInput
                  id="otherSpecify"
                  value={value}
                  labelText="Other (Specify):"
                  placeholder="Other Specify"
                  onChange={onChange}
                  onBlur={onBlur}
                  ref={ref}
                />
              )}
            />
          </ResponsiveWrapper>
        </section>

        {!isMale && (
          <>
            <section className={styles.formGroup}>
              <span className={styles.heading}>{t('pastARVUseForPMTCT', 'Past ARV use for PMTCT')}</span>
              <div className={styles.pmtctSection}>
                <ResponsiveWrapper>
                  <Controller
                    name="motherPMTCT"
                    control={control}
                    render={({ field: { onChange, value, onBlur } }) => (
                      <RadioButtonGroup
                        legendText="Mother"
                        name="motherPMTCT"
                        onChange={(newValue) => {
                          onChange(newValue);
                          setShowDatePicker(newValue === '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
                        }}
                        value={value}
                        onBlur={onBlur}
                        invalid={!!errors.motherPMTCT}
                        invalidText={errors.motherPMTCT?.message}
                      >
                        <RadioButton id="motherYes" labelText="Yes" value={'1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'} />
                        <RadioButton id="motherNo" labelText="No" value={'1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'} />
                      </RadioButtonGroup>
                    )}
                  />
                </ResponsiveWrapper>
                <ResponsiveWrapper>
                  {showDatePicker && (
                    <Controller
                      name="dateMotherPMTCT"
                      control={control}
                      render={({ field: { onChange, value, ref } }) => (
                        <OpenmrsDatePicker
                          id="dateMotherPMTCT"
                          labelText={t('dateMotherPMTCT', 'Date')}
                          value={dateMotherPMTCT}
                          maxDate={today}
                          onChange={(date) => onDateChange(date, 'dateMotherPMTCT')}
                          ref={ref}
                          invalid={!!errors.dateMotherPMTCT}
                          invalidText={errors.dateMotherPMTCT?.message}
                        />
                      )}
                    />
                  )}
                </ResponsiveWrapper>
              </div>
            </section>

            <section className={styles.formGroup}>
              <div className={styles.pmtctSection}>
                <ResponsiveWrapper>
                  <Controller
                    name="childPMTCT"
                    control={control}
                    render={({ field: { onChange, value, onBlur } }) => (
                      <RadioButtonGroup
                        legendText="Child"
                        name="childPMTCT"
                        onChange={(newValue) => {
                          onChange(newValue);
                          setShowChildDatePicker(newValue === '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
                        }}
                        value={value}
                        onBlur={onBlur}
                        invalid={!!errors.childPMTCT}
                        invalidText={errors.childPMTCT?.message}
                      >
                        <RadioButton id="childYes" labelText="Yes" value={'1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'} />
                        <RadioButton id="childNo" labelText="No" value={'1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'} />
                      </RadioButtonGroup>
                    )}
                  />
                </ResponsiveWrapper>
                <ResponsiveWrapper>
                  {showChildDatePicker && (
                    <Controller
                      name="dateChildPMTCT"
                      control={control}
                      render={({ field: { onChange, value, ref } }) => (
                        <OpenmrsDatePicker
                          id="dateChildPMTCT"
                          labelText={t('dateChildPMTCT', 'Date')}
                          value={value}
                          maxDate={today}
                          onChange={(date) => onDateChange(date, 'dateChildPMTCT')}
                          ref={ref}
                          invalid={!!errors.dateChildPMTCT}
                          invalidText={errors.dateChildPMTCT?.message}
                        />
                      )}
                    />
                  )}
                </ResponsiveWrapper>
              </div>
            </section>

            <section>
              <div className={styles.pmtctSection}>
                <ResponsiveWrapper>
                  <Controller
                    name="arvUsedforPMTCT"
                    control={control}
                    render={({ field: { onChange, value, onBlur } }) => (
                      <RadioButtonGroup
                        legendText="ARV used for PMTCT"
                        name="arvUsedforPMTCT"
                        onChange={(newValue) => {
                          onChange(newValue);
                          handleARVChange(newValue);
                        }}
                        value={value}
                        onBlur={onBlur}
                        invalid={!!errors.arvUsedforPMTCT}
                        invalidText={errors.arvUsedforPMTCT?.message}
                      >
                        <RadioButton
                          id="arvUsedYes"
                          labelText="Nevirapine"
                          value={'1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}
                        />
                        <RadioButton id="arvUsedNo" labelText="Other" value={'1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'} />
                      </RadioButtonGroup>
                    )}
                  />
                </ResponsiveWrapper>
                {isOtherSelected && (
                  <ResponsiveWrapper>
                    <Controller
                      name="sideEffects"
                      control={control}
                      render={({ field: { onChange, onBlur, value, ref } }) => (
                        <TextInput
                          id="sideEffects"
                          value={value}
                          labelText="Other Specify:"
                          placeholder="Other Specify"
                          onChange={onChange}
                          onBlur={onBlur}
                          ref={ref}
                        />
                      )}
                    />
                  </ResponsiveWrapper>
                )}
              </div>
            </section>
          </>
        )}

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'Summary of other information:')}</span>
        </section>

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'LFT(lu/L):')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineLFT"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="baselineLFT"
                    value={value}
                    labelText="(Baseline)"
                    placeholder="Baseline LFT(lu/L)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentLFT"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="currentLFT"
                    value={value}
                    labelText="(Current)"
                    placeholder="Current LFT(lu/L)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'RFT:')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineRFT"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="baselineRFT"
                    value={value}
                    labelText="(Baseline)"
                    placeholder="Baseline RFT"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentRFT"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="currentRFT"
                    value={value}
                    labelText="(Current)"
                    placeholder="Current RFT"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'TLC:')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineTLC"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="baselineTLC"
                    value={value}
                    labelText="(Baseline)"
                    placeholder="Baseline TLC"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentTLC"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="currentTLC"
                    value={value}
                    labelText="(Current)"
                    placeholder="Current TLC"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'CD4(CD4%):')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineCD4"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="baselineCD4"
                    value={value}
                    labelText="(Baseline)"
                    placeholder="Baseline CD4(CD4%)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentCD4"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="currentCD4"
                    value={value}
                    labelText="(Current)"
                    placeholder="Current CD4(CD4%)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'VL(mm3):')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineVL"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="baselineVL"
                    value={value}
                    labelText="(Baseline)"
                    placeholder="Baseline VL(mm3)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentVL"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="currentVL"
                    value={value}
                    labelText="(Current)"
                    placeholder="Current VL(mm3)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'Weight(kg):')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineWeight"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="baselineWeight"
                    value={value}
                    labelText="(Baseline)"
                    placeholder="Baseline Wt(kg)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentWeight"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="currentWeight"
                    value={value}
                    labelText="(Current)"
                    placeholder="Current Wt(kg)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'Height(cm):')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineHeight"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="baselineHeight"
                    value={value}
                    labelText="(Baseline)"
                    placeholder="Baseline Ht(cm)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentHeight"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="currentHeight"
                    value={value}
                    labelText="(Current)"
                    placeholder="Current Ht(cm)"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section>
          <span className={styles.heading}>{t('summaryOfOtherInformation', 'Body Surface Area:')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineBodySurfaceArea"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="baselineBodySurfaceArea"
                    value={value}
                    labelText="(Baseline)"
                    placeholder="Baseline Body Surface Area"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentBodySurfaceArea"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="currentBodySurfaceArea"
                    value={value}
                    labelText="(Current)"
                    placeholder="Current Body Surface Area"
                    onChange={onChange}
                    onBlur={onBlur}
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section className={styles.formGroup}>
          <span className={styles.heading}>{t('location', 'WHO Stage')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineWHOStage"
                control={control}
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <Select
                    id="baselineWHOStage"
                    labelText={t('selectBaselineWHOStage', '(Baseline WHO Stage))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                  >
                    <SelectItem text={t('chooseBaselineWHOStage', 'Choose Baseline WHO Stage')} value="" />
                    <SelectItem key={1} text={'Stage One'} value={'2798d3bc-2e0a-459c-b249-9516b380a69e'}>
                      Stage One
                    </SelectItem>
                    <SelectItem key={2} text={'Stage Two'} value={'3495d89f-4d46-44d8-b1c9-d101bc9f15d4'}>
                      Stage Two
                    </SelectItem>
                    <SelectItem key={3} text={'Stage Three'} value={'a9da3e97-3916-4834-854c-6bcbc5142aca'}>
                      Stage Three
                    </SelectItem>
                    <SelectItem key={4} text={'Stage Four'} value={'b5951dd9-6bb2-4b63-af20-0707500108ea'}>
                      Stage Four
                    </SelectItem>
                    <SelectItem key={5} text={'T1'} value={'2798d3bc-2e0a-459c-b249-9516b380a69e'}>
                      T1
                    </SelectItem>
                    <SelectItem key={6} text={'T2'} value={'3495d89f-4d46-44d8-b1c9-d101bc9f15d4'}>
                      T2
                    </SelectItem>
                    <SelectItem key={7} text={'T3'} value={'a9da3e97-3916-4834-854c-6bcbc5142aca'}>
                      T3
                    </SelectItem>
                    <SelectItem key={8} text={'T4'} value={'b5951dd9-6bb2-4b63-af20-0707500108ea'}>
                      T4
                    </SelectItem>
                  </Select>
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentWHOStage"
                control={control}
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <Select
                    id="currentWHOStage"
                    labelText={t('selectCurrentWHOStage', '(Current WHO Stage))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                  >
                    <SelectItem text={t('chooseCurrentWHOStage', 'Choose Current WHO Stage')} value="" />
                    <SelectItem key={1} text={'Stage One'} value={'2798d3bc-2e0a-459c-b249-9516b380a69e'}>
                      Stage One
                    </SelectItem>
                    <SelectItem key={2} text={'Stage Two'} value={'3495d89f-4d46-44d8-b1c9-d101bc9f15d4'}>
                      Stage Two
                    </SelectItem>
                    <SelectItem key={3} text={'Stage Three'} value={'a9da3e97-3916-4834-854c-6bcbc5142aca'}>
                      Stage Three
                    </SelectItem>
                    <SelectItem key={4} text={'Stage Four'} value={'b5951dd9-6bb2-4b63-af20-0707500108ea'}>
                      Stage Four
                    </SelectItem>
                    <SelectItem key={5} text={'T1'} value={'2798d3bc-2e0a-459c-b249-9516b380a69e'}>
                      T1
                    </SelectItem>
                    <SelectItem key={6} text={'T2'} value={'3495d89f-4d46-44d8-b1c9-d101bc9f15d4'}>
                      T2
                    </SelectItem>
                    <SelectItem key={7} text={'T3'} value={'a9da3e97-3916-4834-854c-6bcbc5142aca'}>
                      T3
                    </SelectItem>
                    <SelectItem key={8} text={'T4'} value={'b5951dd9-6bb2-4b63-af20-0707500108ea'}>
                      T4
                    </SelectItem>
                  </Select>
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section className={styles.formGroup}>
          <span className={styles.heading}>{t('functionalStatus', 'Functional Status')}</span>
          <div className={styles.pmtctSection}>
            <ResponsiveWrapper>
              <Controller
                name="baselineFunctionalStatus"
                control={control}
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <Select
                    id="baselineFunctionalStatus"
                    labelText={t('selectBaselineFunctionalStatus', '(Baseline Functional Status))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                  >
                    <SelectItem
                      text={t('chooseBaselineFunctionalStatus', 'Choose Baseline Functional Status')}
                      value=""
                    />
                    <SelectItem key={2} text={'Working'} value={'2798d3bc-2e0a-459c-b249-9516b380a69e'}>
                      Working
                    </SelectItem>
                    <SelectItem key={3} text={'Ambulatory'} value={'3495d89f-4d46-44d8-b1c9-d101bc9f15d4'}>
                      Ambulatory
                    </SelectItem>
                    <SelectItem key={4} text={'Bedridden'} value={'a9da3e97-3916-4834-854c-6bcbc5142aca'}>
                      Bedridden
                    </SelectItem>
                  </Select>
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="currentFunctionalStatus"
                control={control}
                render={({ field: { onChange, value, onBlur, ref } }) => (
                  <Select
                    id="currentFunctionalStatus"
                    labelText={t('selectCurrentFunctionalStatus', '(Current Functional Status))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                  >
                    <SelectItem
                      text={t('chooseCurrentFunctionalStatus', 'Choose Current Functional Status')}
                      value=""
                    />
                    <SelectItem key={2} text={'Working'} value={'2798d3bc-2e0a-459c-b249-9516b380a69e'}>
                      Working
                    </SelectItem>
                    <SelectItem key={3} text={'Ambulatory'} value={'3495d89f-4d46-44d8-b1c9-d101bc9f15d4'}>
                      Ambulatory
                    </SelectItem>
                    <SelectItem key={4} text={'Bedridden'} value={'a9da3e97-3916-4834-854c-6bcbc5142aca'}>
                      Bedridden
                    </SelectItem>
                  </Select>
                )}
              />
            </ResponsiveWrapper>
          </div>
        </section>

        <section className={styles.fieldGroup}>
          <span className={styles.heading}>{t('location', 'Reason for Transfer:')}</span>
          <Checkbox id="changeAddress" labelText={t('isDeadInputLabel', 'Change of Address')} />
          <Checkbox id="closerToPatient" labelText={t('isDeadInputLabel', 'Closer to patients')} />
          <div className={styles.pmtctSection}>
            <Checkbox
              id="betterManagement"
              labelText={t('isDeadInputLabel', 'For better management')}
              onChange={handleCheckboxChange}
            />
            {checkedState.betterManagement && (
              <ResponsiveWrapper>
                <Controller
                  name="betterManagementReasonSpecify"
                  control={control}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <TextInput
                      id="betterManagementReasonSpecify"
                      value={value}
                      labelText="Specify reason"
                      placeholder="Specify Reason"
                      onChange={onChange}
                      onBlur={onBlur}
                      ref={ref}
                      invalid={!!errors.betterManagementReasonSpecify}
                      invalidText={errors.betterManagementReasonSpecify?.message}
                    />
                  )}
                />
              </ResponsiveWrapper>
            )}
          </div>
          <div className={styles.pmtctSection}>
            <Checkbox
              id="otherReason"
              labelText={t('isDeadInputLabel', 'Any other reason')}
              onChange={handleCheckboxChange}
            />
            {checkedState.otherReason && (
              <ResponsiveWrapper>
                <Controller
                  name="otherReasonSpecify"
                  control={control}
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <TextInput
                      id="otherReasonSpecify"
                      value={value}
                      labelText="Specify Other reason"
                      placeholder="Specify Other Reason"
                      onChange={onChange}
                      onBlur={onBlur}
                      ref={ref}
                      invalid={!!errors.otherReasonSpecify}
                      invalidText={errors.otherReasonSpecify?.message}
                    />
                  )}
                />
              </ResponsiveWrapper>
            )}
          </div>
        </section>

        <section>
          <span className={styles.heading}>
            {t('summaryOfOtherInformation', 'Transferring / Referring Clinician:')}
          </span>
        </section>

        <section className={styles.formGroup}>
          <ResponsiveWrapper>
            <Controller
              name="clinicianName"
              control={control}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <TextInput
                  id="clinicianName"
                  value={value}
                  labelText="Clinician Name:"
                  placeholder="Clinician Name"
                  onChange={onChange}
                  onBlur={onBlur}
                  ref={ref}
                  invalid={!!errors.clinicianName}
                  invalidText={errors.clinicianName?.message}
                />
              )}
            />
          </ResponsiveWrapper>
        </section>

        <section className={styles.formGroup}>
          <ResponsiveWrapper>
            <Controller
              name="providerTelephoneNumber"
              control={control}
              render={({ field: { onChange, onBlur, value, ref } }) => (
                <TextInput
                  id="providerTelephoneNumber"
                  value={value}
                  labelText="Telephone:"
                  placeholder="Phone Number"
                  onChange={onChange}
                  onBlur={onBlur}
                  ref={ref}
                  invalid={!!errors.providerTelephoneNumber}
                  invalidText={errors.providerTelephoneNumber?.message}
                />
              )}
            />
          </ResponsiveWrapper>
        </section>

        <div className={styles.lastField}>
          <section className={styles.formGroup}>
            <ResponsiveWrapper>
              <Controller
                name="emailAddress"
                control={control}
                render={({ field: { onChange, onBlur, value, ref } }) => (
                  <TextInput
                    id="email"
                    value={value}
                    labelText="Email:"
                    placeholder="example@domain.com"
                    onBlur={onBlur}
                    ref={ref}
                    onChange={onChange}
                    invalid={!!errors.emailAddress}
                    invalidText={errors.emailAddress?.message}
                  />
                )}
              />
            </ResponsiveWrapper>
          </section>
        </div>

        <ButtonSet className={styles.buttonSet}>
          <Button
            onClick={() => closeWorkspaceHandler('transfer-out-workspace')}
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

export default TransferOutForm;
