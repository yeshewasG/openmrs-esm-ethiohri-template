import { type OpenmrsResource } from '@openmrs/esm-framework';

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

// src/types.ts
export interface Patient {
  uuid: string;
  display: string; // e.g., "12345 - John Doe"
}
export interface Facility {
  uuid: string;
  display: string; // e.g., "12345 - John Doe"
}

export interface Observation {
  concept: string; // Concept UUID
  value: string | number; // Value can be numeric or text
}

export interface EncounterPayload {
  patient: string; // Patient UUID
  encounterDatetime: string; // ISO date string
  location: string; // Location UUID
  encounterType: string; // Encounter type UUID
  obs: Observation[];
}
