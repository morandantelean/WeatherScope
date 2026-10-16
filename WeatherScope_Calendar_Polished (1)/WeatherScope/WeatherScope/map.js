"use strict";

const searchForm = document.getElementById("map-search-form");
const cityInput = document.getElementById("map-city-input");
const searchButton = document.getElementById("map-search-button");
const dateInput = document.getElementById("map-date");
const statusBox = document.getElementById("map-status");

const locationName = document.getElementById("map-location-name");
const coordinatesText = document.getElementById("map-location-coordinates");
const weatherIcon = document.getElementById("map-weather-icon");
const temperatureText = document.getElementById("map-temperature");
const conditionText = document.getElementById("map-condition");
const feelsLikeText = document.getElementById("map-feels-like");
const humidityText = document.getElementById("map-humidity");
const windText = document.getElementById("map-wind");
const rainText = document.getElementById("map-rain");

const forecastContainer = document.getElementById("map-daily-forecast");
const forecastDateLabel = document.getElementById("map-forecast-date-label");

const weatherCodes = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Heavy freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Moderate showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Severe thunderstorm", "⛈️"]
};

let weatherMap;
let selectedMarker;
let selectedCoordinates = null;
let latestWeather = null;
let requestNumber = 0;

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function weatherDescription(code) {
  return weatherCodes[code] || ["Unknown conditions", "🌡️"];
}

function showStatus(message, type = "") {
  statusBox.textContent = message;
  statusBox.className = `map-status ${type}`.trim();
}

function setSearching(isSearching) {
  searchButton.disabled = isSearching;
  searchButton.textContent = isSearching ? "Searching…" : "Search";
}

function formatDate(dateString, options = {
  weekday: "short",
  month: "short",
  day: "numeric"
}) {
  return new Intl.DateTimeFormat(
    undefined,
    options
  ).format(new Date(`${dateString}T12:00:00`));
}

function formatTemperature(value) {
  return Number.isFinite(value) ? `${Math.round(value)}°C` : "--°";
}

