import useSWR from 'swr';
import { fhirBaseUrl, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export function deleteEncounter(patientUuid: string, encounterUuid: string, abortController: AbortController) {
  return openmrsFetch(`${restBaseUrl}/encounter/${encounterUuid}`, {
    method: 'DELETE',
    signal: abortController.signal,
  });
}

export type Encounter = {
  id: string;
  display: string;
  encounterDatetime: string;
  provider: string;
  encounterType: string;
  location: string;
  lastUpdated: string;
};

export function useEncounters(patientUuid: string) {
  const encountersUrl = `${restBaseUrl}/encounter?patient=${patientUuid}&v=full`;

  const { data, error, isLoading, isValidating, mutate } = useSWR(patientUuid ? encountersUrl : null, openmrsFetch);

  // Assuming data is directly accessible, otherwise adjust the access accordingly
  const formattedEncounters =
    Array.isArray(data) && data.length > 0
      ? data
          .map((encounter: any) => mapEncounterProperties(encounter))
          .sort((a: Encounter, b: Encounter) => (b.lastUpdated > a.lastUpdated ? 1 : -1))
      : null;

  return {
    encounters: formattedEncounters || [],
    error: error || null,
    isLoading: isLoading || false,
    isValidating: isValidating || false,
    mutate,
  };
}

function mapEncounterProperties(encounter: any): Encounter {
  return {
    id: encounter?.uuid,
    display: encounter?.display,
    encounterDatetime: encounter?.encounterDatetime,
    provider: encounter?.provider?.display,
    encounterType: encounter?.encounterType?.display,
    location: encounter?.location?.display,
    lastUpdated: encounter?.auditInfo?.dateChanged || encounter?.auditInfo?.dateCreated,
  };
}
