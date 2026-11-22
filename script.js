const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const locationButton = document.getElementById("locationButton");
const statusMessage = document.getElementById("statusMessage");

const weatherCodes = {
  0: { description: "Clear sky", icon: "☀️" },
  1: { description: "Mainly clear", icon: "🌤️" },
  2: { description: "Partly cloudy", icon: "⛅" },
  3: { description: "Overcast", icon: "☁️" },
  45: { description: "Foggy", icon: "🌫️" },
  48: { description: "Depositing rime fog", icon: "🌫️" },
  51: { description: "Light drizzle", icon: "🌦️" },
  53: { description: "Moderate drizzle", icon: "🌦️" },
  55: { description: "Dense drizzle", icon: "🌧️" },
  56: { description: "Freezing drizzle", icon: "🌧️" },
  57: { description: "Heavy freezing drizzle", icon: "🌧️" },
  61: { description: "Light rain", icon: "🌧️" },
  63: { description: "Moderate rain", icon: "🌧️" },
  65: { description: "Heavy rain", icon: "🌧️" },
  66: { description: "Freezing rain", icon: "🌧️" },
  67: { description: "Heavy freezing rain", icon: "🌧️" },
  71: { description: "Light snowfall", icon: "🌨️" },
  73: { description: "Moderate snowfall", icon: "🌨️" },
  75: { description: "Heavy snowfall", icon: "❄️" },
  77: { description: "Snow grains", icon: "❄️" },
  80: { description: "Light rain showers", icon: "🌦️" },
  81: { description: "Moderate rain showers", icon: "🌧️" },
  82: { description: "Violent rain showers", icon: "⛈️" },
  85: { description: "Snow showers", icon: "🌨️" },
  86: { description: "Heavy snow showers", icon: "❄️" },
  95: { description: "Thunderstorm", icon: "⛈️" },
  96: { description: "Thunderstorm with hail", icon: "⛈️" },
  99: { description: "Severe thunderstorm with hail", icon: "⛈️" }
};

function getWeatherInfo(code) {
  return weatherCodes[code] || {
    description: "Weather unavailable",
    icon: "🌡️"
  };
}

function formatTime(value) {
  if (!value) return "--:--";

  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function formatDay(dateString, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";

  return new Date(`${dateString}T12:00:00`).toLocaleDateString(
    "en-IN",
    { weekday: "short" }
  );
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#ff8c8c" : "#91a2b8";
}

async function searchCity(city) {
  const cleanCity = city.trim();

  if (!cleanCity) {
    showStatus("Please enter a city name.", true);
    return;
  }

  try {
    searchButton.disabled = true;
    showStatus(`Searching weather for ${cleanCity}...`);

    const geoURL = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoURL.search = new URLSearchParams({
      name: cleanCity,
      count: "1",
      language: "en",
      format: "json"
    });

    const geoResponse = await fetch(geoURL);
    if (!geoResponse.ok) {
      throw new Error("Unable to search for this city.");
    }

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("City not found. Please check the spelling.");
    }

    const place = geoData.results[0];

    await loadWeather(
      place.latitude,
      place.longitude,
      place.name,
      place.admin1,
      place.country
    );

  } catch (error) {
    showStatus(error.message || "Something went wrong.", true);
  } finally {
    searchButton.disabled = false;
  }
}

async function loadWeather(latitude, longitude, city, region = "", country = "") {
  try {
    showStatus("Fetching the latest weather data...");

    const weatherURL = new URL("https://api.open-meteo.com/v1/forecast");

    weatherURL.search = new URLSearchParams({
      latitude: latitude,
      longitude: longitude,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "weather_code",
        "wind_speed_10m"
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "sunrise",
        "sunset",
        "uv_index_max",
        "precipitation_probability_max"
      ].join(","),
      forecast_days: "7",
      timezone: "auto"
    });

    const response = await fetch(weatherURL);

    if (!response.ok) {
      throw new Error("Weather service is temporarily unavailable.");
    }

    const data = await response.json();

    if (!data.current || !data.daily) {
      throw new Error("Weather information is unavailable.");
    }

    displayCurrentWeather(data, city, region, country);
    displayForecast(data.daily);

    showStatus(
      `Weather updated successfully • ${new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      })}`
    );

  } catch (error) {
    showStatus(error.message || "Unable to load weather.", true);
  }
}

function displayCurrentWeather(data, city, region, country) {
  const current = data.current;
  const daily = data.daily;

  const weather = getWeatherInfo(current.weather_code);

  const locationParts = [city, region, country].filter(Boolean);
  document.getElementById("locationName").textContent =
    [...new Set(locationParts)].join(", ");

  document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

  document.getElementById("weatherIcon").textContent =
    current.is_day ? weather.icon : "🌙";

  document.getElementById("weatherDescription").textContent =
    current.is_day ? weather.description : `Night · ${weather.description}`;

  document.getElementById("temperature").textContent =
    `${Math.round(current.temperature_2m)}°`;

  document.getElementById("feelsLike").textContent =
    `Feels like ${Math.round(current.apparent_temperature)}°`;

  document.getElementById("humidity").textContent =
    `${current.relative_humidity_2m}%`;

  document.getElementById("windSpeed").textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;

  document.getElementById("minMax").textContent =
    `${Math.round(daily.temperature_2m_min[0])}° / ${Math.round(daily.temperature_2m_max[0])}°`;

  document.getElementById("sunrise").textContent =
    formatTime(daily.sunrise[0]);

  document.getElementById("sunset").textContent =
    formatTime(daily.sunset[0]);

  document.getElementById("uvIndex").textContent =
    daily.uv_index_max[0] ?? "--";

  document.getElementById("rainChance").textContent =
    `${daily.precipitation_probability_max[0] ?? 0}%`;
}

function displayForecast(daily) {
  const forecastList = document.getElementById("forecastList");

  forecastList.innerHTML = "";

  daily.time.forEach((date, index) => {
    const weather = getWeatherInfo(daily.weather_code[index]);

    const dayCard = document.createElement("div");
    dayCard.className = "forecast-day";

    const dayName = document.createElement("p");
    dayName.className = "day-name";
    dayName.textContent = formatDay(date, index);

    const dayIcon = document.createElement("p");
    dayIcon.className = "day-icon";
    dayIcon.textContent = weather.icon;

    const dayTemp = document.createElement("p");
    dayTemp.className = "day-temp";
    dayTemp.textContent =
      `${Math.round(daily.temperature_2m_max[index])}°`;

    const dayLow = document.createElement("p");
    dayLow.className = "day-low";
    dayLow.textContent =
      `Low ${Math.round(daily.temperature_2m_min[index])}°`;

    const rain = document.createElement("p");
    rain.className = "rain";
    rain.textContent =
      `Rain ${daily.precipitation_probability_max[index] ?? 0}%`;

    dayCard.append(dayName, dayIcon, dayTemp, dayLow, rain);
    forecastList.appendChild(dayCard);
  });
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchCity(cityInput.value);
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showStatus("Your browser does not support location access.", true);
    return;
  }

  showStatus("Getting your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      await loadWeather(
        latitude,
        longitude,
        "Your Location"
      );
    },
    (error) => {
      let message = "Unable to access your location.";

      if (error.code === error.PERMISSION_DENIED) {
        message = "Location permission denied. Please allow access or search for a city.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        message = "Your location is currently unavailable.";
      } else if (error.code === error.TIMEOUT) {
        message = "Location request timed out. Please try again.";
      }

      showStatus(message, true);
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    }
  );
});

// Load Solapur weather when the dashboard opens.
searchCity("Solapur");