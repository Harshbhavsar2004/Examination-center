// Function to check if any value is greater than 50
const checkValuesGreaterThan50 = async (token) => {
    try {
        if (!token) {
            throw new Error('Token not provided');
        }

        // Verify the token
        const decodedToken = jwt.verify(token, keysecret);

        const users = await userdb.find(); // Assuming this fetches all users
        const usersWithHighValues = users.filter(user => {
            return user.left > 50 || user.right > 50 || user.Voice > 50;
        });
        return usersWithHighValues.length > 0;
    } catch (error) {
        console.error('Error checking values:', error);
        return false;
    }
};


module.exports = checkValuesGreaterThan50;