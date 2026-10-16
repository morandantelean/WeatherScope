

const searchForm = document.querySelector("#weather-search");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status-message");
const currentWeather = document.querySelector("#current-weather");
const forecastSection = document.querySelector("#forecast-section");
const temperatureChart = document.querySelector("#temperature-chart");
const weatherAlerts = document.querySelector("#weather-alerts");
const forecastGrid = document.querySelector("#forecast-grid");
const unitSelect = document.querySelector("#unit-select");
const calendarMonthLabel = document.querySelector("#calendar-month");
const previousMonthButton = document.querySelector("#month-prev");
const nextMonthButton = document.querySelector("#month-next");
const todayMonthButton = document.querySelector("#month-today");
const selectedDateTitle = document.querySelector("#selected-date-title");
const selectedDateDescription = document.querySelector("#selected-date-description");
const selectedDateIcon = document.querySelector("#selected-date-icon");
const selectedDateTemperatures = document.querySelector("#selected-date-temperatures");
let selectedDateKey = getLocalDateKey(new Date());
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

let selectedLocation = null;
let latestWeather = null;

const weatherDescriptions = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Freezing drizzle", icon: "🌧️" },
  57: { label: "Heavy freezing drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌦️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Moderate snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "🌨️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Moderate showers", icon: "🌧️" },
  82: { label: "Heavy showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with hail", icon: "⛈️" },
  99: { label: "Severe thunderstorm with hail", icon: "⛈️" }
};

function getLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function describeWeather(code) {
  return weatherDescriptions[code] || { label: "Conditions unavailable", icon: "🌡️" };
}


function showStatus(message, type = "") {
  const statusText = document.getElementById("status-text");

  if (statusText) {
    statusText.textContent = message;
  } else {
    statusMessage.textContent = message;
  }

  statusMessage.className = `status-message ${type}`.trim();
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  cityInput.disabled = isLoading;

  searchButton.innerHTML = isLoading
    ? 'Searching <span aria-hidden="true">…</span>'
    : 'Search <span aria-hidden="true">→</span>';

  const spinner = document.getElementById("loading-spinner");

  if (spinner) {
    spinner.hidden = !isLoading;
  }

  statusMessage.setAttribute("aria-busy", String(isLoading));
}

function formatTemperature(value, unit = unitSelect.value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--°";
  const converted = unit === "fahrenheit" ? (value * 9 / 5) + 32 : value;
  return `${Math.round(converted)}°${unit === "fahrenheit" ? "F" : "C"}`;
}

function formatWind(speedKmh) {
  if (typeof speedKmh !== "number" || !Number.isFinite(speedKmh)) return "--";
  return unitSelect.value === "fahrenheit"
    ? `${(speedKmh / 1.60934).toFixed(1)} mph`
    : `${Math.round(speedKmh)} km/h`;
}

