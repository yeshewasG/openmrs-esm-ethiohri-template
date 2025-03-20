export const encounterRepresentation =
  'custom:(uuid,encounterDatetime,encounterType,location:(uuid,name),' +
  'patient:(uuid,display),encounterProviders:(uuid,provider:(uuid,name)),' +
  'obs:(uuid,obsDatetime,voided,groupMembers,formFieldNamespace,formFieldPath,concept:(uuid,name:(uuid,name)),value:(uuid,name:(uuid,name),' +
  'names:(uuid,conceptNameType,name))))';

export const templateEsmFieldConcepts = {
  sampleTextInput: '2c30c599-1e4f-46f9-8488-5ab57cdc8ac3',
  sampleNumber: '1473AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  sampleDate: '160649AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

export const templateEsmWorkspace = 'template-esm-workspace';

export const FOLLOWUP_ENCOUNTER_TYPE_UUID = '136b2ded-22a3-4831-a39a-088d35a50ef5';
export const TEMPLATE_ENCOUNTER_TYPE_UUID = 'a4ba8e16-21ff-48ce-9554-7d08b1169e33';
export const TEMPLATE_FORM_UUID = '4ed66728-410c-437e-9b9e-437a3b66f2fa';

export const transferOutFieldConcepts = {
  transfferedFrom: '161550AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  transferredTo: '2c30c599-1e4f-46f9-8488-5ab57cdc8ac3',
  ClinicianName: '1473AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  mrn: '9f760fe1-5cde-41ab-99b8-b8e1d77de902',
  artStarted: '1149AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  originalFirstLineRegimenDose: '6d7d0327-e1f8-4246-bfe5-be1e82d94b14',
  dateOfTransfer: '160649AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  providerTelephoneNumber: '5587f1b1-1917-4345-a284-a0ed6a56a522',
  otherSpecify: 'a2148b80-36e8-4e3f-9759-a04c0deafa86',
  motherPMTCT: '',
};

export const transferOutWorkspace = 'transfer-out-workspace';
export const phdpEncounterTypeUuid = 'f1b397c1-46bd-43e6-a23d-ae2cedaec881';

export const TRANSFEROUT_ENCOUNTER_TYPE_UUID = 'd617892c-4154-4e51-9418-8c6e7a654dd9';
export const TRANSFEROUT_FORM_UUID = '10c8c272-45e3-4efc-a39b-493dd541ee78';

export const kppEncounterUuid = 'c785bab5-f909-4d97-990f-9ba790a537ce';
export const kppFormUuid = '3774b55b-6430-4f82-848c-b9755f07f024';
