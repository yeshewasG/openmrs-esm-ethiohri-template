import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './transfer-out-form.scss';
import {
  OpenmrsDatePicker,
  ResponsiveWrapper,
  closeWorkspace,
  showSnackbar,
  useLayoutType,
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
  TRANSFEROUT_ENCOUNTER_TYPE_UUID,
  TRANSFEROUT_FORM_UUID,
  transferOutFieldConcepts,
} from '../constants';
import dayjs from 'dayjs';
import { useEncounters } from '../transfer-out/transfer-out.resource';
import type { OpenmrsEncounter } from '../types';
import { getObsFromEncounter } from '../utils/encounter-utils';
import { ButtonSet } from '@carbon/react';
import { NumberInput } from '@carbon/react';
import { RadioButtonGroup } from '@carbon/react';
import { RadioButton } from '@carbon/react';
import { Dropdown } from '@carbon/react';
import { Checkbox } from '@carbon/react';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  isTablet: boolean;
}

// type FormInputs = {
//   transferredFrom: string;
//   transferredTo: string;
//   name: string;
//   mrn: string;
//   artStarted: string;
//   originalFirstLineRegimenDose: string;
//   dateOfTransfer: string;
//   refNumber: string;
//   sideEffects: string;
//   rxFailure: string;
//   otherSpecify: string;
//   whoStage: string;
//   childPMTCT: string;
//   emailAddress: string;
//   clinicianName: string;
//   phoneNumber: string;
//   dateMotherPMTCT: string;
//   motherPMTCT: string;
//   dateChildPMTCT: string;
//   arvUsedforPMTCT: string;
// };
type FormInputs = Record<
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
>;

interface TransferOutFormProps {
  patientUuid: string;
  encounter?: OpenmrsEncounter; // If provided, it means we are editing an encounter
}

