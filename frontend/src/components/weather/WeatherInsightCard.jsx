function formatTemperature(
  value,
) {
  if (
    value === null
    || value === undefined
  ) {
    return "—";
  }

  return `${Math.round(
    Number(value),
  )}°C`;
}


function formatNumber(
  value,
) {
  return Math.round(
    Number(value || 0),
  );
}


function formatForecastDate(
  value,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    },
  ).format(
    new Date(
      `${value}T00:00:00`,
    ),
  );
}


function WeatherInsightCard({
  weather,
  advisories = [],
}) {
  if (!weather) {
    return null;
  }

  if (!weather.available) {
    return (
      <div className="weather-card unavailable">
        <div className="weather-card-icon">
          ?
        </div>

        <div>
          <span className="weather-eyebrow">
            Live weather tool
          </span>

          <strong>
            Forecast unavailable
          </strong>

          <p>
            {weather.message
              || (
                "Weather data "
                + "could not be retrieved."
              )}
          </p>
        </div>
      </div>
    );
  }

  const departure =
    weather.departure_day || {};

  const riskLevel =
    weather.risk_level || "low";

  const maximumTripRain =
    formatNumber(
      weather
        .maximum_precipitation_probability_percent,
    );

  const maximumTripWind =
    formatNumber(
      weather
        .maximum_wind_speed_kmh,
    );

  const forecastDays =
    weather.forecast_days
      ?.slice(0, 3)
    || [];

  return (
    <section
      className={
        `weather-card risk-${riskLevel}`
      }
    >
      <div className="weather-card-header">
        <div>
          <span className="weather-eyebrow">
            Live destination weather
          </span>

          <h4>
            {departure.condition
              || "Forecast available"}
          </h4>

          <p>
            {weather.location?.name}

            {weather.location?.country
              ? (
                  `, ${weather.location.country}`
                )
              : ""}

            {" · Departure forecast · "}

            {formatForecastDate(
              departure.date,
            )}
          </p>
        </div>

        <span
          className={
            `weather-risk-badge ${riskLevel}`
          }
        >
          Trip {riskLevel} risk
        </span>
      </div>

      <div className="weather-metrics">
        <div>
          <span>
            Departure high
          </span>

          <strong>
            {formatTemperature(
              departure
                .temperature_max_c,
            )}
          </strong>
        </div>

        <div>
          <span>
            Departure low
          </span>

          <strong>
            {formatTemperature(
              departure
                .temperature_min_c,
            )}
          </strong>
        </div>

        <div>
          <span>
            Departure rain
          </span>

          <strong>
            {formatNumber(
              departure
                .precipitation_probability_percent,
            )}
            %
          </strong>
        </div>

        <div>
          <span>
            Departure wind
          </span>

          <strong>
            {formatNumber(
              departure
                .wind_speed_max_kmh,
            )}{" "}
            km/h
          </strong>
        </div>
      </div>

      <div className="weather-trip-peak">
        <span>
          Peak forecast across trip
        </span>

        <strong>
          {maximumTripRain}% rain
          {" · "}
          {maximumTripWind} km/h wind
        </strong>
      </div>

      {forecastDays.length > 0
        && (
          <div className="weather-forecast-strip">
            {forecastDays.map(
              (day) => (
                <div
                  className="weather-forecast-day"
                  key={day.date}
                >
                  <span>
                    {formatForecastDate(
                      day.date,
                    )}
                  </span>

                  <strong>
                    {day.condition}
                  </strong>

                  <small>
                    {formatTemperature(
                      day.temperature_max_c,
                    )}
                    {" / "}
                    {formatTemperature(
                      day.temperature_min_c,
                    )}
                    {" · "}
                    {formatNumber(
                      day
                        .precipitation_probability_percent,
                    )}
                    % rain
                  </small>
                </div>
              ),
            )}
          </div>
        )}

      {advisories.length > 0 && (
        <div className="weather-advisories">
          {advisories.map(
            (
              advisory,
              index,
            ) => (
              <p
                key={
                  `${advisory}-${index}`
                }
              >
                <span>•</span>
                {advisory}
              </p>
            ),
          )}
        </div>
      )}

      <div className="weather-source">
        Live data source:{" "}
        {weather.source}
      </div>
    </section>
  );
}


export default WeatherInsightCard;