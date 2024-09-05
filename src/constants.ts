export const encounterRepresentation =
  'custom:(uuid,encounterDatetime,encounterType,location:(uuid,name),' +
  'patient:(uuid,display),encounterProviders:(uuid,provider:(uuid,name)),' +
  'obs:(uuid,obsDatetime,voided,groupMembers,formFieldNamespace,formFieldPath,concept:(uuid,name:(uuid,name)),value:(uuid,name:(uuid,name),' +
  'names:(uuid,conceptNameType,name))))';

export const phdpConcepts = {
  appointmentNote: '160632AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  appointmentDateTime: '2c4db7e7-1ece-49a6-a075-d466e6d9b27d',
};

export const transferOutWorkspace = 'transfer-out-workspace';
export const phdpEncounterTypeUuid = 'f1b397c1-46bd-43e6-a23d-ae2cedaec881';
