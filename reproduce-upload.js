import { readFile } from 'fs/promises';
import { Blob } from 'buffer';

const run = async () => {
    console.log("--- TEST 1: No Images ---");
    try {
        const formData = new FormData();
        formData.append('brand', 'TestNoImg');
        formData.append('name', 'TestModelNoImg');
        formData.append('year', '2023');
        formData.append('km', '100');
        formData.append('fuel', 'Petrol');
        formData.append('condition', 'New');
        formData.append('price', '10000');
        formData.append('currency', '$');
        formData.append('featured', 'false');

        const response = await fetch('http://localhost:3001/api/cars', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Test 1 Error:', response.status, text);
        } else {
            const json = await response.json();
            console.log('Test 1 Success:', json);
        }
    } catch (err) {
        console.error('Test 1 Exception:', err);
    }

    console.log("\n--- TEST 2: Invalid Number (Price = 'abc') ---");
    try {
        const formData2 = new FormData();
        formData2.append('brand', 'TestInvalid');
        formData2.append('name', 'TestModelInvalid');
        formData2.append('year', '2023');
        formData2.append('km', '100');
        formData2.append('fuel', 'Petrol');
        formData2.append('condition', 'New');
        formData2.append('price', 'abc'); // Invalid
        formData2.append('currency', '$');
        formData2.append('featured', 'false');

        const response2 = await fetch('http://localhost:3001/api/cars', {
            method: 'POST',
            body: formData2
        });

        if (!response2.ok) {
            const text = await response2.text();
            console.error('Test 2 Error:', response2.status, text);
        } else {
            const json = await response2.json();
            console.log('Test 2 Success:', json);
        }
    } catch (err) {
        console.error('Test 2 Exception:', err);
    }
};

run();
