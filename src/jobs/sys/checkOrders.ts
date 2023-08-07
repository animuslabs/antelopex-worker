import db from "lib/db"
import { addIBCOrderError, newIBCOrder, orderRelayed } from "lib/dbHelpers"
import { chainClients } from "lib/eosio"
import { getProof, getProofRequestData, makeProofAction } from "lib/ibcHelpers"
import { IbcOrder } from "lib/types/antelopex.system.types"
import { sleep, sleepErr, throwErr } from "lib/utils"
import ms from "ms"

async function checkOrders() {
  for (const client of Object.values(chainClients)) {
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
        console.log("get action data")
        await sleep(1000)
        const actData = await getProofRequestData(client, order.trxid.toString(), "emitxfer")
        console.log("get proof")
        await sleep(1000)
        const proof = await getProof(client, actData)
        console.log("making proof action")
        await sleep(1000)
        const action = await makeProofAction(client, actData, proof, false)
        console.log("sending action")
        const result = await action.toChain.sendAction(action.action)
        if (!result) throwErr("Null result")
        console.log(result)
        console.log(result.errors[0].error)
        const receipt = result.receipts[0]
        if (!receipt) {
          await addIBCOrderError(order, new Error(result.errors[0].error))
          continue
        } else {
          const txid = receipt.receipt.id
          await orderRelayed(order, txid, action.toChain.config.chain)
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

