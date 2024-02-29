import { UInt32, UInt64 } from "@greymass/eosio"
import { IBCOrder, SpecialOrder } from "@prisma/client"
import db from "lib/db"
import { newIBCOrder } from "lib/dbHelpers"
import { ChainClient, chainClients } from "lib/eosio"
import { handleOrder } from "lib/handleOrder"
import logger from "lib/logger"
import { IbcOrder, IbcSpecialOrder } from "lib/types/antelopex.system.types"
import { sleep, sleepErr } from "lib/utils"
import ms from "ms"
export async function retrySpecialOrders(client:ChainClient) {
  return retryOrders(client, true)
}

export async function retryOrders(client:ChainClient, specialOrders:boolean = false) {
  let log
  specialOrders
    ? log = logger.getLogger("retrySpecialOrders-" + client.name)
    : log = logger.getLogger("retryOrders-" + client.name)
  log.debug(`Checking orders for chain: ${client.name}`) // DEBUG log
  await sleep(1000)

  let retryOrders:IBCOrder[]|SpecialOrder[] = specialOrders
    ? await db.specialOrder.findMany({ where: { originChain: client.name, shouldRetry: true, relayed: false }})
    : await db.iBCOrder.findMany({ where: { originChain: client.name, shouldRetry: true, relayed: false }})

  let filteredOrders = [...retryOrders].map(el => {
    let order
    if (specialOrders) {
      const specialOrder = el as unknown as SpecialOrder
      order = IbcSpecialOrder.from({
        block_num: specialOrder.blockNum,
        depositor: "",
        fee_paid: 0,
        trxid: specialOrder.originTxid,
        id: specialOrder.orderId
      })
    } else {
      order = IbcOrder.from({
        block_num: el.blockNum,
        depositor: "",
        fee_paid: 0,
        trxid: el.originTxid
      })
    }
    return order
  })
  log.debug(`retrying ${retryOrders.length} orders for client: ${client.name}`) // DEBUG log
  log.debug(`${client.config.chain.toUpperCase()} - New orders found: ${filteredOrders.length}`) // DEBUG log
  for (const order of filteredOrders) await handleOrder(order, client)
}

