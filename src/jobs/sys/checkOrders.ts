import db from "lib/db"
import { chainClients } from "lib/eosio"
import { handleOrder } from "lib/handleOrder"
import { prepareOrders } from "lib/prepareOrders"
import { sleep, sleepErr } from "lib/utils"
import ms from "ms"

async function checkOrders() {
  for (const client of Object.values(chainClients)) {
    const filteredOrders = await prepareOrders(client)
    for (const order of filteredOrders) await handleOrder(order, client)
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
