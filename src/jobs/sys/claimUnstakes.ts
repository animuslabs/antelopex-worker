import { Accounts, Config } from "../../lib/types/antelopex.system.types"
import log from "lib/logger"
import env from "lib/env"
import { getSysConf, tables } from "lib/queries"
import { ActionPusher } from "lib/actionPusher"
import { sysActions } from "lib/actions"


// claim stake if account stake has finished
function claimAccount(account:Accounts, pusher:ActionPusher):boolean {
  const unstake = account.unstake[0]
  if (!unstake) return false
  const now = Math.floor(Date.now() / 1000)
  if (unstake.available_after.toMilliseconds() / 1000 > now) return false
  pusher.add(sysActions.claimUnstake({ account: account.account }))
  return true
}

async function init() {
  try {
    const allAccounts = await tables.sys.accounts()
    log.info("Got all antelopex accounts:", allAccounts.length)
    let claimed = 0
    const pusher = new ActionPusher()
    for (const account of allAccounts) {
      const result = claimAccount(account, pusher)
      if (result) claimed++
    }
    pusher.stop()
    log.info("claimed unstakes:", claimed)
  } catch (error:any) {
    console.error(error.toString())
  }
}
init().catch(console.error)