function formatDate(dateString, options = { weekday: "long", month: "long", day: "numeric" }) {
  // Append a time to avoid parsing a date-only value as a UTC date.
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function convertTemperatureValue(value) {
  return unitSelect.value === "fahrenheit"
    ? (value * 9 / 5) + 32
    : value;
}

function renderTemperatureChart(daily) {
  temperatureChart.replaceChildren();

  const count = Math.min(7, daily.time.length);
  const days = [];

  for (let i = 0; i < count; i++) {
    const high = daily.temperature_2m_max[i];
    const low = daily.temperature_2m_min[i];

    if (Number.isFinite(high) && Number.isFinite(low)) {
      days.push({
        date: daily.time[i],
        high: convertTemperatureValue(high),
        low: convertTemperatureValue(low)
      });
    }
  }

  if (days.length < 2) {
    const message = document.createElement("p");
    message.className = "insight-empty";
    message.textContent = "Temperature chart data is unavailable.";
    temperatureChart.append(message);
    return;
  }

  const width = 700;
  const height = 280;
  const left = 48;
  const right = 18;
  const top = 20;
  const bottom = 45;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const allTemperatures = days.flatMap(day => [day.high, day.low]);
  const minimum = Math.floor(Math.min(...allTemperatures) / 5) * 5 - 5;
  const maximum = Math.ceil(Math.max(...allTemperatures) / 5) * 5 + 5;
  const range = Math.max(maximum - minimum, 10);

  const x = index => left + (index / (days.length - 1)) * plotWidth;
  const y = value => top + ((maximum - value) / range) * plotHeight;
  const unit = unitSelect.value === "fahrenheit" ? "°F" : "°C";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `Seven-day high and low temperatures in ${unit}`);

  // Draw horizontal grid lines and temperature labels.
  for (let step = 0; step <= 4; step++) {
    const value = maximum - (range * step / 4);
    const gridY = y(value);

    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", left);
    line.setAttribute("x2", width - right);
    line.setAttribute("y1", gridY);
    line.setAttribute("y2", gridY);
    line.setAttribute("class", "chart-grid-line");
    svg.append(line);

    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", left - 9);
    label.setAttribute("y", gridY + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart-axis-label");
    label.textContent = `${Math.round(value)}°`;
    svg.append(label);
  }

  // Draw the high and low temperature lines.
  const highPoints = days.map((day, index) => `${x(index)},${y(day.high)}`).join(" ");
  const lowPoints = days.map((day, index) => `${x(index)},${y(day.low)}`).join(" ");

  for (const [points, className] of [
    [highPoints, "chart-high-path"],
    [lowPoints, "chart-low-path"]
  ]) {
    const line = document.createElementNS(svg.namespaceURI, "polyline");
    line.setAttribute("points", points);
    line.setAttribute("class", className);
    svg.append(line);
  }

  // Add points and weekday labels.
  days.forEach((day, index) => {
    for (const [value, className] of [
      [day.high, "chart-high-point"],
      [day.low, "chart-low-point"]
    ]) {
      const circle = document.createElementNS(svg.namespaceURI, "circle");
      circle.setAttribute("cx", x(index));
      circle.setAttribute("cy", y(value));
      circle.setAttribute("r", "4.5");
      circle.setAttribute("class", className);

      const title = document.createElementNS(svg.namespaceURI, "title");
      title.textContent = `${formatDate(day.date, {
        weekday: "long",
        month: "short",
        day: "numeric"
      })}: ${Math.round(value)}${unit}`;
      circle.append(title);
      svg.append(circle);
    }

    const dayLabel = document.createElementNS(svg.namespaceURI, "text");
    dayLabel.setAttribute("x", x(index));
    dayLabel.setAttribute("y", height - 13);
    dayLabel.setAttribute("text-anchor", "middle");
    dayLabel.setAttribute("class", "chart-axis-label");
    dayLabel.textContent = formatDate(day.date, { weekday: "short" });
    svg.append(dayLabel);
  });

  temperatureChart.append(svg);
}


function renderWeatherAlerts() {
  weatherAlerts.replaceChildren();

  const sources = [
    {
      title: "PAGASA Active Warnings",
      description:
        "Visit PAGASA's official website to check its current active warnings and weather information.",
      url: "https://pagasa.dost.gov.ph/",
      label: "View official warnings ↗"
    },
    {
      title: "Tropical Cyclone Bulletins",
      description:
        "Read official bulletins for tropical cyclones, affected areas, wind signals, and safety guidance.",
      url: "https://pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin",
      label: "Read cyclone bulletins ↗"
    }
  ];

  sources.forEach(source => {
    const notice = document.createElement("article");
    notice.className = "weather-notice";

    const heading = document.createElement("h3");
    heading.textContent = source.title;

    const description = document.createElement("p");
    description.textContent = source.description;

    const link = document.createElement("a");
    link.className = "official-alert-link";
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = source.label;

    notice.append(heading, description, link);
    weatherAlerts.append(notice);
  });
}


async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}). Please try again.`);
  }
  const data = await response.json();
  if (data && data.error) {
    throw new Error(data.reason || "The weather service returned an error.");
  }
  return data;
}

async function findLocation(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query,
    count: "5",
    language: "en",
    format: "json"
  }).toString();

  const data = await fetchJson(url);
  if (!data.results || data.results.length === 0) {
    throw new Error(`We couldn't find "${query}". Check the spelling or try a nearby city.`);
  }

  // Prefer a result in the Philippines if the query itself is ambiguous and a PH result exists.
  const philippinesResult = data.results.find(place => place.country_code === "PH");
  return philippinesResult || data.results[0];
}

async function fetchWeather(place) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    // Keep API values in Celsius and km/h; the UI converts them when needed.
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "auto",
    forecast_days: "16"
  }).toString();

  return fetchJson(url);
}


function updateWeatherAnimation(data) {
  const panel = document.querySelector("#current-weather");

  if (!panel || !data.current) return;

  // Remove the previous weather animation.
  panel.classList.remove(
    "weather-sunny",
    "weather-cloudy",
    "weather-rainy",
    "weather-stormy",
    "weather-snowy",
    "weather-night"
  );

  const code = data.current.weather_code;
  const isDay = data.current.is_day === 1;

  let animationClass = "weather-cloudy";

  if (code === 0) {
    animationClass = "weather-sunny";
  } else if ([1, 2, 3, 45, 48].includes(code)) {
    animationClass = "weather-cloudy";
  } else if (code >= 95) {
    animationClass = "weather-stormy";
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    animationClass = "weather-snowy";
  } else if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  ) {
    animationClass = "weather-rainy";
  }

  panel.classList.add(animationClass);

  if (!isDay) {
    panel.classList.add("weather-night");
  }
}

