import db from "lib/db"
import { chainClients } from "lib/eosio"
import { handleOrder } from "lib/handleOrder"
import { handleAnyOrder } from "lib/ibc"
import { prepareSpecialOrders } from "lib/prepareSpecialOrders"
import { sleep, sleepErr } from "lib/utils"
import ms from "ms"

async function checkOrders() {
  for (const client of Object.values(chainClients)) {
    const filteredOrders = await prepareSpecialOrders(client)
    for (const order of filteredOrders) await handleAnyOrder(order, client)
  }
}

async function main() {
  console.log("checkSpecialOrders starting:", new Date().toLocaleString())
  await Promise.race([checkOrders(), sleepErr(ms("3m"))]).catch(async(err) => {
    console.error(err)
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
