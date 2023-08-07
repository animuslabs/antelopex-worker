import { API, APIClient, APIProvider, FetchProvider, Name, Action, Transaction, ActionFields, Authority, PermissionLevel, SignedTransaction, PrivateKey, NameType, AnyAction, ABI, ABISerializableConstructor, ABISerializableType, Struct, UInt32, Checksum256Type, UInt32Type, UInt8, ChainAPI } from "@greymass/eosio"
import fetch from "node-fetch"
import ms from "ms"
import { rand, shuffle, sleep } from "./utils"
import { configs, EosioConfig } from "./env"
import logger from "lib/logger"
import { MemoryCache, caching } from "cache-manager"
import { ChainKey } from "lib/types/ibc.types"
import axios from "axios"
import { ProducerSchedule } from "lib/types/ibc.prove.types"
const ax = axios.create()
const log = logger.getLogger("eosio")
let client:APIClient
let provider:APIProvider

interface ActiveScheduleProducerAuthority extends Struct {
  producer_name:string
  authority:any[]
}
interface ActiveScheduleProducer extends Struct {
  producer_name:string
  authority:ActiveScheduleProducerAuthority
}
interface ActiveSchedule extends Struct {
  version:number
  producers:ActiveScheduleProducer[]
}

interface GetProducerScheduleResponse extends Struct {
  active:ActiveSchedule
  pending:any
  proposed:any
}


export interface TransactionResponse {
  url:string
  receipt:{
    id:string;
    block_num:number;
    block_time:string;
    receipt:{
      status:string;
      cpu_usage_us:number;
      net_usage_words:number;
    };
    elapsed:number;
    net_usage:number;
    scheduled:boolean;
    action_traces:any[];
    account_ram_delta:any;
  }
}
export interface DoActionResponse {
  receipts:TransactionResponse[]
  errors:any[]
}

interface GetTableParams {
  tableName:NameType
  scope?:NameType
  contract?:NameType
}

export type ChainClients = Partial<Record<ChainKey, ChainClient>>


export class ChainClient {
  constructor(chainName:ChainKey) {
    const conf = configs[chainName]
    if (!conf) throw new Error(`Chain ${chainName} is not configured!!`)
    this.config = conf
    this.rpcs = conf.endpoints.map(el => {
      provider = new FetchProvider(el.toString(), { fetch })
      client = new APIClient({ provider })
      return { endpoint: el, rpc: client.v1.chain }
    })
    this.cache = caching("memory", { max: 100, ttl: ms("12s") })
  }

  cache:Promise<MemoryCache>
  config:EosioConfig
  rpcs:{ endpoint:URL, rpc:typeof client.v1.chain }[]
  abiCache:Record<string, ABI.Def> = {}
  async getAbi(contract:NameType) {
    let abi:ABI.Def|undefined = this.abiCache[contract.toString()]
    if (!abi) {
      abi = (await this.pickRpc().rpc.get_abi(contract)).abi
      if (abi) this.abiCache[contract.toString()] = abi
    }
    if (!abi) {
      throw new Error(`No ABI for ${contract}`)
    }
    return abi
  }

  getTransaction(id:Checksum256Type):Promise<API.v1.GetTransactionStatusResponse> {
    // return this.safeDo<API.v1.GetTransactionStatusResponse>("get_transaction_status", id)
    return this.pickRpc().rpc.get_transaction_status(id)
  }

  getProofSocket():string {
    const socket = this.config.proofSockets[rand(0, this.config.proofSockets.length - 1)]
    log.info("using proof socket:", socket)
    if (!socket) throw new Error("No available proof services!!")
    return socket
  }

  async errorCounter(endpoint:string, error:string) {
    log.info("error:", endpoint, error)
  }

