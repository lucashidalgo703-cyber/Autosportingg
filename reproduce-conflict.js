import { readFile } from 'fs/promises';
import { Blob } from 'buffer';

const run = async () => {
    console.log("--- TEST 7: 'images' as Text Field ---");
    try {
        const formData = new FormData();
        formData.append('images', 'This is not a file'); // Conflict?

        formData.append('brand', 'TestConflict');
        formData.append('name', 'TestModelConflict');
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
            console.error('Test 7 Error:', response.status, text);
        } else {
            const json = await response.json();
            console.log('Test 7 Success:', json);
        }
    } catch (err) {
        console.error('Test 7 Exception:', err);
    }
};

run();
