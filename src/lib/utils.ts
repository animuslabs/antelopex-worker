import { Name } from "@greymass/eosio"
import { chainClients } from "./eosio"
import logger from "lib/logger"
import { ChainKey } from "lib/types/ibc.types"
import { AxiosError, AxiosResponse } from "axios"
let log = logger.getLogger("utils")


export const sleep = async(ms:number) => new Promise(resolve => setTimeout(resolve, ms))

export function shuffle<T>(array:T[]) {
  let currentIndex = array.length
  let temporaryValue
  let randomIndex
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex] as T
    array[randomIndex] = temporaryValue as T
  }

  return array
}

export async function accountExists(chain:ChainKey, name:string) {
  const validRegex = /(^[a-z1-5.]{0,11}[a-z1-5]$)|(^[a-z1-5.]{12}[a-j1-5]$)/
  if (typeof name !== "string") return false
  if (!validRegex.test(name)) return false
  const client = chainClients[chain]
  if (!client) throw new Error("invalid chain specified: " + chain)
  try {
    const result = await client.getAccount(Name.from(name))
    if (result) return true
    return false
  } catch (error:any) {
    console.log("can't find account", error.toString())
    return false
  }
}

export function rand(min:number, max:number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function evalTypedEOSIOList(list:any[]):any[] {
  return list.map(el => {
    const result = {}
    Object.entries(el).forEach((item) => {
      const param = item[1] as any
      // @ts-ignore
      result[item[0]] = param.toString()
    })
    return result
  })
}

export function toObject(data:object) {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === "bigint"
      ? value.toString()
      : value // return everything else unchanged
  ))
}

export function pickRand<T>(arr:T[]):T {
  const randomIndex = Math.floor(Math.random() * arr.length)
  return arr[randomIndex] as T
}

export function parseISOString(s:string) {
  let b = s.split(/\D+/)
  return new Date(Date.UTC(b[0] as any, --(b[1] as any), b[2] as any, b[3] as any, b[4] as any, b[5] as any, b[6] as any))
}
export function toDate(string:string) {
  return new Date(parseISOString(string))
}

export function removeDuplicates(arr:any[]) {
  return Array.from(new Set(arr))
}

export async function customRace<T>(requests:Promise<any>[]):Promise<any> {
  let failureCount = 0

  const wrappedRequests = requests.map((request) =>
    request
      .then((response) => {
        // Reject other requests when one request succeeds
        throw new Error("{ success: true, response }")
      })
      .catch((error:AxiosError) => {
        failureCount++
        if (failureCount === requests.length) {
          throw new Error("{ success: false, error: 'All requests failed.' }")
        }
        return error
      })
  )
  return Promise.race(wrappedRequests).catch((result:{ success:boolean; response?:AxiosResponse; error?:string }) => {
    if (result.success) {
      return result.response!
    } else {
      throw new Error(result.error! || "Unknown error")
    }
  })
}
