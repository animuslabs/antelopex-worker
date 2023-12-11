import dotenv from "dotenv"
import fs from "fs-extra"
import { Name, NameType, PrivateKey } from "@greymass/eosio"
import { Options } from "ipfs-http-client"
import { ChainKey } from "lib/types/ibc.types"
import logger from "lib/logger"
const log = logger.getLogger("env")
dotenv.config()


export interface EosioConfig {
  chain:ChainKey
  endpoints:URL[],
  proofSockets:string[]
  firehoseSockets:string[]
  worker:{
    account:NameType
    permission:NameType
    key:PrivateKey
  }
  contracts:{
    system:NameType
    bridge:NameType
  }
  proxy?:{
    maintainerEmail:string,
    proxies:Array<{external:string[], internal:string[]}>
  }, relayer?:{
    port:number
  },
  history?:{
    hyperion:string[],
    injestChunkSize:number,
    keepHistoryDataDays:number,
    injestLoopDelaySec:number,
    port:number
  }
}
type chains = "eos" | "kylin" | "jungle" | "wax" | "waxTest" | "tlos" | "telosTest"
type eosioConfigs = { [k in chains]?:EosioConfig }
interface envType {
  chain:eosioConfigs
}

const readEnv:envType = fs.readJSONSync("../.env.jsonc")
let configs:Partial<Record<ChainKey, EosioConfig>> = {}
for (const conf of Object.entries(readEnv.chain)) {
  const chainName:ChainKey = conf[0] as ChainKey
  const untyped = conf[1] as any
  log.info(`Unparsing ENV config for:${chainName}`)
  const typed:EosioConfig = {
    chain: chainName,
    proofSockets: untyped.proofSockets,
    firehoseSockets: untyped.firehoseSockets,
    endpoints: untyped.endpoints.map((el:string) => new URL(el)),
    worker: {
      account: Name.from(untyped.worker.account),
      permission: Name.from(untyped.worker.permission),
      key: PrivateKey.from(untyped.worker.key)
    },
    contracts: {
      system: Name.from(untyped.contracts.system),
      bridge: Name.from(untyped.contracts.bridge)
    },
    proxy: untyped.proxy
      ? {
        maintainerEmail: untyped.proxy.maintainerEmail,
        proxies: untyped.proxy.proxies
      }
      : undefined,
    relayer: untyped.relayer
      ? {
        port: untyped.relayer.port
      }
      : undefined,
    history: untyped.history
      ? {
        hyperion: untyped.history.hyperion,
        injestChunkSize: untyped.history.injestChunkSize,
        keepHistoryDataDays: untyped.history.keepHistoryDataDays,
        injestLoopDelaySec: untyped.history.injestLoopDelaySec,
        port: untyped.history.port
      }
      : undefined
  }
  configs[chainName] = typed
}

export { configs }


export function getConfig(chain:ChainKey):EosioConfig {
  const conf = configs[chain]
  if (!conf) throw new Error(`No config provided for chain: '${chain}'`)
  return conf
}