  async safeDo<T>(cb:keyof ChainAPI, params?:any, retry?:number):Promise<T|any> {
    if (!retry) retry = 0
    const rpc = this.pickRpc()
    const url = rpc.endpoint.toString()
    // log.debug("Try rpc:", url)
    try {
      const doit = async() => {
        try {
          let exec = rpc.rpc[cb]
          // @ts-ignore
          const result = (await rpc.rpc[cb](params))
          return result
        } catch (error:any) {
          const errorMsg = error.toString() as string
          log.error("safeDo Error:", rpc.endpoint.toString(), errorMsg, error)
          if (cb === "get_account" && (errorMsg.search("unknown key") > -1)) {
            retry = 5
            throw (error)
          } else {
            this.errorCounter(url, errorMsg)
            await sleep(ms("8s"))
            throw (error)
          }
        }
      }
      const result = await Promise.race([
        doit(),
        // doit(),
        new Promise((res, reject) => setTimeout(() => reject(new Error("SafeDo Timeout:")), ms("3s")))
      ])
      // log.info('Result:', result);

      return result as T
    } catch (error) {
      log.error("DoRequest Error:", url)
      retry++
      log.error("RETRY", retry)
      if (retry < 5) return this.safeDo(cb, params, retry)
      else throw new Error(`Request Failed after ${retry} retries!`)
    }
  }

  async getAllScopes(params:API.v1.GetTableByScopeParams) {
    let { code, table } = params
    if (!code) code = this.config.contracts.system
    let lower_bound:any = null
    const rows:any[] = []

    const loop = async():Promise<any> => {
      const result = await this.safeDo<API.v1.GetTableByScopeResponse>("get_table_by_scope", { code, table, limit: -1, lower_bound })
      if (!result) return
      result.rows.forEach((el:any) => rows.push(el))
      log.info("scopes:", rows.length)

      if (result.more) lower_bound = result.more
      else return
      return loop()
    }
    await loop()
    return rows.map(el => el.scope) as Name[]
  }

  async getBlock(blockNum:UInt32Type):Promise<API.v1.GetBlockResponse> {
    return this.safeDo("get_block", blockNum)
  }

  // async getFullBlock(blockNum:UInt32Type):Promise<any> {
  //   const hyp = this.config.history?.hyperion
  // }

  async signActions(actions:Action[], extra?:{
    keys?:PrivateKey[]
    max_cpu_usage_ms?:number
  }):Promise<SignedTransaction
    > {
    const info = await this.getInfo()
    let header = info.getTransactionHeader()
    if (extra?.max_cpu_usage_ms) header.max_cpu_usage_ms = UInt8.from(extra.max_cpu_usage_ms)

    const transaction = Transaction.from({
      ...header,
      actions
    })
    let keys = extra?.keys
    if (!keys) keys = [this.config.worker.key]
    const signatures = keys.map(key => key.signDigest(transaction.signingDigest(info.chain_id)))
    const signedTransaction = SignedTransaction.from({ ...transaction, signatures })
    return signedTransaction
  }

  async pushTrx(trx:Transaction) {
    // this.pickRpc().rpc.send_transaction2()
    return this.safeDo("push_transaction", trx)
  }

  async getTableRowsJson(params:API.v1.GetTableRowsParams):Promise<any[]> {
    return (await this.safeDo<API.v1.GetTableRowsResponse>("get_table_rows", params)).rows
  }

  async getTableRows<I, T extends ABISerializableConstructor>(params:API.v1.GetTableRowsParamsTyped<I, T>):Promise<InstanceType<T>[]> {
    return (await this.safeDo<API.v1.GetTableRowsResponse>("get_table_rows", params)).rows as InstanceType<T>[]
  }

  async getProducerSchedule():Promise<GetProducerScheduleResponse> {
    let res = (await ax.get<GetProducerScheduleResponse>(this.pickRpc().endpoint.toString() + "v1/chain/get_producer_schedule"))
    return res.data
  }

  pickRpc() {
    const pick = this.rpcs[rand(0, this.rpcs.length - 1)]
    // log.info('pickRPC:', pick.endpoint.toString())
    if (!pick) throw (new Error("No RPCs available"))
    else return pick
  }

  pickEndpoint():string {
    const pick = this.rpcs[rand(0, this.rpcs.length - 1)]
    if (!pick) throw (new Error("No RPCs available"))
    return pick.endpoint.toString()
  }

  sendAction(act:Action) {
    return this.doAction(act.name, act.data, act.account)
  }

