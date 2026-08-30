const BASE = 'http://localhost:4000/api';

export const getHotspots = async () => (await fetch(`${BASE}/hotspots`)).json();
export const getFacilities = async () => (await fetch(`${BASE}/facilities`)).json();
export const getIncidents = async () => (await fetch(`${BASE}/incidents`)).json();