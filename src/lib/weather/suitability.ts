import { isFairWeather, describeWeatherCode } from "@/lib/weather/codes";
import type { TemperatureUnit } from "@/lib/preferences/types";

export type Suitability = {
  suitable: boolean;
  withinWorkingHours: boolean;
  reasons: string[];
};

function toCelsius(temperature: number, unit: TemperatureUnit): number {
  if (unit === "fahrenheit") return ((temperature - 32) * 5) / 9;
  return temperature;
}

export function localMinutes(date: Date, timeZone: string): { minutes: number; label: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(read("hour"));
  const minute = Number(read("minute"));
  if (hour === 24) hour = 0;

  return {
    minutes: hour * 60 + minute,
    label: `${read("year")}-${read("month")}-${read("day")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

export function isWithinWorkingHours(nowMinutes: number, start: string, end: string): boolean {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function assessOutdoorMeeting(input: {
  weatherCode: number;
  temperature: number;
  temperatureUnit: TemperatureUnit;
  windSpeedKmh: number;
  timezone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  now?: Date;
}): Suitability & { localTime: string } {
  const local = localMinutes(input.now ?? new Date(), input.timezone);
  const withinWorkingHours = isWithinWorkingHours(local.minutes, input.workingHoursStart, input.workingHoursEnd);
  const celsius = toCelsius(input.temperature, input.temperatureUnit);
  const reasons: string[] = [];

  if (withinWorkingHours) {
    reasons.push(
      `Current local time is inside working hours (${input.workingHoursStart}–${input.workingHoursEnd}).`,
    );
  } else {
    reasons.push(
      `Current local time is outside working hours (${input.workingHoursStart}–${input.workingHoursEnd}).`,
    );
  }

  const fair = isFairWeather(input.weatherCode);
  if (fair) {
    reasons.push(`Conditions are ${describeWeatherCode(input.weatherCode).toLowerCase()}.`);
  } else {
    reasons.push(`Conditions are unsuitable: ${describeWeatherCode(input.weatherCode).toLowerCase()}.`);
  }

  let comfortable = true;
  if (celsius < 10) {
    comfortable = false;
    reasons.push("Temperature is too cold for a typical outdoor meeting.");
  } else if (celsius > 32) {
    comfortable = false;
    reasons.push("Temperature is too hot for a typical outdoor meeting.");
  } else {
    reasons.push("Temperature is comfortable for being outside.");
  }

  const calm = input.windSpeedKmh <= 40;
  reasons.push(calm ? "Wind is light enough for an outdoor meeting." : "Wind is too strong for an outdoor meeting.");

  return {
    suitable: withinWorkingHours && fair && comfortable && calm,
    withinWorkingHours,
    reasons,
    localTime: local.label,
  };
}
