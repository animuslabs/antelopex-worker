import db from "lib/db"
import { chainClients } from "lib/eosio"
import { retrySpecialOrders } from "lib/retryOrders"
import { sleep, sleepErr } from "lib/utils"
import ms from "ms"

async function init() {
  for (const client of Object.values(chainClients)) await retrySpecialOrders(client)
}

async function main() {
  console.log("checkOrders starting:", new Date().toLocaleString())
  await Promise.race([init(), sleepErr(ms("3m"))]).catch(async(err) => {
    console.error(err)
    console.error("checkOrders Failed due to timeout:", new Date().toLocaleString())
    await db.$disconnect()
    process.kill(process.pid, "SIGTERM")
  })
  console.log("retrySpecialOrders Finished:", new Date().toLocaleString())
  await sleep(ms("15m"))
  await main()
}
main().catch(error => {
  console.error(`Main function encountered an error: ${error.message}`)
})
