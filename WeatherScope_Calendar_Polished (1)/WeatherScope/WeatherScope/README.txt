WEATHERSCOPE
Weather Tracking and Forecast Application
==========================================

1. GROUP NAME AND MEMBERS
-------------------------
Project Name: WeatherScope

Group Members:

1. Lean Morandante
   Role: HTML & Structure
   Responsibility: Builds the semantic page structure, portfolio content,
   and accessible interface elements.

2. Christen Dadios
   Role: CSS & Design
   Responsibility: Creates the visual design, responsive layouts, and
   weather-inspired styling.

3. Hazel Negros
   Role: JavaScript & API
   Responsibility: Connects the application to Open-Meteo, handles API
   responses, and displays weather information.


2. PROJECT DESCRIPTION
----------------------
WeatherScope is a weather-tracking website that allows users to search
for cities and view current weather conditions and daily forecasts.

The website aims to make weather information easy to access and understand
through a simple, colorful, and user-friendly interface.


3. PROJECT FILES
----------------
index.html
    The group portfolio homepage introducing the project and its members.

app.html
    The main weather application displaying weather information and forecasts.

styles.css
    Contains the website's styling, layout, colors, and responsive design.

script.js
    Handles weather searches, API requests, and displaying weather data.

map.html
    The interactive weather map page.

map.css
    Contains the styling for the weather map page.

map.js
    Handles map functionality and the weather radar layer.

README.txt
    Provides project information and instructions for running the application.


4. API USED AND DOCUMENTATION
-----------------------------
API Name: Open-Meteo API

Purpose:
Open-Meteo provides weather forecast data for the application. Its geocoding
service is used to search for locations, while its forecast service provides
weather information for the selected location.

Official Website:
https://open-meteo.com/

Geocoding API Documentation:
https://open-meteo.com/en/docs/geocoding-api

Weather Forecast API Documentation:
https://open-meteo.com/en/docs/forecast-api

Additional Services:

Leaflet - JavaScript library used for the interactive map.
Documentation: https://leafletjs.com/reference.html

RainViewer - Weather radar service used by the map, depending on the
project's current configuration.
Website: https://www.rainviewer.com/

PAGASA - Official Philippine weather information website linked from
the application.
Website: https://www.pagasa.dost.gov.ph/


5. MAIN FEATURES
----------------
- Search for cities and locations.
- Display current weather conditions.
- Show temperature, feels-like temperature, humidity, and wind speed.
- Switch between Celsius and Fahrenheit.
- View daily weather forecasts in the forecast section.
- Display weather information on an interactive map.
- View a weather radar layer, depending on service availability.
- Switch between light and dark themes.
- Navigate between the portfolio, weather application, and map pages.
- Access official PAGASA resources through external links.


6. HOW TO RUN THE APPLICATION
-----------------------------
Requirements:
- A modern web browser.
- Visual Studio Code (recommended).
- Live Server extension for Visual Studio Code.
- An internet connection to access external weather and map services.

Instructions:

1. Download or clone the WeatherScope project from GitHub.
2. Extract the project folder if it was downloaded as a ZIP file.
3. Open the project folder in Visual Studio Code.
4. Make sure the HTML, CSS, JavaScript, and required asset files are present.
5. Install the Live Server extension if it is not already installed.
6. Right-click index.html in Visual Studio Code.
7. Select "Open with Live Server."
8. Use the navigation links or buttons to open the main weather application
   and the interactive weather map.

No separate backend server is required for the basic application, provided
the external services are accessible from the browser.


7. IMPORTANT NOTES
------------------
- An internet connection is required for API requests and external map resources.
- Weather data depends on the availability of Open-Meteo.
- Map tiles and radar data depend on their respective services.
- Keep required photos, icons, and other assets in their expected locations.
- PAGASA links open official external resources; the application does not
  claim direct live integration with a PAGASA API.


END OF README.txt