// get user's current location
// get location user wants to travel to
// pass user location into Google maps geocoder to get lat and lng coords
// pass user desired location into Google geocoder to get lat and lng coords
// pass city info and call weather API and get current weather
// pass city info and call zomato API and get top 3 random restaurants 
// pass city info into 


// create empty object to store all methods
const app = {};

// get user's current location
// most of the other APIs we are requesting data from accept location info in the form of lat lng coords
// so we pass user location into Google  geocoder to get lat and lng coords to use in other API requests
app.getCoords = (location) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, (results, status) => {
    if (status == google.maps.GeocoderStatus.OK) {
        const lat = results[0].geometry.location.lat();
        const lng = results[0].geometry.location.lng();
        console.log(lat, lng);
    } else {
      alert("Something went wrong." + status);
    }
  });
}


app.getWeather = () => {

}

app.getCurrency = () => {

}

app.convertCurrency = () => {
    
}

app.getRestaurants = () => {

}

app.events = () => {
    $('form').on('submit', (e) => {
        e.preventDefault();
        const userAddress = $('input[type=search]').val();
        app.getCoords(userAddress);
    });
}

app.init = () => {
    app.events();
}

$(function() {
    console.log('working!');
    app.init();
})