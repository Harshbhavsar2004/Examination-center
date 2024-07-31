const examinerdb = require('./userSchema')
const mongoose = require("mongoose");
async function initializeTestData() {
    try {
        // Check if test data already exists
        const existingExaminer = await examinerdb.findOne({ email: 'test@gmail.com' });

        if (!existingExaminer) {
            // Insert test data if it doesn't exist
            const newExaminer = new examinerdb({
                email: 'examiner@gmail.com',
                pass: 'abcd12'
            });
            await newExaminer.save();
            console.log('Test data initialized successfully.');
        } else {
            console.log('Test data already exists.');
        }
    } catch (error) {
        console.error('Error initializing test data:', error);
    }
}
initializeTestData();

module.export = initializeTestData;