async function getJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status}).`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.reason || "The weather service returned an error.");
  }

  return data;
}

// Search city names with the Open-Meteo Geocoding API.
async function geocodeCity(query) {
  const url = new URL(
    "https://geocoding-api.open-meteo.com/v1/search"
  );

  url.search = new URLSearchParams({
    name: query,
    count: "10",
    language: "en",
    format: "json"
  });

  const data = await getJson(url);

  if (!data.results || !data.results.length) {
    throw new Error(`No location found for "${query}". Try another city.`);
  }

  // Prefer a Philippines result for common ambiguous city names.
  return data.results.find(place => place.country_code === "PH")
    || data.results[0];
}

// Fetch current conditions and daily forecasts for map coordinates.
async function getWeather(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m"
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max"
    ].join(","),
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "auto",
    forecast_days: "16"
  });

  return getJson(url);
}

function createTemperatureIcon(icon, temperature) {
  return L.divIcon({
    className: "",
    html: `<div class="weather-temperature-marker">
      <span>${icon}</span>${temperature}
    </div>`,
    iconSize: [100, 38],
    iconAnchor: [50, 19]
  });
}

function updateMarker(latitude, longitude, icon, temperature) {
  const position = [latitude, longitude];
  const markerIcon = createTemperatureIcon(icon, temperature);

  if (selectedMarker) {
    selectedMarker.setLatLng(position);
    selectedMarker.setIcon(markerIcon);
  } else {
    selectedMarker = L.marker(position, {
      icon: markerIcon,
      keyboard: true,
      title: "Selected weather location"
    }).addTo(weatherMap);
  }

  selectedMarker.bindPopup(
    `<strong>${icon} ${temperature}</strong><br>Selected forecast location`
  );
}

function renderDailyForecast(daily) {
  forecastContainer.replaceChildren();

  if (!daily || !daily.time) {
    forecastContainer.textContent = "Forecast data is unavailable.";
    return;
  }

  // Show five days starting from the selected date when possible.
  const selectedDate = dateInput.value || localDateKey();
  let startIndex = daily.time.indexOf(selectedDate);

  if (startIndex < 0) {
    startIndex = daily.time.findIndex(date => date >= selectedDate);
  }

  if (startIndex < 0) {
    const message = document.createElement("p");
    message.textContent = "No forecast is available for this date.";
    forecastContainer.append(message);
    return;
  }

  const endIndex = Math.min(startIndex + 5, daily.time.length);

  for (let index = startIndex; index < endIndex; index++) {
    const date = daily.time[index];
    const [label, icon] = weatherDescription(daily.weather_code[index]);

    const card = document.createElement("article");
    card.className = "map-forecast-day";

    const dayName = document.createElement("div");
    dayName.className = "day-name";
    dayName.textContent = formatDate(date);

    const dayIcon = document.createElement("div");
    dayIcon.className = "day-icon";
    dayIcon.textContent = icon;

    const dayCondition = document.createElement("div");
    dayCondition.className = "day-condition";
    dayCondition.textContent = label;

    const high = document.createElement("strong");
    high.className = "day-high";
    high.textContent = formatTemperature(
      daily.temperature_2m_max[index]
    );

    const low = document.createElement("span");
    low.className = "day-low";
    low.textContent = formatTemperature(
      daily.temperature_2m_min[index]
    );

    const temperatures = document.createElement("div");
    temperatures.append(high, low);

    const rain = document.createElement("div");
    rain.className = "day-rain";

    const probability = daily.precipitation_probability_max?.[index];

    rain.textContent = probability == null
      ? "Rain: unavailable"
      : `💧 ${probability}% rain`;

    card.append(dayName, dayIcon, dayCondition, temperatures, rain);
    forecastContainer.append(card);
  }
}

function renderSelectedDate(daily) {
  const index = daily.time.indexOf(dateInput.value);

  if (index < 0) {
    forecastDateLabel.textContent = "Date outside forecast range";
    return;
  }

  forecastDateLabel.textContent = formatDate(dateInput.value, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const [label, icon] = weatherDescription(daily.weather_code[index]);

  // Display the selected day's conditions in the main card.
  weatherIcon.textContent = icon;
  conditionText.textContent = `${label} · Daily forecast`;

  temperatureText.textContent = formatTemperature(
    daily.temperature_2m_max[index]
  );

  feelsLikeText.textContent = "—";
  rainText.textContent =
    daily.precipitation_probability_max?.[index] == null
      ? "--%"
      : `${daily.precipitation_probability_max[index]}%`;

  renderDailyForecast(daily);
}

function renderCurrentWeather(data, placeName, latitude, longitude) {
  const current = data.current;

  if (!current || !data.daily) {
    throw new Error("The weather response is incomplete.");
  }

  const [label, icon] = weatherDescription(current.weather_code);

  locationName.textContent = placeName;
  coordinatesText.textContent =
    `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`;

  weatherIcon.textContent = icon;
  temperatureText.textContent = formatTemperature(current.temperature_2m);
  conditionText.textContent = label;
  feelsLikeText.textContent = formatTemperature(current.apparent_temperature);

  humidityText.textContent =
    current.relative_humidity_2m == null
      ? "--%"
      : `${current.relative_humidity_2m}%`;

  windText.textContent =
    current.wind_speed_10m == null
      ? "-- km/h"
      : `${Math.round(current.wind_speed_10m)} km/h`;

  rainText.textContent =
    data.daily.precipitation_probability_max?.[0] == null
      ? "--%"
      : `${data.daily.precipitation_probability_max[0]}%`;

  latestWeather = data;

  renderSelectedDate(data.daily);
}

async function loadCoordinates(latitude, longitude, placeName, zoom = 7) {
  const thisRequest = ++requestNumber;

  selectedCoordinates = { latitude, longitude, placeName };

  showStatus(`Loading weather for ${placeName}…`);

  try {
    const data = await getWeather(latitude, longitude);

    // Ignore older requests if the user selected another location.
    if (thisRequest !== requestNumber) return;

    if (!dateInput.value) {
      dateInput.value = localDateKey();
    }

    renderCurrentWeather(data, placeName, latitude, longitude);
    updateMarker(
      latitude,
      longitude,
      weatherDescription(data.current.weather_code)[1],
      formatTemperature(data.current.temperature_2m)
    );

    weatherMap.setView([latitude, longitude], zoom);

    showStatus(`Weather loaded for ${placeName}.`, "success");
  } catch (error) {
    if (thisRequest !== requestNumber) return;

    console.error("Weather map error:", error);
    showStatus(
      error instanceof TypeError
        ? "Network error. Check your internet connection and try again."
        : error.message,
      "error"
    );
  }
}

async function searchLocation(query) {
  if (query.trim().length < 2) {
    showStatus("Enter at least two characters for a city.", "error");
    return;
  }

  setSearching(true);

  try {
    const place = await geocodeCity(query.trim());

    cityInput.value = place.name;

    const fullName = [
      place.name,
      place.admin1,
      place.country
    ].filter(Boolean).join(", ");

    await loadCoordinates(
      place.latitude,
      place.longitude,
      fullName,
      9
    );
  } catch (error) {
    console.error("Location search error:", error);
    showStatus(error.message || "Could not find that location.", "error");
  } finally {
    setSearching(false);
  }
}

function initializeMap() {
  if (typeof L === "undefined") {
    showStatus(
      "The map library did not load. Check your internet connection and refresh.",
      "error"
    );
    return;
  }

  weatherMap = L.map("weather-map", {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([12.8797, 121.7740], 5);

  // Add the street map immediately.
  const streetLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  ).addTo(weatherMap);

  // Add the layer switcher and load the radar.
  addRainRadarLayer(streetLayer);

  
  // Add a button to find the user's current location.
  const locateControl = L.control({ position: "topleft" });

  locateControl.onAdd = function () {
    const button = L.DomUtil.create("button", "map-locate-button");

    button.type = "button";
    button.title = "Go to my current location";
    button.setAttribute("aria-label", "Go to my current location");
    button.textContent = "◎ My Location";

    L.DomEvent.disableClickPropagation(button);

    L.DomEvent.on(button, "click", function () {
      if (!navigator.geolocation) {
        showStatus("Geolocation is not supported by this browser.", "error");
        return;
      }

      showStatus("Finding your location…");

      navigator.geolocation.getCurrentPosition(
        function (position) {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          loadCoordinates(
            latitude,
            longitude,
            "My Location",
            10
          );
        },
        function (error) {
          const message = error.code === 1
            ? "Location permission was denied. Allow location access to use this feature."
            : error.code === 2
              ? "Your location could not be determined."
              : "Location request timed out. Please try again.";

          showStatus(message, "error");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });

    return button;
  };

  locateControl.addTo(weatherMap);


  weatherMap.on("click", event => {
    const latitude = event.latlng.lat;
    const longitude = event.latlng.lng;

    loadCoordinates(
      latitude,
      longitude,
      `Map location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
      weatherMap.getZoom()
    );
  });

  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchLocation(cityInput.value);
  });

  dateInput.addEventListener("change", () => {
    if (!latestWeather) return;

    renderSelectedDate(latestWeather.daily);
  });

  dateInput.value = localDateKey();

  // Load a default location when the page opens.
  searchLocation("Surigao City");
}

