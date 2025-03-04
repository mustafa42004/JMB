const axios = require('axios')
const latitude = 22.685485043135586
const longitude = 75.8599692622163
// const GOOGLE_API_KEY = 'AIzaSyBYU1yH-q0KTwN0N_Aoi6ZtrA9M42frTsI'

const fetch = async() => {
    const apiKey = 'c30beda40324440bbdf454d1a36c3760';
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude},${longitude}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const address = response.data.results[0].formatted; // Get the formatted address
        console.log(address)
    } catch (error) {
        console.error('Error fetching address:', error.message);
      
    }
}

fetch()