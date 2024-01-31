
export const convertTimeStringToDecimal = (timeString) => {
  const lookup = {
    '12:00PM ET': 0,
    '12:15PM ET': 0.25,
    '12:30PM ET': 0.5,
    '12:45PM ET': 0.75,
    '01:00PM ET': 1,
    '01:15PM ET': 1.25,
    '01:30PM ET': 1.5,
    '01:45PM ET': 1.75,
    '02:00PM ET': 2,
    '02:15PM ET': 2.25,
    '02:30PM ET': 2.5,
    '02:45PM ET': 2.75,
    '03:00PM ET': 3,
    '03:15PM ET': 3.25,
    '03:30PM ET': 3.5,
    '03:45PM ET': 3.75,
    '04:00PM ET': 4,
    '04:15PM ET': 4.25,
    '04:30PM ET': 4.5,
    '04:45PM ET': 4.75,
    '05:00PM ET': 5,
    '05:15PM ET': 5.25,
    '05:30PM ET': 5.5,
    '05:45PM ET': 5.75,
    '06:00PM ET': 6,
    '06:15PM ET': 6.25,
    '06:30PM ET': 6.5,
    '06:45PM ET': 6.75,
    '07:00PM ET': 7,
    '07:15PM ET': 7.25,
    '07:30PM ET': 7.5,
    '07:45PM ET': 7.75,
    '08:00PM ET': 8,
    '08:15PM ET': 8.25,
    '08:30PM ET': 8.5,
    '08:45PM ET': 8.75,
    '09:00PM ET': 9,
    '09:15PM ET': 9.25,
    '09:30PM ET': 9.5,
    '09:45PM ET': 9.75,
    '10:00PM ET': 10,
    '10:15PM ET': 10.25,
    '10:30PM ET': 10.5,
    '10:45PM ET': 10.75,
    '11:00PM ET': 11,
    '11:15PM ET': 11.25,
    '11:30PM ET': 11.5,
    '11:45PM ET': 11.75,
  }

  return lookup[timeString]
}

export const getTodaysDate = () => {
  const today = new Date();
  const localOffset = today.getTimezoneOffset() * 60000;
  const targetTime = new Date(today.getTime() - localOffset);
  const formattedDate = targetTime.toISOString();

  return formattedDate.split('T')[0]
}

export const getCurrentTimeDecimal = () => {
  var now = new Date();
  var current_time = (now.getHours() - 12) + (now.getMinutes() / 60);
  current_time = Math.round(current_time * 100) / 100; // rounding to 2 decimal places
  return current_time;
}

export const isPlayerLocked = (startTime) => {
  const currentTime = getCurrentTimeDecimal()
  const decimalStartTime = convertTimeStringToDecimal(startTime)
  return decimalStartTime < currentTime
}