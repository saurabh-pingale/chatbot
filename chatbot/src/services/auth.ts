import { API_ENDPOINTS } from "../constants/api";

const handleResponse = async (response: Response) => {
    if (response.ok) {
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            return {};
        }
        const data = await response.json();
        return data;
    } else {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.detail || 'API request failed');
    }
};

export const sendOTP = async (email: string, shopId: string) => {
    const response = await fetch(API_ENDPOINTS.SEND_OTP, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, shop_id: shopId }),
    });
    return handleResponse(response);
};

export const verifyOTP = async (email: string, otp: string, shopId: string) => {
    const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, shop_id: shopId }),
    });

    const data = await handleResponse(response);
    if (data && data.access_token) {
        localStorage.setItem('user_jwt_token', data.access_token);
    }
    return data;
}; 