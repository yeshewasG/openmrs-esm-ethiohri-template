import { type OpenmrsResource } from "@openmrs/esm-framework";

export interface OpenmrsEncounter extends OpenmrsResource {
    encounterDatetime: Date;
    encounterType: string;
    patient: string;
    location: string;
    encounterProviders?: Array<{ encounterRole: string; provider: string }>;
    obs: Array<OpenmrsResource>;
    form?: string;
    visit?: string;
  }