const TransferOutForm: React.FC<TransferOutFormProps> = ({ patientUuid, encounter }) => {
  const { t } = useTranslation();
  const [transferOutDate, setTransferOutDate] = useState<string | null>(null);
  const [dateMotherPMTCT, setDateMotherPMTCT] = useState<string | null>(null);
  const [childPMTCTDate, setChildPMTCTDate] = useState<string | null>(null);
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
  const encounterType = TRANSFEROUT_ENCOUNTER_TYPE_UUID;
  const form = { uuid: TRANSFEROUT_FORM_UUID };
  const location = facilityLocationUUID;
  const patient = patientUuid;
  const orders = [];
  const isTablet = useLayoutType() === 'tablet';
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showChildDatePicker, setShowChildDatePicker] = useState(false);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [isMale, setIsMale] = useState(false);

  const handleARVChange = (newValue) => {
    const isOther = newValue === '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    setIsOtherSelected(isOther);

    // Clear "sideEffects" field if "Other" is not selected
    if (!isOther) {
      setValue('sideEffects', ''); // Clear the sideEffects value
    }
  };

  const [checkedState, setCheckedState] = useState({
    betterManagement: false,
    otherReason: false,
  });

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    if (!checked && checkedState[id]) {
      // Clear the corresponding text box if it was previously checked
      if (id === 'betterManagement') {
        setValue('betterManagementReasonSpecify', ''); // Clear "For better management" text field
      } else if (id === 'otherReason') {
        setValue('otherReasonSpecify', ''); // Clear "Any other reason" text field
      }
    }
    setCheckedState((prevState) => ({
      ...prevState,
      [id]: checked,
    }));
  };

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
      const gender = patientInfo?.person?.gender;
      if (gender === 'M') {
        // Check if gender is male (or however it is represented in your data)
        setIsMale(true);
      } else {
        setIsMale(false);
      }
      //setValue('clinicianName', `${givenName} ${middleName} ${familyName}`);
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
      // setValue(
      //   'transferredTo',
      //   encounter?.obs?.find((e) => e?.concept?.uuid === transferOutFieldConcepts.transferredTo)?.value || '',
      // );
      setValue('transferredTo', getObsFromEncounter(encounter, transferOutFieldConcepts.transferredTo));
      setValue('clinicianName', getObsFromEncounter(encounter, transferOutFieldConcepts.ClinicianName));
      setValue(
        'providerTelephoneNumber',
        getObsFromEncounter(encounter, transferOutFieldConcepts.providerTelephoneNumber),
      );
      setValue(
        'artStarted',
        encounter?.obs?.find((e) => e?.concept?.uuid === transferOutFieldConcepts.artStarted)?.value?.uuid || '',
      );
      // setValue(
      //   'originalFirstLineRegimenDose',
      //   encounter?.obs?.find((e) => e?.concept?.uuid === transferOutFieldConcepts.originalFirstLineRegimenDose)?.value
      //     ?.uuid || '',
      // );
    }
  }, [encounter, setValue]);

  const childPMTCT = watch('childPMTCT');
  const motherPMTCT = watch('motherPMTCT');

  // const onDateChange = (value: any) => {
  //   try {
  //     const jsDate = new Date(value);
  //     if (isNaN(jsDate.getTime())) {
  //       throw new Error('Invalid Date');
  //     }
  //     const formattedDate = dayjs(jsDate).format('YYYY-MM-DD');
  //     setValue('dateOfTransfer', formattedDate);
  //     setTransferOutDate(formattedDate);
  //     setDateMotherPMTCT(formattedDate);
  //     setError(null);
  //     setNotification({ message: 'Date selected successfully.', type: 'success' });
  //   } catch (e) {
  //     setError('Invalid date format');
  //     setNotification({ message: 'Invalid date format.', type: 'error' });
  //   }
  // };
  type DateFieldKey = 'dateMotherPMTCT' | 'dateOfTransfer' | 'dateChildPMTCT';

  const onDateChange = (value: any, dateField: DateFieldKey) => {
    try {
      const jsDate = new Date(value);
      if (isNaN(jsDate.getTime())) {
        throw new Error('Invalid Date');
      }
      const formattedDate = dayjs(jsDate).format('YYYY-MM-DD');
      setValue(dateField, formattedDate); // Dynamically set the value based on the field
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
    if (childPMTCT === 'yes' && !fieldValues.childPMTCT) {
      setError('Date for Mother PMTCT is required when "Child Yes" is selected.');
      return;
    }
    if (motherPMTCT === 'other' && !fieldValues.dateMotherPMTCT) {
      setError('Date for Mother PMTCT is required when "ARV used for PMTCT Other" is selected.');
      return;
    }

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
    <Form className={styles.form} onSubmit={handleSubmit(handleFormSubmit)} data-testid="transfer-out-form">
      <Stack gap={1} className={styles.container}>
        <section>
          {/* <span className={styles.heading}>{t('transferredFrom', 'Transferred From')}</span> */}
          <ResponsiveWrapper>
            <TextInput
              id="transferredFrom"
              value={facilityLocationName}
              labelText="Transferred From"
              placeholder="Facility Name"
              //helperText="Helper text"
            />
          </ResponsiveWrapper>
        </section>

        <section className={` ${styles.row}`}>
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
                    //helperText="Helper text"
                    ref={ref}
                  />
                )}
              />
            </ResponsiveWrapper>
            <ResponsiveWrapper>
              <Controller
                name="refNumber"
                control={control}
                //defaultValue={defaultDuration}
                render={({ field: { onChange, onBlur, value, ref }, fieldState }) => (
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
                  invalidText={error}
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
                          setSelectedField('motherPMTCT'); // Set the selected field for clear action
                          setShowDatePicker(newValue === '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'); // Show date picker when "Yes" is selected
                        }}
                        value={value}
                        onBlur={onBlur}
                      >
                        <RadioButton
                          id="motherYes"
                          labelText="Yes"
                          value={'1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}
                          onFocus={() => setSelectedField('motherPMTCT')}
                        />
                        <RadioButton
                          id="motherNo"
                          labelText="No"
                          value={'1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}
                          onFocus={() => setSelectedField('motherPMTCT')}
                        />
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
                          invalidText={error}
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
                          setSelectedField('childPMTCT'); // Set the selected field for clear action
                          setShowChildDatePicker(newValue === '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
                        }}
                        value={value}
                        onBlur={onBlur}
                      >
                        <RadioButton
                          id="childYes"
                          labelText="Yes"
                          value={'1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}
                          onFocus={() => setSelectedField('childPMTCT')}
                        />
                        <RadioButton
                          id="childNo"
                          labelText="No"
                          value={'1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}
                          onFocus={() => setSelectedField('childPMTCT')}
                        />
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
                          value={transferOutDate}
                          maxDate={today}
                          onChange={(date) => onDateChange(date, 'dateChildPMTCT')}
                          ref={ref}
                          invalidText={error}
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
                          setSelectedField('arvUsedforPMTCT'); // Set the selected field for clear action
                          handleARVChange(newValue);
                        }}
                        value={value}
                        onBlur={onBlur}
                      >
                        <RadioButton
                          id="arvUsedYes"
                          labelText="Nevirapine"
                          value={'1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}
                          onFocus={() => setSelectedField('arvUsedforPMTCT')}
                        />
                        <RadioButton
                          id="arvUsedNo"
                          labelText="Other"
                          value={'1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}
                          onFocus={() => setSelectedField('arvUsedforPMTCT')}
                        />
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
                render={({ field: { onChange, value, onBlur, ref }, fieldState }) => (
                  <Select
                    id="baselineWHOStage"
                    labelText={t('selectBaselineWHOStage', '(Baseline WHO Stage))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                    invalid={!!fieldState?.error?.message}
                    invalidText={fieldState?.error?.message}
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
                render={({ field: { onChange, value, onBlur, ref }, fieldState }) => (
                  <Select
                    id="currentWHOStage"
                    labelText={t('selectCurrentWHOStage', '(Current WHO Stage))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                    invalid={!!fieldState?.error?.message}
                    invalidText={fieldState?.error?.message}
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
                render={({ field: { onChange, value, onBlur, ref }, fieldState }) => (
                  <Select
                    id="baselineFunctionalStatus"
                    labelText={t('selectBaselineFunctionalStatus', '(Baseline Functional Status))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                    invalid={!!fieldState?.error?.message}
                    invalidText={fieldState?.error?.message}
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
                render={({ field: { onChange, value, onBlur, ref }, fieldState }) => (
                  <Select
                    id="currentFunctionalStatus"
                    labelText={t('selectCurrentFunctionalStatus', '(Current Functional Status))')}
                    onChange={onChange}
                    onBlur={onBlur}
                    value={value}
                    ref={ref}
                    invalid={!!fieldState?.error?.message}
                    invalidText={fieldState?.error?.message}
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
          <Checkbox
            //checked={value}
            id="changeAddress"
            labelText={t('isDeadInputLabel', 'Change of Address')}
            //onChange={(event, { checked, id }) => setFieldValue(id, checked)}
          />
          <Checkbox
            //checked={value}
            id="closerToPatient"
            labelText={t('isDeadInputLabel', 'Closer to patients')}
            //onChange={(event, { checked, id }) => setFieldValue(id, checked)}
          />
          <div className={styles.pmtctSection}>
            <Checkbox
              //checked={value}
              id="betterManagement"
              labelText={t('isDeadInputLabel', 'For better management')}
              onChange={handleCheckboxChange}
              //onChange={(event, { checked, id }) => setFieldValue(id, checked)}
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
                    />
                  )}
                />
              </ResponsiveWrapper>
            )}
          </div>
          <div className={styles.pmtctSection}>
            <Checkbox
              //checked={value}
              id="otherReason"
              labelText={t('isDeadInputLabel', 'Any other reason')}
              onChange={handleCheckboxChange}
              //onChange={(event, { checked, id }) => setFieldValue(id, checked)}
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
                    />
                  )}
                />
              </ResponsiveWrapper>
            )}
          </div>
          {/* {values.isDead ? fields.map((field) => <Field key={`death-info-${field}`} name={field} />) : null} */}
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

        {/* <ButtonSet className={isTablet ? styles.tablet : styles.desktop}>
            <Button
              className={styles.button}
              onClick={() => closeWorkspaceHandler('transfer-out-workspace')}
              kind="secondary"
            >
              {t('discard', 'Discard')}
            </Button>
            <Button className={styles.button} type="submit">
              {/* {t('saveAndClose', 'Save and close')} */}
        {/* {encounter ? t('saveAndClose', 'update and close') : t('saveAndClose', 'Save and close')}
            </Button>
          </ButtonSet>           */}
      </Stack>
    </Form>
  );
};

export default TransferOutForm;
