import { Action, AnyAction, Authority, Name, UInt64 } from "@greymass/eosio"
import { ActionPusher } from "lib/actionPusher"

import log from "lib/logger"
import { getAccounts } from "lib/queries"
import { fah } from "lib/fah"
import { sysActions } from "lib/actions"


async function init() {
  try {
    const accounts = await getAccounts()
    const members = await fah.getTeamMembers()
    console.log("team members:", members.length)

    let membersObj = Object.fromEntries(members.map(m => [m.name, m]))
    const pusher = new ActionPusher()
    const filteredAccounts = accounts.filter(a => {
      const lastUpdate = a.last_points_update.toMilliseconds()
      const validAfter = Date.now() - 3.6e+6
      return lastUpdate < validAfter
    })
    for (const acct of filteredAccounts) {
      log.info("checking account:", acct.account.toString())
      const member = membersObj[acct.account.toString()]
      console.log("memberData:", member)
      if (!member) continue

      if (member.score - 100 > acct.fah_points.toNumber()) {
        log.info("updating score:", acct.account.toString())
        pusher.add(sysActions.addFahPoints({ account: acct.account, add_fah_points: member.score - acct.fah_points.toNumber() }))
      }
    }
    pusher.stop()
  } catch (error:any) {
    log.error(error.toString())
    log.debug(error)
  }
}
init()
