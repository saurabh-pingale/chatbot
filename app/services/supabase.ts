import axios from 'axios';

export const getColorPreference = async (shopId: string) => {
    try {
        const response = await axios.get(`/supabase?shopId=${shopId}`);
        return response.data.color;
    } catch (error) {
        console.error("Error fetching the color preference!");
        return "Error, fetching the color"
    }
}