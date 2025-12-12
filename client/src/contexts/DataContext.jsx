/**
 * Data Context - Shared patients and clinicians data
 * Fetches data once and provides it to all components
 */

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { dataAPI } from '../services/api';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [patients, setPatients] = useState([]);
  const [clinicians, setClinicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track if data has been fetched to prevent multiple fetches
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple fetches (handles React Strict Mode double-mount in development)
    if (dataFetchedRef.current) {
      return;
    }
    dataFetchedRef.current = true;

    const fetchData = async () => {
      try {
        const [patientsRes, cliniciansRes] = await Promise.all([
          dataAPI.getPatients(),
          dataAPI.getClinicians()
        ]);
        setPatients(patientsRes.data);
        setClinicians(cliniciansRes.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load patients and clinicians data');
        // Reset flag on error so it can retry if needed
        dataFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty deps - only fetch once on mount

  const value = {
    patients,
    clinicians,
    loading,
    error,
    // Helper functions
    getPatientName: (patientId) => {
      const patient = patients.find(p => p.id === patientId);
      return patient ? patient.name : patientId;
    },
    getClinicianName: (clinicianId) => {
      const clinician = clinicians.find(c => c.id === clinicianId);
      return clinician ? clinician.name : clinicianId;
    }
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

