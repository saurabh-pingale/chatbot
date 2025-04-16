import axios from 'axios';
import { API } from 'app/constants/api.constants';

export const getColorPreference = async (shopId: string) => {
    try {
        const response = await axios.get(`${API.BACKEND_URL}/${API.GET_COLOR}?shopId=${shopId}`);
        return response.data.color;
    } catch (error) {
        console.error("Error fetching the color preference!");
        return "Error, fetching the color"
    }
}