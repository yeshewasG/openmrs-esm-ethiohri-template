// ClientForm.tsx
import React, { useEffect, useState } from 'react';
import {
  Form,
  TextInput,
  Select,
  SelectItem,
  DatePicker,
  DatePickerInput,
  NumberInput,
  Button,
  MultiSelect,
  InlineNotification,
  Stack,
} from '@carbon/react';
import { useForm, Controller } from 'react-hook-form';
import styles from './kpp-form.scss';
import { closeWorkspace, showSnackbar, usePatient, useSession } from '@openmrs/esm-framework';
import { kppEncounterUuid, kppFormUuid } from '../constants';
import { fetchLocation, saveEncounter } from '../api/api';
import { t } from 'i18next';

// OpenMRS API Configuration
const OPENMRS_API_BASE = 'http://localhost:8080/openmrs/ws/rest/v1'; // Update with your instance URL
const AUTH_HEADER = {
  headers: {
    Authorization: 'Basic ' + btoa('admin:Admin123'), // Update with your credentials
  },
};

// Full interface for all 72 fields
interface ClientFormData {
  firstName?: string;
  fatherName?: string;
  grandfatherName?: string;
  clientUID: string;
  mrn?: string;
  sbccCompleted: string;
  reachedWithPackage: string;
  followUpDate: string;
  dateOfBirth: string;
  age: number;
  sex: string;
  riskBehaviors: string[];
  targetGroup: string[];
  modalityUsed: string;
  hivTestedPreviously: string;
  hivTestResult?: string;
  durationSinceLastTest?: number;
  hivSelfTestDistributed: string;
  hivSelfTestModality?: string;
  hivSelfTestFor?: string;
  selfTestResultReported: string;
  hivSelfTestResult?: string;
  conventionalTestDone: string;
  conventionalTestDate?: string;
  conventionalTestResult?: string;
  linkageToCare?: string;
  artStarted?: string;
  artStartDate?: string;
  uniqueArtNumber?: string;
  pregnancyTestDone: string;
  hcgTestResult?: string;
  pmtctLinkageDate?: string;
  prepEligible: string;
  prepStarted: string;
  prepStartDate?: string;
  prepNotStartedReasons?: string[];
  prepType?: string;
  prepFollowUpStatus?: string;
  prepPreviously?: string;
  prepNotContinuedReasons?: string[];
  prepSideEffects?: string;
  prepAdherence?: string;
  pepDischargeDate?: string;
  nextAppointmentDate?: string;
  stiScreened: string;
  syndromicStiDiagnosis?: string;
  stiManagementProvided?: string;
  tbScreened: string;
  tbScreeningResult?: string;
  tbConfirmed?: string;
  tbLinked?: string;
  mentalHealthScreened: string;
  mhiSudIdentified?: string;
  mhiSudLinked?: string;
  hepBTested: string;
  hepBResult?: string;
  hepBReferred?: string;
  hepBVaccination?: string;
  hepCTested: string;
  hepCResult?: string;
  hepCReferred?: string;
  fpCounseling: string;
  fpMethodProvided: string;
  fpMethodType?: string[];
  condomDemo: string;
  condomsProvided: string;
  condomCount?: number;
  gbvAssessment: string;
  gbvOutcome?: string;
  gbvLinked?: string;
  gbvServiceProvided?: string[];
  cervicalCancerEligible: string;
  cervicalCancerCounselled?: string;
  cervicalCancerScreened: string;
  cervicalCancerNotScreenedReason?: string;
  cervicalCancerResult?: string;
  cervicalCancerTreatment?: string;
  lastFollowUpOutcome?: string;
  finalDecision?: string;
  couponId?: string;
  couponReturnDate?: string;
  etbPaid?: number;
}