  async getFullTable< T extends ABISerializableConstructor>(params:GetTableParams, type?:T):Promise<InstanceType<T>[]> {
    let code = params.contract
    const table = params.tableName
    let { scope } = params
    if (!scope) scope = code

    let lower_bound:any = null
    const rows:T[] = []
    const loop = async():Promise<void> => {
      const result = await this.safeDo("get_table_rows", { code, table, scope, limit: 100, lower_bound, type })
      result.rows.forEach((el:T) => rows.push(el))
      if (result.more) lower_bound = result.next_key
      else return
      return loop()
    }
    await loop()
    return rows as InstanceType<T>[]
  }

  infoCache:any
  async getInfo():Promise<API.v1.GetInfoResponse> {
    let cache = await this.cache
    const result = await cache.get("get_info")
    if (result) return result as API.v1.GetInfoResponse
    else {
      const info = await this.safeDo<API.v1.GetInfoResponse>("get_info")
      await cache.set("get_info", info)
      return info
    }
  }

  async getAccount(name:Name):Promise<API.v1.AccountObject> {
    const result = (await this.safeDo("get_account", name)) as API.v1.AccountObject
    return result
  }

  async doAction(name:NameType, data:{ [key:string]:any } = {}, contract:NameType = this.config.contracts.system, authorization?:PermissionLevel[], keys?:PrivateKey[], retry?:number):Promise<DoActionResponse | null> {
    if (!data) data = {}
    if (!authorization) authorization = [PermissionLevel.from({ actor: this.config.worker.account, permission: this.config.worker.permission })]
    const info = await this.getInfo()
    const header = info.getTransactionHeader()
    let action:Action
    try {
      action = Action.from({
        authorization,
        account: contract,
        name,
        data
      })
    } catch (error) {
    // log.info(error.toString())

      let abi:ABI.Def|undefined = this.abiCache[contract.toString()]
      if (!abi) {
        abi = (await this.pickRpc().rpc.get_abi(contract)).abi
        if (abi) this.abiCache[contract.toString()] = abi
      }
      if (!abi) {
        throw new Error(`No ABI for ${contract}`)
      }
      action = Action.from({
        authorization,
        account: contract,
        name,
        data
      }, abi)
    }
    const transaction = Transaction.from({
      ...header,
      actions: [action]
    })
    if (!keys) keys = [this.config.worker.key]

    const signatures = keys.map(key => key.signDigest(transaction.signingDigest(info.chain_id)))
    const signedTransaction = SignedTransaction.from({ ...transaction, signatures })
    const receipts:TransactionResponse[] = []
    const errors:any[] = []
    let apis = shuffle(this.rpcs)
    if (apis.length > 3) apis = apis.slice(0, 3)
    // log.info(apis)

    const timeoutTimer = ms("15s")
    await Promise.all(apis.map(({ endpoint, rpc }) => Promise.race([
      new Promise(res => {
        rpc.push_transaction(signedTransaction).then(result => {
          receipts.push({ url: endpoint.origin, receipt: result.processed })
        }).catch(error => {
        // log.info('Error Type:', typeof error);
          errors.push({ url: endpoint.origin, error: error?.error?.details[0]?.message || JSON.stringify(error?.error, null, 2) })
        }).finally(() => res(null))
      }),
      new Promise(res => setTimeout(() => {
        errors.push({ url: endpoint.origin, error: "Timeout Error after " + (timeoutTimer / 1000) + " seconds" })
        res(null)
      }, timeoutTimer))
    ])))
    // log.info('doAction finished;', receipts, errors);
    interface UniqueErrors {
      endpoints:string[]
      error:string
    }
    const uniqueErrors:UniqueErrors[] = []
    errors.forEach(el => {
      const exists = uniqueErrors.findIndex(el2 => el2.error = el.error)
      if (exists === -1) {
        el.endpoints = [el.url]
        delete el.url
        uniqueErrors.push(el)
      } else {
        uniqueErrors[exists]?.endpoints.push(el.url)
      }
    })

    return { receipts, errors: uniqueErrors }
  }
}

export const chainClients:Partial<Record<ChainKey, ChainClient>> = {}
Object.values(configs).forEach((conf) => chainClients[conf.chain] = new ChainClient(conf.chain))

export function getChainClient(chain:ChainKey):ChainClient {
  const client = chainClients[chain]
  if (!client) throw new Error(`No chain client active for '${chain}'`)
  return client
}
