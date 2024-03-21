import { Name } from "@wharfkit/antelope"
import { proveSchedules } from "lib/ proveScheduleChange"
import { handleTrxResult } from "lib/actions"
import { addIBCOrderError, addIBCSpecialOrderError } from "lib/dbHelpers"
import { ChainClient, getChainClient } from "lib/eosio"
import { getIBCNft } from "lib/ibcTokens"
import { findAction, findProofType, getProof, makeProofAction } from "lib/ibcUtil"
import logger from "lib/logger"
import { IbcOrder, IbcSpecialOrder } from "lib/types/antelopex.system.types"
import { ChainKey, GetProofQuery } from "lib/types/ibc.types"
import { throwErr } from "lib/utils"
const log = logger.getLogger("handleNftOrder")

export async function handleNftOrder(order:IbcSpecialOrder|IbcOrder, fromChain:ChainClient, data?:GetProofQuery) {
  const specialOrder = "id" in order
  try {
    if (!data) data = await findAction(fromChain, order.trxid.toString(), order.block_num.toNumber())
    if (data.actionName == "emitxfer") return log.error("skipping emitxfer action...")
    log.debug(`Processing nft order: ${order.trxid.toString()} ${data.actionName}`)
    const ibcNftRow = await getIBCNft(fromChain, data.action.account as unknown as Name)
    const toChain = getChainClient(ibcNftRow.paired_chain.toString() as ChainKey)
    await proveSchedules(fromChain, toChain).catch(log.error)
    const { proofType, block_merkle_root, lastProvenBlock } = await findProofType(fromChain, toChain, order.block_num.toNumber())
    const proof = await getProof(fromChain, data, proofType == "lightProof" ? lastProvenBlock : undefined)
    let action = await makeProofAction(data.actionName, fromChain, toChain, data, proof, proofType, block_merkle_root)
    const result = await toChain.sendAction(action)
    // log.debug(`Result for order ${order.trxid.toString()}}`)
    if (!result) throwErr("Null result")
    await handleTrxResult(result, specialOrder, order, toChain)
  } catch (error:any) {
    log.error(`Exception caught for order ${order.trxid.toString()}: ${error.message}`)
    specialOrder ? await addIBCSpecialOrderError(order, error) : await addIBCOrderError(order, error)
  }
}
