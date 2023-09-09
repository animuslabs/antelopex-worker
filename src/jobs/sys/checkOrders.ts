import db from "lib/db"
import { UpdateOrderError, addIBCOrderError, newIBCOrder, orderRelayed } from "lib/dbHelpers"
import { chainClients } from "lib/eosio"
import { IbcOrder } from "lib/types/antelopex.system.types"
import { sleep, sleepErr, throwErr } from "lib/utils"
import ms from "ms"
import logger from "lib/logger"
import { getEmitXferMeta, getProof, makeXferProveAction } from "lib/ibcUtil"

async function checkOrders() {
  for (const client of Object.values(chainClients)) {
    const log = logger.getLogger("checkOrders-" + client.name)
    await sleep(1000)
    const conf = client.config
    const orders = await client.getFullTable({ tableName: "ibcorders", contract: conf.contracts.system }, IbcOrder)
    let filteredOrders:IbcOrder[] = []
    const info = await client.getInfo()
    const liBlock = info.last_irreversible_block_num.toNumber()
    let pending = 0
    for (const order of orders) {
      if (order.block_num.toNumber() > liBlock) {
        pending++
        console.log("skipping pending, waiting for LIB", pending)
        continue
      }
      const dbEntry = await db.iBCOrder.findUnique({ where: { originTxid: order.trxid.toString() }})
      if (dbEntry) {
        if (dbEntry.relayed || dbEntry.relayError) continue
        filteredOrders.push(order)
        continue
      } else {
        await newIBCOrder(client.config.chain, order)
        filteredOrders.push(order)
      }
    }
    console.log(client.config.chain.toUpperCase(), "found new orders:", filteredOrders.length)

    for (const order of filteredOrders) {
      try {
        const data = await getEmitXferMeta(client, order.trxid.toString(), order.block_num.toNumber())
        const proof = await getProof(client, data)
        const { destinationChain, action } = await makeXferProveAction(client, data, proof)
        const result = await destinationChain.sendAction(action)
        console.log(result)
        if (!result) throwErr("Null result")
        console.log(result)
        const receipt = result.receipts[0]
        if (!receipt) {
          const error = result.errors[0]?.error
          if (!error) throwErr("Receipt and error fields missing")
          log.error(error)
          await UpdateOrderError(order, new Error(error))
          continue
        } else {
          const txid = receipt.receipt.id
          await orderRelayed(order, txid, destinationChain.name)
        }
      } catch (error:any) {
        console.error(error)
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
main().catch(console.error)

