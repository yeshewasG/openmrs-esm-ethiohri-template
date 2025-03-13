// src/VitalSignsForm.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import axios, { AxiosResponse } from 'axios';
import { Patient, EncounterPayload, Facility } from '../types/index';
import { fetchLocation, saveEncounter } from '../api/api';
import { usePatient } from '@openmrs/esm-framework';

const VitalSignsForm: React.FC = () => {
  // State with TypeScript types
  const patient = usePatient();
  //   const [patientId, setPatientId] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [systolicBP, setSystolicBP] = useState<string>('');
  const [diastolicBP, setDiastolicBP] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [pulse, setPulse] = useState<string>('');
  const [location, setLocation] = useState<Facility>();
  // OpenMRS API settings
  const apiBaseUrl = 'http://localhost:8080/openmrs/ws/rest/v1';
  const auth = { username: 'admin', password: 'Admin123' };

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const facilityInformation = await fetchLocation();
        facilityInformation?.data?.results?.forEach((element: any) => {
          if (element?.tags?.some((x: any) => x.display === 'Facility Location')) {
            setLocation({ uuid: element.uuid, display: element.display });
          }
        });
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    };

    fetchLocationData();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Concept UUIDs (replace with real ones from your OpenMRS instance)
    const conceptUuids = {
      bloodPressureSystolic: '165278AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Example UUID
      bloodPressureDiastolic: '165279AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      temperature: '5088AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      pulse: '5087AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    };
    // Create encounter payload with TypeScript type
    const encounterPayload: EncounterPayload = {
      patient: patient.patientUuid,
      encounterDatetime: new Date().toISOString(),
      location: location.uuid, // Example location UUID
      encounterType: 'c785bab5-f909-4d97-990f-9ba790a537ce', // kp encounter type UUID
      obs: [
        { concept: conceptUuids.bloodPressureSystolic, value: systolicBP },
        { concept: conceptUuids.bloodPressureDiastolic, value: diastolicBP },
        { concept: conceptUuids.temperature, value: temperature },
        { concept: conceptUuids.pulse, value: pulse },
      ],
    };

    try {
      const response = await saveEncounter(new AbortController(), encounterPayload, encounterPayload.encounterType); // Use saveEncounter for updating

      console.log('Encounter created:', response.data);
      alert('Vital signs submitted successfully!');
      // Reset form
      setSystolicBP('');
      setDiastolicBP('');
      setTemperature('');
      setPulse('');
    } catch (error: unknown) {
      console.error('Error submitting encounter:', error);
      alert('Failed to submit vital signs.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Vital Signs Form</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Blood Pressure (mmHg): </label>
          <input
            type="number"
            value={systolicBP}
            onChange={(e) => setSystolicBP(e.target.value)}
            placeholder="Systolic"
            required
          />
          /
          <input
            type="number"
            value={diastolicBP}
            onChange={(e) => setDiastolicBP(e.target.value)}
            placeholder="Diastolic"
            required
          />
        </div>
        <div>
          <label>Temperature (°C): </label>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            step="0.1"
            required
          />
        </div>
        <div>
          <label>Pulse (bpm): </label>
          <input type="number" value={pulse} onChange={(e) => setPulse(e.target.value)} required />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default VitalSignsForm;
