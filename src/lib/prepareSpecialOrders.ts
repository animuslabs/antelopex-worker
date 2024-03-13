import db from "lib/db"
import { UpdateOrderError, UpdateSpecialOrderError, addIBCOrderError, addIBCSpecialOrderError, newIBCOrder, newIBCSpecialOrder, orderRelayed } from "lib/dbHelpers"
import { ChainClient, chainClients } from "lib/eosio"
import { IbcOrder, IbcSpecialOrder } from "lib/types/antelopex.system.types"
import { sleep, sleepErr, throwErr } from "lib/utils"
import ms from "ms"
import logger from "lib/logger"
import { getDestinationChain, findAction, getProof, makeXferProveAction } from "lib/ibcUtil"
import { Action, UInt64 } from "@greymass/eosio"
import { Emitxfer } from "lib/types/wraplock.types"
import { getIBCToken } from "lib/ibcTokens"
import { ProofData, ProofRequestType } from "lib/types/ibc.types"
import { proveSchedules } from "lib/ proveScheduleChange"
import { handleOrder } from "lib/handleOrder"

export async function prepareSpecialOrders(client:ChainClient) {
  const log = logger.getLogger("checkSpecialOrders-" + client.name)
  log.debug(`Checking special orders for chain: ${client.name}`) // DEBUG log

  await sleep(1000)
  const conf = client.config

  const oldestRecord = await db.specialOrder.findFirst({
    orderBy: { orderId: "desc" },
    take: 1,
    where: { originChain: client.name }
  })
  const retryRecords = await db.specialOrder.findMany({ where: { originChain: client.name, shouldRetry: true, relayed: false }})
  let orders:IbcSpecialOrder[] = []
  if (oldestRecord) {
    log.info("oldest spcialOrder Id for chain:", oldestRecord?.orderId.toString(), "getting special orders after this orderId")
    orders = await client.getTableRows({ table: "specialorder", code: conf.contracts.system, lower_bound: UInt64.from(oldestRecord.orderId + BigInt(1)), type: IbcSpecialOrder, limit: 5 })
  } else {
    log.info(`Fetching full table for chain: ${client.name}`) // DEBUG log
    orders = await client.getFullTable({ tableName: "specialorder", contract: conf.contracts.system }, IbcSpecialOrder)
  }
  let filteredOrders:IbcSpecialOrder[] = []
  const info = await client.getInfo()
  const liBlock = info.last_irreversible_block_num
  let pending = 0

  log.debug(`Processing ${orders.length} orders for client: ${client.name}`) // DEBUG log

  for (const order of orders) {
    if (order.block_num > liBlock) {
      pending++
      log.debug(`Order ${order.trxid.toString()} is still pending. Total pending: ${pending}`) // DEBUG log
      continue
    }
    log.debug("checking db for order: ", order.trxid.toString())
    const dbEntry = await db.specialOrder.findUnique({ where: { originTxid: order.trxid.toString() }})
    if (dbEntry) {
      log.debug("found existing order entry in db")
      if (dbEntry.relayed || dbEntry.shouldRetry == false) continue
      filteredOrders.push(order)
      continue
    } else {
      log.debug(`New IBC Order for transaction ID: ${order.trxid.toString()}`) // DEBUG log
      await newIBCSpecialOrder(client.config.chain, order)
      filteredOrders.push(order)
    }
  }
  log.debug(`${client.config.chain.toUpperCase()} - New orders found: ${filteredOrders.length}`) // DEBUG log
  return filteredOrders
}
