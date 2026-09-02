const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000/api';

export const getHotspots  = async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return (await fetch(`${BASE}/hotspots${qs ? `?${qs}` : ''}`)).json();
};
export const getFacilities = async () => (await fetch(`${BASE}/facilities`)).json();
export const getFacility   = async (id) => (await fetch(`${BASE}/facilities/${id}`)).json();
export const getIncidents  = async () => (await fetch(`${BASE}/incidents`)).json();
export const getAlerts     = async () => (await fetch(`${BASE}/alerts`)).json();
export const getMlStatus   = async () => (await fetch(`${BASE}/ml/status`)).json();
export const runMlPipeline = async (writeBack = true) =>
    (await fetch(`${BASE}/ml/run?write_back=${writeBack}`, { method: 'POST' })).json();

export { BASE };