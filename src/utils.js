import { nameMapper, teamNameMapper } from './nameMapper.js'

export const convertTimeStringToDecimal = (timeString) => {
  const lookup = {
    '12:00pm ET': 0,
    '12:15pm ET': 0.25,
    '12:30pm ET': 0.5,
    '12:45pm ET': 0.75,
    '01:00pm ET': 1,
    '01:15pm ET': 1.25,
    '01:30pm ET': 1.5,
    '01:45pm ET': 1.75,
    '02:00pm ET': 2,
    '02:15pm ET': 2.25,
    '02:30pm ET': 2.5,
    '02:45pm ET': 2.75,
    '03:00pm ET': 3,
    '03:15pm ET': 3.25,
    '03:30pm ET': 3.5,
    '03:45pm ET': 3.75,
    '04:00pm ET': 4,
    '04:15pm ET': 4.25,
    '04:30pm ET': 4.5,
    '04:45pm ET': 4.75,
    '05:00pm ET': 5,
    '05:15pm ET': 5.25,
    '05:30pm ET': 5.5,
    '05:45pm ET': 5.75,
    '06:00pm ET': 6,
    '06:15pm ET': 6.25,
    '06:30pm ET': 6.5,
    '06:45pm ET': 6.75,
    '07:00pm ET': 7,
    '07:15pm ET': 7.25,
    '07:30pm ET': 7.5,
    '07:45pm ET': 7.75,
    '08:00pm ET': 8,
    '08:15pm ET': 8.25,
    '08:30pm ET': 8.5,
    '08:45pm ET': 8.75,
    '09:00pm ET': 9,
    '09:15pm ET': 9.25,
    '09:30pm ET': 9.5,
    '09:45pm ET': 9.75,
    '10:00pm ET': 10,
    '10:15pm ET': 10.25,
    '10:30pm ET': 10.5,
    '10:45pm ET': 10.75,
    '11:00pm ET': 11,
    '11:15pm ET': 11.25,
    '11:30pm ET': 11.5,
    '11:45pm ET': 11.75,
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
  let now = new Date();
  let current_time = (now.getHours() - 12) + (now.getMinutes() / 60);
  current_time = Math.round(current_time * 100) / 100; // rounding to 2 decimal places
  return current_time;
}

export const isPlayerLocked = (startTime) => {
  const currentTime = getCurrentTimeDecimal()
  const decimalStartTime = convertTimeStringToDecimal(startTime)
  return decimalStartTime < currentTime
}

export const queryData = async (url, noCache=false) => {
  // Fetch the CSV file
  const response = await fetch(url, {
    headers: {
      'Cache-Control': noCache ? 'no-cache' : 'max-age=600',
    },
  })
  const data = await response.text()
  if(data.includes('<Error><Code>AccessDenied</Code><Message>Access Denied</Message>')) {
    return null
  }

  return data
}

export const splitData = (data, teamColumn = null) => {
  if(data === null) {
    return []
  }

  const toReturn = data.split('\n').filter(i => i).map((row) => row.split(','))
  if(teamColumn) {
    toReturn.forEach((row) => {
      if(!(row[teamColumn] in teamNameMapper)) {
        return
      }

      row[teamColumn] = teamNameMapper[row[teamColumn]]
    })
  }

  return toReturn
}

export const loadPlayerDataForSlate = async (slate) => {
  const formattedDate = getTodaysDate()
  const data4 = await queryData(`https://amichai-dfs-data.s3.amazonaws.com/slate_player_data_${formattedDate}_${slate[2]}`)
  const player_data = splitData(data4, 5)

  const toReturn = player_data.sort((a, b) => {
    return parseFloat(a[3]) < parseFloat(b[3]) ? 1 : -1
  })


  return toReturn.filter((obj, index, self) =>
    index === self.findIndex((t) => t[0] === obj[0])
  )
}

export const setupTableData = (playerData, slateData, teamData, slateName, overrides) => {
  const nameToPlayerData = {}
  for(const row of playerData) {
    let name = row[0]
    if(name in nameMapper) {
      name = nameMapper[name]
    }

    nameToPlayerData[name] = row
  }

  const teamToStartTime = teamData.reduce((acc, row) => {
    const team = row[0]
    acc[team] = row[2]
    return acc
  }, {})

  const teamToOpponent = teamData.reduce((acc, row) => {
    const team = row[0]
    acc[team] = row[1]
    return acc
  }, {})

  return slateData.map((row) => {
    let name = row[1]
    if(name in nameMapper) {
      name = nameMapper[name]
    } 

    const team = row[4]
    const opponent = teamToOpponent[team]
    if(!opponent) {
      // name mapping problem?
      debugger
    }

    const startTime = teamToStartTime[team]

    if(!startTime) {
      // name mapping problem?
      debugger
    }

    const playerData = nameToPlayerData[name]
    if (!playerData) {
      ///Are you missing a name conversion here?
      return {
        name: name,
        playerId: row[0],
        position: row[2],
        salary: row[3],
        cost: parseInt(row[3]),
        team,
        projection: 0,
        override: 0,
        status: row[6],
        opp: opponent,
        startTime,
      }
    }

    let projection = '0.0'

    if(slateName.includes('DK')) {
      projection = playerData[3]
    } else {
      projection = playerData[2]
    }

    const status = playerData[4]
    if (status === 'O') {
      row.push('0.0')
      projection = '0.0'
    } else {
      row.push(projection)
    }
    row.push(status)

    const projectionRounded = Math.round(parseFloat(projection) * 100) / 100;

    return {
      name: row[1],
      playerId: row[0],
      position: row[2],
      salary: row[3],
      cost: parseInt(row[3]),
      team,
      projection: projectionRounded,
      override: overrides ? overrides[row[0]] ?? projectionRounded : projectionRounded,
      status,
      opp: opponent,
      startTime,
    }
  })
}