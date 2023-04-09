import { Name } from "@greymass/eosio"
import { getAccount } from "./eosio"
import logger from "lib/logger"
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
    array[randomIndex] = temporaryValue
  }

  return array
}

export async function accountExists(name:string) {
  const validRegex = /(^[a-z1-5.]{0,11}[a-z1-5]$)|(^[a-z1-5.]{12}[a-j1-5]$)/
  if (typeof name !== "string") return false
  if (!validRegex.test(name)) return false
  try {
    const result = await getAccount(Name.from(name))
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
      result[item[0]] = param.toString()
    })
    return result
  })
}

export function toObject(data) {
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

export function parseISOString(s) {
  let b = s.split(/\D+/)
  return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]))
}
export function toDate(string) {
  return new Date(parseISOString(string))
}

export function removeDuplicates(arr:any[]) {
  return Array.from(new Set(arr))
}
