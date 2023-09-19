import db from "lib/db"
import { UpdateOrderError, addIBCOrderError, newIBCOrder, orderRelayed } from "lib/dbHelpers"
import { chainClients } from "lib/eosio"
import { IbcOrder } from "lib/types/antelopex.system.types"
import { sleep, sleepErr, throwErr } from "lib/utils"
import ms from "ms"
import logger from "lib/logger"
import { getEmitXferMeta, getProof, makeXferProveAction } from "lib/ibcUtil"
import { UInt64 } from "@greymass/eosio"

async function checkOrders() {
  for (const client of Object.values(chainClients)) {
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
        if (dbEntry.relayed || dbEntry.relayError) continue
        filteredOrders.push(order)
        continue
      } else {
        log.debug(`New IBC Order for transaction ID: ${order.trxid.toString()}`) // DEBUG log
        await newIBCOrder(client.config.chain, order)
        filteredOrders.push(order)
      }
    }

    log.debug(`${client.config.chain.toUpperCase()} - New orders found: ${filteredOrders.length}`) // DEBUG log

    for (const order of filteredOrders) {
      try {
        log.debug(`Processing order: ${order.trxid.toString()}`) // DEBUG log
        const data = await getEmitXferMeta(client, order.trxid.toString(), order.block_num.toNumber())
        const proof = await getProof(client, data)
        const { destinationChain, action } = await makeXferProveAction(client, data, proof)
        const result = await destinationChain.sendAction(action)
        log.debug(`Result for order ${order.trxid.toString()}: ${JSON.stringify(result)}`) // DEBUG log

        if (!result) throwErr("Null result")

        const receipt = result.receipts[0]
        if (!receipt) {
          const error = result.errors[0]?.error
          if (!error) throwErr("Receipt and error fields missing")
          log.error(`Error for order ${order.trxid.toString()}: ${error}`)
          await UpdateOrderError(order, new Error(error))
          continue
        } else {
          const txid = receipt.receipt.id
          log.debug(`Order ${order.trxid.toString()} relayed with transaction ID: ${txid}`) // DEBUG log
          await orderRelayed(order, txid, destinationChain.name)
        }
      } catch (error:any) {
        log.error(`Exception caught for order ${order.trxid.toString()}: ${error.message}`)
        await addIBCOrderError(order, error)
      }
    }
  }
}

async function main() {
  console.log("checkOrders starting:", new Date().toLocaleString())
  await Promise.race([checkOrders(), sleepErr(ms("3m"))]).catch(async() => {
    console.error("checkOrders Failed due to timeout:", new Date().toLocaleString())
    await db.$disconnect()
    process.kill(process.pid, "SIGTERM")
  })
  console.log("checkOrders Finished:", new Date().toLocaleString())
  await sleep(ms("1m"))
  await main()
}
main().catch(error => {
  console.error(`Main function encountered an error: ${error.message}`)
})
