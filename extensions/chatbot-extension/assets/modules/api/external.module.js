import { API } from '../../constants/api.constants';

export async function fetchUserIP() {
  try {
    const response = await fetch(API.IP_ADDRESS);
    return await response.json();
  } catch (error) {
    console.error('IP fetch failed:', error);
    return { ip: null };
  }
}

export async function fetchUserLocation(ip) {
  if (ip === 'unknown') return { country: 'unknown', city: null, region: null };

  try {
    const response = await fetch(`${API.USER_LOCATION}/${ip}/json/`);
    const data = await response.json();
    return {
      country: data.country_name || null,
      city: data.city || null,
      region: data.region || null
    };
  } catch (error) {
    console.error('Location fetch failed:', error);
    return { country: null, city: null, region: null};
  }
}