// Concept UUIDs (replace with actual UUIDs from your OpenMRS instance)
const CONCEPTS: { [key in keyof ClientFormData]: string } = {
  firstName: '166102AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  fatherName: '166574AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  grandfatherName: '166103AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  //not cnaged
  clientUID: '162762AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  mrn: '162763AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  reachedWithPackage: '162765AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  //not changed
  sbccCompleted: '5a471ad6-9707-43c1-9751-57f3c5bbf59f', //need to change

  followUpDate: 'b8cd8630-56dd-495e-8c84-e36a636febe7',
  dateOfBirth: '166575AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  age: '1532AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  sex: '1533AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  riskBehaviors: 'beaaba00-bc94-40f4-bb3c-aaa97b23b2c4',
  targetGroup: 'ca2c04ba-d9bd-4bad-ab03-e57ea9e49016',
  modalityUsed: '79c5e586-95a0-40af-a34c-852909d6a88d',
  hivTestedPreviously: 'f4bcd7bc-83c2-40b1-9159-dadb97a83fc8',
  hivTestResult: '23ef2580-e9e5-4e1b-af9b-584cdd30abc4',
  durationSinceLastTest: 'd002eb43-bcba-4435-8e0d-b0a6130f09bd',
  hivSelfTestDistributed: '166464AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  hivSelfTestModality: '2f8edc50-7018-4557-bb23-2bb28d3f4092',
  hivSelfTestFor: '55d35624-fb83-400b-8cfb-0783e3a0ef65',
  selfTestResultReported: 'fe83f450-4966-4fc6-8b50-375b6d64f546',
  hivSelfTestResult: 'e77fb81b-7811-41e4-8f30-af101d9c1c6b',
  conventionalTestDone: '164401AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  conventionalTestDate: '160082AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  conventionalTestResult: '40d1c129-5373-4005-95b1-409e56db9743',
  linkageToCare: 'c1bb9738-10aa-4905-bb5d-af4e55b4bb69',
  artStarted: '95daa4f8-b45d-4dee-b5d0-5f9446d22c19',
  artStartDate: 'ae329187-6232-4142-aa91-22c85bc8e5b5',
  uniqueArtNumber: 'c8d98ef1-5e58-417c-a7c3-7f30f76a7155',
  pregnancyTestDone: 'f562d24b-4c2f-44cd-b894-7ee94ef0078c',
  hcgTestResult: 'd30935f7-49ab-4984-b9e7-b18391a7efc8',
  pmtctLinkageDate: '7ff87d3-f1c1-4f00-922a-59a295b23f49',
  prepEligible: 'f9747f64-d9ad-496d-888d-4a3de096ff8d',
  prepStarted: '3b4bc0b2-acbb-4fb5-82eb-6f0479915862',
  prepStartDate: 'a216f62d-5b73-4b99-b96a-37172a0c811e',
  prepNotStartedReasons: 'e03bd6fa-2733-4ea7-b8b5-fc3221b4ca36',
  prepType: 'a501dd8a-8aa3-4595-a0be-2d7519504612',
  prepFollowUpStatus: 'b23c8ae7-cd07-4ec2-b60c-ad0e46f0d6f9',
  prepPreviously: '740e5d37-2b4e-4a38-907d-f6c2cd828af7',
  prepNotContinuedReasons: 'e03bd6fa-2733-4ea7-b8b5-fc3221b4ca36',
  prepSideEffects: '6d9482a5-4686-4fa2-a35a-ea6c0daa5d1f',
  prepAdherence: '23d97715-589c-4dcf-bb86-70e26bba2269',
  pepDischargeDate: '18f78400-d91c-40ea-bd9f-4388c10d50c1',
  nextAppointmentDate: 'c596f199-4d76-4eca-b3c4-ffa631c0aee9',
  stiScreened: 'f461ff79-1873-4f80-bffd-6b3164db7e88',
  syndromicStiDiagnosis: '7a643a93-3f11-4ad0-acfa-b15f2d7c8ddc',
  stiManagementProvided: 'a64f8fa4-5e3d-47d9-b1c3-fe7a6998e99c',
  tbScreened: 'feebf47b-c11e-4fa7-bb4b-1a9fc444bcc9',
  tbScreeningResult: 'c20140f7-d45d-4b44-a1b9-0534861a615d',
  tbConfirmed: 'ceeb9fe5-3f90-4abd-9b7b-0188fd8c4991',
  tbLinked: 'f47dfd57-f4a1-4d18-b47f-46126de40318',
  mentalHealthScreened: '0f19d323-f7c9-4b64-b1ec-9bd5cd37ebec',
  mhiSudIdentified: '160246AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  mhiSudLinked: 'd25ddd73-6d0e-49db-9b7d-99c376f2469e',
  hepBTested: '6c6a1af6-f37b-4e40-9dc3-cb69c1e9d96c',
  hepBResult: '1322AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  hepBReferred: '6b2fdc09-6981-47f3-badd-b66c54207225',
  hepBVaccination: 'b91b464f-fcb3-44e3-9666-546f3fbe1a27',
  hepCTested: 'aa82f32b-93f4-4b9e-b26a-9242455abcf6',
  hepCResult: '1325AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  hepCReferred: '404360b6-3326-41da-950c-edc66d303adf',
  fpCounseling: '1382AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  fpMethodProvided: '8d5be308-7205-4a57-844e-968f62850e65',
  fpMethodType: '160576AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  condomDemo: '408f420c-284e-456c-9c8e-89f18fcc02b0',
  condomsProvided: '159777AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  condomCount: '1f0bb965-e2ec-4f74-a640-9ca0082711d1',

  gbvAssessment: '162826AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  gbvOutcome: '162827AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  gbvLinked: '162828AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  gbvServiceProvided: '162829AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  cervicalCancerEligible: '162830AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  cervicalCancerCounselled: '162831AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  cervicalCancerScreened: '162832Af461ff79-1873-4f80-bffd-6b3164db7e88AAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  cervicalCancerNotScreenedReason: '162833AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  cervicalCancerResult: '162834AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  cervicalCancerTreatment: '162835AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  lastFollowUpOutcome: '162836AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  finalDecision: '162837AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  couponId: '162838AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  couponReturnDate: '162839AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  etbPaid: '162840AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

// Validation rules for required fields
const validationRules = {
  clientUID: { required: 'Client UID is required' },
  sbccCompleted: { required: 'SBBC status is required' },
  reachedWithPackage: { required: 'Service package status is required' },
  followUpDate: { required: 'Follow-up date is required' },
  dateOfBirth: { required: 'Date of birth is required' },
  age: { required: 'Age is required', min: { value: 0, message: 'Age cannot be negative' } },
  sex: { required: 'Sex is required' },
  riskBehaviors: { required: 'Risk behaviors are required' },
  targetGroup: { required: 'Target group is required' },
  hivTestedPreviously: { required: 'HIV tested previously is required' },
  hivSelfTestDistributed: { required: 'HIV self-test distribution is required' },
  selfTestResultReported: { required: 'Self-test result reported is required' },
  conventionalTestDone: { required: 'Conventional test status is required' },
  pregnancyTestDone: { required: 'Pregnancy test status is required' },
  prepEligible: { required: 'PrEP eligibility is required' },
  prepStarted: { required: 'PrEP started is required' },
  stiScreened: { required: 'STI screening is required' },
  tbScreened: { required: 'TB screening is required' },
  mentalHealthScreened: { required: 'Mental health screening is required' },
  hepBTested: { required: 'Hepatitis B test status is required' },
  hepCTested: { required: 'Hepatitis C test status is required' },
  fpCounseling: { required: 'Family planning counseling is required' },
  fpMethodProvided: { required: 'Family planning method provided is required' },
  condomDemo: { required: 'Condom demo is required' },
  condomsProvided: { required: 'Condoms provided is required' },
  gbvAssessment: { required: 'GBV assessment is required' },
  cervicalCancerEligible: { required: 'Cervical cancer eligibility is required' },
  cervicalCancerScreened: { required: 'Cervical cancer screening is required' },
};

const ClientForm: React.FC = () => {
  const patient = usePatient();
  const session = useSession();
  const encounterDate = new Date().toISOString();
  const [facilityInfo, setFacilityInfo] = useState({ uuid: '', name: '' });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    defaultValues: {
      clientUID: patient.patientUuid,
      sbccCompleted: '',
      reachedWithPackage: '',
      followUpDate: '',
      dateOfBirth: '',
      age: 0,
      sex: '',
      riskBehaviors: [],
      targetGroup: [],
      modalityUsed: '',
      hivTestedPreviously: '',
      hivSelfTestDistributed: '',
      selfTestResultReported: '',
      conventionalTestDone: '',
      pregnancyTestDone: '',
      prepEligible: '',
      prepStarted: '',
      stiScreened: '',
      tbScreened: '',
      mentalHealthScreened: '',
      hepBTested: '',
      hepCTested: '',
      fpCounseling: '',
      fpMethodProvided: '',
      condomDemo: '',
      condomsProvided: '',
      gbvAssessment: '',
      cervicalCancerEligible: '',
      cervicalCancerScreened: '',
    },
  });

  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);

  const watchedFields = {
    hivTestedPreviously: watch('hivTestedPreviously'),
    hivSelfTestDistributed: watch('hivSelfTestDistributed'),
    hivSelfTestModality: watch('hivSelfTestModality'),
    selfTestResultReported: watch('selfTestResultReported'),
    conventionalTestDone: watch('conventionalTestDone'),
    conventionalTestResult: watch('conventionalTestResult'),
    linkageToCare: watch('linkageToCare'),
    artStarted: watch('artStarted'),
    pregnancyTestDone: watch('pregnancyTestDone'),
    hcgTestResult: watch('hcgTestResult'),
    prepStarted: watch('prepStarted'),
    prepFollowUpStatus: watch('prepFollowUpStatus'),
    prepPreviously: watch('prepPreviously'),
    stiScreened: watch('stiScreened'),
    syndromicStiDiagnosis: watch('syndromicStiDiagnosis'),
    tbScreened: watch('tbScreened'),
    tbScreeningResult: watch('tbScreeningResult'),
    tbConfirmed: watch('tbConfirmed'),
    mentalHealthScreened: watch('mentalHealthScreened'),
    mhiSudIdentified: watch('mhiSudIdentified'),
    hepBTested: watch('hepBTested'),
    hepBResult: watch('hepBResult'),
    hepCTested: watch('hepCTested'),
    hepCResult: watch('hepCResult'),
    fpMethodProvided: watch('fpMethodProvided'),
    condomsProvided: watch('condomsProvided'),
    gbvAssessment: watch('gbvAssessment'),
    gbvLinked: watch('gbvLinked'),
    cervicalCancerEligible: watch('cervicalCancerEligible'),
    cervicalCancerCounselled: watch('cervicalCancerCounselled'),
    cervicalCancerScreened: watch('cervicalCancerScreened'),
    cervicalCancerResult: watch('cervicalCancerResult'),
    modalityUsed: watch('modalityUsed'),
    couponId: watch('couponId'),
  };
  useEffect(() => {
    fetchLocation().then(({ data }) => {
      const facility = data.results.find((element) => element.tags.some((x) => x.display === 'Facility Location'));
      if (facility) {
        setFacilityInfo({ uuid: facility.uuid, name: facility.display });
      }
    });
  }, []);
  const createEncounter = async (data: ClientFormData) => {
    const payload = {
      encounterDatetime: encounterDate,
      encounterProviders: [{ provider: session.currentProvider.uuid, encounterRole: session.user.roles }],
      encounterType: kppEncounterUuid,
      form: { uuid: kppFormUuid },
      location: facilityInfo.uuid,
      patient: patient.patientUuid,
      orders: [],
      obs: Object.entries(data)
        .filter(([, value]) => value !== '' && value !== undefined && value !== null && value !== 0)
        .map(([key, value]) => ({
          concept: CONCEPTS[key as keyof ClientFormData],
          formFieldNamespace: 'rfe-forms',
          formFieldPath: `rfe-forms-${key}`,
          value: Array.isArray(value) ? value.join(',') : value,
        })),
    };

    try {
      const response = await saveEncounter(new AbortController(), payload);

      showSnackbar({
        isLowContrast: true,
        title: t('saveEntry', 'Record Saved'),
        kind: 'success',
        subtitle: t('transferOutEncounterCreatedSuccessfully', 'A new encounter was created'),
      });
      setSubmissionStatus('Encounter created successfully');
      return response.data;
    } catch (error) {
      setSubmissionStatus('Error creating encounter: ' + (error.response?.data?.error?.message || error.message));
      throw error;
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    try {
      await createEncounter(data);
    } catch (error) {
      console.error('Submission error:', error);
    }
  };
  const handleClose = () => {
    closeWorkspace('kpp-form-workspace');
  };
  return (
    <div className={styles.form}>
      {submissionStatus && (
        <InlineNotification
          kind={submissionStatus.includes('Error') ? 'error' : 'success'}
          title={submissionStatus}
          subtitle=""
          onClose={() => setSubmissionStatus(null)}
        />
      )}
      <Form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-grid">
          {/* Basic Information */}
          {/* <Controller
            name="firstName"
            control={control}
            render={({ field }) => <TextInput id="firstName" labelText="First Name" {...field} />}
          />
          <Controller
            name="fatherName"
            control={control}
            render={({ field }) => <TextInput id="fatherName" labelText="Father Name" {...field} />}
          />
          <Controller
            name="grandfatherName"
            control={control}
            render={({ field }) => <TextInput id="grandfatherName" labelText="Grandfather Name" {...field} />}
          />
          <Controller
            name="clientUID"
            disabled
            control={control}
            rules={validationRules.clientUID}
            render={({ field }) => (
              <TextInput
                id="clientUID"
                labelText="Client UID *"
                {...field}
                invalid={!!errors.clientUID}
                invalidText={errors.clientUID?.message}
              />
            )}
          />
          <Controller
            name="mrn"
            control={control}
            render={({ field }) => <TextInput id="mrn" labelText="MRN" {...field} />}
          /> */}

          {/* Service Questions */}
          <Controller
            name="sbccCompleted"
            control={control}
            rules={validationRules.sbccCompleted}
            render={({ field }) => (
              <Select id="sbccCompleted" labelText="SBBC Completed *" {...field} invalid={!!errors.sbccCompleted}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          <Controller
            name="reachedWithPackage"
            control={control}
            rules={validationRules.reachedWithPackage}
            render={({ field }) => (
              <Select
                id="reachedWithPackage"
                labelText="Reached with Package *"
                {...field}
                invalid={!!errors.reachedWithPackage}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />

          {/* Dates and Age */}
          <Controller
            name="followUpDate"
            control={control}
            rules={validationRules.followUpDate}
            render={({ field }) => (
              <DatePicker datePickerType="single" {...field}>
                <DatePickerInput
                  id="followUpDate"
                  labelText="Follow-up Date *"
                  placeholder="mm/dd/yyyy"
                  invalid={!!errors.followUpDate}
                />
              </DatePicker>
            )}
          />
          {/* <Controller
            name="dateOfBirth"
            control={control}
            rules={validationRules.dateOfBirth}
            render={({ field }) => (
              <DatePicker datePickerType="single" {...field}>
                <DatePickerInput
                  id="dateOfBirth"
                  labelText="Date of Birth *"
                  placeholder="mm/dd/yyyy"
                  invalid={!!errors.dateOfBirth}
                />
              </DatePicker>
            )}
          />
          <Controller
            name="age"
            control={control}
            rules={validationRules.age}
            render={({ field }) => (
              <NumberInput
                id="age"
                labelText="Age *"
                min={0}
                {...field}
                invalid={!!errors.age}
                invalidText={errors.age?.message}
              />
            )}
          />

           <Controller
            name="sex"
            control={control}
            rules={validationRules.sex}
            render={({ field }) => (
              <Select id="sex" labelText="Sex *" {...field} invalid={!!errors.sex}>
                <SelectItem value="" text="Select" />
                <SelectItem value="male" text="Male" />
                <SelectItem value="female" text="Female" />
              </Select>
            )}
          /> */}
          <Controller
            name="riskBehaviors"
            control={control}
            rules={validationRules.riskBehaviors}
            render={({ field }) => (
              <MultiSelect
                id="riskBehaviors"
                label="Risk Behaviors *"
                items={[
                  { id: 'sti', label: 'History of STI' },
                  { id: 'multiplePartnersExchange', label: 'Multiple partners with exchange' },
                  { id: 'inconsistentCondoms', label: 'Inconsistent condom use' },
                  { id: 'consistentCondoms', label: 'Consistent condom use' },
                  { id: 'drugUse', label: 'Drug use during sex' },
                  { id: 'ivDrugUse', label: 'IV drug use' },
                  { id: 'declined', label: 'Declined to disclose' },
                ]}
                itemToString={(item) => item.label}
                {...field}
                invalid={!!errors.riskBehaviors}
              />
            )}
          />
          <Controller
            name="targetGroup"
            control={control}
            rules={validationRules.targetGroup}
            render={({ field }) => (
              <MultiSelect
                id="targetGroup"
                label="Target Group *"
                items={[
                  { id: 'fsw', label: 'FSW' },
                  { id: 'pwid', label: 'PWID' },
                  { id: 'agyw', label: 'High Risk AGYW' },
                  { id: 'other', label: 'Other' },
                ]}
                itemToString={(item) => item.label}
                {...field}
                invalid={!!errors.targetGroup}
              />
            )}
          />
          <Controller
            name="modalityUsed"
            control={control}
            render={({ field }) => (
              <Select id="modalityUsed" labelText="Modality Used" {...field}>
                <SelectItem value="" text="Select" />
                <SelectItem value="self" text="Self" />
                <SelectItem value="psp" text="PSP" />
                <SelectItem value="sns" text="SNS" />
              </Select>
            )}
          />

          {/* HIV Testing */}
          <Controller
            name="hivTestedPreviously"
            control={control}
            rules={validationRules.hivTestedPreviously}
            render={({ field }) => (
              <Select
                id="hivTestedPreviously"
                labelText="HIV Tested Previously *"
                {...field}
                invalid={!!errors.hivTestedPreviously}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.hivTestedPreviously === 'yes' && (
            <>
              <Controller
                name="hivTestResult"
                control={control}
                render={({ field }) => (
                  <Select id="hivTestResult" labelText="HIV Test Result" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="positive" text="Positive" />
                    <SelectItem value="negative" text="Negative" />
                  </Select>
                )}
              />
              <Controller
                name="durationSinceLastTest"
                control={control}
                render={({ field }) => (
                  <NumberInput id="durationSinceLastTest" labelText="Months Since Last Test" min={0} {...field} />
                )}
              />
            </>
          )}
          <Controller
            name="hivSelfTestDistributed"
            control={control}
            rules={validationRules.hivSelfTestDistributed}
            render={({ field }) => (
              <Select
                id="hivSelfTestDistributed"
                labelText="HIV Self-Test Distributed *"
                {...field}
                invalid={!!errors.hivSelfTestDistributed}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.hivSelfTestDistributed === 'yes' && (
            <>
              <Controller
                name="hivSelfTestModality"
                control={control}
                render={({ field }) => (
                  <Select id="hivSelfTestModality" labelText="Self-Test Modality" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="da" text="Directly Assisted" />
                    <SelectItem value="ua" text="Unassisted" />
                  </Select>
                )}
              />
              {watchedFields.hivSelfTestModality === 'ua' && (
                <Controller
                  name="hivSelfTestFor"
                  control={control}
                  render={({ field }) => (
                    <Select id="hivSelfTestFor" labelText="Self-Test For" {...field}>
                      <SelectItem value="" text="Select" />
                      <SelectItem value="self" text="Self" />
                      <SelectItem value="partner" text="Sex Partner" />
                      <SelectItem value="others" text="Others" />
                    </Select>
                  )}
                />
              )}
            </>
          )}
          <Controller
            name="selfTestResultReported"
            control={control}
            rules={validationRules.selfTestResultReported}
            render={({ field }) => (
              <Select
                id="selfTestResultReported"
                labelText="Self-Test Result Reported *"
                {...field}
                invalid={!!errors.selfTestResultReported}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.selfTestResultReported === 'yes' && (
            <Controller
              name="hivSelfTestResult"
              control={control}
              render={({ field }) => (
                <Select id="hivSelfTestResult" labelText="Self-Test Result" {...field}>
                  <SelectItem value="" text="Select" />
                  <SelectItem value="reactive" text="Reactive" />
                  <SelectItem value="nonreactive" text="Non-Reactive" />
                </Select>
              )}
            />
          )}
          <Controller
            name="conventionalTestDone"
            control={control}
            rules={validationRules.conventionalTestDone}
            render={({ field }) => (
              <Select
                id="conventionalTestDone"
                labelText="Conventional Test Done *"
                {...field}
                invalid={!!errors.conventionalTestDone}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.conventionalTestDone === 'yes' && (
            <>
              <Controller
                name="conventionalTestDate"
                control={control}
                render={({ field }) => (
                  <DatePicker datePickerType="single" {...field}>
                    <DatePickerInput
                      id="conventionalTestDate"
                      labelText="Conventional Test Date"
                      placeholder="mm/dd/yyyy"
                    />
                  </DatePicker>
                )}
              />
              <Controller
                name="conventionalTestResult"
                control={control}
                render={({ field }) => (
                  <Select id="conventionalTestResult" labelText="Conventional Test Result" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="positive" text="Positive" />
                    <SelectItem value="negative" text="Negative" />
                    <SelectItem value="indeterminate" text="Indeterminate" />
                  </Select>
                )}
              />
              {watchedFields.conventionalTestResult === 'positive' && (
                <>
                  <Controller
                    name="linkageToCare"
                    control={control}
                    render={({ field }) => (
                      <Select id="linkageToCare" labelText="Linkage to Care" {...field}>
                        <SelectItem value="" text="Select" />
                        <SelectItem value="yes" text="Yes" />
                        <SelectItem value="no" text="No" />
                      </Select>
                    )}
                  />
                  {watchedFields.linkageToCare === 'yes' && (
                    <>
                      <Controller
                        name="artStarted"
                        control={control}
                        render={({ field }) => (
                          <Select id="artStarted" labelText="ART Started" {...field}>
                            <SelectItem value="" text="Select" />
                            <SelectItem value="yes" text="Yes" />
                            <SelectItem value="no" text="No" />
                          </Select>
                        )}
                      />
                      {watchedFields.artStarted === 'yes' && (
                        <>
                          <Controller
                            name="artStartDate"
                            control={control}
                            render={({ field }) => (
                              <DatePicker datePickerType="single" {...field}>
                                <DatePickerInput
                                  id="artStartDate"
                                  labelText="ART Start Date"
                                  placeholder="mm/dd/yyyy"
                                />
                              </DatePicker>
                            )}
                          />
                          <Controller
                            name="uniqueArtNumber"
                            control={control}
                            render={({ field }) => (
                              <TextInput id="uniqueArtNumber" labelText="Unique ART Number" maxLength={14} {...field} />
                            )}
                          />
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Pregnancy Testing */}
          <Controller
            name="pregnancyTestDone"
            control={control}
            rules={validationRules.pregnancyTestDone}
            render={({ field }) => (
              <Select
                id="pregnancyTestDone"
                labelText="Pregnancy Test Done *"
                {...field}
                invalid={!!errors.pregnancyTestDone}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.pregnancyTestDone === 'yes' && (
            <>
              <Controller
                name="hcgTestResult"
                control={control}
                render={({ field }) => (
                  <Select id="hcgTestResult" labelText="HCG Test Result" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="reactive" text="Reactive" />
                    <SelectItem value="nonreactive" text="Non-Reactive" />
                  </Select>
                )}
              />
              {watchedFields.hcgTestResult === 'reactive' && (
                <Controller
                  name="pmtctLinkageDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker datePickerType="single" {...field}>
                      <DatePickerInput id="pmtctLinkageDate" labelText="PMTCT Linkage Date" placeholder="mm/dd/yyyy" />
                    </DatePicker>
                  )}
                />
              )}
            </>
          )}

          {/* PrEP */}
          <Controller
            name="prepEligible"
            control={control}
            rules={validationRules.prepEligible}
            render={({ field }) => (
              <Select id="prepEligible" labelText="PrEP Eligible *" {...field} invalid={!!errors.prepEligible}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          <Controller
            name="prepStarted"
            control={control}
            rules={validationRules.prepStarted}
            render={({ field }) => (
              <Select id="prepStarted" labelText="PrEP Started *" {...field} invalid={!!errors.prepStarted}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.prepStarted === 'yes' && (
            <>
              <Controller
                name="prepStartDate"
                control={control}
                render={({ field }) => (
                  <DatePicker datePickerType="single" {...field}>
                    <DatePickerInput id="prepStartDate" labelText="PrEP Start Date" placeholder="mm/dd/yyyy" />
                  </DatePicker>
                )}
              />
              <Controller
                name="prepType"
                control={control}
                render={({ field }) => (
                  <Select id="prepType" labelText="Type of PrEP" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="oral" text="Oral PrEP" />
                    <SelectItem value="injectable" text="Injectable PrEP" />
                  </Select>
                )}
              />
              <Controller
                name="prepFollowUpStatus"
                control={control}
                render={({ field }) => (
                  <Select id="prepFollowUpStatus" labelText="PrEP Follow-up Status" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="onPrep" text="On PrEP" />
                    <SelectItem value="to" text="Transfer Out" />
                    <SelectItem value="ltfu" text="Lost" />
                    <SelectItem value="d" text="Dead" />
                  </Select>
                )}
              />
              <Controller
                name="prepPreviously"
                control={control}
                render={({ field }) => (
                  <Select id="prepPreviously" labelText="Previously on PrEP" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="yes" text="Yes" />
                    <SelectItem value="no" text="No" />
                  </Select>
                )}
              />
              {watchedFields.prepFollowUpStatus === 'ltfu' && (
                <Controller
                  name="prepNotContinuedReasons"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      id="prepNotContinuedReasons"
                      label="Reasons PrEP Not Continued"
                      items={[
                        { id: 'otherOptions', label: 'Wants other prevention' },
                        { id: 'stockOut', label: 'Drug stock out' },
                        { id: 'stigma', label: 'Fear of stigma' },
                        { id: 'unwilling', label: 'Lack of willingness' },
                        { id: 'contra', label: 'TDF-3TC contraindication' },
                        { id: 'other', label: 'Others' },
                      ]}
                      itemToString={(item) => item.label}
                      {...field}
                    />
                  )}
                />
              )}
              {watchedFields.prepFollowUpStatus === 'onPrep' && (
                <>
                  <Controller
                    name="prepSideEffects"
                    control={control}
                    render={({ field }) => (
                      <Select id="prepSideEffects" labelText="Side Effects" {...field}>
                        <SelectItem value="" text="Select" />
                        <SelectItem value="no" text="No Side Effects" />
                        <SelectItem value="yes" text="Side Effects Present" />
                      </Select>
                    )}
                  />
                  <Controller
                    name="prepAdherence"
                    control={control}
                    render={({ field }) => (
                      <Select id="prepAdherence" labelText="Adherence" {...field}>
                        <SelectItem value="" text="Select" />
                        <SelectItem value="good" text="Good (<=4)" />
                        <SelectItem value="poor" text="Poor (5+)" />
                      </Select>
                    )}
                  />
                </>
              )}
            </>
          )}
          {watchedFields.prepStarted === 'no' && (
            <Controller
              name="prepNotStartedReasons"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  id="prepNotStartedReasons"
                  label="Reasons PrEP Not Started"
                  items={[
                    { id: 'otherOptions', label: 'Wants other prevention' },
                    { id: 'stockOut', label: 'Drug stock out' },
                    { id: 'stigma', label: 'Fear of stigma' },
                    { id: 'unwilling', label: 'Lack of willingness' },
                    { id: 'contra', label: 'TDF-3TC contraindication' },
                    { id: 'other', label: 'Others' },
                  ]}
                  itemToString={(item) => item.label}
                  {...field}
                />
              )}
            />
          )}
          <Controller
            name="pepDischargeDate"
            control={control}
            render={({ field }) => (
              <DatePicker datePickerType="single" {...field}>
                <DatePickerInput id="pepDischargeDate" labelText="PEP Discharge Date" placeholder="mm/dd/yyyy" />
              </DatePicker>
            )}
          />
          <Controller
            name="nextAppointmentDate"
            control={control}
            render={({ field }) => (
              <DatePicker datePickerType="single" {...field}>
                <DatePickerInput id="nextAppointmentDate" labelText="Next Appointment Date" placeholder="mm/dd/yyyy" />
              </DatePicker>
            )}
          />

          {/* STI */}
          <Controller
            name="stiScreened"
            control={control}
            rules={validationRules.stiScreened}
            render={({ field }) => (
              <Select id="stiScreened" labelText="Screened for STI *" {...field} invalid={!!errors.stiScreened}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.stiScreened === 'yes' && (
            <>
              <Controller
                name="syndromicStiDiagnosis"
                control={control}
                render={({ field }) => (
                  <Select id="syndromicStiDiagnosis" labelText="Syndromic STI Diagnosis" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="urethral" text="Urethral Discharge" />
                    <SelectItem value="vaginal" text="Vaginal Discharge" />
                    <SelectItem value="ulcer" text="Genital Ulcer" />
                    <SelectItem value="bubo" text="Inguinal Bubo" />
                    <SelectItem value="swelling" text="Scrotal Swelling" />
                    <SelectItem value="pain" text="Lower Abdominal Pain" />
                    <SelectItem value="none" text="None" />
                  </Select>
                )}
              />
              {watchedFields.syndromicStiDiagnosis && watchedFields.syndromicStiDiagnosis !== 'none' && (
                <Controller
                  name="stiManagementProvided"
                  control={control}
                  render={({ field }) => (
                    <Select id="stiManagementProvided" labelText="STI Management Provided" {...field}>
                      <SelectItem value="" text="Select" />
                      <SelectItem value="yes" text="Yes" />
                      <SelectItem value="no" text="No" />
                    </Select>
                  )}
                />
              )}
            </>
          )}

          {/* TB */}
          <Controller
            name="tbScreened"
            control={control}
            rules={validationRules.tbScreened}
            render={({ field }) => (
              <Select id="tbScreened" labelText="Screened for TB *" {...field} invalid={!!errors.tbScreened}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.tbScreened === 'yes' && (
            <>
              <Controller
                name="tbScreeningResult"
                control={control}
                render={({ field }) => (
                  <Select id="tbScreeningResult" labelText="TB Screening Result" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="positive" text="Positive" />
                    <SelectItem value="negative" text="Negative" />
                  </Select>
                )}
              />
              {watchedFields.tbScreeningResult === 'positive' && (
                <>
                  <Controller
                    name="tbConfirmed"
                    control={control}
                    render={({ field }) => (
                      <Select id="tbConfirmed" labelText="Confirmed TB Case" {...field}>
                        <SelectItem value="" text="Select" />
                        <SelectItem value="yes" text="Yes" />
                        <SelectItem value="no" text="No" />
                      </Select>
                    )}
                  />
                  {watchedFields.tbConfirmed === 'yes' && (
                    <Controller
                      name="tbLinked"
                      control={control}
                      render={({ field }) => (
                        <Select id="tbLinked" labelText="Linked to TB Unit" {...field}>
                          <SelectItem value="" text="Select" />
                          <SelectItem value="yes" text="Yes" />
                          <SelectItem value="no" text="No" />
                        </Select>
                      )}
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* Mental Health */}
          <Controller
            name="mentalHealthScreened"
            control={control}
            rules={validationRules.mentalHealthScreened}
            render={({ field }) => (
              <Select
                id="mentalHealthScreened"
                labelText="Screened for Mental Health *"
                {...field}
                invalid={!!errors.mentalHealthScreened}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.mentalHealthScreened === 'yes' && (
            <>
              <Controller
                name="mhiSudIdentified"
                control={control}
                render={({ field }) => (
                  <Select id="mhiSudIdentified" labelText="MHI/SUD Identified" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="yes" text="Yes" />
                    <SelectItem value="no" text="No" />
                  </Select>
                )}
              />
              {watchedFields.mhiSudIdentified === 'yes' && (
                <Controller
                  name="mhiSudLinked"
                  control={control}
                  render={({ field }) => (
                    <Select id="mhiSudLinked" labelText="Linked to MHI/SUD Service" {...field}>
                      <SelectItem value="" text="Select" />
                      <SelectItem value="yes" text="Yes" />
                      <SelectItem value="no" text="No" />
                    </Select>
                  )}
                />
              )}
            </>
          )}

          {/* Hepatitis B */}
          <Controller
            name="hepBTested"
            control={control}
            rules={validationRules.hepBTested}
            render={({ field }) => (
              <Select id="hepBTested" labelText="Tested for Hepatitis B *" {...field} invalid={!!errors.hepBTested}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.hepBTested === 'yes' && (
            <>
              <Controller
                name="hepBResult"
                control={control}
                render={({ field }) => (
                  <Select id="hepBResult" labelText="Hepatitis B Result" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="positive" text="Positive" />
                    <SelectItem value="negative" text="Negative" />
                  </Select>
                )}
              />
              {watchedFields.hepBResult === 'positive' && (
                <Controller
                  name="hepBReferred"
                  control={control}
                  render={({ field }) => (
                    <Select id="hepBReferred" labelText="Referred for Hep B Treatment" {...field}>
                      <SelectItem value="" text="Select" />
                      <SelectItem value="yes" text="Yes" />
                      <SelectItem value="no" text="No" />
                    </Select>
                  )}
                />
              )}
              {watchedFields.hepBResult === 'negative' && (
                <Controller
                  name="hepBVaccination"
                  control={control}
                  render={({ field }) => (
                    <Select id="hepBVaccination" labelText="Hep B Vaccination Given" {...field}>
                      <SelectItem value="" text="Select" />
                      <SelectItem value="yes" text="Yes" />
                      <SelectItem value="no" text="No" />
                    </Select>
                  )}
                />
              )}
            </>
          )}

          {/* Hepatitis C */}
          <Controller
            name="hepCTested"
            control={control}
            rules={validationRules.hepCTested}
            render={({ field }) => (
              <Select id="hepCTested" labelText="Tested for Hepatitis C *" {...field} invalid={!!errors.hepCTested}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.hepCTested === 'yes' && (
            <>
              <Controller
                name="hepCResult"
                control={control}
                render={({ field }) => (
                  <Select id="hepCResult" labelText="Hepatitis C Result" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="positive" text="Positive" />
                    <SelectItem value="negative" text="Negative" />
                  </Select>
                )}
              />
              {watchedFields.hepCResult === 'positive' && (
                <Controller
                  name="hepCReferred"
                  control={control}
                  render={({ field }) => (
                    <Select id="hepCReferred" labelText="Referred for Hep C Treatment" {...field}>
                      <SelectItem value="" text="Select" />
                      <SelectItem value="yes" text="Yes" />
                      <SelectItem value="no" text="No" />
                    </Select>
                  )}
                />
              )}
            </>
          )}

          {/* Family Planning */}
          <Controller
            name="fpCounseling"
            control={control}
            rules={validationRules.fpCounseling}
            render={({ field }) => (
              <Select id="fpCounseling" labelText="FP Counseling Provided *" {...field} invalid={!!errors.fpCounseling}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          <Controller
            name="fpMethodProvided"
            control={control}
            rules={validationRules.fpMethodProvided}
            render={({ field }) => (
              <Select
                id="fpMethodProvided"
                labelText="FP Method Provided *"
                {...field}
                invalid={!!errors.fpMethodProvided}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.fpMethodProvided === 'yes' && (
            <Controller
              name="fpMethodType"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  id="fpMethodType"
                  label="FP Method Type"
                  items={[
                    { id: 'pills', label: 'Oral Contraceptive Pills' },
                    { id: 'injectable', label: 'Injectable' },
                    { id: 'implant', label: 'Implant' },
                    { id: 'iucd', label: 'IUCD' },
                    { id: 'ecp', label: 'ECP' },
                    { id: 'tl', label: 'Tubal Ligation' },
                  ]}
                  itemToString={(item) => item.label}
                  {...field}
                />
              )}
            />
          )}

          {/* Condoms */}
          <Controller
            name="condomDemo"
            control={control}
            rules={validationRules.condomDemo}
            render={({ field }) => (
              <Select id="condomDemo" labelText="Condom Use Demonstrated *" {...field} invalid={!!errors.condomDemo}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          <Controller
            name="condomsProvided"
            control={control}
            rules={validationRules.condomsProvided}
            render={({ field }) => (
              <Select id="condomsProvided" labelText="Condoms Provided *" {...field} invalid={!!errors.condomsProvided}>
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.condomsProvided === 'yes' && (
            <Controller
              name="condomCount"
              control={control}
              render={({ field }) => <NumberInput id="condomCount" labelText="Number of Condoms" min={0} {...field} />}
            />
          )}

          {/* GBV */}
          <Controller
            name="gbvAssessment"
            control={control}
            rules={validationRules.gbvAssessment}
            render={({ field }) => (
              <Select
                id="gbvAssessment"
                labelText="GBV Assessment Conducted *"
                {...field}
                invalid={!!errors.gbvAssessment}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.gbvAssessment === 'yes' && (
            <>
              <Controller
                name="gbvOutcome"
                control={control}
                render={({ field }) => (
                  <Select id="gbvOutcome" labelText="GBV Assessment Outcome" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="physical" text="Physical" />
                    <SelectItem value="emotional" text="Emotional" />
                    <SelectItem value="sexual" text="Sexual" />
                    <SelectItem value="other" text="Other" />
                  </Select>
                )}
              />
              <Controller
                name="gbvLinked"
                control={control}
                render={({ field }) => (
                  <Select id="gbvLinked" labelText="Linked to GBV Service" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="yes" text="Yes" />
                    <SelectItem value="no" text="No" />
                  </Select>
                )}
              />
              {watchedFields.gbvLinked === 'yes' && (
                <Controller
                  name="gbvServiceProvided"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      id="gbvServiceProvided"
                      label="GBV Service Provided"
                      items={[
                        { id: 'medical', label: 'Medical Service' },
                        { id: 'legal', label: 'Legal Services' },
                        { id: 'social', label: 'Social Services' },
                        { id: 'psych', label: 'Psychological Services' },
                        { id: 'other', label: 'Others' },
                      ]}
                      itemToString={(item) => item.label}
                      {...field}
                    />
                  )}
                />
              )}
            </>
          )}

          {/* Cervical Cancer */}
          <Controller
            name="cervicalCancerEligible"
            control={control}
            rules={validationRules.cervicalCancerEligible}
            render={({ field }) => (
              <Select
                id="cervicalCancerEligible"
                labelText="Eligible for Cervical Cancer Screening *"
                {...field}
                invalid={!!errors.cervicalCancerEligible}
              >
                <SelectItem value="" text="Select" />
                <SelectItem value="yes" text="Yes" />
                <SelectItem value="no" text="No" />
              </Select>
            )}
          />
          {watchedFields.cervicalCancerEligible === 'yes' && (
            <>
              <Controller
                name="cervicalCancerCounselled"
                control={control}
                render={({ field }) => (
                  <Select id="cervicalCancerCounselled" labelText="Counselled for Cervical Cancer" {...field}>
                    <SelectItem value="" text="Select" />
                    <SelectItem value="yes" text="Yes" />
                    <SelectItem value="no" text="No" />
                  </Select>
                )}
              />
              <Controller
                name="cervicalCancerScreened"
                control={control}
                rules={validationRules.cervicalCancerScreened}
                render={({ field }) => (
                  <Select
                    id="cervicalCancerScreened"
                    labelText="Screened for Cervical Cancer *"
                    {...field}
                    invalid={!!errors.cervicalCancerScreened}
                  >
                    <SelectItem value="" text="Select" />
                    <SelectItem value="yes" text="Yes" />
                    <SelectItem value="no" text="No" />
                  </Select>
                )}
              />
              {watchedFields.cervicalCancerScreened === 'no' && (
                <Controller
                  name="cervicalCancerNotScreenedReason"
                  control={control}
                  render={({ field }) => (
                    <Select id="cervicalCancerNotScreenedReason" labelText="Reason Not Screened" {...field}>
                      <SelectItem value="" text="Select" />
                      <SelectItem value="menses" text="Client on menses" />
                      <SelectItem value="service" text="Service interruption" />
                      <SelectItem value="declined" text="Client declined" />
                      <SelectItem value="other" text="Other" />
                    </Select>
                  )}
                />
              )}
              {watchedFields.cervicalCancerScreened === 'yes' && (
                <>
                  <Controller
                    name="cervicalCancerResult"
                    control={control}
                    render={({ field }) => (
                      <Select id="cervicalCancerResult" labelText="Cervical Cancer Result" {...field}>
                        <SelectItem value="" text="Select" />
                        <SelectItem value="positive" text="Positive" />
                        <SelectItem value="negative" text="Negative" />
                        <SelectItem value="suspected" text="Suspected" />
                      </Select>
                    )}
                  />
                  {(watchedFields.cervicalCancerResult === 'positive' ||
                    watchedFields.cervicalCancerResult === 'suspected') && (
                    <Controller
                      name="cervicalCancerTreatment"
                      control={control}
                      render={({ field }) => (
                        <Select id="cervicalCancerTreatment" labelText="Cervical Cancer Treatment" {...field}>
                          <SelectItem value="" text="Select" />
                          <SelectItem value="yes" text="Yes" />
                          <SelectItem value="no" text="No" />
                        </Select>
                      )}
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* Follow-up and Final */}
          <Controller
            name="lastFollowUpOutcome"
            control={control}
            render={({ field }) => (
              <Select id="lastFollowUpOutcome" labelText="Last Follow-up Outcome" {...field}>
                <SelectItem value="" text="Select" />
                <SelectItem value="left" text="Left town" />
                <SelectItem value="positive" text="Tested HIV Positive" />
                <SelectItem value="unknown" text="Unknown" />
                <SelectItem value="declined" text="Declined" />
                <SelectItem value="other" text="Other" />
              </Select>
            )}
          />
          <Controller
            name="finalDecision"
            control={control}
            render={({ field }) => (
              <Select id="finalDecision" labelText="Final Decision" {...field}>
                <SelectItem value="" text="Select" />
                <SelectItem value="referred" text="Referred to other KP site" />
                <SelectItem value="linked" text="Linked/Referred to ART" />
                <SelectItem value="tracking" text="Continue Tracking" />
                <SelectItem value="unable" text="Unable to Access" />
                <SelectItem value="other" text="Other" />
              </Select>
            )}
          />

          {/* SNS Specific */}
          {watchedFields.modalityUsed === 'sns' && (
            <>
              <Controller
                name="couponId"
                control={control}
                render={({ field }) => <TextInput id="couponId" labelText="Coupon ID" {...field} />}
              />
              {watchedFields.couponId && (
                <>
                  <Controller
                    name="couponReturnDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker datePickerType="single" {...field}>
                        <DatePickerInput
                          id="couponReturnDate"
                          labelText="Coupon Return Date"
                          placeholder="mm/dd/yyyy"
                        />
                      </DatePicker>
                    )}
                  />
                  <Controller
                    name="etbPaid"
                    control={control}
                    render={({ field }) => (
                      <NumberInput id="etbPaid" labelText="ETB Paid to Recruiter" min={0} {...field} />
                    )}
                  />
                </>
              )}
            </>
          )}

          <Stack gap={3} orientation="horizontal">
            <Button onClick={() => handleClose()} kind="secondary">
              Dismiss
            </Button>
            <Button type="submit" kind="primary">
              Submit
            </Button>
          </Stack>
        </div>
      </Form>
    </div>
  );
};

export default ClientForm;
