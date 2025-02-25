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