function renderWeather(place, data) {
  if (!data.current || !data.daily) {
    throw new Error("The weather service returned incomplete data. Please try again.");
  }

  selectedLocation = place;
  updateWeatherAnimation(data);
  latestWeather = data;
  calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedDateKey = getLocalDateKey(new Date());
  const current = data.current;
  const description = describeWeather(current.weather_code);
  const locationParts = [place.admin1, place.country].filter(Boolean);

  document.querySelector("#location-name").textContent = place.name;
  document.querySelector("#location-details").textContent = locationParts.join(", ") || "Location found";
  document.querySelector("#current-date").textContent = `Updated for ${formatDate(current.time.slice(0, 10))}`;
  document.querySelector("#current-icon").textContent = description.icon;
  document.querySelector("#current-temperature").textContent = formatTemperature(current.temperature_2m);
  document.querySelector("#current-condition").textContent = description.label;
  document.querySelector("#feels-like").textContent = formatTemperature(current.apparent_temperature);
  document.querySelector("#humidity").textContent = `${current.relative_humidity_2m ?? "--"}%`;
  document.querySelector("#wind-speed").textContent = formatWind(current.wind_speed_10m);
  document.querySelector("#feels-stat").textContent = formatTemperature(current.apparent_temperature);

  renderForecast(data.daily);
renderTemperatureChart(data.daily);
renderWeatherAlerts(data);

currentWeather.hidden = false;
forecastSection.hidden = false;
}

function renderForecast(daily) {
  forecastGrid.replaceChildren();
  const available = new Map(daily.time.map((date, index) => [date, index]));
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  calendarMonthLabel.textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(calendarMonth);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = getLocalDateKey(new Date());

  // Leading blank cells align the first date with its weekday.
  for (let blank = 0; blank < firstWeekday; blank++) {
    const spacer = document.createElement("div");
    spacer.className = "calendar-empty";
    spacer.setAttribute("aria-hidden", "true");
    forecastGrid.append(spacer);
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    const forecastIndex = available.get(date);
    const hasForecast = forecastIndex !== undefined;
    const cell = document.createElement("article");
    const isPastDate = date < todayKey;
    cell.className = `calendar-day${hasForecast ? " has-forecast" : " no-forecast"}${isPastDate && !hasForecast ? " past-date" : ""}${date === todayKey ? " is-today" : ""}${date === selectedDateKey ? " is-selected" : ""}`;
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.setAttribute("aria-pressed", String(date === selectedDateKey));
    cell.setAttribute("aria-label", formatDate(date, { weekday: "long", month: "long", day: "numeric" }));
    cell.addEventListener("click", () => { selectedDateKey = date; renderForecast(daily); });
    cell.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectedDateKey = date; renderForecast(daily); } });

    const number = document.createElement("span");
    number.className = "calendar-date";
    number.textContent = String(dayNumber);
    cell.append(number);

    if (hasForecast) {
      const condition = describeWeather(daily.weather_code[forecastIndex]);
      const icon = document.createElement("div");
      icon.className = "calendar-icon";
      icon.textContent = condition.icon;
      icon.setAttribute("aria-hidden", "true");
      const temps = document.createElement("div");
      temps.className = "calendar-temps";
      const high = document.createElement("strong");
      high.textContent = formatTemperature(daily.temperature_2m_max[forecastIndex]);
      const low = document.createElement("span");
      low.textContent = formatTemperature(daily.temperature_2m_min[forecastIndex]);
      temps.append(high, low);
      const label = document.createElement("div");
      label.className = "calendar-condition";
      label.textContent = condition.label;
      const rainChance = daily.precipitation_probability_max?.[forecastIndex];
      const rain = document.createElement("div");
      rain.className = "calendar-rain";
      rain.textContent = rainChance == null ? "" : `💧 ${rainChance}%`;
      cell.append(icon, temps, label, rain);
      cell.title = `${formatDate(date)}: ${condition.label}, high ${high.textContent}, low ${low.textContent}`;
    } else {
      const unavailable = document.createElement("span");
      unavailable.className = `calendar-unavailable${isPastDate ? " past-date-label" : " forecast-unavailable-label"}`;
      unavailable.textContent = isPastDate ? "Past date" : "Forecast unavailable";
      cell.append(unavailable);
      cell.title = isPastDate
        ? "This date has passed. Historical weather is not included in this forecast view."
        : "This date is outside the forecast range returned by Open-Meteo.";
      cell.setAttribute("aria-label", `${formatDate(date, { weekday: "long", month: "long", day: "numeric" })}. ${unavailable.textContent}.`);
    }
    forecastGrid.append(cell);
  }
  renderSelectedDate(daily);
}