async function addRainRadarLayer(streetLayer) {
  // Create the layer switcher immediately.
  const radarLayer = L.layerGroup();

  L.control.layers(
    {
      "Street Map": streetLayer
    },
    {
      "🌧️ Rain Radar": radarLayer
    },
    {
      collapsed: false
    }
  ).addTo(weatherMap);

  
  // Add a dedicated Rain Radar toggle button.
  const radarControl = L.control({ position: "topleft" });

  radarControl.onAdd = function () {
    const button = L.DomUtil.create(
      "button",
      "radar-toggle-button"
    );

    button.type = "button";
    button.textContent = "🌧️ Radar: Off";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Turn rain radar on");

    L.DomEvent.disableClickPropagation(button);
    L.DomEvent.on(button, "click", function () {
      const radarIsOn = weatherMap.hasLayer(radarLayer);

      if (radarIsOn) {
        weatherMap.removeLayer(radarLayer);
        button.textContent = "🌧️ Radar: Off";
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", "Turn rain radar on");
        button.classList.remove("radar-is-on");
      } else {
        weatherMap.addLayer(radarLayer);
        button.textContent = "🌧️ Radar: On";
        button.setAttribute("aria-pressed", "true");
        button.setAttribute("aria-label", "Turn rain radar off");
        button.classList.add("radar-is-on");
      }
    });

    return button;
  };

  radarControl.addTo(weatherMap);


  try {
    const response = await fetch(
      "https://api.rainviewer.com/public/weather-maps.json"
    );

    if (!response.ok) {
      throw new Error("Unable to load radar data.");
    }

    const data = await response.json();
    const frames = data.radar?.past;

    if (!data.host || !frames || frames.length === 0) {
      throw new Error("No radar frames are available.");
    }

    const latestFrame = frames[frames.length - 1];

    
    const radarTimestamp = document.getElementById("radar-timestamp");

    if (radarTimestamp) {
      radarTimestamp.textContent =
        `Radar frame: ${new Date(latestFrame.time * 1000).toLocaleString()}`;
    }


    const radarTiles = L.tileLayer(
      `${data.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
      {
        attribution:
          'Radar © <a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a>',
        opacity: 0.65,
        maxNativeZoom: 7,
        maxZoom: 19,
        tileSize: 256
      }
    );

    radarTiles.addTo(radarLayer);

    console.log("Rain radar layer is ready.");
  } catch (error) {
    console.error("Rain radar error:", error);
    showStatus(
      "The street map is available, but the rain radar could not load.",
      "error"
    );
  }
}

document.addEventListener("DOMContentLoaded", initializeMap);

/* Dark and light mode toggle */
const themeToggle = document.getElementById("theme-toggle");
const themeStorageKey = "weatherscope-theme";

function applyMapTheme(theme) {
  document.body.classList.toggle("dark-mode", theme === "dark");

  if (!themeToggle) return;

  const icon = themeToggle.querySelector(".theme-icon");
  const label = themeToggle.querySelector(".theme-label");

  if (icon) {
    icon.textContent = theme === "dark" ? "🌙" : "☀️";
  }

  if (label) {
    label.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }
  const brandIcon = document.querySelector(".map-brand-icon");

if (brandIcon) {
  brandIcon.textContent = theme === "dark" ? "🌙" : "☀️";
}

  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
}

let savedMapTheme = "light";

try {
  savedMapTheme = localStorage.getItem(themeStorageKey) === "dark"
    ? "dark"
    : "light";
} catch (error) {
  // Use light mode if storage is unavailable.
}

applyMapTheme(savedMapTheme);

themeToggle?.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark-mode")
    ? "light"
    : "dark";

  try {
    localStorage.setItem(themeStorageKey, nextTheme);
  } catch (error) {
    // The current page can still switch themes.
  }

  applyMapTheme(nextTheme);
});

