import { Action, Asset, Checksum256, NameType } from "@greymass/eosio"
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
import { IbcToken } from "lib/types/antelopex.system.types"
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
      // log.debug(event) // DEBUG log

      const res = JSON.parse(event.data)
      log.debug("Received message from ibc getBlockActions", res) // DEBUG log

      if (res.type === "error") reject(new Error(res.error))
      if (res.type !== "getBlockActions") return
      ws.close()
      const action_receipt = res.txs.filter((t:any) => t[0].transactionId.toUpperCase() === txId.toUpperCase())
      if (action_receipt.length !== 1) throwErr("Action receipt for trx with txId", txId, "not found in block", blockNum, action_receipt)
      const action_data = action_receipt[0].find((a:any) => a.action.name === "emitxfer")
      if (!action_data) throwErr("Action emitxfer not found in transaction")
      log.debug(action_data.action)
      if (!action_data.action.data) action_data.action.data = [0]
      const actionData = Action.from(action_data.action)
      const actionReceipt = action_data.receipt
      const action_receipt_digest = action_data.action_receipt_digest
      resolve({ action: actionData, action_receipt_digest, block_to_prove: blockNum, actionReceipt })
    })
  })
}

export async function getProof(chain:ChainClient, queryData:GetProofQuery, last_proven_block?:number):Promise<ProofData> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(chain.getProofSocket())
    const type = last_proven_block ? "lightProof" : "heavyProof" // if we don't have last_proven_block then request heavy proof
    ws.addEventListener("open", (event) => {
      // connected to websocket server
      const query:Partial<ProofQuery> = { type, block_to_prove: queryData.block_to_prove }
      if (queryData.action_receipt_digest) query.action_receipt_digest = queryData.action_receipt_digest
      if (type == "lightProof") query.last_proven_block = last_proven_block
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

export async function getDestinationChain(tknRow:IbcToken, fromChainName:ChainKey, xferActionContract:NameType):Promise<ChainClient> {
  let nativeChainName = tknRow.native_chain.toString()
  if (nativeChainName === "telos") nativeChainName = "tlos"
  if (fromChainName as string === "telos") fromChainName = "tlos"
  const toNative = nativeChainName != fromChainName
  if (toNative) return getChainClient(nativeChainName as ChainKey)
  else {
    const wlConfig = tknRow.wraplock_contracts.find(el => el.contract.toString() === xferActionContract.toString())
    if (!wlConfig) throwErr("No valid wraplock contract for sym contract", tknRow.symbol.toString(), xferActionContract.toString())
    return getChainClient(wlConfig.destination_chain.toString() as ChainKey)
  }
}

export async function makeXferProveAction(fromChain:ChainClient, toChain:ChainClient, requestData:GetProofQuery, proofData:ProofData, type:ProofRequestType = "heavyProof", block_merkle_root?:string) {
  if (type === "lightProof" && !block_merkle_root) throwErr("Block merkle root required for lightProof")
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
  console.log("data:", data)

  let act:Action
  const tknRow = await getIBCToken(fromChain, sym)
  let fromChainName:string = fromChain.name
  if (fromChainName === "tlos") fromChainName = "telos"
  const toNative = tknRow.native_chain.toString() != fromChainName
  // fs.writeJsonSync("../data.json", data)
  if (toNative) {
    // destinationChain = getChainClient(tknRow.native_chain.toString() as ChainKey)
    const destinationTokenRow = await getIBCToken(toChain, sym)
    console.log(JSON.stringify(destinationTokenRow, null, 2))

    const wlContract = destinationTokenRow.wraplock_contracts.find(el => el.destination_chain.toString() === fromChainName)
    console.log(fromChain.name)
    console.log(JSON.stringify(destinationTokenRow, null, 2))
    if (!wlContract) throwErr("No matching wraplock contract found for sym", sym.toString(), fromChainName)
    if (type == "lightProof") {
      data.blockproof.root = block_merkle_root
      act = actions.lockToken.withdrawB(data, wlContract.contract, tknRow.native_chain.toString() as ChainKey)
    } else act = actions.lockToken.withdrawA(data, wlContract.contract, tknRow.native_chain.toString() as ChainKey)
  } else {
    // const wlConfig = tknRow.wraplock_contracts.find(el => el.contract.toString() === contract)
    // if (!wlConfig) throwErr("No valid wraplock contract for sym contract", sym, contract)
    // destinationChain = getChainClient(wlConfig.destination_chain.toString() as ChainKey)
    const destinationTokenRow = await getIBCToken(toChain, sym)
    log.debug(toChain.name, toObject(destinationTokenRow)) // DEBUG log
    // if (type == "lightProof") proofData. = lastBlockProvedRes.block_merkle_root
    if (type == "lightProof") {
      data.blockproof.root = block_merkle_root
      act = actions.wrapToken.issueB(data, destinationTokenRow.token_contract, toChain.name)
    } else act = actions.wrapToken.issueA(data, destinationTokenRow.token_contract, toChain.name)
  }
  return act
}
