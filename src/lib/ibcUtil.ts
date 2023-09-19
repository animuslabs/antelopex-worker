import { Action, Asset, Checksum256 } from "@greymass/eosio"
import fs from "fs-extra"
import { actions } from "lib/actions"
import { ChainClient, getChainClient } from "lib/eosio"
import { HypAction, getHypClient, hypClients } from "lib/hyp"
import { getIBCToken } from "lib/ibcTokens"
import { ProofData, ActionReceipt, ChainKey, ProofDataResult, GetProofQuery, ProofRequestType, ProofQuery } from "lib/types/ibc.types"
import { Emitxfer } from "lib/types/wraplock.types"
import { throwErr, toObject } from "lib/utils"
import WebSocket from "ws"
import logger from "lib/logger"
const log = logger.getLogger("ibcUtil")

export async function getEmitXferMeta(chain:ChainClient, txId:string, blockNum:number):Promise<GetProofQuery> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(chain.getProofSocket())
    ws.addEventListener("open", (event) => {
      const query = { type: "getBlockActions", block_to_prove: blockNum }
      ws.send(JSON.stringify(query))
    })

    ws.addEventListener("error", (event) => {
      log.debug(`WebSocket error: ${event.message}`) // DEBUG log
    })

    ws.addEventListener("message", (event:any) => {
      log.debug(event) // DEBUG log

      const res = JSON.parse(event.data)
      log.debug("Received message from ibc getBlockActions", res) // DEBUG log

      if (res.type === "error") reject(new Error(res.error))
      if (res.type !== "getBlockActions") return
      ws.close()
      const action_receipt = res.txs.filter((t:any) => t[0].transactionId === txId)
      if (action_receipt.length !== 1) throwErr("Action receipt for trx with txId", txId, "not found in block", blockNum, action_receipt)
      const action_data = action_receipt[0].find((a:any) => a.action.name === "emitxfer")
      if (!action_data) throwErr("Action emitxfer not found in transaction")
      const actionData = Action.from(action_data.action)
      const actionReceipt = action_data.receipt
      const action_receipt_digest = action_data.action_receipt_digest
      resolve({ action: actionData, action_receipt_digest, block_to_prove: blockNum, actionReceipt })
    })
  })
}

export async function getProof(chain:ChainClient, queryData:GetProofQuery, type:ProofRequestType = "heavyProof"):Promise<ProofData> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(chain.getProofSocket())

    ws.addEventListener("open", (event) => {
      // connected to websocket server
      const query:Partial<ProofQuery> = { type, block_to_prove: queryData.block_to_prove }
      if (queryData.action_receipt_digest) query.action_receipt_digest = queryData.action_receipt_digest
      query.action_receipt = queryData.actionReceipt
      let auth_sequence = []
      for (let authSequence of query.action_receipt?.auth_sequence as any) auth_sequence.push(Object.values(authSequence))
      if (query.action_receipt) query.action_receipt.auth_sequence = auth_sequence
      ws.send(JSON.stringify(query))
    })

    // messages from websocket server
    ws.addEventListener("message", (event:any) => {
      const res = JSON.parse(event.data)
      log.debug("Received message from ibc proof server", res) // DEBUG log

      if (res.type === "error") reject(new Error(res.error))
      if (res.type !== "proof") return
      ws.close()
      let typedProof:ProofDataResult = res
      resolve(typedProof.proof)
    })
  })
}

export async function makeXferProveAction(fromChain:ChainClient, requestData:GetProofQuery, proofData:ProofData) {
  const sym = requestData.action.decodeData(Emitxfer).xfer.quantity.quantity.symbol
  if (!proofData.actionproof) throwErr("No action proof found in proofData")
  let auth_sequence = []
  for (let authSequence of requestData.actionReceipt.auth_sequence) auth_sequence.push({ account: authSequence[0], sequence: authSequence[1] })
  requestData.actionReceipt.auth_sequence = auth_sequence
  let data:any = { ...proofData }
  data.actionproof = {
    ...proofData.actionproof,
    action: toObject(requestData.action),
    receipt: { ...requestData.actionReceipt }
  }
  let act:Action
  let destinationChain:ChainClient
  const contract = requestData.action.account.toString()
  const tknRow = await getIBCToken(fromChain, sym)
  const toNative = tknRow.native_chain.toString() != fromChain.config.chain
  fs.writeJsonSync("../data.json", data)
  if (toNative) {
    destinationChain = getChainClient(tknRow.native_chain.toString() as ChainKey)
    const destinationTokenRow = await getIBCToken(destinationChain, sym)
    const wlContract = destinationTokenRow.wraplock_contracts.find(el => el.destination_chain.toString() === fromChain.config.chain)
    if (!wlContract) throwErr("No matching wraplock contract found for sym", sym.toString())
    act = actions.lockToken.withdrawA(data, wlContract.contract, tknRow.native_chain.toString() as ChainKey)
  } else {
    const wlConfig = tknRow.wraplock_contracts.find(el => el.contract.toString() === contract)
    if (!wlConfig) throwErr("No valid wraplock contract for sym contract", sym, contract)
    destinationChain = getChainClient(wlConfig.destination_chain.toString() as ChainKey)
    const destinationTokenRow = await getIBCToken(destinationChain, sym)
    log.debug(destinationChain.name, toObject(destinationTokenRow)) // DEBUG log

    act = actions.wrapToken.issueA(data, destinationTokenRow.token_contract, destinationChain.name)
    // act = Action.prototype
  }
  return { action: act, destinationChain }
}
