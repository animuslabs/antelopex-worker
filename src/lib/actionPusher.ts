import { Action } from "@greymass/eosio"
import { ChainClient } from "lib/eosio"
import logger from "lib/logger"
import { ChainKey } from "lib/types/ibc.types"
import { sleep } from "lib/utils"
const log = logger.getLogger("ActionPusher")

export class ActionPusher {
  constructor(chainName:ChainKey, intervalms:number = 1000) {
    this.timer = setInterval(() => this.pushTrx(), intervalms)
    this.client = new ChainClient(chainName)
  }

  client:ChainClient

  async stop() {
    log.debug("stopping pusher")
    while (this.queue.length > 0) {
      await sleep(1000)
      log.debug("queue remaining", this.queue.length)
    }
    log.debug("stopped")
    clearInterval(this.timer)
  }

  add(act:Action) {
    this.queue.push(act)
  }

  timer:NodeJS.Timer
  queue:Action[] = []

  private async pushTrx() {
    // log.debug("queue:", this)
    const act = this.queue.shift()
    if (!act) return
    const result = await this.client.sendAction(act)
    log.debug("pushTrx result:", result)
    if (result?.receipts.length == 0) {
      log.error("Transaction Error:", result.errors)
    } else {
      log.debug("transaction success:", result?.receipts[0]?.receipt.id)
    }
  }
}
