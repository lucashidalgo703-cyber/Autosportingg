
const testLogin = async () => {
    try {
        console.log('Testing login with password: 116sporting');
        const response = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: '116sporting' })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('SUCCESS: Login worked with 116sporting');
        } else {
            console.log('FAILED: ' + response.status);
            console.log(await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

testLogin();
