import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { encounterRepresentation } from '../constants';

export function saveEncounter(abortController: AbortController, payload, encounterUuid?: string) {
  const url = encounterUuid
    ? `${restBaseUrl}/encounter/${encounterUuid}?v=${encounterRepresentation}`
    : `${restBaseUrl}/encounter?v=${encounterRepresentation}`;
  return openmrsFetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: payload,
    signal: abortController.signal,
  });
}

export function fetchLocation() {
  return openmrsFetch(`${restBaseUrl}/location?q=&v=default`);
}

export async function getPatientInfo(patientUuid: string) {
  try {
    const response = await openmrsFetch(`${restBaseUrl}/patient/${patientUuid}?v=full`);
    const data = await response.data;

    return data;
  } catch (error) {
    console.error('Error fetching patient emergency contact:', error);
    return null;
  }
}
