import { formatDate, parseDate } from '@openmrs/esm-framework';
import dayjs from 'dayjs';

export function formatDateTime(dateString: string): any {
    const format = 'YYYY-MM-DDTHH:mm:ss';
    if (dateString.includes('.')) {
      dateString = dateString.split('.')[0];
    }
    return dayjs(dateString, format, true).toDate();
  }
  
  export function obsArrayDateComparator(left, right) {
    return formatDateTime(right.obsDatetime) - formatDateTime(left.obsDatetime);
  }

export function findObs(encounter, obsConcept): Record<string, any> {
    const allObs = encounter?.obs?.filter((observation) => observation.concept.uuid === obsConcept) || [];
    return allObs?.length == 1 ? allObs[0] : allObs?.sort(obsArrayDateComparator)[0];
  }

  export function getObsFromEncounter(encounter, obsConcept, isDate?: Boolean, isTrueFalseConcept?: Boolean) {
    const obs = findObs(encounter, obsConcept);
  
    if (isTrueFalseConcept) {
      if (obs.value.uuid == 'cf82933b-3f3f-45e7-a5ab-5d31aaee3da3') {
        return 'Yes';
      } else {
        return 'No';
      }
    }
    if (!obs) {
      return '--';
    }
    if (isDate) {
      return formatDate(parseDate(obs.value), { mode: 'wide' });
    }
    if (typeof obs.value === 'object' && obs.value?.names) {
      return (
        obs.value?.names?.find((conceptName) => conceptName.conceptNameType === 'SHORT')?.name || obs.value.name.name
      );
    }
    return obs.value;
  }