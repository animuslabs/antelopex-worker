import db from "lib/db"
import { UpdateOrderError, addIBCOrderError, newIBCOrder, orderRelayed } from "lib/dbHelpers"
import { ChainClient, chainClients } from "lib/eosio"
import { IbcOrder } from "lib/types/antelopex.system.types"
import { sleep, sleepErr, throwErr } from "lib/utils"
import ms from "ms"
import logger from "lib/logger"
import { getDestinationChain, getEmitXferMeta, getProof, makeXferProveAction } from "lib/ibcUtil"
import { Action, UInt64 } from "@greymass/eosio"
import { Emitxfer } from "lib/types/wraplock.types"
import { getIBCToken } from "lib/ibcTokens"
import { ProofData, ProofRequestType } from "lib/types/ibc.types"
import { proveSchedules } from "lib/ proveScheduleChange"
import { handleOrder } from "lib/handleOrder"

export async function prepareOrders(client:ChainClient) {
  const log = logger.getLogger("checkOrders-" + client.name)
  log.debug(`Checking orders for chain: ${client.name}`) // DEBUG log

  await sleep(1000)
  const conf = client.config

  const oldestRecord = await db.iBCOrder.findFirst({
    orderBy: { blockNum: "desc" },
    take: 1,
    where: { originChain: client.name }
  })

  let orders:IbcOrder[] = []
  if (oldestRecord) {
    log.info("oldest block for chain:", oldestRecord?.blockNum.toString(), "getting orders after this block")
    orders = await client.getTableRows({ table: "ibcorders", code: conf.contracts.system, index_position: "secondary", lower_bound: UInt64.from(parseInt(oldestRecord?.blockNum.toString()) + 1), type: IbcOrder, limit: 1000 })
  } else {
    log.info(`Fetching full table for chain: ${client.name}`) // DEBUG log
    orders = await client.getFullTable({ tableName: "ibcorders", contract: conf.contracts.system }, IbcOrder)
  }
  let filteredOrders:IbcOrder[] = []
  const info = await client.getInfo()
  const liBlock = info.last_irreversible_block_num.toNumber()
  let pending = 0

  log.debug(`Processing ${orders.length} orders for client: ${client.name}`) // DEBUG log

  for (const order of orders) {
    if (order.block_num.toNumber() > liBlock) {
      pending++
      log.debug(`Order ${order.trxid.toString()} is still pending. Total pending: ${pending}`) // DEBUG log
      continue
    }
    log.debug("checking db for order: ", order.trxid.toString())
    const dbEntry = await db.iBCOrder.findUnique({ where: { originTxid: order.trxid.toString() }})
    if (dbEntry) {
      log.debug("found existing order entry in db")
      if (dbEntry.relayed || !dbEntry.shouldRetry) continue
      filteredOrders.push(order)
      continue
    } else {
      log.debug(`New IBC Order for transaction ID: ${order.trxid.toString()}`) // DEBUG log
      await newIBCOrder(client.config.chain, order)
      filteredOrders.push(order)
    }
  }

  log.debug(`${client.config.chain.toUpperCase()} - New orders found: ${filteredOrders.length}`) // DEBUG log
  return filteredOrders
}
