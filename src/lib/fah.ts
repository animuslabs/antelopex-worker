import ax from "axios"

const teamid = "238663"
const teamapi = `https://api2.foldingathome.org/team/${teamid}/members`

type FahApiData = {
  name:string
  id:number
  rank:number|null
  score:number
  wus:number
}

export const fah = {
  async getTeamMembers():Promise<FahApiData[]> {
    const response = await ax.get(teamapi)
    let donors:FahApiData[] = response.data.map((el:string[]):FahApiData => {
      const apiData:FahApiData = {
        name: el[0]?.toLowerCase() || "",
        id: el[1] as unknown as number,
        rank: el[2] as unknown as number,
        score: el[3] as unknown as number,
        wus: el[4] as unknown as number
      }
      return apiData
    })
    donors.shift()
    return donors
  }
}
