import { getAllScopes, getFullTable, pickRpc, safeDo } from "./eosio"
import * as sys from "./types/antelopex.system.types"
import env from "./env"
import cacheManager from "cache-manager"
let cache = await cacheManager.caching("memory", { max: 100, ttl: 300/*seconds*/ })

export async function getSysConf():Promise<sys.Config> {
  const config = await getFullTable({ tableName: "config", contract: env.contracts.system }, sys.Config)
  if (!config[0]) throw (new Error("system contract not initialized "))
  return config[0]
}

export async function getAccounts():Promise<sys.Accounts[]> {
  return await getFullTable({ tableName: "accounts", contract: env.contracts.system }, sys.Accounts)
}


export const tables = {
  sys: {
    config: () => cache.wrap("sysconf", getSysConf),
    accounts: () => cache.wrap("accounts", () => getAccounts())
  }
}
