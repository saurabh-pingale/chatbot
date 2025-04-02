export async function sendSessionDataToBackend(sessionData) {
    try {
        await fetch('/apps/chatbot-api/store-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sessionData),
        });
    } catch (error) {
        console.error('Error sending session data:', error);
    }
}