function renderSelectedDate(daily) {
  const date = selectedDateKey;
  const availableIndex = daily.time.indexOf(date);
  const todayKey = getLocalDateKey(new Date());
  selectedDateTitle.textContent = formatDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  selectedDateTemperatures.replaceChildren();

  if (availableIndex >= 0) {
    const condition = describeWeather(daily.weather_code[availableIndex]);
    selectedDateIcon.textContent = condition.icon;
    selectedDateDescription.textContent = `${condition.label} · Forecast provided by Open-Meteo.`;
    const high = document.createElement("strong");
    high.textContent = `High ${formatTemperature(daily.temperature_2m_max[availableIndex])}`;
    const low = document.createElement("span");
    low.textContent = `Low ${formatTemperature(daily.temperature_2m_min[availableIndex])}`;
    selectedDateTemperatures.append(high, low);
    const rain = daily.precipitation_probability_max?.[availableIndex];
    if (rain != null) {
      const rainChance = document.createElement("span");
      rainChance.textContent = `💧 ${rain}% chance of precipitation`;
      selectedDateTemperatures.append(rainChance);
    }
  } else if (date < todayKey) {
    selectedDateIcon.textContent = "🗓️";
    selectedDateDescription.textContent = "This date has passed. Historical weather is not included in this forecast calendar.";
    selectedDateTemperatures.textContent = "Historical data unavailable";
  } else {
    selectedDateIcon.textContent = "🔭";
    selectedDateDescription.textContent = "This date is outside the forecast range currently returned by Open-Meteo.";
    selectedDateTemperatures.textContent = "Forecast unavailable";
  }
}

function changeCalendarMonth(offset) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
  const today = new Date();
  const isCurrentMonth = calendarMonth.getFullYear() === today.getFullYear() && calendarMonth.getMonth() === today.getMonth();
  selectedDateKey = isCurrentMonth ? getLocalDateKey(today) : getLocalDateKey(calendarMonth);
  if (latestWeather?.daily) renderForecast(latestWeather.daily);
}

function returnToCurrentMonth() {
  const today = new Date();
  calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDateKey = getLocalDateKey(today);
  if (latestWeather?.daily) renderForecast(latestWeather.daily);
}

previousMonthButton.addEventListener("click", () => changeCalendarMonth(-1));
nextMonthButton.addEventListener("click", () => changeCalendarMonth(1));
todayMonthButton.addEventListener("click", returnToCurrentMonth);

async function searchWeather(query) {
  const cleanedQuery = query.trim();
  if (cleanedQuery.length < 2) {
    showStatus("Please enter at least two characters for a city name.", "error");
    cityInput.focus();
    return;
  }

  setLoading(true);
  showStatus("Finding the location and loading weather data…");
  try {
    const place = await findLocation(cleanedQuery);
    const weather = await fetchWeather(place);
    renderWeather(place, weather);
    showStatus(`Weather loaded for ${place.name}.`, "success");
  } catch (error) {
    console.error("WeatherScope API error:", error);
    showStatus(error instanceof TypeError
      ? "Could not fetch data. Check your internet connection and try again."
      : (error.message || "Could not fetch data. Please try again."), "error");
  } finally {
    setLoading(false);
  }
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchWeather(cityInput.value);
});

unitSelect.addEventListener("change", async () => {
  if (!selectedLocation) return;
  setLoading(true);
  showStatus("Updating temperature units…");
  try {
    const updatedData = await fetchWeather(selectedLocation);
    renderWeather(selectedLocation, updatedData);
    showStatus(`Units updated for ${selectedLocation.name}.`, "success");
  } catch (error) {
    console.error("Could not update units:", error);
    showStatus("Could not update the units. Please try again.", "error");
  } finally {
    setLoading(false);
  }
});

// Load a default city so the dashboard isn't empty on first visit.
searchWeather("Surigao City");

// Back-to-top button
const backToTopButton = document.querySelector("#back-to-top");

if (backToTopButton) {
  function updateBackToTopButton() {
    backToTopButton.classList.toggle(
      "is-visible",
      window.scrollY > 300
    );
  }

  window.addEventListener("scroll", updateBackToTopButton, {
    passive: true
  });

  backToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  updateBackToTopButton();
}
