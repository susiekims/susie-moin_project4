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
app.getLocation = (location) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    },(results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
                return component.types[0] === 'country';
            });
            const country = addressComponents[0].long_name;
            const lat = results[0].geometry.location.lat();
            const lng = results[0].geometry.location.lng();
            console.log(country);
            console.log(lat, lng);
            console.log(results);
        } else {
            alert("Something went wrong." + status);
        }
    });
}

app.getWeather = () => {
    
}

app.getCurrency = () => {
    
}

app.convertCurrency = (userCurrency, destinationCurrency) => {
    // console.log('i was called!');
    $.ajax({
        url: `https://free.currencyconverterapi.com/api/v6/convert`,
        method: 'GET',
        dataType: 'json',
        data: {
            q: `${userCurrency}_${destinationCurrency},${destinationCurrency}_${userCurrency}`,
            compact: 'ultra'
        }
    }).then((res) => {
        console.log(res);
    });
}

app.getRestaurants = () => {

}

app.events = () => {
    $('form').on('submit', (e) => {
        e.preventDefault();
        const userAddress = $('input[type=search]').val();
        app.getLocation(userAddress);
    });
}

app.init = () => {
    app.events();
    app.convertCurrency('CAD', 'USD');
}

$(function() {
    console.log( "ready!" );
    app.init();
});