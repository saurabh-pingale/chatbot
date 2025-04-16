//TODO - All api urls should be one place
import axios from 'axios';

export const getColorPreference = async (shopId: string) => {
    try {
        //TODO - Shift API URL to api contants file
        const response = await axios.get(`http:localhost:8000/store-admin/color-preference?shopId=${shopId}`);
        //If db is down, or something hapend then color is not coming, 
        //then we need to keep default color i.e return response?.data?.color || COLORS.ORANGE;
        return response.data.color;
    } catch (error) {
        console.error("Error fetching the color preference!");
        return "Error, fetching the color"
    }
}