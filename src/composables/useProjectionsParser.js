

export function useProjectionsParser() {
  const parseProjectionFile = (contents) => {
    const lines = contents.split('\n')
    const line1 = lines[0].split(',')

    let nameIdx = 0
    let projectionIdx = null
    const nameColumns = ['"PLAYER NAME"', '"Name"']
    const projectionColumns = ['"MY PROJ"', '"Projection"', '"Fpts"']
    line1.forEach((part, index) => {
      if(nameColumns.includes(part)) {
        nameIdx = index
      }
      if(projectionColumns.includes(part)) {
        projectionIdx = index
      }
    })

    if(projectionIdx === null) {
      alert('failed to parse projection file')
      return
    }

    const projections = {}
    lines.slice(1).map((line) => {
      const parts = line.split(',')
      let name = parts[nameIdx].replace(/"/g, '')
      if(name.includes(' : UTIL')) {
        name = name.replace(' : UTIL', '')
      }

      const projection = parts[projectionIdx].replace(/"/g, '')
      projections[name] = parseFloat(projection)
    })

    return projections
  }

  return { parseProjectionFile }
}