import { ChainClient } from "lib/eosio"
import { handleNftOrder } from "lib/handleNftOrder"
import { handleOrder } from "lib/handleOrder"
import { findAction } from "lib/ibcUtil"
import { IbcOrder, IbcSpecialOrder } from "lib/types/antelopex.system.types"

export async function handleAnyOrder(order:IbcOrder|IbcSpecialOrder, client:ChainClient) {
  const data = await findAction(client, order.trxid.toString(), order.block_num.toNumber())
  if (data.actionName == "emitxfer") return handleOrder(order, client, data)
  else return handleNftOrder(order, client, data)
}
